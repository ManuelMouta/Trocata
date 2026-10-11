"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Check,
  ChevronDown,
  Download,
  Network,
  Upload,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { aceitarResultado, type ResultadoProcura } from "@/app/actions/pools";

interface Props {
  requestId: string;
  solicitanteId: string;
  resultado: ResultadoProcura;
}

/** Posições dos 4 nós do diagrama (losango): topo = solicitante. */
const NODE_POS = [
  "left-1/2 top-0 -translate-x-1/2",
  "right-0 top-1/2 -translate-y-1/2 translate-x-0",
  "bottom-0 left-1/2 -translate-x-1/2",
  "left-0 top-1/2 -translate-y-1/2",
] as const;

export function ResultadoView({ requestId, solicitanteId, resultado }: Props) {
  const router = useRouter();
  const [indice, setIndice] = useState(0);
  const [aceitar, setAceitar] = useState(false);

  const pools = useMemo(
    () => [resultado.melhor, ...(resultado.alternativas ?? [])],
    [resultado],
  );
  const pool = pools[indice];
  const outros = pool.membros.filter((id) => id !== solicitanteId);
  const ordemNos = [solicitanteId, ...outros];

  const nomeCromo = (ordem: number) =>
    resultado.cromos[String(ordem)]?.nome ?? `Cromo ${ordem}`;
  const numeroCromo = (ordem: number) =>
    resultado.cromos[String(ordem)]?.numero ?? String(ordem);

  const daParaTi = (id: string) =>
    pool.trocas.filter((t) => t.de === id && t.para === solicitanteId);
  const tuDasA = (id: string) =>
    pool.trocas.filter((t) => t.de === solicitanteId && t.para === id);

  const recebes = pool.recebePorMembro[solicitanteId] ?? 0;
  const das = pool.trocas.filter((t) => t.de === solicitanteId).length;
  const score = Math.round(Math.min(1, pool.score) * 100);

  const viab =
    pool.distanciaMediaKm < 5
      ? { chip: "🟢 Encontro local", texto: "Excelente — todos na mesma zona" }
      : pool.distanciaMediaKm < 15
        ? { chip: "🟡 Zona alargada", texto: `Boa — deslocação média de ${pool.distanciaMediaKm.toFixed(1)} km` }
        : { chip: "🔴 Disperso", texto: "Disperso — considera ajustar localização" };

  async function confirmar() {
    setAceitar(true);
    const res = await aceitarResultado(requestId, indice);
    if (res.poolId) router.replace(`/pool/${res.poolId}`);
    else {
      setAceitar(false);
      alert(res.error ?? "Não foi possível aceitar o pool");
    }
  }

  function rejeitar() {
    if (indice < pools.length - 1) setIndice((i) => i + 1);
    else router.replace(`/procurar/sem-resultados?req=${requestId}`);
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Banner de sucesso — gradiente festivo com formas WC26 */}
      <div className="bg-gradient-festa relative flex animate-pulse-soft items-center justify-center gap-4 overflow-hidden rounded-card p-6 text-white shadow-md">
        <span className="animate-wiggle text-3xl">🎉</span>
        <h1 className="titulo-desportivo relative z-10 text-center text-xl">
          Encontrámos o grupo perfeito para ti!
        </h1>
        <div className="shape-quarter pointer-events-none absolute -left-2 -top-2 size-12 bg-wc-yellow/40" aria-hidden />
        <div className="pointer-events-none absolute -bottom-3 right-8 size-8 rotate-12 bg-white/15" aria-hidden />
      </div>
      {pools.length > 1 && (
        <p className="-mt-4 text-center text-sm text-muted-foreground">
          Opção {indice + 1} de {pools.length}
        </p>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Coluna esquerda: contexto + estatísticas */}
        <div className="flex flex-col gap-6 lg:col-span-1">
          {/* Card do Pool */}
          <div className="rounded-card border border-border bg-card p-6 shadow-card">
            <div className="mb-2 flex items-center gap-3">
              <Network className="size-8 text-primary" />
              <h2 className="font-display text-2xl font-bold">
                Pool #{requestId.slice(0, 5).toUpperCase()}
              </h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Score de otimização do match: {score}%
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded bg-primary-600 px-2 py-1 text-xs font-semibold uppercase tracking-wider text-white">
                {viab.chip}
              </span>
              <span className="rounded bg-muted px-2 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Grupo de 4
              </span>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">{viab.texto}</p>
          </div>

          {/* Estatísticas do Pool */}
          <div className="rounded-card border border-border bg-card p-6 shadow-card">
            <h3 className="mb-4 flex items-center gap-2 text-xl font-semibold">
              <BarChart3 className="size-5 text-muted-foreground" />
              Estatísticas do Pool
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-button border border-border bg-surface-low p-3">
                <span className="font-semibold">Total de trocas</span>
                <span className="text-2xl font-bold text-primary-700">
                  {pool.trocaTotal}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col items-center justify-center rounded-button border border-border bg-[#b6d4fe] p-4 text-[#2a486b]">
                  <Download className="mb-1 size-5" />
                  <span className="text-center text-sm">Vais receber</span>
                  <span className="mt-1 text-2xl font-bold">{recebes}</span>
                </div>
                <div className="flex flex-col items-center justify-center rounded-button border border-border bg-[#c84761] p-4 text-white">
                  <Upload className="mb-1 size-5" />
                  <span className="text-center text-sm">Vais dar</span>
                  <span className="mt-1 text-2xl font-bold">{das}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Coluna direita: diagrama do match */}
        <div className="lg:col-span-2">
          <div className="relative rounded-card border border-border bg-card p-8 shadow-card">
            <h3 className="mb-4 flex items-center gap-2 text-xl font-semibold">
              <Users className="size-5 text-muted-foreground" />
              Resumo do Match
            </h3>
            <div className="relative mx-auto aspect-square w-full max-w-sm py-4">
              {/* Losango + linhas cruzadas */}
              <svg
                className="absolute inset-0 h-full w-full"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                aria-hidden
              >
                <path d="M 50,8 L 92,50 L 50,92 L 8,50 Z" fill="none" stroke="#00A651" strokeDasharray="2,2" strokeWidth="0.6" className="opacity-40" />
                <path d="M 50,8 L 50,92" fill="none" stroke="#00A651" strokeDasharray="2,2" strokeWidth="0.6" className="opacity-40" />
                <path d="M 8,50 L 92,50" fill="none" stroke="#00A651" strokeDasharray="2,2" strokeWidth="0.6" className="opacity-40" />
              </svg>
              {/* Nós */}
              {ordemNos.map((id, i) => {
                const p = resultado.perfis[id];
                const eu = id === solicitanteId;
                const paraTi = daParaTi(id).length;
                return (
                  <div
                    key={id}
                    className={cn("absolute z-10 flex flex-col items-center", NODE_POS[i])}
                  >
                    <div
                      className={cn(
                        "flex items-center justify-center overflow-hidden rounded-full bg-card shadow-md",
                        eu
                          ? "size-16 border-4 border-primary"
                          : "size-14 border-2 border-border",
                      )}
                    >
                      <Avatar name={p?.nome ?? "?"} size={eu ? "lg" : "md"} className="h-full w-full rounded-none" />
                    </div>
                    <div className="mt-2 rounded-button border border-white/50 bg-white/70 px-3 py-1 text-center shadow-sm backdrop-blur">
                      <span
                        className={cn(
                          "block text-xs font-semibold uppercase tracking-wider",
                          eu && "text-primary-700",
                        )}
                      >
                        {eu ? `Tu (${p?.localidade ?? "—"})` : p?.nome}
                      </span>
                      {!eu && (
                        <span className="block text-[10px] text-muted-foreground">
                          {p?.distKm.toFixed(1)}km • {paraTi} p/ ti
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Detalhes por pessoa (accordion) */}
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Detalhes das trocas</h2>
        {outros.map((id) => {
          const p = resultado.perfis[id];
          const recebe = daParaTi(id);
          const das2 = tuDasA(id);
          return (
            <details key={id} className="group rounded-card border border-border bg-card shadow-card">
              <summary className="flex cursor-pointer items-center justify-between p-3 text-sm font-medium">
                <span className="flex items-center gap-2">
                  <Avatar name={p?.nome ?? "?"} size="sm" />
                  {p?.nome}
                </span>
                <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
              </summary>
              <div className="space-y-3 border-t border-border p-3 text-sm">
                <div>
                  <p className="mb-1 flex items-center gap-1 font-medium text-primary-700">
                    <ArrowLeft className="size-4" /> {p?.nome} vai dar-te
                  </p>
                  {recebe.length ? (
                    <ul className="space-y-0.5 text-muted-foreground">
                      {recebe.map((t, i) => (
                        <li key={i}>
                          #{numeroCromo(t.ordem)} — {nomeCromo(t.ordem)}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-muted-foreground">Nada directamente.</p>
                  )}
                </div>
                <div>
                  <p className="mb-1 flex items-center gap-1 font-medium">
                    <ArrowRight className="size-4" /> Tu vais dar a {p?.nome}
                  </p>
                  {das2.length ? (
                    <ul className="space-y-0.5 text-muted-foreground">
                      {das2.map((t, i) => (
                        <li key={i}>
                          #{numeroCromo(t.ordem)} — {nomeCromo(t.ordem)}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-muted-foreground">Nada directamente.</p>
                  )}
                </div>
              </div>
            </details>
          );
        })}
      </div>

      {/* Barra de acções (Stitch: reject outline + accept verde grande) */}
      <div className="flex flex-col items-stretch justify-end gap-4 border-t border-border pt-6 md:flex-row md:items-center">
        <Button variant="outline" size="lg" onClick={rejeitar} disabled={aceitar}>
          <X /> {indice < pools.length - 1 ? "Ver outra opção" : "Rejeitar e procurar outro"}
        </Button>
        <button
          type="button"
          onClick={confirmar}
          disabled={aceitar}
          className="flex animate-pulse-soft items-center justify-center gap-2 rounded-card bg-primary px-8 py-4 text-lg font-semibold text-primary-foreground shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl disabled:pointer-events-none disabled:opacity-60"
        >
          <Check className="size-5" />
          {aceitar ? "A entrar no Pool..." : "Aceitar e entrar no Pool"}
        </button>
      </div>
    </div>
  );
}
