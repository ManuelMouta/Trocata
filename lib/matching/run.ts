import { MATCHING } from "./config";
import {
  prepararMembro,
  matchPar,
  avaliarPool,
  type Membro,
  type AvaliacaoPool,
} from "./score";
import type {
  CandidatoInput,
  SolicitanteInput,
  PoolCandidato,
  ResultadoMatching,
  OpcoesMatching,
} from "./types";

function toPoolCandidato(membros: Membro[], a: AvaliacaoPool): PoolCandidato {
  // pool_score é normalizado à posteriori (precisa do máximo do conjunto);
  // aqui guardamos as componentes cruas.
  return {
    membros: membros.map((m) => m.id),
    score: 0,
    trocaTotal: a.trocaTotal,
    completude: a.completude,
    geoScore: a.geoScore,
    distanciaMediaKm: a.distanciaMediaKm,
    trocas: a.trocas,
    recebePorMembro: a.recebePorMembro,
  };
}

/**
 * Executa o matching para um solicitante sobre uma lista de candidatos já
 * filtrados geograficamente. Ver desenho no plano/§5:
 *  1. afinidade individual O(N) -> top-K
 *  2. combinações C(K,3) pontuadas com a fórmula completa
 *  3. filtros de negócio + normalização + ranking
 */
export function correrMatching(
  solicitante: SolicitanteInput,
  candidatos: CandidatoInput[],
  opts: OpcoesMatching = {},
): ResultadoMatching {
  const topK = opts.topK ?? MATCHING.topK;
  const maxPools = opts.maxPools ?? MATCHING.maxPools;

  // maxOrdem: maior ordem presente em qualquer colecção (dimensiona bitsets).
  let maxOrdem = opts.maxOrdem ?? 0;
  if (!opts.maxOrdem) {
    for (const c of [solicitante, ...candidatos])
      for (const o of [...c.repetidos, ...c.faltas])
        if (o > maxOrdem) maxOrdem = o;
  }

  const U = prepararMembro({ ...solicitante, distKm: 0 }, maxOrdem);
  const cand = candidatos.map((c) => prepararMembro(c, maxOrdem));

  // 1. Afinidade individual com U -> ordenar -> top-K
  const comAfinidade = cand
    .map((m) => ({ m, af: matchPar(U, m) }))
    .filter((x) => x.af > 0) // sem qualquer troca com U é inútil
    .sort((a, b) => b.af - a.af)
    .slice(0, topK)
    .map((x) => x.m);

  const candidatosConsiderados = candidatos.length;

  if (comAfinidade.length < 3) {
    return { melhor: null, alternativas: [], candidatosConsiderados };
  }

  // 2. Combinações C(K,3) para completar o pool com U
  type Avaliado = { membros: Membro[]; a: AvaliacaoPool };
  const avaliados: Avaliado[] = [];
  const K = comAfinidade.length;
  for (let i = 0; i < K; i++) {
    for (let j = i + 1; j < K; j++) {
      for (let k = j + 1; k < K; k++) {
        const membros = [U, comAfinidade[i], comAfinidade[j], comAfinidade[k]];
        const a = avaliarPool(membros);

        // 3a. Filtros de viabilidade (§5.5)
        if (a.trocaTotal < MATCHING.minTrocaTotal) continue;
        if (a.minMatchPar < MATCHING.minMatchPar) continue;
        // cada membro recebe >= 1 cromo que precisa (ignora quem não tem faltas)
        const todosRecebem = membros.every(
          (m) =>
            m.nFaltas === 0 ||
            a.recebePorMembro[m.id] >= MATCHING.minRecebidoPorMembro,
        );
        if (!todosRecebem) continue;
        // raio respeitado: cada candidato dentro do próprio alcance conjunto
        const raioOk = membros
          .slice(1)
          .every((m) => m.distKm <= Math.max(solicitante.raioKm, m.raioKm));
        if (!raioOk) continue;

        avaliados.push({ membros, a });
      }
    }
  }

  if (avaliados.length === 0) {
    return { melhor: null, alternativas: [], candidatosConsiderados };
  }

  // 3b. Normalização + pool_score
  const maxTroca = Math.max(...avaliados.map((x) => x.a.trocaScore)) || 1;
  const scored = avaliados.map((x) => {
    const normTroca = x.a.trocaScore / maxTroca;
    const score =
      MATCHING.pesos.troca * normTroca +
      MATCHING.pesos.completude * x.a.completude +
      MATCHING.pesos.geo * x.a.geoScore;
    return { ...x, score };
  });

  // Ordena por score; desempate por diversidade (dadores distintos ao U) e trocas.
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.a.diversidadeSolicitante !== a.a.diversidadeSolicitante)
      return b.a.diversidadeSolicitante - a.a.diversidadeSolicitante;
    return b.a.trocaTotal - a.a.trocaTotal;
  });

  // Evita alternativas com exactamente o mesmo conjunto de membros.
  const vistos = new Set<string>();
  const pools: PoolCandidato[] = [];
  for (const s of scored) {
    const chave = [...s.membros.map((m) => m.id)].sort().join("|");
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    const pc = toPoolCandidato(s.membros, s.a);
    pc.score = s.score;
    pools.push(pc);
    if (pools.length >= maxPools) break;
  }

  return {
    melhor: pools[0] ?? null,
    alternativas: pools.slice(1),
    candidatosConsiderados,
  };
}
