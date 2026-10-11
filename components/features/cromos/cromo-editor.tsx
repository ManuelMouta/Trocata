"use client";

import { useEffect, useState } from "react";
import { X, Minus, Plus, CheckCircle2, Copy, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { acentoDe } from "@/components/features/cromos/cromo-card";
import { cn } from "@/lib/utils";
import type { Cromo } from "@/lib/types";

interface Props {
  cromo: Cromo | null;
  quantidade: number;
  saving?: boolean;
  onClose: () => void;
  onSave: (quantidade: number, precisa: boolean) => void;
}

/** Os três estados possíveis de um cromo na caderneta — mutuamente exclusivos. */
type Modo = "nao_tenho" | "tenho" | "repetido";

function modoDe(quantidade: number): Modo {
  if (quantidade >= 2) return "repetido";
  if (quantidade === 1) return "tenho";
  return "nao_tenho";
}

/**
 * Bottom sheet para editar um cromo. Antes perguntava "quantos tens?" e
 * "precisas?" em simultâneo, mesmo quando a combinação não fazia sentido
 * (ex.: 2 repetidos + "precisas, sim"). Agora é uma escolha única em 3
 * estados — "não tenho" / "tenho" / "tenho repetidos" — cada um a
 * confirmar directamente, sem sub-perguntas: escolher "não tenho" já
 * significa que precisas dele (falta-te), sem passo extra.
 */
export function CromoEditor({
  cromo,
  quantidade,
  saving,
  onClose,
  onSave,
}: Props) {
  const [modo, setModo] = useState<Modo>(modoDe(quantidade));
  // "extra" = quantos tens PARA ALÉM do que fica na caderneta (mínimo 1: o
  // próprio repetido). Total guardado = extra + 1 (o 1 que fica no álbum).
  const [qtdExtra, setQtdExtra] = useState(Math.max(quantidade - 1, 1));

  useEffect(() => {
    setModo(modoDe(quantidade));
    setQtdExtra(Math.max(quantidade - 1, 1));
  }, [quantidade, cromo]);

  // fechar com Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (cromo) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cromo, onClose]);

  if (!cromo) return null;

  function confirmar() {
    if (modo === "nao_tenho") onSave(0, true);
    else if (modo === "tenho") onSave(1, false);
    else onSave(qtdExtra + 1, false);
  }

  const opcoes: { v: Modo; label: string; icon: typeof Circle }[] = [
    { v: "nao_tenho", label: "Não tenho", icon: Circle },
    { v: "tenho", label: "Tenho", icon: CheckCircle2 },
    { v: "repetido", label: "Repetidos", icon: Copy },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-black/40 animate-fade-in"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Editar cromo ${cromo.numero}`}
        className="relative w-full max-w-md rounded-t-card border border-border bg-card p-5 shadow-card-hover animate-fade-in sm:rounded-card"
      >
        <div className="mb-4 flex items-start gap-3">
          {cromo.imagem_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cromo.imagem_url}
              alt={`Cromo ${cromo.numero} — ${cromo.nome}`}
              width={72}
              height={96}
              referrerPolicy="no-referrer"
              className="h-24 w-18 shrink-0 rounded-input border border-border object-cover"
            />
          ) : (
            <div
              aria-hidden
              className="flex h-24 w-18 shrink-0 items-center justify-center rounded-input"
              style={{
                background: `linear-gradient(160deg, ${acentoDe(cromo.equipa)} 0%, #091622 92%)`,
              }}
            >
              <span className="font-display text-xl font-black italic text-white/90">
                {cromo.numero.replace(/\D/g, "") || "★"}
              </span>
            </div>
          )}
          <div className="flex-1">
            <p className="text-xs font-semibold text-muted-foreground">
              #{cromo.numero} · {cromo.equipa}
            </p>
            <h2 className="font-display text-lg font-semibold text-navy">
              {cromo.nome}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-full p-1 text-muted-foreground hover:bg-muted"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Estado — escolha única */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-navy">Este cromo:</p>
          <div className="grid grid-cols-3 gap-2">
            {opcoes.map((opt) => {
              const Icon = opt.icon;
              const activa = modo === opt.v;
              return (
                <button
                  key={opt.v}
                  type="button"
                  onClick={() => setModo(opt.v)}
                  aria-pressed={activa}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-button border px-2 py-3 text-xs font-semibold transition-colors",
                    activa
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card hover:bg-muted",
                  )}
                >
                  <Icon className="size-5" />
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sub-pergunta: só faz sentido quando tens repetidos. O contador é o
            número de repetidos (para dar/trocar) — 1 fica sempre na caderneta. */}
        {modo === "repetido" && (
          <div className="mt-4 space-y-2 rounded-input bg-surface-low p-3">
            <p className="text-sm font-medium text-navy">Quantos tens a mais, para troca?</p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label="Menos"
                onClick={() => setQtdExtra((v) => Math.max(1, v - 1))}
                className="flex size-10 items-center justify-center rounded-button border border-border hover:bg-muted disabled:opacity-40"
                disabled={qtdExtra <= 1}
              >
                <Minus className="size-4" />
              </button>
              <span className="w-12 text-center text-xl font-bold text-navy">
                {qtdExtra >= 3 ? "3+" : qtdExtra}
              </span>
              <button
                type="button"
                aria-label="Mais"
                onClick={() => setQtdExtra((v) => v + 1)}
                className="flex size-10 items-center justify-center rounded-button border border-border hover:bg-muted"
              >
                <Plus className="size-4" />
              </button>
            </div>
          </div>
        )}

        <Button
          className="mt-6"
          variant="primary"
          block
          loading={saving}
          onClick={confirmar}
        >
          Confirmar
        </Button>
      </div>
    </div>
  );
}
