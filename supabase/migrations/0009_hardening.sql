-- 0009 — Endurecimento antes de tornar o repositório / a app públicos.
--
-- 1. O cliente só lê do perfil o que o ecrã de colegas precisa (nome, localidade).
--    Email, telemóvel, coordenadas e caches da caderneta saem por meu_perfil(),
--    que devolve apenas a linha de quem está autenticado.
-- 2. O cliente não consegue alterar estado, caches nem email (só o raio).
-- 3. Um pedido de procura inserido pelo cliente nasce sempre pendente e sem
--    resultado. O resultado só é escrito depois, com a service role (que ignora RLS).
-- 4. Criar o pool passa a ser uma transacção: ninguém entra em dois grupos
--    por uma corrida, e o cliente não escolhe os membros à margem do resultado.
-- 5. Expirar um pool, gravar a localização e o link de WhatsApp ficam validados
--    no servidor, não só no browser.

-- ---------------------------------------------------------------------------
-- Perfil: colunas visíveis aos colegas de pool
-- ---------------------------------------------------------------------------
revoke all on table public.utilizadores from public, anon, authenticated;

grant select (id, nome, localidade)
  on table public.utilizadores to authenticated;

-- O raio é o único campo de negócio que o cliente grava directo. updated_at
-- entra na grant porque o trigger touch_updated_at o preenche no mesmo UPDATE;
-- o trigger volta a pôr now(), por isso o cliente não consegue antedatar o perfil.
grant update (raio_km, updated_at)
  on table public.utilizadores to authenticated;

create or replace function public.meu_perfil()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select to_jsonb(t)
  from (
    select
      u.id,
      u.nome,
      u.email,
      u.telemovel,
      u.localidade,
      u.raio_km,
      u.estado,
      u.repetidos_cache,
      u.faltas_cache,
      u.registo_completo,
      (u.localizacao is not null) as tem_localizacao
    from public.utilizadores u
    where u.id = auth.uid()
  ) t;
$$;

revoke all on function public.meu_perfil() from public, anon, authenticated;
grant execute on function public.meu_perfil() to authenticated;

-- ---------------------------------------------------------------------------
-- Pedidos de procura: o cliente não escreve o resultado
-- ---------------------------------------------------------------------------
create or replace function public.psr_normalizar_insert()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.status := 'pending';
  new.resultado := null;
  new.result_pool_id := null;
  new.params := '{}'::jsonb;
  return new;
end;
$$;

drop trigger if exists psr_normalizar_insert on public.pool_search_requests;
create trigger psr_normalizar_insert
  before insert on public.pool_search_requests
  for each row execute function public.psr_normalizar_insert();

revoke all on function public.psr_normalizar_insert() from public;
grant execute on function public.psr_normalizar_insert() to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Materializar o pool numa única transacção (só service role)
-- ---------------------------------------------------------------------------
create or replace function public.materializar_pool(
  p_request uuid,
  p_solicitante uuid,
  p_membros uuid[],
  p_trocas jsonb
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pool uuid;
  v_owner uuid;
  v_existing uuid;
  v_n int;
begin
  if p_solicitante is null
     or p_membros is null
     or cardinality(p_membros) <> 4
     or (select count(distinct m) from unnest(p_membros) as m) <> 4
     or not (p_solicitante = any (p_membros)) then
    raise exception 'pool_invalido';
  end if;

  select utilizador_id, result_pool_id
    into v_owner, v_existing
  from public.pool_search_requests
  where id = p_request
  for update;

  if v_owner is null or v_owner <> p_solicitante then
    raise exception 'pedido_invalido';
  end if;

  if v_existing is not null then
    return v_existing;
  end if;

  perform 1
  from public.utilizadores
  where id = any (p_membros)
  order by id
  for update;

  select count(*) into v_n
  from public.utilizadores
  where id = any (p_membros);

  if v_n <> 4 then
    raise exception 'pool_invalido';
  end if;

  if exists (
    select 1
    from public.utilizadores
    where id = any (p_membros)
      and estado = 'em_pool'
  ) then
    raise exception 'membro_em_pool';
  end if;

  insert into public.pool (estado, expires_at)
  values ('formando', now() + interval '24 hours')
  returning id into v_pool;

  insert into public.pool_membro (
    pool_id, utilizador_id, is_solicitante, estado, confirmado_at
  )
  select
    v_pool,
    m,
    m = p_solicitante,
    case when m = p_solicitante then 'confirmado' else 'convidado' end,
    case when m = p_solicitante then now() else null end
  from unnest(p_membros) as m;

  insert into public.troca_pool (
    pool_id, de_utilizador_id, para_utilizador_id, cromo_id, quantidade
  )
  select
    v_pool,
    (t->>'de')::uuid,
    (t->>'para')::uuid,
    (t->>'cromo_id')::int,
    1
  from jsonb_array_elements(coalesce(p_trocas, '[]'::jsonb)) as t
  where (t->>'cromo_id') ~ '^[0-9]+$'
    and (t->>'de')::uuid = any (p_membros)
    and (t->>'para')::uuid = any (p_membros)
    and (t->>'de')::uuid <> (t->>'para')::uuid;

  update public.utilizadores
  set estado = 'em_pool'
  where id = any (p_membros);

  update public.pool_search_requests
  set status = 'completed',
      result_pool_id = v_pool
  where id = p_request;

  return v_pool;
end;
$$;

revoke all on function public.materializar_pool(uuid, uuid, uuid[], jsonb) from public, anon, authenticated;
grant execute on function public.materializar_pool(uuid, uuid, uuid[], jsonb) to service_role;

-- ---------------------------------------------------------------------------
-- Expiração: só um membro do pool a pode despoletar
-- ---------------------------------------------------------------------------
create or replace function public.avaliar_expiracao_pool(p_pool uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_estado text;
  v_exp timestamptz;
begin
  if auth.uid() is null or not public.e_membro_do_pool(p_pool) then
    return;
  end if;

  select estado, expires_at into v_estado, v_exp
  from public.pool
  where id = p_pool;

  if v_estado = 'formando' and v_exp is not null and v_exp < now() then
    update public.pool set estado = 'cancelada' where id = p_pool;
    update public.utilizadores set estado = 'activo'
    where estado = 'em_pool'
      and id in (
        select utilizador_id from public.pool_membro where pool_id = p_pool
      );
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Localização: o RPC é a fronteira, não só o formulário
-- ---------------------------------------------------------------------------
create or replace function public.definir_localizacao(
  p_lat double precision,
  p_lng double precision,
  p_localidade text,
  p_raio_km integer
) returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if auth.uid() is null then
    raise exception 'Sessão expirada';
  end if;
  if p_lat is null or p_lng is null
     or p_lat < -90 or p_lat > 90
     or p_lng < -180 or p_lng > 180 then
    raise exception 'Coordenadas inválidas';
  end if;
  if p_localidade is null
     or char_length(btrim(p_localidade)) < 1
     or char_length(p_localidade) > 120 then
    raise exception 'Localidade inválida';
  end if;
  if p_raio_km not in (5, 10, 15, 20, 30, 50) then
    raise exception 'Raio inválido';
  end if;

  update public.utilizadores
  set localizacao = st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography,
      localidade = btrim(p_localidade),
      raio_km = p_raio_km
  where id = auth.uid();
end;
$$;

-- ---------------------------------------------------------------------------
-- Colecção em massa: teto para não aceitar um array arbitrário
-- ---------------------------------------------------------------------------
create or replace function public.guardar_cromos_massa(
  p_cromo_ids int[],
  p_quantidade integer,
  p_precisa boolean
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Sessão expirada';
  end if;
  if coalesce(cardinality(p_cromo_ids), 0) > 2000 then
    raise exception 'Demasiados cromos de uma vez';
  end if;

  insert into public.colecao_utilizador (
    utilizador_id, cromo_id, quantidade_tem, precisa, updated_at
  )
  select auth.uid(), cid, greatest(p_quantidade, 0), p_precisa, now()
  from unnest(p_cromo_ids) as cid
  on conflict (utilizador_id, cromo_id)
  do update set
    quantidade_tem = greatest(excluded.quantidade_tem, 0),
    precisa = excluded.precisa,
    updated_at = now();
end;
$$;

-- ---------------------------------------------------------------------------
-- Link de WhatsApp: o endereço tem de ser só o convite, até ao fim
-- ---------------------------------------------------------------------------
create or replace function public.submeter_link_whatsapp(p_pool uuid, p_link text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if not exists (
    select 1 from public.pool_membro
    where pool_id = p_pool and utilizador_id = v_uid
  ) then
    return 'nao_membro';
  end if;
  if p_link !~ '^https://chat\.whatsapp\.com/[A-Za-z0-9]+$' then
    return 'link_invalido';
  end if;

  update public.pool
  set whatsapp_link = p_link,
      whatsapp_link_expires_at = now() + interval '7 days'
  where id = p_pool;
  return 'ok';
end;
$$;
