import type { Metadata } from "next";
import { StepIndicator } from "@/components/features/registo/step-indicator";
import { Passo1Form } from "@/components/features/registo/passo1-form";

export const metadata: Metadata = { title: "Registo — Dados pessoais | Trocata" };

export default function Passo1Page() {
  return (
    <div className="space-y-6">
      <StepIndicator atual={1} />
      <div className="space-y-1 text-center">
        <h1 className="font-display text-2xl font-bold text-navy">Cria a tua conta</h1>
        <p className="text-sm text-muted-foreground">
          Só precisamos de alguns dados para começar.
        </p>
      </div>
      <Passo1Form />
    </div>
  );
}
