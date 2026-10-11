import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ResultadoView } from "@/components/features/procurar/resultado-view";
import { createClient } from "@/lib/supabase/server";
import type { ResultadoProcura } from "@/app/actions/pools";

export const metadata: Metadata = { title: "Pool encontrado — Trocata" };
export const dynamic = "force-dynamic";

export default async function ResultadoPage({
  searchParams,
}: {
  searchParams: Promise<{ req?: string }>;
}) {
  const { req } = await searchParams;
  if (!req) redirect("/procurar");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: pedido } = await supabase
    .from("pool_search_requests")
    .select("status, resultado, result_pool_id")
    .eq("id", req)
    .single();

  if (!pedido) redirect("/procurar");
  if (pedido.result_pool_id) redirect(`/pool/${pedido.result_pool_id}`);
  if (pedido.status === "no_match")
    redirect(`/procurar/sem-resultados?req=${req}`);
  if (pedido.status !== "completed" || !pedido.resultado)
    redirect(`/procurar/processamento?req=${req}`);

  return (
    <ResultadoView
      requestId={req}
      solicitanteId={user.id}
      resultado={pedido.resultado as ResultadoProcura}
    />
  );
}
