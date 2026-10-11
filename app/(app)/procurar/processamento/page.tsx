import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Processamento } from "@/components/features/procurar/processamento";

export const metadata: Metadata = { title: "A procurar... — Trocata" };
export const dynamic = "force-dynamic";

export default async function ProcessamentoPage({
  searchParams,
}: {
  searchParams: Promise<{ req?: string }>;
}) {
  const { req } = await searchParams;
  if (!req) redirect("/procurar");
  return <Processamento requestId={req} />;
}
