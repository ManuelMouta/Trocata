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
