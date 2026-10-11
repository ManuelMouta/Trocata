"use client";

import { cn } from "@/lib/utils";

export const RAIOS = [5, 10, 15, 20, 30, 50] as const;
export type Raio = (typeof RAIOS)[number];

interface Props {
  value: Raio;
  onChange: (v: Raio) => void;
  label?: string;
}

/** Selector segmentado do raio de deslocação (km). */
export function RaioSlider({ value, onChange, label }: Props) {
  return (
    <div className="space-y-2">
      {label && (
        <p className="text-sm font-medium text-navy">
          {label}: <span className="text-primary">{value} km</span>
        </p>
      )}
      <div
        role="radiogroup"
        aria-label="Distância máxima para encontro"
        className="flex flex-wrap gap-2"
      >
        {RAIOS.map((r) => (
          <button
            key={r}
            type="button"
            role="radio"
            aria-checked={value === r}
            onClick={() => onChange(r)}
            className={cn(
              "min-w-14 rounded-button border px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
              value === r
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-card-foreground hover:bg-muted",
            )}
          >
            {r} km
          </button>
        ))}
      </div>
    </div>
  );
}
