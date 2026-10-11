"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, SlidersHorizontal, CheckSquare, X, AlertTriangle, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CromoCard, estadoDe, acentoDe } from "@/components/features/cromos/cromo-card";
import { CromoEditor } from "@/components/features/cromos/cromo-editor";
import { guardarCromo, guardarCromosMassa } from "@/app/actions/colecao";
import { cn } from "@/lib/utils";
import type { Cromo, TipoCromo } from "@/lib/types";

interface Entrada {
  quantidade: number;
  precisa: boolean;
}
type Tab = "todos" | "repetidos" | "faltas";

/** Renderizar 680 cards de uma vez torna a página gigante (~46 000px) e lenta. */
const PAGINA = 40;

interface Props {
  cromos: Cromo[];
  inicial: Record<number, Entrada>;
  equipas: string[];
  emPool: boolean;
}

export function ColecaoManager({ cromos, inicial, equipas, emPool }: Props) {
  const [mapa, setMapa] = useState<Record<number, Entrada>>(inicial);
  const [tab, setTab] = useState<Tab>("todos");
  const [busca, setBusca] = useState("");
  const [equipa, setEquipa] = useState("");
  const [tipo, setTipo] = useState<"" | TipoCromo>("");
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [mostrarSelecoes, setMostrarSelecoes] = useState(false);
  const [limite, setLimite] = useState(PAGINA);

  const [sel, setSel] = useState<Cromo | null>(null);
  const [saving, setSaving] = useState(false);

  // modo de selecção múltipla
  const [multi, setMulti] = useState(false);
  const [selecionados, setSelecionados] = useState<Set<number>>(new Set());
  const [savingMassa, setSavingMassa] = useState(false);

  const ent = (id: number): Entrada => mapa[id] ?? { quantidade: 0, precisa: false };

  const visiveis = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return cromos.filter((c) => {
      if (equipa && c.equipa !== equipa) return false;
      if (tipo && c.tipo !== tipo) return false;
      if (q && !`${c.numero} ${c.nome} ${c.equipa}`.toLowerCase().includes(q))
        return false;
      if (tab !== "todos") {
        const e = estadoDe(ent(c.id).quantidade, ent(c.id).precisa);
        if (tab === "repetidos" && e !== "repetido") return false;
        if (tab === "faltas" && e !== "falta") return false;
      }
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cromos, busca, equipa, tipo, tab, mapa]);

  // Reinicia a paginação sempre que a pesquisa/filtro/tab muda.
  useEffect(() => {
    setLimite(PAGINA);
  }, [busca, equipa, tipo, tab]);

  const paginados = visiveis.slice(0, limite);
  const temMais = visiveis.length > limite;

  // Secções por seleção (ordem do álbum preservada — visíveis já vêm por `ordem`).
  const seccoes = useMemo(() => {
    const out: { equipa: string; cromos: Cromo[] }[] = [];
    for (const c of paginados) {
      const ultima = out[out.length - 1];
      if (ultima && ultima.equipa === c.equipa) ultima.cromos.push(c);
      else out.push({ equipa: c.equipa, cromos: [c] });
    }
    return out;
  }, [paginados]);

  // Progresso por seleção (sobre o álbum todo, não só o filtro actual).
  const progresso = useMemo(() => {
    const m = new Map<string, { tem: number; total: number }>();
    for (const c of cromos) {
      const p = m.get(c.equipa) ?? { tem: 0, total: 0 };
      p.total++;
      if ((mapa[c.id]?.quantidade ?? 0) >= 1) p.tem++;
      m.set(c.equipa, p);
    }
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cromos, mapa]);

  async function onSave(quantidade: number, precisa: boolean) {
    if (!sel) return;
    setSaving(true);
    const anterior = mapa[sel.id];
    setMapa((m) => ({ ...m, [sel.id]: { quantidade, precisa } }));
    const err = await guardarCromo(sel.id, quantidade, precisa);
    setSaving(false);
    if (err) setMapa((m) => ({ ...m, [sel.id]: anterior ?? { quantidade: 0, precisa: false } }));
    else setSel(null);
  }

  function toggleSel(id: number) {
    setSelecionados((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  async function aplicarMassa(quantidade: number, precisa: boolean) {
    const ids = [...selecionados];
    if (ids.length === 0) return;
    setSavingMassa(true);
    setMapa((m) => {
      const n = { ...m };
      for (const id of ids) n[id] = { quantidade, precisa };
      return n;
    });
    await guardarCromosMassa(ids, quantidade, precisa);
    setSavingMassa(false);
    setSelecionados(new Set());
    setMulti(false);
  }

  const tabs: { v: Tab; label: string }[] = [
    { v: "todos", label: "Todos os cromos" },
    { v: "repetidos", label: "Repetidos" },
    { v: "faltas", label: "Em falta" },
  ];

  return (
    <div className="space-y-4">
      {emPool && (
        <div className="flex items-start gap-2 rounded-card border border-gold-300 bg-gold-50 p-3 text-sm text-gold-800">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <p>
            Alterar cromos pode afectar futuros matches. O teu pool actual mantém-se.
          </p>
        </div>
      )}

      {/* Controlos (Stitch: card com tabs segmentadas + pesquisa + filtros) */}
      <div className="flex flex-col items-stretch justify-between gap-4 rounded-card border border-border bg-surface-low p-4 shadow-card md:flex-row md:items-center">
        {/* Tabs segmentadas */}
        <div className="flex w-full gap-1 self-start overflow-x-auto rounded-button bg-surface-high p-1 md:w-auto md:self-auto">
          {tabs.map((t) => (
            <button
              key={t.v}
              type="button"
              onClick={() => setTab(t.v)}
              className={cn(
                "whitespace-nowrap rounded-input px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-colors",
                tab === t.v
                  ? "bg-card text-primary-700 shadow-sm"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Pesquisa + filtros */}
        <div className="flex w-full flex-col gap-2 sm:flex-row md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Procurar por nome, número ou equipa"
              className="bg-card pl-9"
            />
          </div>
          <button
            type="button"
            onClick={() => setMostrarFiltros((v) => !v)}
            className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-primary-700"
          >
            <SlidersHorizontal className="size-4" /> Filtros
            {(equipa || tipo) && (
              <span className="rounded-full bg-primary px-1.5 text-xs text-primary-foreground">
                {(equipa ? 1 : 0) + (tipo ? 1 : 0)}
              </span>
            )}
          </button>
        </div>
      </div>

      {mostrarFiltros && (
        <div className="grid grid-cols-2 gap-2">
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoCromo | "")}
            className="h-11 rounded-input border border-input bg-card px-3 text-sm"
          >
            <option value="">Todos os tipos</option>
            <option value="jogador">Jogador</option>
            <option value="escudo">Escudo</option>
            <option value="especial">Especial</option>
          </select>
        </div>
      )}

      {/* Selector de seleção — matriz compacta (evita scroll horizontal de 50 chips) */}
      <div className="overflow-hidden rounded-card border border-border bg-surface-low">
        <button
          type="button"
          onClick={() => setMostrarSelecoes((v) => !v)}
          aria-expanded={mostrarSelecoes}
          className="flex w-full items-center justify-between gap-3 px-4 py-3 hover:bg-muted/50"
        >
          <span className="flex items-center gap-2.5">
            <span className="font-display text-xs font-black uppercase tracking-wider text-navy-900">
              Seleção
            </span>
            <span
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1 font-display text-[11px] font-bold uppercase tracking-wider",
                equipa ? "bg-navy-900 text-white" : "bg-surface-high text-muted-foreground",
              )}
            >
              {equipa && (
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: acentoDe(equipa) }}
                  aria-hidden
                />
              )}
              {equipa || "Todas"}
            </span>
          </span>
          <ChevronDown
            className={cn("size-4 text-muted-foreground transition-transform", mostrarSelecoes && "rotate-180")}
          />
        </button>

        {mostrarSelecoes && (
          <div className="grid grid-cols-2 gap-1.5 border-t border-border p-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            <button
              type="button"
              onClick={() => {
                setEquipa("");
                setMostrarSelecoes(false);
              }}
              className={cn(
                "flex items-center gap-2 rounded-button px-2.5 py-2 text-left text-xs font-semibold transition-colors",
                !equipa
                  ? "bg-navy-900 text-white"
                  : "border border-border bg-card hover:bg-muted",
              )}
            >
              <span className="flex-1 truncate">Todas</span>
              <span className="text-[10px] tabular-nums opacity-60">{cromos.length}</span>
            </button>
            {equipas.map((eq) => {
              const activa = equipa === eq;
              const p = progresso.get(eq);
              const completa = p && p.tem === p.total;
              return (
                <button
                  key={eq}
                  type="button"
                  onClick={() => {
                    setEquipa(activa ? "" : eq);
                    setMostrarSelecoes(false);
                  }}
                  title={eq}
                  className={cn(
                    "flex items-center gap-2 rounded-button px-2.5 py-2 text-left text-xs font-semibold transition-colors",
                    activa
                      ? "bg-navy-900 text-white"
                      : "border border-border bg-card hover:bg-muted",
                  )}
                >
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: completa ? "#c9a227" : acentoDe(eq) }}
                    aria-hidden
                  />
                  <span className="flex-1 truncate">{eq}</span>
                  {p && (
                    <span
                      className={cn(
                        "text-[10px] tabular-nums",
                        completa ? "font-bold text-gold-600" : "opacity-60",
                        activa && "text-white opacity-80",
                      )}
                    >
                      {p.tem}/{p.total}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        {visiveis.length} cromo{visiveis.length !== 1 && "s"}
        {multi && ` · ${selecionados.size} selecionado(s)`}
      </p>

      {/* Grid */}
      {visiveis.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          Nenhum cromo corresponde à pesquisa.
        </p>
      ) : (
        <>
          <div className="space-y-6">
            {seccoes.map((sec) => {
              const acento = acentoDe(sec.equipa);
              const p = progresso.get(sec.equipa);
              const pct = p ? Math.round((p.tem / p.total) * 100) : 0;
              return (
                <section key={sec.equipa}>
                  {/* Cabeçalho de seleção (separador da caderneta) */}
                  <div className="mb-3 flex items-center gap-3">
                    <span
                      className="h-6 w-1.5 -skew-x-12 rounded-sm"
                      style={{ backgroundColor: acento }}
                      aria-hidden
                    />
                    <h2 className="font-display text-lg font-black uppercase tracking-wide text-navy-900">
                      {sec.equipa}
                    </h2>
                    {p && (
                      <span className="ml-auto flex items-center gap-2">
                        <span className="h-1.5 w-20 overflow-hidden rounded-full bg-muted sm:w-28">
                          <span
                            className="block h-full rounded-full transition-all"
                            style={{ width: `${pct}%`, backgroundColor: pct === 100 ? "#c9a227" : acento }}
                          />
                        </span>
                        <span
                          className={cn(
                            "font-display text-xs font-bold tabular-nums",
                            pct === 100 ? "text-gold-600" : "text-muted-foreground",
                          )}
                        >
                          {p.tem}/{p.total}
                        </span>
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
                    {sec.cromos.map((c) => {
                      const e = ent(c.id);
                      return (
                        <CromoCard
                          key={c.id}
                          cromo={c}
                          quantidade={e.quantidade}
                          precisa={e.precisa}
                          selecionado={multi && selecionados.has(c.id)}
                          onClick={() => (multi ? toggleSel(c.id) : setSel(c))}
                        />
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
          {temMais && (
            <div className="flex justify-center pt-4">
              <Button
                variant="outline"
                onClick={() => setLimite((l) => l + PAGINA)}
              >
                Carregar mais cromos ({visiveis.length - limite} restantes)
              </Button>
            </div>
          )}
        </>
      )}

      {/* FAB selecção múltipla (Stitch: verde, rounded-xl) */}
      {!multi && (
        <button
          type="button"
          onClick={() => setMulti(true)}
          className="fixed bottom-24 right-4 z-30 flex items-center gap-2 rounded-card bg-primary px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-primary-foreground shadow-card-hover transition-transform hover:scale-105 md:bottom-8 md:right-8"
        >
          <CheckSquare className="size-5" /> Selecionar vários
        </button>
      )}

      {/* Barra de acções em massa */}
      {multi && (
        <div className="fixed inset-x-0 bottom-16 z-40 border-t border-border bg-card p-3 shadow-card-hover md:bottom-0">
          <div className="mx-auto flex max-w-2xl flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-navy">
                {selecionados.size} selecionado(s)
              </span>
              <button
                type="button"
                onClick={() => {
                  setMulti(false);
                  setSelecionados(new Set());
                }}
                aria-label="Cancelar selecção"
                className="rounded-full p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="primary"
                disabled={selecionados.size === 0}
                loading={savingMassa}
                onClick={() => aplicarMassa(2, false)}
              >
                Marcar repetido
              </Button>
              <Button
                size="sm"
                variant="danger"
                disabled={selecionados.size === 0}
                loading={savingMassa}
                onClick={() => aplicarMassa(0, true)}
              >
                Marcar em falta
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={selecionados.size === 0}
                loading={savingMassa}
                onClick={() => aplicarMassa(0, false)}
              >
                Limpar
              </Button>
            </div>
          </div>
        </div>
      )}

      <CromoEditor
        cromo={sel}
        quantidade={sel ? ent(sel.id).quantidade : 0}
        saving={saving}
        onClose={() => setSel(null)}
        onSave={onSave}
      />
    </div>
  );
}
