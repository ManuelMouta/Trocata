import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Copy,
  Search,
  TriangleAlert,
  User,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getPerfilAtual } from "@/lib/profile";

export const metadata: Metadata = { title: "Dashboard — Trocata" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const perfil = (await getPerfilAtual())!; // layout garante sessão + registo completo
  const supabase = await createClient();

  const { count: totalCromos } = await supabase
    .from("cromos")
    .select("id", { count: "exact", head: true });

  const { count: possuidos } = await supabase
    .from("colecao_utilizador")
    .select("id", { count: "exact", head: true })
    .gt("quantidade_tem", 0);

  const nRepetidos = perfil.repetidos_cache.length;
  const nFaltas = perfil.faltas_cache.length;
  const total = totalCromos ?? 0;
  const completude = total > 0 ? Math.round(((possuidos ?? 0) / total) * 100) : 0;
  const registados = nRepetidos + nFaltas;

  const emPool = perfil.estado === "em_pool";
  const podeProcurar =
    !emPool && nRepetidos >= 1 && nFaltas >= 1 && registados >= 5;

  // Pool activo do utilizador (para o link "ver pool").
  let poolAtivoId: string | null = null;
  if (emPool) {
    const { data: pm } = await supabase
      .from("pool_membro")
      .select("pool_id, pool(estado)")
      .eq("utilizador_id", perfil.id)
      .order("joined_at", { ascending: false });
    const ativo = (pm ?? []).find((m) => {
      const p = m.pool as unknown as { estado: string } | null;
      return p && ["formando", "activa", "a_aguardar_substituto"].includes(p.estado);
    });
    poolAtivoId = ativo?.pool_id ?? null;
  }

  return (
    <div className="space-y-8">
      <h1 className="titulo-desportivo text-3xl">Dashboard</h1>

      {/* Card de estado — gradiente vibrante com forma geométrica */}
      <div className="relative flex items-center justify-between overflow-hidden rounded-card bg-gradient-brand p-6 text-white shadow-card">
        <div className="relative z-10">
          <h2 className="mb-2 font-display text-xl font-black">
            {emPool
              ? "Tens um pool activo 🎴"
              : podeProcurar
                ? "Estás pronto para trocar! 🎉"
                : "Completa a tua caderneta para começar ⚽"}
          </h2>
          <p className="text-white/85">
            {emPool
              ? "Vê os detalhes do teu grupo e combina o encontro."
              : podeProcurar
                ? "A tua caderneta está atualizada e pronta para novas conexões."
                : "Precisas de pelo menos 1 repetido, 1 falta e 5 cromos registados."}
          </p>
        </div>
        <div className="shape-quarter-bl pointer-events-none absolute right-0 top-0 size-24 bg-wc-yellow/25" aria-hidden />
        <div className="pointer-events-none absolute -bottom-4 right-16 size-10 rotate-12 bg-white/10" aria-hidden />
      </div>

      {/* Estatísticas — cada uma com o seu acento WC26 */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <StatCard
          icon={<Copy className="size-6" />}
          chip="bg-wc-blue/10 text-wc-blue"
          label="Repetidos"
          valor={nRepetidos}
        />
        <StatCard
          icon={<TriangleAlert className="size-6" />}
          chip="bg-wc-red/10 text-wc-red"
          label="Em falta"
          valor={nFaltas}
        />
        <StatCard
          icon={<CheckCircle2 className="size-6" />}
          chip="bg-primary/10 text-primary-700"
          label="Completude"
          valor={`${completude}%`}
          destaque
        />
      </div>

      {/* Acção principal — CTA em gradiente com energia */}
      {podeProcurar ? (
        <div className="flex flex-col items-center justify-between gap-6 rounded-card border border-border bg-surface-high p-8 shadow-card md:flex-row">
          <div className="text-center md:text-left">
            <h3 className="mb-2 font-display text-xl font-black">Vamos encontrar trocas ⚡</h3>
            <p className="text-muted-foreground">
              O nosso algoritmo procura os melhores parceiros perto de ti.
            </p>
          </div>
          <Link
            href="/procurar"
            className="bg-gradient-brand group flex w-full flex-col items-center gap-1 rounded-card px-8 py-4 text-white shadow-md transition-all hover:-translate-y-0.5 hover:shadow-xl md:w-auto"
          >
            <span className="flex items-center gap-2 text-lg font-bold">
              <Search className="size-5 transition-transform group-hover:rotate-12 group-hover:scale-110" />
              Procurar Pool de Troca
            </span>
            <span className="text-xs font-normal opacity-85">
              Encontra 3 pessoas na tua zona
            </span>
          </Link>
        </div>
      ) : emPool && poolAtivoId ? (
        <div className="flex flex-col items-center justify-between gap-6 rounded-card border border-border bg-surface-high p-8 shadow-card md:flex-row">
          <div className="text-center md:text-left">
            <h3 className="mb-2 text-xl font-semibold">O teu grupo espera-te</h3>
            <p className="text-muted-foreground">
              Confirma a participação e combina o encontro com o grupo.
            </p>
          </div>
          <Link
            href={`/pool/${poolAtivoId}`}
            className="flex w-full items-center justify-center gap-2 rounded-card bg-primary px-8 py-4 text-lg font-semibold text-primary-foreground shadow-md transition-opacity hover:opacity-90 md:w-auto"
          >
            Ver o meu pool
          </Link>
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-card border border-border bg-surface-high p-6 text-muted-foreground shadow-card">
          <AlertCircle className="size-6 shrink-0" />
          {emPool
            ? "O teu pool foi encerrado. Já podes procurar outro."
            : "Regista mais cromos para desbloquear a procura de pools."}
        </div>
      )}

      {/* Acções secundárias (Stitch: cards com ícone circular + chevron) */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <LinkCard
          href="/colecao"
          icon={<BookOpen className="size-5" />}
          titulo="Gerir a minha caderneta"
          texto="Atualiza os teus repetidos e faltas"
        />
        <LinkCard
          href="/perfil"
          icon={<User className="size-5" />}
          titulo="O meu perfil"
          texto="Ver definições e histórico"
        />
      </div>
    </div>
  );
}

function StatCard({
  icon,
  chip,
  label,
  valor,
  destaque,
}: {
  icon: React.ReactNode;
  chip: string;
  label: string;
  valor: string | number;
  destaque?: boolean;
}) {
  return (
    <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-card border border-border bg-card p-6 text-center shadow-card transition-all hover:-translate-y-1 hover:shadow-card-hover">
      {destaque && <div className="absolute inset-0 bg-primary/5" />}
      <div className={`relative z-10 mb-3 flex size-12 items-center justify-center rounded-full ${chip}`}>
        {icon}
      </div>
      <p className="relative z-10 mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p
        className={
          destaque
            ? "relative z-10 font-display text-4xl font-black text-primary-700"
            : "relative z-10 font-display text-4xl font-black"
        }
      >
        {valor}
      </p>
    </div>
  );
}

function LinkCard({
  href,
  icon,
  titulo,
  texto,
}: {
  href: string;
  icon: React.ReactNode;
  titulo: string;
  texto: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 rounded-card border border-border bg-card p-6 shadow-card transition-shadow hover:shadow-card-hover"
    >
      <div className="rounded-full bg-muted p-3 transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
        {icon}
      </div>
      <div>
        <h4 className="font-bold transition-colors group-hover:text-primary-700">
          {titulo}
        </h4>
        <p className="text-sm text-muted-foreground">{texto}</p>
      </div>
      <ChevronRight className="ml-auto size-5 text-muted-foreground transition-colors group-hover:text-primary-700" />
    </Link>
  );
}
