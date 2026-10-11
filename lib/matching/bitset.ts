/**
 * Bitsets para cromos (índice 1..N via cromos.ordem).
 * match_par usa AND + popcount, tornando cada avaliação de par ~microssegundos.
 */

// Tabela de popcount de 8 bits (256 entradas).
const POPCOUNT8 = new Uint8Array(256);
for (let i = 0; i < 256; i++) {
  POPCOUNT8[i] = (i & 1) + POPCOUNT8[i >> 1];
}

/** Nº de palavras de 32 bits para cobrir ordens 1..maxOrdem. */
export function wordsFor(maxOrdem: number): number {
  return Math.ceil((maxOrdem + 1) / 32);
}

/** Constrói um bitset a partir de uma lista de ordens (1-based). */
export function toBitset(ordens: number[], words: number): Uint32Array {
  const bs = new Uint32Array(words);
  for (const o of ordens) {
    if (o < 0) continue;
    bs[o >>> 5] |= 1 << (o & 31);
  }
  return bs;
}

/** popcount(a & b) — nº de bits comuns entre dois bitsets. */
export function intersectionCount(a: Uint32Array, b: Uint32Array): number {
  const n = Math.min(a.length, b.length);
  let total = 0;
  for (let i = 0; i < n; i++) {
    const w = a[i] & b[i];
    // popcount de 32 bits via tabela de 8 bits
    total +=
      POPCOUNT8[w & 0xff] +
      POPCOUNT8[(w >>> 8) & 0xff] +
      POPCOUNT8[(w >>> 16) & 0xff] +
      POPCOUNT8[(w >>> 24) & 0xff];
  }
  return total;
}

/** Lista as ordens presentes em (a & b), 1-based. */
export function intersectionOrders(a: Uint32Array, b: Uint32Array): number[] {
  const n = Math.min(a.length, b.length);
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    let w = a[i] & b[i];
    while (w !== 0) {
      const bit = w & -w; // lowest set bit
      const idx = 31 - Math.clz32(bit);
      out.push(i * 32 + idx);
      w ^= bit;
    }
  }
  return out;
}
