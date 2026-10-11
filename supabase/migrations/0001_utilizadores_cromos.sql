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
