import {
  intersectionCount,
  toBitset,
  wordsFor,
  intersectionOrders,
} from "./bitset";
import { distanciaMediaAoCentroide } from "./geo";
import { MATCHING } from "./config";
import type { CandidatoInput, Troca } from "./types";

/** Representação interna com bitsets pré-computados. */
export interface Membro {
  id: string;
  nome: string;
  localidade: string | null;
  lat: number;
  lng: number;
  distKm: number;
  raioKm: number;
  desatualizado: boolean;
  repBS: Uint32Array;
  faltaBS: Uint32Array;
  nFaltas: number;
}

export function prepararMembro(c: CandidatoInput, maxOrdem: number): Membro {
  const words = wordsFor(maxOrdem);
  return {
    id: c.id,
    nome: c.nome,
    localidade: c.localidade,
    lat: c.lat,
    lng: c.lng,
    distKm: c.distKm,
    raioKm: c.raioKm,
    desatualizado: !!c.desatualizado,
    repBS: toBitset(c.repetidos, words),
    faltaBS: toBitset(c.faltas, words),
    nFaltas: c.faltas.length,
  };
}

/**
 * Afinidade par-a-par (pairwise, §5.3.1) — usada para ordenar candidatos.
 * = cromos que A pode dar a B + que B pode dar a A (interseções de conjuntos).
 */
export function matchPar(a: Membro, b: Membro): number {
  return (
    intersectionCount(a.repBS, b.faltaBS) + intersectionCount(b.repBS, a.faltaBS)
  );
}

export interface AvaliacaoPool {
  trocas: Troca[];
  trocaTotal: number; // contagem honesta (cada cromo muda de mãos 1x)
  trocaScore: number; // ponderado por freshness (para o pool_score)
  completude: number; // 0..1
  geoScore: number; // 0..1
  distanciaMediaKm: number;
  recebePorMembro: Record<string, number>;
  minMatchPar: number; // menor afinidade pairwise entre pares (filtro §5.5)
  diversidadeSolicitante: number; // nº de dadores distintos ao solicitante
}

/**
 * Avalia um pool (contagem honesta): para cada ordem de cromo, o nº de trocas
 * é min(nº de quem tem repetido, nº de quem precisa). Assim o mesmo cromo
 * repetido não é "dado" a duas pessoas ao mesmo tempo.
 *
 * @param membros os 4 membros do pool (o primeiro é o solicitante)
 */
export function avaliarPool(membros: Membro[]): AvaliacaoPool {
  const trocas: Troca[] = [];
  const recebePorMembro: Record<string, number> = {};
  const dadoresAoSolicitante = new Set<string>();
  const solicitanteId = membros[0].id;
  for (const m of membros) recebePorMembro[m.id] = 0;

  let trocaScore = 0;

  // Ordems relevantes: união de todos os repetidos e faltas.
  const words = membros[0].repBS.length;
  const uniao = new Uint32Array(words);
  for (const m of membros) {
    for (let i = 0; i < words; i++) uniao[i] |= m.repBS[i] | m.faltaBS[i];
  }

  // Itera cada ordem presente e faz a atribuição por ordem.
  for (let w = 0; w < words; w++) {
    let bits = uniao[w];
    while (bits !== 0) {
      const low = bits & -bits;
      const ordem = w * 32 + (31 - Math.clz32(low));
      bits ^= low;

      const dadores = membros.filter((m) => testBit(m.repBS, ordem));
      const recetores = membros.filter((m) => testBit(m.faltaBS, ordem));
      if (dadores.length === 0 || recetores.length === 0) continue;

      const n = Math.min(dadores.length, recetores.length);

      // Dadores por id (determinístico); receptores por FAIRNESS: quem recebeu
      // menos até agora ganha o cromo escasso (maximiza cobertura do grupo).
      const dOrd = [...dadores].sort((a, b) => (a.id < b.id ? -1 : 1));
      const rOrd = [...recetores].sort((a, b) => {
        const dr = recebePorMembro[a.id] - recebePorMembro[b.id];
        return dr !== 0 ? dr : a.id < b.id ? -1 : 1;
      });

      for (let t = 0; t < n; t++) {
        const dador = dOrd[t];
        const recetor = rOrd[t];
        if (dador.id === recetor.id) continue; // nunca acontece (rep⊥falta)
        trocas.push({ de: dador.id, para: recetor.id, ordem });
        recebePorMembro[recetor.id]++;
        if (recetor.id === solicitanteId) dadoresAoSolicitante.add(dador.id);
        trocaScore += dador.desatualizado ? MATCHING.pesoDesatualizado : 1;
      }
    }
  }

  const trocaTotal = trocas.length;

  // Completude: média da fracção de faltas cobertas por membro.
  const completude =
    membros.reduce((s, m) => {
      if (m.nFaltas === 0) return s + 0;
      return s + Math.min(1, recebePorMembro[m.id] / m.nFaltas);
    }, 0) / membros.length;

  // Geo score.
  const distanciaMediaKm = distanciaMediaAoCentroide(
    membros.map((m) => ({ lat: m.lat, lng: m.lng })),
  );
  const geoScore = Math.max(
    0,
    Math.min(1, 1 - distanciaMediaKm / MATCHING.distMaxAceitavelKm),
  );

  // Menor afinidade pairwise entre todos os pares (filtro de viabilidade).
  let minMP = Infinity;
  for (let i = 0; i < membros.length; i++)
    for (let j = i + 1; j < membros.length; j++)
      minMP = Math.min(minMP, matchPar(membros[i], membros[j]));

  return {
    trocas,
    trocaTotal,
    trocaScore,
    completude,
    geoScore,
    distanciaMediaKm,
    recebePorMembro,
    minMatchPar: minMP === Infinity ? 0 : minMP,
    diversidadeSolicitante: dadoresAoSolicitante.size,
  };
}

/** Lista os cromos (ordens) que `de` dá a `para` num pool avaliado. */
export function cromosEntre(
  trocas: Troca[],
  de: string,
  para: string,
): number[] {
  return trocas.filter((t) => t.de === de && t.para === para).map((t) => t.ordem);
}

function testBit(bs: Uint32Array, ordem: number): boolean {
  return (bs[ordem >>> 5] & (1 << (ordem & 31))) !== 0;
}

export { intersectionOrders };
