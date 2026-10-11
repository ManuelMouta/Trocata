"use server";

import { createClient } from "@/lib/supabase/server";

async function rpc<T = unknown>(
  fn: string,
  args: Record<string, unknown>,
): Promise<{ data?: T; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada" };
  const { data, error } = await supabase.rpc(fn, args);
  return error ? { error: "Não foi possível atualizar o grupo." } : { data: data as T };
}

/** Confirma a participação do próprio no pool. */
export async function confirmarMembro(poolId: string) {
  return rpc<string>("confirmar_membro", { p_pool: poolId });
}

/** Sai do pool (dissolve-o e liberta os membros). */
export async function sairPool(poolId: string) {
  return rpc("sair_pool", { p_pool: poolId });
}

/** Submete o link de convite do grupo de WhatsApp (validado no servidor). */
export async function submeterLinkWhatsapp(poolId: string, link: string) {
  return rpc<string>("submeter_link_whatsapp", {
    p_pool: poolId,
    p_link: link.trim(),
  });
}

/** Limpa o link (para gerar/colar um novo quando expira). */
export async function limparLinkWhatsapp(poolId: string) {
  return rpc("limpar_link_whatsapp", { p_pool: poolId });
}
