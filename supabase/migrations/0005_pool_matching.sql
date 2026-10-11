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
