"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPerfilAtual } from "@/lib/profile";
import { correrMatching } from "@/lib/matching/run";
import { MATCHING } from "@/lib/matching/config";
import type {
  CandidatoInput,
  SolicitanteInput,
  PoolCandidato,
} from "@/lib/matching/types";

export interface PerfilResumo {
  nome: string;
  localidade: string | null;
  distKm: number;
}
export interface CromoResumo {
  id: number;
  numero: string;
  nome: string;
  equipa: string;
}
export interface ResultadoProcura {
  melhor: PoolCandidato;
  alternativas: PoolCandidato[];
  perfis: Record<string, PerfilResumo>;
  cromos: Record<string, CromoResumo>; // chave = ordem (string em JSON)
}

/** Valida pré-condições e cria um pedido de procura (§4.3.1, E004). */
export async function iniciarProcura(): Promise<{
  requestId?: string;
  error?: string;
  code?: string;
}> {
  const perfil = await getPerfilAtual();
  if (!perfil) return { error: "Sessão expirada" };

  const supabase = await createClient();

  if (perfil.estado === "em_pool")
    return { error: "Já estás num pool activo.", code: "EM_POOL" };

  const nRep = perfil.repetidos_cache.length;
  const nFal = perfil.faltas_cache.length;
  if (nRep + nFal < 5)
    return {
      error: "Precisas de registar pelo menos 5 cromos para procurar pools.",
      code: "E004",
    };
  if (nRep < 1 || nFal < 1)
    return {
      error: "Precisas de pelo menos 1 repetido e 1 cromo em falta.",
      code: "E004",
    };

  const { data: req, error } = await supabase
    .from("pool_search_requests")
    .insert({ utilizador_id: perfil.id, status: "pending" })
    .select("id")
    .single();
  if (error) return { error: "Não foi possível iniciar a procura." };
  return { requestId: req.id };
}

/** Corre o algoritmo (com escalonamento de raio) e grava o resultado. */
export async function executarProcura(requestId: string): Promise<{
  status: "completed" | "no_match" | "error";
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", error: "Sessão expirada" };

  const admin = createAdminClient();
  const { data: req } = await admin
    .from("pool_search_requests")
    .select("id, utilizador_id, status")
    .eq("id", requestId)
    .single();
  if (!req || req.utilizador_id !== user.id)
    return { status: "error", error: "Pedido inválido" };
  if (req.status === "completed") return { status: "completed" };
  if (req.status === "no_match") return { status: "no_match" };

  await admin
    .from("pool_search_requests")
    .update({ status: "processing" })
    .eq("id", requestId);

  const { data: perfArr } = await admin.rpc("perfil_matching", {
    p_uid: user.id,
  });
  const perf = perfArr?.[0];
  if (!perf || perf.lat == null) {
    await admin
      .from("pool_search_requests")
      .update({ status: "no_match" })
      .eq("id", requestId);
    return { status: "no_match" };
  }

  const solic: SolicitanteInput = {
    id: perf.id,
    nome: perf.nome,
    localidade: perf.localidade,
    lat: perf.lat,
    lng: perf.lng,
    raioKm: perf.raio_km,
    repetidos: perf.repetidos ?? [],
    faltas: perf.faltas ?? [],
  };

  // Escalonamento automático de raio até haver pool viável (§4.3.2).
  let candidatosUsados: CandidatoInput[] = [];
  let resultado = correrMatching(solic, []);
  for (const mult of MATCHING.escaladasRaioKm) {
    const raio = Math.min(MATCHING.maxRaioKm, Math.round(perf.raio_km * mult));
    const { data: cands } = await admin.rpc("candidatos_matching", {
      p_uid: user.id,
      p_lat: perf.lat,
      p_lng: perf.lng,
      p_raio_km: raio,
    });
    candidatosUsados = (cands ?? []).map(
      (c: {
        id: string;
        nome: string;
        localidade: string | null;
        lat: number;
        lng: number;
        dist_km: number;
        raio_km: number;
        repetidos: number[] | null;
        faltas: number[] | null;
        desatualizado: boolean;
      }) => ({
        id: c.id,
        nome: c.nome,
        localidade: c.localidade,
        lat: c.lat,
        lng: c.lng,
        distKm: c.dist_km,
        raioKm: c.raio_km,
        repetidos: c.repetidos ?? [],
        faltas: c.faltas ?? [],
        desatualizado: c.desatualizado,
      }),
    );
    resultado = correrMatching(solic, candidatosUsados);
    if (resultado.melhor) break;
  }

  if (!resultado.melhor) {
    await admin
      .from("pool_search_requests")
      .update({ status: "no_match" })
      .eq("id", requestId);
    return { status: "no_match" };
  }

  // Perfis para apresentação.
  const perfis: Record<string, PerfilResumo> = {
    [solic.id]: { nome: solic.nome, localidade: solic.localidade, distKm: 0 },
  };
  for (const c of candidatosUsados)
    perfis[c.id] = { nome: c.nome, localidade: c.localidade, distKm: c.distKm };

  // Cromos envolvidos nas trocas.
  const ordens = new Set<number>();
  for (const p of [resultado.melhor, ...resultado.alternativas])
    for (const t of p.trocas) ordens.add(t.ordem);

  const cromos: Record<string, CromoResumo> = {};
  if (ordens.size > 0) {
    const { data: info } = await admin
      .from("cromos")
      .select("id, ordem, numero, nome, equipa")
      .in("ordem", [...ordens]);
    for (const c of info ?? [])
      cromos[String(c.ordem)] = {
        id: c.id,
        numero: c.numero,
        nome: c.nome,
        equipa: c.equipa,
      };
  }

  const resultadoJSON: ResultadoProcura = {
    melhor: resultado.melhor,
    alternativas: resultado.alternativas,
    perfis,
    cromos,
  };

  await admin
    .from("pool_search_requests")
    .update({ status: "completed", resultado: resultadoJSON })
    .eq("id", requestId);

  return { status: "completed" };
}

/** Materializa o pool escolhido (best=0 ou alternativa) e reserva os membros. */
export async function aceitarResultado(
  requestId: string,
  indice = 0,
): Promise<{ poolId?: string; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada" };

  const admin = createAdminClient();
  const { data: req } = await admin
    .from("pool_search_requests")
    .select("id, utilizador_id, resultado, result_pool_id")
    .eq("id", requestId)
    .single();
  if (!req || req.utilizador_id !== user.id)
    return { error: "Pedido inválido" };
  if (req.result_pool_id) return { poolId: req.result_pool_id };

  const resultado = req.resultado as ResultadoProcura | null;
  if (!resultado) return { error: "Sem resultado para aceitar" };
  const pools = [resultado.melhor, ...(resultado.alternativas ?? [])];
  const escolhido: PoolCandidato | undefined = pools[indice] ?? resultado.melhor;
  if (!escolhido) return { error: "Sem pool para aceitar" };

  if (escolhido.membros.length !== 4 || !escolhido.membros.includes(user.id)) {
    return { error: "Não foi possível criar o grupo." };
  }

  const trocas = escolhido.trocas
    .filter((t) => resultado.cromos[String(t.ordem)])
    .map((t) => ({
      de: t.de,
      para: t.para,
      cromo_id: resultado.cromos[String(t.ordem)].id,
    }));

  const { data: poolId, error: rpcError } = await admin.rpc("materializar_pool", {
    p_request: requestId,
    p_solicitante: user.id,
    p_membros: escolhido.membros,
    p_trocas: trocas,
  });

  if (rpcError || !poolId) {
    if (rpcError?.message.includes("membro_em_pool")) {
      return {
        error: "Um dos membros entrou entretanto noutro pool. Procura de novo.",
      };
    }
    return { error: "Não foi possível criar o grupo." };
  }

  return { poolId };
}
