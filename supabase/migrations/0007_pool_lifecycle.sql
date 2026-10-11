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
