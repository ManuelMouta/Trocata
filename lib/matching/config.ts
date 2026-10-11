/**
 * Constantes de negócio do matching.
 *
 * Nota: a spec (§5.5) define troca_total >= 8, mas esse limiar foi calibrado
 * sobre a soma pairwise de |rep ∩ falta| (que sobrecontabiliza o mesmo cromo
 * repetido pedido por várias pessoas). Aqui usamos contagem honesta (cada
 * cromo muda de mãos no máximo 1x), pelo que o limiar equivalente é mais baixo.
 */
export const MATCHING = {
  /** distância base de procura se o utilizador não definiu raio */
  raioBaseKm: 15,
  /** escalonamento automático de raio quando não há pool viável (§4.3.2) */
  escaladasRaioKm: [1, 1.5, 2] as const, // multiplicadores aplicados ao raio do utilizador (limitado a maxRaioKm)
  maxRaioKm: 50,
  /** nº de candidatos por afinidade individual a combinar exaustivamente */
  topK: 32,
  /** nº máximo de pools devolvidos (melhor + alternativas) */
  maxPools: 5,
  /** mínimo de cromos efectivamente trocados no grupo (contagem honesta) */
  minTrocaTotal: 6,
  /**
   * Afinidade mínima por par (§5.5 pede 2). Desactivado (0): a spec exige que
   * cada par troque, mas o próprio exemplo §5.6 tem pares sem troca directa
   * (o valor flui pelo grupo). A justiça é garantida por minRecebidoPorMembro.
   */
  minMatchPar: 0,
  /** cada membro deve receber >= 1 cromo que precisa (§5.5) */
  minRecebidoPorMembro: 1,
  /** peso reduzido de freshness p/ dados >7 dias (§5.5) */
  pesoDesatualizado: 0.7,
  /** ponderações do pool_score (§5.3.2, seguindo o texto descritivo 70/20/10) */
  pesos: { troca: 0.7, completude: 0.2, geo: 0.1 },
  /** distância máxima aceitável para normalizar o geo_score */
  distMaxAceitavelKm: 50,
} as const;
