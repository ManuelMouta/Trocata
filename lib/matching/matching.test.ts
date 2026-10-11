import { describe, it, expect } from "vitest";
import { toBitset, intersectionCount, intersectionOrders, wordsFor } from "./bitset";
import { prepararMembro, matchPar, avaliarPool } from "./score";
import { correrMatching } from "./run";
import type { CandidatoInput } from "./types";

const W = wordsFor(700);

describe("bitset", () => {
  it("conta interseções", () => {
    const a = toBitset([5, 12, 23, 45], W);
    const b = toBitset([5, 12], W);
    expect(intersectionCount(a, b)).toBe(2);
  });
  it("lista as ordens em interseção", () => {
    const a = toBitset([7, 15, 30], W);
    const b = toBitset([15, 30, 99], W);
    expect(intersectionOrders(a, b).sort((x, y) => x - y)).toEqual([15, 30]);
  });
});

// Exemplo da spec §5.6 (dados; a spec é inconsistente nos totais — seguimos
// contagem honesta que reproduz o INTENTO: A recebe exactamente 7, 15, 30).
const LISBOA = { lat: 38.72, lng: -9.14 };
function mk(
  id: string,
  repetidos: number[],
  faltas: number[],
  extra?: Partial<CandidatoInput>,
): CandidatoInput {
  return {
    id,
    nome: id,
    localidade: "Lisboa",
    lat: LISBOA.lat + (extra?.lat ?? 0),
    lng: LISBOA.lng + (extra?.lng ?? 0),
    distKm: extra?.distKm ?? 2,
    raioKm: extra?.raioKm ?? 15,
    repetidos,
    faltas,
  };
}

const A = mk("A", [5, 12, 23, 45], [7, 15, 30], { distKm: 0 });
const B = mk("B", [7, 15, 40], [5, 12], { distKm: 3 });
const C = mk("C", [30, 55], [23, 45], { distKm: 4 });
const D = mk("D", [15, 30], [12, 45], { distKm: 1 });

describe("matchPar (pairwise §5.3.1)", () => {
  it("A↔B = 4", () => {
    const a = prepararMembro(A, 700);
    const b = prepararMembro(B, 700);
    expect(matchPar(a, b)).toBe(4); // A dá {5,12}=2 + B dá {7,15}=2
  });
});

describe("avaliarPool (contagem honesta)", () => {
  const membros = [A, B, C, D].map((c) => prepararMembro(c, 700));
  const av = avaliarPool(membros);

  it("A recebe exactamente os cromos 7, 15 e 30 (intento da spec §5.6)", () => {
    const paraA = av.trocas
      .filter((t) => t.para === "A")
      .map((t) => t.ordem)
      .sort((x, y) => x - y);
    expect(paraA).toEqual([7, 15, 30]);
    expect(av.recebePorMembro["A"]).toBe(3);
  });

  it("completude de A = 100% (3 de 3 faltas)", () => {
    // completude é a média do grupo; A sozinho cobre 3/3
    expect(av.recebePorMembro["A"] / 3).toBe(1);
  });

  it("cada cromo repetido muda de mãos no máximo uma vez", () => {
    // o cromo 12 (só A o tem repetido) é dado a UMA pessoa, não a B e D
    const deram12 = av.trocas.filter((t) => t.ordem === 12);
    expect(deram12.length).toBe(1);
  });

  it("troca total honesta = 7", () => {
    expect(av.trocaTotal).toBe(7);
  });

  it("geoScore alto (todos perto)", () => {
    expect(av.geoScore).toBeGreaterThan(0.9);
  });
});

describe("correrMatching", () => {
  it("forma o pool A+B+C+D e ignora candidatos sem afinidade", () => {
    const ruido = mk("Z", [600, 601], [602, 603], { distKm: 5 }); // nada em comum
    const res = correrMatching(A, [B, C, D, ruido], { maxOrdem: 700 });
    expect(res.melhor).not.toBeNull();
    expect(res.melhor!.membros.sort()).toEqual(["A", "B", "C", "D"]);
    expect(res.melhor!.membros).not.toContain("Z");
  });

  it("devolve vazio quando há menos de 3 candidatos com afinidade", () => {
    const res = correrMatching(A, [B], { maxOrdem: 700 });
    expect(res.melhor).toBeNull();
  });

  it("respeita o raio (candidato demasiado longe é excluído)", () => {
    const longe = mk("F", [7, 15, 30], [5, 12, 23], { distKm: 999, raioKm: 15 });
    // F tem óptima afinidade mas está a 999km -> nenhum pool viável só com ele
    const res = correrMatching(A, [longe], { maxOrdem: 700 });
    expect(res.melhor).toBeNull();
  });
});
