import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Trocas do Pool — Trocata" };
export const dynamic = "force-dynamic";

interface TrocaRow {
  de_utilizador_id: string;
  para_utilizador_id: string;
  cromo_id: number;
  cromos: { numero: string; nome: string } | null;
}

export default async function TrocasPage({
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

  const { data: membrosRaw } = await supabase
    .from("pool_membro")
    .select("utilizador_id, utilizadores(nome)")
    .eq("pool_id", id)
    .order("joined_at");
  if (!membrosRaw?.some((m) => m.utilizador_id === user.id)) redirect("/dashboard");

  const membros = (membrosRaw ?? []).map((m) => ({
    id: m.utilizador_id,
    nome:
      m.utilizador_id === user.id
        ? "Tu"
        : (m.utilizadores as unknown as { nome: string })?.nome ?? "?",
  }));

  const { data: trocas } = await supabase
    .from("troca_pool")
    .select("de_utilizador_id, para_utilizador_id, cromo_id, cromos(numero, nome)")
    .eq("pool_id", id);

  const lista = (trocas ?? []) as unknown as TrocaRow[];

  const nome = (uid: string) => membros.find((m) => m.id === uid)?.nome ?? "?";
  const celula = (de: string, para: string) =>
    lista.filter((t) => t.de_utilizador_id === de && t.para_utilizador_id === para);

  return (
    <div className="space-y-5">
      <Link
        href={`/pool/${id}`}
        className="inline-flex items-center gap-1 text-sm font-medium text-primary"
      >
        <ArrowLeft className="size-4" /> Voltar ao pool
      </Link>
      <h1 className="font-display text-2xl font-bold text-navy">
        Trocas do grupo
      </h1>

      {/* Matriz quem dá × quem recebe */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[36rem] border-collapse text-sm">
          <thead>
            <tr>
              <th className="border border-border bg-muted p-2 text-left text-xs text-muted-foreground">
                dá ↓ / recebe →
              </th>
              {membros.map((m) => (
                <th key={m.id} className="border border-border bg-muted p-2 text-xs font-semibold text-navy">
                  {m.nome}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {membros.map((de) => (
              <tr key={de.id}>
                <th className="border border-border bg-muted p-2 text-left text-xs font-semibold text-navy">
                  {de.nome}
                </th>
                {membros.map((para) => {
                  const cels = de.id === para.id ? [] : celula(de.id, para.id);
                  return (
                    <td
                      key={para.id}
                      className="border border-border p-2 align-top text-xs"
                    >
                      {de.id === para.id ? (
                        <span className="text-muted-foreground">—</span>
                      ) : cels.length ? (
                        <ul className="space-y-0.5">
                          {cels.map((t, i) => (
                            <li key={i} className="text-navy">
                              #{t.cromos?.numero ?? t.cromo_id}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-muted-foreground">·</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cromos em circulação */}
      <div>
        <h2 className="mb-2 font-display text-lg font-semibold text-navy">
          Cromos em circulação ({lista.length})
        </h2>
        <ul className="space-y-1 text-sm">
          {lista.map((t, i) => (
            <li key={i} className="flex items-center gap-2 rounded-input border border-border bg-card p-2">
              <span className="font-medium text-navy">#{t.cromos?.numero ?? t.cromo_id}</span>
              <span className="truncate text-muted-foreground">{t.cromos?.nome}</span>
              <span className="ml-auto whitespace-nowrap text-xs text-muted-foreground">
                {nome(t.de_utilizador_id)} → {nome(t.para_utilizador_id)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
