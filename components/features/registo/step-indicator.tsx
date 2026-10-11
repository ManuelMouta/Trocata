import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const passos = ["Dados", "Localização", "Caderneta"];

export function StepIndicator({ atual }: { atual: 1 | 2 | 3 }) {
  return (
    <ol className="flex items-center justify-center gap-2" aria-label="Progresso do registo">
      {passos.map((label, i) => {
        const n = i + 1;
        const done = n < atual;
        const active = n === atual;
        return (
          <li key={label} className="flex items-center gap-2">
            <div className="flex flex-col items-center gap-1">
              <span
                aria-current={active ? "step" : undefined}
                className={cn(
                  "flex size-8 items-center justify-center rounded-full text-sm font-semibold transition-colors",
                  done && "bg-primary text-primary-foreground",
                  active && "bg-navy text-navy-foreground",
                  !done && !active && "bg-muted text-muted-foreground",
                )}
              >
                {done ? <Check className="size-4" /> : n}
              </span>
              <span
                className={cn(
                  "text-xs",
                  active ? "font-medium text-navy" : "text-muted-foreground",
                )}
              >
                {label}
              </span>
            </div>
            {n < passos.length && (
              <span
                className={cn(
                  "mb-5 h-0.5 w-6 rounded",
                  done ? "bg-primary" : "bg-border",
                )}
                aria-hidden
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
