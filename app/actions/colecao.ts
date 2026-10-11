"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Guarda (upsert) uma entrada da colecção do utilizador — auto-save do passo 3
 * e da gestão de colecção. Devolve erro em string (ou null em sucesso).
 */
export async function guardarCromo(
  cromoId: number,
  quantidade: number,
  precisa: boolean,
): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Sessão expirada";

  const { error } = await supabase.rpc("guardar_cromo", {
    p_cromo_id: cromoId,
    p_quantidade: Math.max(0, Math.trunc(quantidade)),
    p_precisa: precisa,
  });
  return error ? "Não foi possível guardar." : null;
}

/**
 * Aplica o mesmo estado (quantidade + precisa) a vários cromos de uma vez
 * (selecção múltipla / adicionar em massa).
 */
export async function guardarCromosMassa(
  cromoIds: number[],
  quantidade: number,
  precisa: boolean,
): Promise<string | null> {
  if (cromoIds.length === 0) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Sessão expirada";

  const { error } = await supabase.rpc("guardar_cromos_massa", {
    p_cromo_ids: cromoIds,
    p_quantidade: Math.max(0, Math.trunc(quantidade)),
    p_precisa: precisa,
  });
  return error ? "Não foi possível guardar." : null;
}

/** Marca o registo como concluído (regra dos ≥5 cromos aplicada no RPC). */
export async function completarRegisto(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Sessão expirada";

  const { error } = await supabase.rpc("completar_registo");
  return error ? "Não foi possível concluir o registo." : null;
}
