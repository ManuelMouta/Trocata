import Link from "next/link";
import { Bell, Search } from "lucide-react";
import { redirect } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { BottomNav } from "@/components/ui/bottom-nav";
import { TopNav } from "@/components/ui/top-nav";
import { getPerfilAtual, proximoPassoRegisto } from "@/lib/profile";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const perfil = await getPerfilAtual();
  if (!perfil) redirect("/login");

  // Retoma: se o registo não está completo, reencaminha para o passo em falta.
  const passo = proximoPassoRegisto(perfil);
  if (passo) redirect(passo);

  return (
    <div className="min-h-dvh bg-background pb-20 md:pb-0">
      <header className="sticky top-0 z-30 border-b border-border bg-card shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="titulo-desportivo text-xl text-primary-700">
              Troca<span className="text-gradient-brand">ta</span>
            </Link>
            <TopNav />
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/procurar"
              className="bg-gradient-brand hidden rounded-button px-4 py-2 text-xs font-bold uppercase tracking-wider text-white transition-transform hover:scale-105 md:inline-flex md:items-center md:gap-1.5"
            >
              <Search className="size-3.5" /> Procurar Pool
            </Link>
            <button
              type="button"
              aria-label="Notificações"
              className="relative rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-primary-700"
            >
              <Bell className="size-5" />
            </button>
            <Link href="/perfil" aria-label="Perfil">
              <Avatar name={perfil.nome} size="sm" />
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
      <BottomNav />
    </div>
  );
}
