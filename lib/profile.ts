import { createClient } from "@/lib/supabase/server";
import type { Utilizador } from "@/lib/types";

type PerfilRpc = {
  id: string;
  nome: string;
  email: string;
  telemovel: string | null;
  localidade: string | null;
  raio_km: number;
  estado: Utilizador["estado"];
  repetidos_cache: number[] | null;
  faltas_cache: number[] | null;
  registo_completo: boolean;
  tem_localizacao: boolean;
};

/**
 * Carrega o perfil do utilizador autenticado (ou null se não houver sessão).
 * Inclui `tem_localizacao` para a lógica de retoma do wizard.
 */
export async function getPerfilAtual(): Promise<Utilizador | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // RPC e não a tabela: email, telemóvel, caches e coordenadas não são
  // legíveis por colegas de pool (migration 0009).
  const { data, error } = await supabase.rpc("meu_perfil");
  if (error || !data) return null;

  const perfil = data as PerfilRpc;
  return {
    id: perfil.id,
    nome: perfil.nome,
    email: perfil.email,
    telemovel: perfil.telemovel,
    localidade: perfil.localidade,
    raio_km: perfil.raio_km,
    estado: perfil.estado,
    repetidos_cache: perfil.repetidos_cache ?? [],
    faltas_cache: perfil.faltas_cache ?? [],
    registo_completo: perfil.registo_completo,
    tem_localizacao: perfil.tem_localizacao,
  };
}

/**
 * Determina em que passo do registo o utilizador deve estar (retoma).
 * - sem localização  -> passo 2
 * - com localização mas registo não concluído -> passo 3
 * - registo concluído -> null (segue para dashboard)
 */
export function proximoPassoRegisto(
  perfil: Utilizador,
): "/registo/passo-2" | "/registo/passo-3" | null {
  if (!perfil.tem_localizacao) return "/registo/passo-2";
  if (!perfil.registo_completo) return "/registo/passo-3";
  return null;
}
