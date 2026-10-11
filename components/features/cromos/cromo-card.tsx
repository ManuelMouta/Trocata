"use client";

import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Cromo } from "@/lib/types";

export type EstadoCromo = "neutro" | "tem" | "repetido" | "falta";

export function estadoDe(quantidade: number, precisa: boolean): EstadoCromo {
  if (quantidade >= 2) return "repetido";
  if (precisa) return "falta";
  if (quantidade === 1) return "tem";
  return "neutro";
}

/** Paleta festiva WC26 (globals.css) — acento determinístico por seleção. */
const ACENTOS = ["#00a651", "#0057ff", "#e4002b", "#8b2fc9", "#c9a227"];

export function acentoDe(equipa: string): string {
  let h = 0;
  for (let i = 0; i < equipa.length; i++) h = (h * 31 + equipa.charCodeAt(i)) | 0;
  return ACENTOS[Math.abs(h) % ACENTOS.length];
}

/** Dígitos do número do cromo (ALG9 -> "9") para o estilo "camisola". */
function digitosDe(numero: string): string {
  const d = numero.replace(/\D/g, "");
  return d || numero;
}

interface Props {
  cromo: Cromo;
  quantidade: number;
  precisa: boolean;
  selecionado?: boolean;
  onClick: () => void;
}

/**
 * Cromo estilo "sticker de futebol" WC26: foto real (Wikimedia) em full-bleed
 * com overlay de nome, ou "camisola" gráfica com o número quando não há foto.
 * Sem foto E sem cromo: slot vazio tracejado, como numa caderneta por colar.
 * A foto vem directamente do CDN do Wikimedia (não via /api/cromo-img) — o
 * browser faz cache normal e não há gargalo/rate-limit no nosso servidor.
 */
export function CromoCard({ cromo, quantidade, precisa, selecionado, onClick }: Props) {
  const estado = estadoDe(quantidade, precisa);
  const possui = estado === "tem" || estado === "repetido";
  const acento = acentoDe(cromo.equipa);
  const especial = cromo.tipo === "especial";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selecionado}
      aria-label={`Cromo ${cromo.numero}, ${cromo.nome}, ${cromo.equipa}. Estado: ${estado}.`}
      className={cn(
        "group relative aspect-[3/4] w-full overflow-hidden rounded-card text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        possui
          ? "shadow-card hover:-translate-y-1.5 hover:rotate-1 hover:shadow-card-hover"
          : "border-2 border-dashed bg-surface-low hover:border-solid",
        selecionado && "ring-2 ring-wc-blue ring-offset-2",
      )}
      style={possui ? undefined : { borderColor: `${acento}55` }}
    >
      {possui ? (
        <>
          {/* Fundo/foto */}
          <div
            className="absolute inset-0"
            style={{ background: `linear-gradient(160deg, ${acento} 0%, #091622 92%)` }}
          >
            {cromo.imagem_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={cromo.imagem_url}
                alt=""
                loading="lazy"
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              /* "Camisola": número gigante estilo dorsal */
              <div className="flex h-full w-full flex-col items-center justify-center pb-10">
                <span
                  className="font-display text-6xl font-black italic leading-none text-white/90"
                  style={{ textShadow: `3px 3px 0 ${acento}` }}
                >
                  {digitosDe(cromo.numero)}
                </span>
                <span className="mt-2 px-2 text-center font-display text-[11px] font-bold uppercase tracking-widest text-white/60">
                  {cromo.equipa}
                </span>
              </div>
            )}
          </div>

          {/* Brilho foil nos especiais */}
          {especial && (
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-transparent via-gold-300/30 to-transparent" />
          )}

          {/* Chip de número (estilo dorsal inclinado) */}
          <span
            className="absolute left-2 top-2 -skew-x-6 rounded-sm bg-white/95 px-1.5 py-0.5 font-display text-[11px] font-black italic text-navy-900 shadow-sm"
            aria-hidden
          >
            #{cromo.numero}
          </span>

          {/* Badge repetidos */}
          {estado === "repetido" && (
            <span className="absolute right-2 top-2 z-10 flex h-6 min-w-6 items-center justify-center rounded-full bg-gold px-1 font-display text-[11px] font-black text-navy-900 shadow-sm">
              {quantidade >= 3 ? "3+" : `${quantidade}x`}
            </span>
          )}

          {/* Overlay inferior com nome/equipa */}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-navy-900/95 via-navy-900/60 to-transparent px-2.5 pb-2 pt-8">
            <p className="line-clamp-2 font-display text-sm font-bold leading-tight text-white">
              {cromo.nome}
            </p>
            <p
              className="mt-0.5 truncate text-[9px] font-semibold uppercase tracking-widest"
              style={{ color: acento === "#091622" ? "#ffc72c" : "#ffc72c" }}
            >
              {cromo.equipa}
            </p>
          </div>

          {/* Moldura interior (look de sticker) */}
          <div
            className={cn(
              "pointer-events-none absolute inset-0 rounded-card border-2",
              especial ? "border-gold" : "border-white/25",
            )}
          />
        </>
      ) : (
        /* Slot vazio da caderneta — foto "fantasma" quando existe, para se
           reconhecer o jogador antes de colar o cromo */
        <div className="relative flex h-full w-full flex-col items-center justify-center gap-1.5 p-2.5">
          {cromo.imagem_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cromo.imagem_url}
              alt=""
              loading="lazy"
              referrerPolicy="no-referrer"
              className="absolute inset-0 h-full w-full object-cover opacity-25 grayscale transition-opacity duration-300 group-hover:opacity-45"
            />
          )}
          {estado === "falta" && (
            <span className="absolute right-2 top-2 z-10 flex size-6 items-center justify-center rounded-full bg-danger text-danger-foreground shadow-sm">
              <span className="text-xs font-bold">!</span>
            </span>
          )}
          <span
            className="relative flex size-9 items-center justify-center rounded-full bg-card/80 transition-transform group-hover:scale-110"
            style={{ boxShadow: `inset 0 0 0 2px ${acento}55` }}
          >
            <Plus className="size-5" style={{ color: acento }} />
          </span>
          <p className="relative mt-1 rounded bg-card/75 px-1.5 font-display text-xs font-black text-foreground">
            #{cromo.numero}
          </p>
          <p className="relative line-clamp-2 rounded bg-card/75 px-1.5 text-center text-[11px] font-semibold leading-tight text-foreground/90">
            {estado === "falta" ? "Em falta" : cromo.nome}
          </p>
          <p className="relative truncate rounded bg-card/75 px-1.5 text-[9px] uppercase tracking-widest text-muted-foreground">
            {cromo.equipa}
          </p>
        </div>
      )}
    </button>
  );
}
