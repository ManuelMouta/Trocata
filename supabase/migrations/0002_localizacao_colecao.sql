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
