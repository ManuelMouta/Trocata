"use client";

import { passwordStrength } from "@/lib/validations/auth";
import { cn } from "@/lib/utils";

const barColors = [
  "bg-danger",
  "bg-danger",
  "bg-alert",
  "bg-gold",
  "bg-primary",
];

export function PasswordStrength({ value }: { value: string }) {
  if (!value) return null;
  const { score, label } = passwordStrength(value);
  return (
    <div className="space-y-1" aria-live="polite">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors",
              i < score ? barColors[score] : "bg-muted",
            )}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Força da palavra-passe: <span className="font-medium">{label}</span>
      </p>
    </div>
  );
}
