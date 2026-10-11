"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CromoCard, estadoDe } from "@/components/features/cromos/cromo-card";
import { CromoEditor } from "@/components/features/cromos/cromo-editor";
import { guardarCromo, completarRegisto } from "@/app/actions/colecao";
import { cn } from "@/lib/utils";
import type { Cromo } from "@/lib/types";

interface Entrada {
  quantidade: number;
  precisa: boolean;
}

type Filtro = "todos" | "repetidos" | "faltas";

/** Renderizar 680 cards de uma vez torna a página gigante e lenta. */
const PAGINA = 40;

interface Props {
  cromos: Cromo[];
  inicial: Record<number, Entrada>;
}

export function CadernetaRegisto({ cromos, inicial }: Props) {
  const router = useRouter();
  const [mapa, setMapa] = useState<Record<number, Entrada>>(inicial);
  const [sel, setSel] = useState<Cromo | null>(null);
  const [saving, setSaving] = useState(false);
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [limite, setLimite] = useState(PAGINA);
  const [concluindo, startConcluir] = useTransition();

  const registados = useMemo(
    () =>
      Object.values(mapa).filter((e) => e.quantidade > 0 || e.precisa).length,
    [mapa],
  );

  const visiveis = useMemo(() => {
    if (filtro === "todos") return cromos;
    return cromos.filter((c) => {
      const e = mapa[c.id] ?? { quantidade: 0, precisa: false };
      const est = estadoDe(e.quantidade, e.precisa);
      return filtro === "repetidos" ? est === "repetido" : est === "falta";
    });
  }, [cromos, mapa, filtro]);

  useEffect(() => {
    setLimite(PAGINA);
  }, [filtro]);

  const paginados = visiveis.slice(0, limite);
  const temMais = visiveis.length > limite;

  async function onSave(quantidade: number, precisa: boolean) {
    if (!sel) return;
    setSaving(true);
    const anterior = mapa[sel.id];
    // optimista
    setMapa((m) => ({ ...m, [sel.id]: { quantidade, precisa } }));
    const err = await guardarCromo(sel.id, quantidade, precisa);
    setSaving(false);
    if (err) {
      // reverter em caso de erro
      setMapa((m) => ({
        ...m,
        [sel.id]: anterior ?? { quantidade: 0, precisa: false },
      }));
    } else {
      setSel(null);
    }
  }

  function concluir() {
    startConcluir(async () => {
      await completarRegisto();
      router.push("/onboarding");
    });
  }

  const filtros: { v: Filtro; label: string }[] = [
    { v: "todos", label: "Todos" },
    { v: "repetidos", label: "Repetidos" },
    { v: "faltas", label: "Em falta" },
  ];

  return (
    <div className="space-y-4">
      {/* Progresso */}
      <div className="sticky top-0 z-10 -mx-4 border-b border-border bg-background/95 px-4 py-2 backdrop-blur">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-navy">
            {registados} de {cromos.length} cromos registados
          </span>
          {registados < 5 && (
            <span className="text-xs text-alert">Mínimo 5 para procurar</span>
          )}
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${Math.min(100, (registados / Math.max(cromos.length, 1)) * 100)}%` }}
          />
        </div>
        {/* Filtros */}
        <div className="mt-3 flex gap-2">
          {filtros.map((f) => (
            <button
              key={f.v}
              type="button"
              onClick={() => setFiltro(f.v)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                filtro === f.v
                  ? "bg-navy text-navy-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/70",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {visiveis.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          Ainda não marcaste cromos neste filtro.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {paginados.map((c) => {
              const e = mapa[c.id] ?? { quantidade: 0, precisa: false };
              return (
                <CromoCard
                  key={c.id}
                  cromo={c}
                  quantidade={e.quantidade}
                  precisa={e.precisa}
                  onClick={() => setSel(c)}
                />
              );
            })}
          </div>
          {temMais && (
            <div className="flex justify-center pt-2">
              <Button variant="outline" onClick={() => setLimite((l) => l + PAGINA)}>
                Carregar mais cromos ({visiveis.length - limite} restantes)
              </Button>
            </div>
          )}
        </>
      )}

      {registados < 5 && (
        <div className="flex items-start gap-2 rounded-card border border-alert/30 bg-orange-50 p-3 text-sm text-alert">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <p>Sem pelo menos 5 cromos registados não poderás fazer matching.</p>
        </div>
      )}

      {/* Acções */}
      <div className="flex flex-col gap-2 pb-4">
        <Button variant="primary" size="lg" block loading={concluindo} onClick={concluir}>
          Concluir registo
        </Button>
        <Button variant="ghost" onClick={concluir} disabled={concluindo}>
          Preencher mais tarde
        </Button>
      </div>

      <CromoEditor
        cromo={sel}
        quantidade={sel ? (mapa[sel.id]?.quantidade ?? 0) : 0}
        saving={saving}
        onClose={() => setSel(null)}
        onSave={onSave}
      />
    </div>
  );
}
