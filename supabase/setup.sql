-- ============================================================
-- Trocata — setup consolidado (gerado a partir de supabase/migrations/*)
-- Cola este ficheiro inteiro no SQL Editor do Supabase e corre.
-- ============================================================


-- >>>>>>>>>> supabase/migrations/0000_init_extensions.sql <<<<<<<<<<

-- 0000 — Extensões base
-- PostGIS: pesquisa geográfica por raio (índice GIST).
-- pg_cron: jobs de safety-net (timeouts de pools, limpeza) — Fases 3/4.
create extension if not exists postgis with schema extensions;
create extension if not exists pg_cron;

-- Verificação rápida (correr manualmente): select postgis_version();

-- >>>>>>>>>> supabase/migrations/0001_utilizadores_cromos.sql <<<<<<<<<<

-- 0001 — Utilizadores e Cromos (Fase 1)
-- Perfil 1:1 com auth.users + catálogo de cromos.

-- ---------------------------------------------------------------------------
-- UTILIZADORES
-- ---------------------------------------------------------------------------
create table public.utilizadores (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null,
  email text not null unique,
  telemovel text,
  localizacao geography (point, 4326),
  localidade text,                       -- nome legível (ex. "Amadora")
  raio_km smallint not null default 15,
  estado text not null default 'novo'
    check (estado in ('novo', 'activo', 'em_pool', 'inactivo')),
  -- Caches denormalizados de ordens de cromos, mantidos por trigger na Fase 2.
  -- Aceleram o matching (evita join à colecao dentro do worker).
  repetidos_cache smallint[] not null default '{}',
  faltas_cache smallint[] not null default '{}',
  registo_completo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Índice geográfico para ST_DWithin (filtragem por raio no matching).
create index utilizadores_localizacao_gix
  on public.utilizadores using gist (localizacao);
create index utilizadores_estado_idx on public.utilizadores (estado);

-- ---------------------------------------------------------------------------
-- CROMOS (catálogo — dados placeholder, sem arte oficial)
-- ---------------------------------------------------------------------------
create table public.cromos (
  id serial primary key,
  ordem smallint not null unique,        -- índice de bit para o matching (1..N)
  numero text not null,
  nome text not null,
  equipa text not null,
  tipo text not null check (tipo in ('jogador', 'escudo', 'especial')),
  created_at timestamptz not null default now()
);
create index cromos_equipa_idx on public.cromos (equipa);
create index cromos_tipo_idx on public.cromos (tipo);

-- ---------------------------------------------------------------------------
-- TRIGGER: criar perfil ao registar (auth.users -> public.utilizadores)
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.utilizadores (id, nome, email, telemovel)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nome', 'Coleccionador'),
    new.email,
    new.raw_user_meta_data ->> 'telemovel'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- TRIGGER: manter updated_at
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger utilizadores_touch
  before update on public.utilizadores
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.utilizadores enable row level security;

-- Cada utilizador lê/edita apenas o seu próprio perfil.
create policy "utilizadores_self_select"
  on public.utilizadores for select
  using (auth.uid() = id);

create policy "utilizadores_self_update"
  on public.utilizadores for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- (Nota: a policy de "ver colegas de pool" é adicionada na migration de pools,
--  quando a tabela pool_membro existir.)

-- Cromos: catálogo público de leitura para qualquer utilizador autenticado.
alter table public.cromos enable row level security;
create policy "cromos_read_all"
  on public.cromos for select
  to authenticated
  using (true);

-- >>>>>>>>>> supabase/migrations/0002_localizacao_colecao.sql <<<<<<<<<<

-- 0002 — RPC de localização + tabela de colecção (Fase 1/2)

-- ---------------------------------------------------------------------------
-- RPC: definir_localizacao
-- Escreve o ponto PostGIS (não é directo pelo client JS) + localidade + raio.
-- ---------------------------------------------------------------------------
-- Assinatura única com integer (o client JS envia números como integer;
-- a coluna smallint aceita por cast de atribuição). Evita ambiguidade PostgREST.
create or replace function public.definir_localizacao(
  p_lat double precision,
  p_lng double precision,
  p_localidade text,
  p_raio_km integer
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  update public.utilizadores
  set localizacao = st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography,
      localidade = p_localidade,
      raio_km = p_raio_km
  where id = auth.uid();
end;
$$;

-- ---------------------------------------------------------------------------
-- COLECAO_UTILIZADOR
-- ---------------------------------------------------------------------------
create table public.colecao_utilizador (
  id bigserial primary key,
  utilizador_id uuid not null references public.utilizadores (id) on delete cascade,
  cromo_id int not null references public.cromos (id),
  quantidade_tem smallint not null default 0 check (quantidade_tem >= 0),
  precisa boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (utilizador_id, cromo_id)
);
create index colecao_utilizador_uid_idx
  on public.colecao_utilizador (utilizador_id);

-- ---------------------------------------------------------------------------
-- TRIGGER: sincronizar caches (repetidos/faltas) no perfil
--   repetidos = ordens com quantidade_tem >= 2 (tem duplicado para dar)
--   faltas    = ordens com precisa = true
-- ---------------------------------------------------------------------------
create or replace function public.sync_caches_colecao()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := coalesce(new.utilizador_id, old.utilizador_id);
begin
  update public.utilizadores u
  set
    repetidos_cache = coalesce((
      select array_agg(c.ordem order by c.ordem)
      from public.colecao_utilizador cu
      join public.cromos c on c.id = cu.cromo_id
      where cu.utilizador_id = v_uid and cu.quantidade_tem >= 2
    ), '{}'),
    faltas_cache = coalesce((
      select array_agg(c.ordem order by c.ordem)
      from public.colecao_utilizador cu
      join public.cromos c on c.id = cu.cromo_id
      where cu.utilizador_id = v_uid and cu.precisa = true
    ), '{}')
  where u.id = v_uid;
  return null;
end;
$$;

create trigger colecao_sync_caches
  after insert or update or delete on public.colecao_utilizador
  for each row execute function public.sync_caches_colecao();

-- ---------------------------------------------------------------------------
-- RPC: guardar_cromo (upsert de uma entrada da colecção)
-- ---------------------------------------------------------------------------
create or replace function public.guardar_cromo(
  p_cromo_id int,
  p_quantidade integer,
  p_precisa boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.colecao_utilizador (utilizador_id, cromo_id, quantidade_tem, precisa, updated_at)
  values (auth.uid(), p_cromo_id, greatest(p_quantidade, 0), p_precisa, now())
  on conflict (utilizador_id, cromo_id)
  do update set
    quantidade_tem = greatest(excluded.quantidade_tem, 0),
    precisa = excluded.precisa,
    updated_at = now();
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: completar_registo
--   Marca registo_completo e passa o estado 'novo' -> 'activo' se houver
--   pelo menos 5 cromos registados (regra da spec 4.1.4).
-- ---------------------------------------------------------------------------
create or replace function public.completar_registo()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_total int;
begin
  select count(*) into v_total
  from public.colecao_utilizador
  where utilizador_id = v_uid and (quantidade_tem > 0 or precisa = true);

  update public.utilizadores
  set registo_completo = true,
      estado = case when v_total >= 5 then 'activo' else 'novo' end
  where id = v_uid;
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.colecao_utilizador enable row level security;
create policy "colecao_self_all"
  on public.colecao_utilizador for all
  using (auth.uid() = utilizador_id)
  with check (auth.uid() = utilizador_id);

-- >>>>>>>>>> supabase/migrations/0003_colecao_massa.sql <<<<<<<<<<

-- 0003 — Edição em massa da colecção (FAB "adicionar em massa")

-- Assinatura única com integer (evita ambiguidade PostgREST).
create or replace function public.guardar_cromos_massa(
  p_cromo_ids int[],
  p_quantidade integer,
  p_precisa boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.colecao_utilizador (utilizador_id, cromo_id, quantidade_tem, precisa, updated_at)
  select auth.uid(), cid, greatest(p_quantidade, 0), p_precisa, now()
  from unnest(p_cromo_ids) as cid
  on conflict (utilizador_id, cromo_id)
  do update set
    quantidade_tem = greatest(excluded.quantidade_tem, 0),
    precisa = excluded.precisa,
    updated_at = now();
end;
$$;

-- >>>>>>>>>> supabase/migrations/0004_fix_rpc_overloads.sql <<<<<<<<<<

-- 0004 — Corrige ambiguidade de overloads dos RPCs
--
-- As versões iniciais criaram DUAS assinaturas (smallint + integer) para os
-- mesmos RPCs. O PostgREST não consegue escolher a candidata quando o client
-- JS envia um número → erro "Could not choose the best candidate function".
--
-- Este ficheiro é idempotente e seguro em bases novas ou já existentes:
-- larga TODAS as variantes e recria uma única assinatura (integer).

-- 1. Largar variantes ambíguas ---------------------------------------------
drop function if exists public.definir_localizacao(double precision, double precision, text, smallint);
drop function if exists public.definir_localizacao(double precision, double precision, text, integer);
drop function if exists public.guardar_cromo(int, smallint, boolean);
drop function if exists public.guardar_cromo(int, integer, boolean);
drop function if exists public.guardar_cromos_massa(int[], smallint, boolean);
drop function if exists public.guardar_cromos_massa(int[], integer, boolean);

-- 2. Recriar assinaturas únicas (integer) ----------------------------------
create function public.definir_localizacao(
  p_lat double precision,
  p_lng double precision,
  p_localidade text,
  p_raio_km integer
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  update public.utilizadores
  set localizacao = st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography,
      localidade = p_localidade,
      raio_km = p_raio_km
  where id = auth.uid();
end;
$$;

create function public.guardar_cromo(
  p_cromo_id int,
  p_quantidade integer,
  p_precisa boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.colecao_utilizador (utilizador_id, cromo_id, quantidade_tem, precisa, updated_at)
  values (auth.uid(), p_cromo_id, greatest(p_quantidade, 0), p_precisa, now())
  on conflict (utilizador_id, cromo_id)
  do update set
    quantidade_tem = greatest(excluded.quantidade_tem, 0),
    precisa = excluded.precisa,
    updated_at = now();
end;
$$;

create function public.guardar_cromos_massa(
  p_cromo_ids int[],
  p_quantidade integer,
  p_precisa boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.colecao_utilizador (utilizador_id, cromo_id, quantidade_tem, precisa, updated_at)
  select auth.uid(), cid, greatest(p_quantidade, 0), p_precisa, now()
  from unnest(p_cromo_ids) as cid
  on conflict (utilizador_id, cromo_id)
  do update set
    quantidade_tem = greatest(excluded.quantidade_tem, 0),
    precisa = excluded.precisa,
    updated_at = now();
end;
$$;

-- >>>>>>>>>> supabase/migrations/0005_pool_matching.sql <<<<<<<<<<

-- 0005 — Schema de matching e pools (Fase 3)

-- ---------------------------------------------------------------------------
-- POOL
-- ---------------------------------------------------------------------------
create table public.pool (
  id uuid primary key default gen_random_uuid(),
  estado text not null default 'formando'
    check (estado in ('formando','a_aguardar_substituto','activa','concluida','cancelada')),
  whatsapp_link text,
  whatsapp_link_expires_at timestamptz,
  expires_at timestamptz,                 -- janela de 24h para aceitar/confirmar
  created_at timestamptz not null default now()
);

create table public.pool_membro (
  id bigserial primary key,
  pool_id uuid not null references public.pool (id) on delete cascade,
  utilizador_id uuid not null references public.utilizadores (id) on delete cascade,
  estado text not null default 'convidado'
    check (estado in ('convidado','confirmado','recusado','saiu')),
  is_solicitante boolean not null default false,
  joined_at timestamptz not null default now(),
  confirmado_at timestamptz,
  unique (pool_id, utilizador_id)
);
create index pool_membro_pool_idx on public.pool_membro (pool_id);
create index pool_membro_uid_idx on public.pool_membro (utilizador_id);

create table public.troca_pool (
  id bigserial primary key,
  pool_id uuid not null references public.pool (id) on delete cascade,
  de_utilizador_id uuid not null references public.utilizadores (id),
  para_utilizador_id uuid not null references public.utilizadores (id),
  cromo_id int not null references public.cromos (id),
  quantidade smallint not null default 1
);
create index troca_pool_pool_idx on public.troca_pool (pool_id);

-- ---------------------------------------------------------------------------
-- PEDIDOS DE PROCURA (estado do matching + resultado em JSON)
-- ---------------------------------------------------------------------------
create table public.pool_search_requests (
  id uuid primary key default gen_random_uuid(),
  utilizador_id uuid not null references public.utilizadores (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending','processing','completed','no_match','timeout','cancelado')),
  params jsonb not null default '{}',
  -- resultado = { melhor: PoolCandidato, alternativas: PoolCandidato[], perfis: {...} }
  resultado jsonb,
  result_pool_id uuid references public.pool (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index psr_uid_idx on public.pool_search_requests (utilizador_id);

create trigger psr_touch
  before update on public.pool_search_requests
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- RPC: candidatos_matching (filtro geográfico via índice GIST)
--   Só executável por service_role (dados sensíveis de vários utilizadores).
-- ---------------------------------------------------------------------------
create or replace function public.candidatos_matching(
  p_uid uuid,
  p_lat double precision,
  p_lng double precision,
  p_raio_km integer
)
returns table (
  id uuid,
  nome text,
  localidade text,
  lat double precision,
  lng double precision,
  dist_km double precision,
  raio_km smallint,
  repetidos smallint[],
  faltas smallint[],
  desatualizado boolean
)
language sql
security definer
set search_path = public, extensions
as $$
  select
    u.id, u.nome, u.localidade,
    st_y(u.localizacao::geometry) as lat,
    st_x(u.localizacao::geometry) as lng,
    st_distance(
      u.localizacao,
      st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography
    ) / 1000.0 as dist_km,
    u.raio_km,
    u.repetidos_cache,
    u.faltas_cache,
    (u.updated_at < now() - interval '7 days') as desatualizado
  from public.utilizadores u
  where u.id <> p_uid
    and u.estado = 'activo'
    and u.localizacao is not null
    and st_dwithin(
      u.localizacao,
      st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography,
      greatest(p_raio_km, u.raio_km) * 1000
    )
  order by dist_km
  limit 200;
$$;

-- Só o service_role invoca (via Server Action). Retira exposição a clientes.
revoke execute on function public.candidatos_matching(uuid, double precision, double precision, integer) from public, anon, authenticated;

-- Perfil de matching do próprio solicitante (coordenadas + caches).
create or replace function public.perfil_matching(p_uid uuid)
returns table (
  id uuid,
  nome text,
  localidade text,
  lat double precision,
  lng double precision,
  raio_km smallint,
  repetidos smallint[],
  faltas smallint[]
)
language sql
security definer
set search_path = public, extensions
as $$
  select
    u.id, u.nome, u.localidade,
    st_y(u.localizacao::geometry) as lat,
    st_x(u.localizacao::geometry) as lng,
    u.raio_km, u.repetidos_cache, u.faltas_cache
  from public.utilizadores u
  where u.id = p_uid;
$$;
revoke execute on function public.perfil_matching(uuid) from public, anon, authenticated;

-- Define localização por uid (usado pelo seed de utilizadores sintéticos).
create or replace function public.definir_localizacao_admin(
  p_uid uuid,
  p_lat double precision,
  p_lng double precision,
  p_localidade text,
  p_raio_km integer
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  update public.utilizadores
  set localizacao = st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography,
      localidade = p_localidade,
      raio_km = p_raio_km
  where id = p_uid;
end;
$$;
revoke execute on function public.definir_localizacao_admin(uuid, double precision, double precision, text, integer) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.pool enable row level security;
alter table public.pool_membro enable row level security;
alter table public.troca_pool enable row level security;
alter table public.pool_search_requests enable row level security;

-- Membros vêem a sua pool.
create policy "pool_membro_select_proprio"
  on public.pool_membro for select
  using (
    exists (
      select 1 from public.pool_membro pm
      where pm.pool_id = pool_membro.pool_id and pm.utilizador_id = auth.uid()
    )
  );

create policy "pool_select_membros"
  on public.pool for select
  using (
    exists (
      select 1 from public.pool_membro pm
      where pm.pool_id = pool.id and pm.utilizador_id = auth.uid()
    )
  );

create policy "troca_select_membros"
  on public.troca_pool for select
  using (
    exists (
      select 1 from public.pool_membro pm
      where pm.pool_id = troca_pool.pool_id and pm.utilizador_id = auth.uid()
    )
  );

-- Colegas de pool podem ver o perfil uns dos outros (nome/localidade/avatar).
create policy "utilizadores_select_colegas_pool"
  on public.utilizadores for select
  using (
    exists (
      select 1
      from public.pool_membro a
      join public.pool_membro b on a.pool_id = b.pool_id
      where a.utilizador_id = auth.uid() and b.utilizador_id = utilizadores.id
    )
  );

-- Pedidos de procura: o próprio vê/insere; updates só via service_role.
create policy "psr_select_proprio"
  on public.pool_search_requests for select
  using (auth.uid() = utilizador_id);
create policy "psr_insert_proprio"
  on public.pool_search_requests for insert
  with check (auth.uid() = utilizador_id);

-- >>>>>>>>>> supabase/migrations/0006_fix_rls_recursion.sql <<<<<<<<<<

-- 0006 — Corrige recursão infinita nas policies de pool
--
-- As policies de 0005 consultavam pool_membro dentro da própria policy de
-- pool_membro (e pool/troca_pool/utilizadores também consultavam pool_membro),
-- o que o Postgres rejeita: "infinite recursion detected in policy".
--
-- Solução padrão Supabase: funções SECURITY DEFINER (ignoram RLS) para os
-- testes de pertença, usadas nas policies.

-- Helpers ------------------------------------------------------------------
create or replace function public.e_membro_do_pool(p_pool uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.pool_membro
    where pool_id = p_pool and utilizador_id = auth.uid()
  );
$$;

create or replace function public.partilha_pool_comigo(p_uid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.pool_membro a
    join public.pool_membro b on a.pool_id = b.pool_id
    where a.utilizador_id = auth.uid() and b.utilizador_id = p_uid
  );
$$;

grant execute on function public.e_membro_do_pool(uuid) to authenticated;
grant execute on function public.partilha_pool_comigo(uuid) to authenticated;

-- Substituir policies recursivas -------------------------------------------
drop policy if exists "pool_membro_select_proprio" on public.pool_membro;
create policy "pool_membro_select_proprio"
  on public.pool_membro for select
  using (public.e_membro_do_pool(pool_id));

drop policy if exists "pool_select_membros" on public.pool;
create policy "pool_select_membros"
  on public.pool for select
  using (public.e_membro_do_pool(id));

drop policy if exists "troca_select_membros" on public.troca_pool;
create policy "troca_select_membros"
  on public.troca_pool for select
  using (public.e_membro_do_pool(pool_id));

drop policy if exists "utilizadores_select_colegas_pool" on public.utilizadores;
create policy "utilizadores_select_colegas_pool"
  on public.utilizadores for select
  using (public.partilha_pool_comigo(id));

-- >>>>>>>>>> supabase/migrations/0007_pool_lifecycle.sql <<<<<<<<<<

-- 0007 — Ciclo de vida do pool (Fase 4): confirmações, sair, link WhatsApp,
-- timeout lazy + Realtime.

-- ---------------------------------------------------------------------------
-- confirmar_membro: o próprio confirma; pool passa a 'activa' quando 4 confirmam
-- ---------------------------------------------------------------------------
create or replace function public.confirmar_membro(p_pool uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_conf int;
begin
  update public.pool_membro
  set estado = 'confirmado', confirmado_at = now()
  where pool_id = p_pool and utilizador_id = v_uid and estado = 'convidado';
  if not found then return 'nao_alterado'; end if;

  select count(*) filter (where estado = 'confirmado')
  into v_conf
  from public.pool_membro where pool_id = p_pool;

  if v_conf >= 4 then
    update public.pool set estado = 'activa'
    where id = p_pool and estado = 'formando';
  end if;
  return 'ok';
end;
$$;
grant execute on function public.confirmar_membro(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- sair_pool: dissolve o pool e liberta todos os membros (MVP).
--   (o re-matching de substituto fica para uma fase futura)
-- ---------------------------------------------------------------------------
create or replace function public.sair_pool(p_pool uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_uid uuid := auth.uid();
begin
  if not exists (
    select 1 from public.pool_membro where pool_id = p_pool and utilizador_id = v_uid
  ) then
    return;
  end if;

  update public.pool set estado = 'cancelada'
  where id = p_pool and estado in ('formando','activa','a_aguardar_substituto');

  update public.utilizadores set estado = 'activo'
  where estado = 'em_pool'
    and id in (select utilizador_id from public.pool_membro where pool_id = p_pool);

  update public.pool_membro set estado = 'saiu'
  where pool_id = p_pool and utilizador_id = v_uid;
end;
$$;
grant execute on function public.sair_pool(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Link WhatsApp: submeter (validado) e limpar (gerar novo)
-- ---------------------------------------------------------------------------
create or replace function public.submeter_link_whatsapp(p_pool uuid, p_link text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare v_uid uuid := auth.uid();
begin
  if not exists (
    select 1 from public.pool_membro where pool_id = p_pool and utilizador_id = v_uid
  ) then
    return 'nao_membro';
  end if;
  if p_link !~ '^https://chat\.whatsapp\.com/[A-Za-z0-9]+' then
    return 'link_invalido';
  end if;
  update public.pool
  set whatsapp_link = p_link,
      whatsapp_link_expires_at = now() + interval '7 days'
  where id = p_pool;
  return 'ok';
end;
$$;
grant execute on function public.submeter_link_whatsapp(uuid, text) to authenticated;

create or replace function public.limpar_link_whatsapp(p_pool uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_uid uuid := auth.uid();
begin
  if not exists (
    select 1 from public.pool_membro where pool_id = p_pool and utilizador_id = v_uid
  ) then
    return;
  end if;
  update public.pool
  set whatsapp_link = null, whatsapp_link_expires_at = null
  where id = p_pool;
end;
$$;
grant execute on function public.limpar_link_whatsapp(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Timeout lazy: avaliado quando alguém abre o pool.
--   Se ainda 'formando' e passou a janela de 24h -> dissolve e liberta.
-- ---------------------------------------------------------------------------
create or replace function public.avaliar_expiracao_pool(p_pool uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_estado text; v_exp timestamptz;
begin
  select estado, expires_at into v_estado, v_exp from public.pool where id = p_pool;
  if v_estado = 'formando' and v_exp is not null and v_exp < now() then
    update public.pool set estado = 'cancelada' where id = p_pool;
    update public.utilizadores set estado = 'activo'
    where estado = 'em_pool'
      and id in (select utilizador_id from public.pool_membro where pool_id = p_pool);
  end if;
end;
$$;
grant execute on function public.avaliar_expiracao_pool(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Realtime: publicar alterações de pool e pool_membro
-- ---------------------------------------------------------------------------
do $$
begin
  begin
    alter publication supabase_realtime add table public.pool;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.pool_membro;
  exception when duplicate_object then null;
  end;
end $$;

-- >>>>>>>>>> supabase/migrations/0009_hardening.sql <<<<<<<<<<

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
