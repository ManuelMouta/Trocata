import type { Metadata } from "next";
import { ColecaoManager } from "@/components/features/cromos/colecao-manager";
import { createClient } from "@/lib/supabase/server";
import { getPerfilAtual } from "@/lib/profile";
import type { Cromo } from "@/lib/types";

export const metadata: Metadata = { title: "A minha caderneta — Trocata" };
export const dynamic = "force-dynamic";

export default async function ColecaoPage() {
  const perfil = (await getPerfilAtual())!; // layout garante sessão
  const supabase = await createClient();

  const { data: cromos } = await supabase
    .from("cromos")
    .select("id, ordem, numero, nome, equipa, tipo, imagem_url")
    .order("ordem");

  const { data: colecao } = await supabase
    .from("colecao_utilizador")
    .select("cromo_id, quantidade_tem, precisa");

  const inicial: Record<number, { quantidade: number; precisa: boolean }> = {};
  for (const c of colecao ?? [])
    inicial[c.cromo_id] = { quantidade: c.quantidade_tem, precisa: c.precisa };

  const equipas = [...new Set((cromos ?? []).map((c) => c.equipa))];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="mb-2 font-display text-3xl font-bold text-primary-700 sm:text-4xl">
          Gestão da Coleção
        </h1>
        <p className="text-muted-foreground">
          Organiza os teus cromos, controla repetições e gere o que te falta
          para completar o álbum.
        </p>
      </div>
      <ColecaoManager
        cromos={(cromos as Cromo[]) ?? []}
        inicial={inicial}
        equipas={equipas}
        emPool={perfil.estado === "em_pool"}
      />
    </div>
  );
}
