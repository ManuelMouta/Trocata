import { Construction } from "lucide-react";

/** Placeholder para rotas ainda por implementar nas próximas fases. */
export function EmBreve({ titulo }: { titulo: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Construction className="size-8" />
      </div>
      <h1 className="font-display text-xl font-bold text-navy">{titulo}</h1>
      <p className="max-w-xs text-sm text-muted-foreground">
        Esta secção está a ser construída e chega numa próxima fase.
      </p>
    </div>
  );
}
