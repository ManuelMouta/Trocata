import { createClient as createSbClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase com service-role — SÓ para uso no servidor (Server Actions).
 * Ignora RLS, por isso nunca deve ser importado em código de cliente.
 * Usado pelo matching para ler candidatos e escrever pools de vários utilizadores.
 */
export function createAdminClient() {
  if (typeof window !== "undefined") {
    throw new Error("createAdminClient só pode ser usado no servidor.");
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Faltam NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  return createSbClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
