import type { Metadata } from "next";
import { SemResultados } from "@/components/features/procurar/sem-resultados";
import { getPerfilAtual } from "@/lib/profile";

export const metadata: Metadata = { title: "Sem resultados — Trocata" };
export const dynamic = "force-dynamic";

export default async function SemResultadosPage() {
  const perfil = (await getPerfilAtual())!;
  return <SemResultados raioAtual={perfil.raio_km} />;
}
