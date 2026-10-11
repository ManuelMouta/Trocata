"use server";

import { createClient } from "@/lib/supabase/server";

/** Actualiza apenas o raio de procura (RLS permite self-update). */
export async function atualizarRaio(raioKm: number): Promise<string | null> {
  if (![5, 10, 15, 20, 30, 50].includes(raioKm)) return "Raio inválido";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Sessão expirada";

  const { error } = await supabase
    .from("utilizadores")
    .update({ raio_km: raioKm })
    .eq("id", user.id);
  return error ? "Não foi possível atualizar o raio." : null;
}
