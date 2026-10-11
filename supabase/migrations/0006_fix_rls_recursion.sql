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
