import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { StepIndicator } from "@/components/features/registo/step-indicator";
import { CadernetaRegisto } from "@/components/features/registo/caderneta-registo";
import { createClient } from "@/lib/supabase/server";
import { getPerfilAtual } from "@/lib/profile";
import type { Cromo } from "@/lib/types";

export const metadata: Metadata = { title: "Registo — Caderneta | Trocata" };
export const dynamic = "force-dynamic";

export default async function Passo3Page() {
  const perfil = await getPerfilAtual();
  if (!perfil) redirect("/registo/passo-1");
  if (!perfil.tem_localizacao) redirect("/registo/passo-2");

  const supabase = await createClient();
  const { data: cromos } = await supabase
    .from("cromos")
    .select("id, ordem, numero, nome, equipa, tipo, imagem_url")
    .order("ordem");

  const { data: colecao } = await supabase
    .from("colecao_utilizador")
    .select("cromo_id, quantidade_tem, precisa");

  const inicial: Record<number, { quantidade: number; precisa: boolean }> = {};
  for (const c of colecao ?? []) {
    inicial[c.cromo_id] = { quantidade: c.quantidade_tem, precisa: c.precisa };
  }

  return (
    <div className="space-y-6">
      <StepIndicator atual={3} />
      <div className="space-y-1 text-center">
        <h1 className="font-display text-2xl font-bold text-navy">A tua caderneta</h1>
        <p className="text-sm text-muted-foreground">
          Marca os cromos que tens a mais (repetidos) e os que te faltam.
        </p>
      </div>
      <CadernetaRegisto cromos={(cromos as Cromo[]) ?? []} inicial={inicial} />
    </div>
  );
}
