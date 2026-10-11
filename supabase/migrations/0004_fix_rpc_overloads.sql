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
