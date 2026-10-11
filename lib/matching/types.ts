/** Tipos do algoritmo de matching (Fase 3). */

export interface CandidatoInput {
  id: string;
  nome: string;
  localidade: string | null;
  lat: number;
  lng: number;
  /** distância (km) ao solicitante, já calculada pela query geográfica */
  distKm: number;
  raioKm: number;
  repetidos: number[]; // ordens de cromos com quantidade >= 2
  faltas: number[]; // ordens de cromos em falta
  /** true se a colecção não é actualizada há >7 dias (peso reduzido de freshness) */
  desatualizado?: boolean;
}

/** O solicitante (mesmos campos, distKm=0). */
export type SolicitanteInput = Omit<CandidatoInput, "distKm"> & {
  distKm?: number;
};

/** Uma troca concreta dentro do pool: `de` dá o cromo `ordem` a `para`. */
export interface Troca {
  de: string;
  para: string;
  ordem: number;
}

export interface PoolCandidato {
  /** ids dos 4 membros (inclui o solicitante) */
  membros: string[];
  score: number;
  trocaTotal: number;
  completude: number;
  geoScore: number;
  distanciaMediaKm: number;
  trocas: Troca[];
  /** nº de cromos que cada membro recebe (por id) */
  recebePorMembro: Record<string, number>;
}

export interface ResultadoMatching {
  melhor: PoolCandidato | null;
  alternativas: PoolCandidato[];
  /** nº de candidatos considerados após filtro geográfico */
  candidatosConsiderados: number;
}

export interface OpcoesMatching {
  /** top-K candidatos por afinidade individual a combinar exaustivamente */
  topK?: number;
  /** nº máximo de pools a devolver (melhor + alternativas) */
  maxPools?: number;
  maxOrdem?: number;
}
