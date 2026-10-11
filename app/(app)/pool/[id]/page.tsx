import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PoolView, type MembroView } from "@/components/features/pool/pool-view";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "O meu Pool — Trocata" };
export const dynamic = "force-dynamic";

export default async function PoolPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Timeout lazy: avalia expiração ao abrir (E001/pool formando > 24h).
  await supabase.rpc("avaliar_expiracao_pool", { p_pool: id });

  const { data: pool } = await supabase
    .from("pool")
    .select("id, estado, whatsapp_link, whatsapp_link_expires_at")
    .eq("id", id)
    .single();
  if (!pool) redirect("/dashboard");

  const { data: membrosRaw } = await supabase
    .from("pool_membro")
    .select("utilizador_id, estado, is_solicitante, utilizadores(nome, localidade)")
    .eq("pool_id", id)
    .order("joined_at");

  // Garante que o utilizador é membro.
  if (!membrosRaw?.some((m) => m.utilizador_id === user.id)) redirect("/dashboard");

  const membros: MembroView[] = (membrosRaw ?? []).map((m) => {
    const u = m.utilizadores as unknown as { nome: string; localidade: string | null };
    return {
      utilizador_id: m.utilizador_id,
      estado: m.estado,
      is_solicitante: m.is_solicitante,
      nome: u?.nome ?? "Coleccionador",
      localidade: u?.localidade ?? null,
    };
  });

  const { data: trocas } = await supabase
    .from("troca_pool")
    .select("de_utilizador_id, para_utilizador_id")
    .eq("pool_id", id);

  const recebes = (trocas ?? []).filter((t) => t.para_utilizador_id === user.id).length;
  const das = (trocas ?? []).filter((t) => t.de_utilizador_id === user.id).length;

  return (
    <PoolView pool={pool} membros={membros} eu={user.id} recebes={recebes} das={das} />
  );
}
