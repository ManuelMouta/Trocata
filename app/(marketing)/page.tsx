import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Check,
  Handshake,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  User,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * Mini-cromos do hero: jogadores conhecidos, com foto real (Wikimedia
 * Commons, fonte livre de licença — ver scripts/fetch-fotos-jogadores.ts).
 * Escolhidos por reconhecibilidade imediata, para vender a promessa da
 * caderneta logo na primeira dobra.
 */
const heroCromos = [
  { numero: "POR15", nome: "Cristiano Ronaldo", foto: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/67/Cristiano_Ronaldo_2275_%28cropped%29.jpg/330px-Cristiano_Ronaldo_2275_%28cropped%29.jpg" },
  { numero: "ARG17", nome: "Lionel Messi", foto: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/27/Lionel_Messi_NE_Revolution_Inter_Miami_7.9.25-178.jpg/330px-Lionel_Messi_NE_Revolution_Inter_Miami_7.9.25-178.jpg" },
  { numero: "NOR15", nome: "Erling Haaland", foto: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/43/Erling_Haaland_Morocco_v_Norway_7_June_2026-51.jpg/330px-Erling_Haaland_Morocco_v_Norway_7_June_2026-51.jpg" },
  { numero: "FRA20", nome: "Kylian Mbappé", foto: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/95/Kylian_Mbappe_France_v_Senegal_16_June_2026-391_%28cropped%29.jpg/330px-Kylian_Mbappe_France_v_Senegal_16_June_2026-391_%28cropped%29.jpg" },
  { numero: "BRA14", nome: "Vinícius Júnior", foto: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/Vin%C3%ADcius_J%C3%BAnior_Brazil_V_Morocco_13_June_2026-207_%28cropped%29.jpg/330px-Vin%C3%ADcius_J%C3%BAnior_Brazil_V_Morocco_13_June_2026-207_%28cropped%29.jpg" },
  { numero: "ENG11", nome: "Jude Bellingham", foto: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Jude_Bellingham_England_v_Ghana_23_June_2026-061_%28cropped%29.jpg/330px-Jude_Bellingham_England_v_Ghana_23_June_2026-061_%28cropped%29.jpg" },
];

export default async function LandingPage() {
  // Se já autenticado, ir directo para o dashboard (spec 4.1.1).
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) redirect("/dashboard");
  } catch {
    // sem Supabase configurado — mostrar landing na mesma
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-card/80 shadow-sm backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-8">
          <span className="titulo-desportivo text-xl text-primary-700">
            Troca<span className="text-gradient-brand">ta</span>
            <span className="ml-1 text-sm not-italic">⚽</span>
          </span>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-xs font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-primary-700"
            >
              Entrar
            </Link>
            <Link
              href="/registo/passo-1"
              className="bg-gradient-brand rounded-button px-4 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-sm transition-transform hover:scale-105"
            >
              Começar a trocar
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-grow">
        {/* HERO — escuro e vibrante, linguagem geométrica do emblema 26 */}
        <section className="relative w-full overflow-hidden bg-ink pb-24 pt-16 text-white">
          {/* Gradientes de fundo */}
          <div className="absolute -left-40 -top-40 size-[32rem] rounded-full bg-primary-600/30 blur-3xl" />
          <div className="absolute -right-32 top-1/3 size-[28rem] rounded-full bg-wc-blue/25 blur-3xl" />
          <div className="absolute -bottom-24 left-1/3 size-96 rounded-full bg-wc-purple/25 blur-3xl" />

          {/* Formas geométricas do emblema 26 (quadrados + quartos de círculo) */}
          <div className="shape-quarter absolute left-[6%] top-[12%] size-14 animate-float bg-wc-yellow/80 md:size-20" aria-hidden />
          <div className="absolute right-[8%] top-[10%] size-10 rotate-12 animate-float-slow bg-wc-red/80 md:size-14" aria-hidden />
          <div className="shape-quarter-bl absolute bottom-[14%] left-[12%] hidden size-16 animate-float-slow bg-wc-blue/70 md:block" aria-hidden />
          <div className="absolute bottom-[22%] right-[16%] hidden size-8 -rotate-6 animate-float bg-primary-400/80 md:block" aria-hidden />

          <div className="relative z-10 mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-4 md:px-8 lg:grid-cols-2">
            <div className="flex flex-col gap-6 text-center lg:text-left">
              <span className="inline-flex items-center gap-2 self-center rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-wc-yellow backdrop-blur lg:self-start">
                <Sparkles className="size-4" />
                Mundial 2026 · EUA · México · Canadá
              </span>
              <h1 className="titulo-desportivo text-4xl leading-[0.95] sm:text-5xl lg:text-6xl">
                Completa a tua
                <br />
                caderneta{" "}
                <span className="text-gradient-brand">do Mundial</span>
              </h1>
              <p className="mx-auto max-w-xl text-lg text-white/80 lg:mx-0">
                Encontra 3 pessoas na tua zona com os cromos que precisas.
                Troca em segurança, poupa dinheiro e grita golo mais cedo. 🎉
              </p>
              <div className="mt-4 flex flex-col justify-center gap-4 sm:flex-row lg:justify-start">
                <Link
                  href="/registo/passo-1"
                  className="bg-gradient-brand inline-flex items-center justify-center gap-2 rounded-button px-8 py-4 text-sm font-bold uppercase tracking-wider text-white shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl"
                >
                  Começar a trocar <ArrowRight className="size-4" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-button border-2 border-white/30 px-8 py-4 text-sm font-bold uppercase tracking-wider text-white transition-colors hover:bg-white/10"
                >
                  Já tenho conta
                </Link>
              </div>
              {/* mini-prova social */}
              <p className="text-sm text-white/50">
                Grupos de 4 · Matching automático · Encontro combinado no WhatsApp
              </p>
            </div>

            {/* Visual: colagem de cromos + badges flutuantes */}
            <div className="relative mx-auto w-full max-w-lg">
              <div className="relative z-20 rotate-[-3deg] rounded-card border-4 border-white/10 bg-white p-5 shadow-card-hover transition-transform duration-500 hover:rotate-0">
                <p className="mb-3 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  A minha caderneta
                  <span className="rounded bg-wc-yellow px-1.5 py-0.5 text-[10px] text-ink">
                    2026
                  </span>
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {heroCromos.map((c, i) => (
                    <div
                      key={c.numero}
                      className={cn(
                        "group relative aspect-[3/4] overflow-hidden rounded-input shadow-sm transition-transform hover:z-10 hover:scale-110",
                        i % 2 === 0 ? "rotate-1" : "-rotate-1",
                      )}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={c.foto}
                        alt=""
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent px-1.5 pb-1 pt-4">
                        <p className="truncate text-[9px] font-bold leading-tight text-white">
                          {c.nome}
                        </p>
                      </div>
                      <span className="absolute left-1 top-1 rounded-sm bg-white/90 px-1 font-display text-[9px] font-black italic text-navy-900">
                        #{c.numero}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              {/* Badges flutuantes */}
              <div className="absolute -left-4 top-1/4 z-30 flex animate-float items-center gap-3 rounded-card bg-white p-3 text-foreground shadow-card-hover sm:-left-8">
                <div className="bg-gradient-brand flex size-10 items-center justify-center rounded-full text-white">
                  <Users className="size-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Grupos fechados
                  </p>
                  <p className="font-display text-sm font-black">4 Colecionadores</p>
                </div>
              </div>
              <div className="absolute -right-2 bottom-1/4 z-30 flex animate-float-slow items-center gap-3 rounded-card bg-white p-3 text-foreground shadow-card-hover sm:-right-4">
                <div className="flex size-10 items-center justify-center rounded-full bg-wc-yellow text-ink">
                  <Handshake className="size-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Trocas otimizadas
                  </p>
                  <p className="font-display text-sm font-black">Máxima eficiência</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* COMO FUNCIONA — cards numerados coloridos */}
        <section className="w-full bg-background px-4 py-24 md:px-8">
          <div className="mx-auto flex max-w-6xl flex-col gap-12">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="titulo-desportivo mb-4 text-3xl text-foreground">
                Como funciona?
              </h2>
              <p className="text-muted-foreground">
                Um processo simples e seguro para maximizar as tuas trocas sem
                perderes tempo em encontros massivos.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <PassoCard n={1} cor="bg-primary-600" titulo="Regista os teus cromos" texto="Insere os cromos que tens repetidos e os que te faltam. Interface rápida, pensada para coleções grandes.">
                <div className="flex gap-2">
                  {["#12", "#45", "#102", "..."].map((t) => (
                    <span key={t} className="flex h-8 items-center rounded border border-border bg-muted px-2 text-xs font-bold text-muted-foreground">
                      {t}
                    </span>
                  ))}
                </div>
              </PassoCard>
              <PassoCard n={2} cor="bg-wc-blue" titulo="Encontra o Grupo Ideal" texto={'O algoritmo cria um "Pool" de 4 pessoas na tua zona onde o match de cromos é perfeito — sem redundâncias.'}>
                <div className="flex items-center justify-between">
                  <User className="size-5 text-wc-blue" />
                  <div className="mx-2 h-px flex-grow bg-border" />
                  <Handshake className="size-5 text-wc-blue" />
                  <div className="mx-2 h-px flex-grow bg-border" />
                  <User className="size-5 text-wc-blue" />
                </div>
              </PassoCard>
              <PassoCard n={3} cor="bg-wc-red" titulo="Troca via WhatsApp" texto="Entra no grupo do pool, combina o local seguro (café, shopping) e faz as trocas ao vivo.">
                <div className="flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded-full bg-[#25D366]/20">
                    <MessageCircle className="size-4 text-[#25D366]" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Grupo criado com sucesso
                  </span>
                </div>
              </PassoCard>
            </div>
          </div>
        </section>

        {/* O PODER DO GRUPO DE 4 */}
        <section className="relative w-full overflow-hidden bg-surface-low px-4 py-24 md:px-8">
          <div
            className="pointer-events-none absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                "radial-gradient(circle at 2px 2px, var(--color-border) 1px, transparent 0)",
              backgroundSize: "24px 24px",
            }}
          />
          {/* formas decorativas */}
          <div className="shape-quarter absolute right-[4%] top-[8%] hidden size-16 animate-float bg-wc-yellow/60 lg:block" aria-hidden />
          <div className="relative z-10 mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 lg:grid-cols-12">
            <div className="flex flex-col gap-6 lg:col-span-5">
              <span className="inline-flex items-center gap-2 self-start rounded-full border border-border bg-card px-3 py-1 text-xs font-bold uppercase tracking-wider text-wc-purple shadow-sm">
                <ShieldCheck className="size-4" />
                Segurança &amp; Eficiência
              </span>
              <h2 className="titulo-desportivo text-3xl text-foreground">
                O poder do <br />
                <span className="text-primary-600">Grupo de 4</span>
              </h2>
              <p className="text-muted-foreground">
                Encontros com dezenas de pessoas são caóticos e ineficientes. O
                nosso modelo &quot;Pool de 4&quot; garante que todos os membros do grupo
                têm exatamente os cromos que os outros precisam.
              </p>
              <ul className="mt-2 flex flex-col gap-4">
                {[
                  ["bg-primary-600", "Maior taxa de sucesso na troca de cromos raros."],
                  ["bg-wc-blue", "Ambiente mais seguro e controlado para todas as idades."],
                  ["bg-wc-red", "Menos tempo perdido a folhear cadernetas ao acaso."],
                ].map(([cor, t]) => (
                  <li key={t} className="flex items-start gap-3">
                    <span className={cn("mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-white", cor)}>
                      <Check className="size-3.5" />
                    </span>
                    <span className="text-sm">{t}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Card do pool com 4 nós ligados */}
            <div className="lg:col-span-7">
              <div className="relative flex aspect-video w-full flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card/70 p-6 shadow-card-hover backdrop-blur-xl md:aspect-[4/3]">
                <div className="z-10 mb-6 flex items-center justify-between border-b border-border/60 pb-4">
                  <div>
                    <h4 className="font-display text-lg font-black">Pool #LX-2026-A</h4>
                    <p className="mt-1 flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      <MapPin className="size-3.5" />
                      Lisboa, Parque das Nações
                    </p>
                  </div>
                  <span className="bg-gradient-brand flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider text-white">
                    <span className="size-2 animate-pulse rounded-full bg-wc-yellow" />
                    Match Perfeito
                  </span>
                </div>
                <div className="relative z-10 flex flex-grow items-center justify-center">
                  <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
                    <line x1="20%" y1="22%" x2="80%" y2="22%" stroke="var(--color-primary-400)" strokeWidth="2" strokeDasharray="4 4" className="opacity-50" />
                    <line x1="20%" y1="22%" x2="20%" y2="78%" stroke="var(--color-primary-400)" strokeWidth="2" strokeDasharray="4 4" className="opacity-50" />
                    <line x1="80%" y1="22%" x2="80%" y2="78%" stroke="var(--color-primary-400)" strokeWidth="2" strokeDasharray="4 4" className="opacity-50" />
                    <line x1="20%" y1="78%" x2="80%" y2="78%" stroke="var(--color-primary-400)" strokeWidth="2" strokeDasharray="4 4" className="opacity-50" />
                    <line x1="20%" y1="22%" x2="80%" y2="78%" stroke="var(--color-border)" strokeWidth="1" className="opacity-40" />
                    <line x1="80%" y1="22%" x2="20%" y2="78%" stroke="var(--color-border)" strokeWidth="1" className="opacity-40" />
                  </svg>
                  <PoolNode pos="left-[10%] top-[6%]" cor="border-wc-blue text-wc-blue" nome="João P." extra="+12" />
                  <PoolNode pos="right-[10%] top-[6%]" cor="border-wc-red text-wc-red" nome="Maria C." extra="+8" />
                  <PoolNode pos="bottom-[6%] left-[10%]" cor="border-wc-purple text-wc-purple" nome="Tiago R." extra="+15" />
                  {/* Tu */}
                  <div className="absolute bottom-[6%] right-[10%] flex flex-col items-center gap-2">
                    <div className="bg-gradient-brand relative flex size-16 items-center justify-center rounded-full border-2 border-primary shadow-md ring-4 ring-primary/20">
                      <User className="size-7 text-white" />
                      <span className="absolute -right-2 -top-2 rounded bg-wc-yellow px-1.5 py-0.5 text-[9px] font-black uppercase text-ink shadow">
                        Tu
                      </span>
                    </div>
                    <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-bold shadow-sm">
                      45 Necessidades
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-auto w-full border-t border-border bg-ink px-4 py-8 text-white/70 md:px-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 md:flex-row">
          <div className="flex items-center gap-2 text-sm">
            <span className="titulo-desportivo text-gradient-brand text-base">Trocata 2026</span>
            <span>|</span>
            <span>© 2026 Trocata. Não é um produto oficial FIFA ou Panini.</span>
          </div>
          <div className="flex gap-6 text-sm">
            <span className="cursor-default transition-colors hover:text-white">Privacidade</span>
            <span className="cursor-default transition-colors hover:text-white">Termos</span>
            <span className="cursor-default transition-colors hover:text-white">FAQ</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function PassoCard({
  n,
  cor,
  titulo,
  texto,
  children,
}: {
  n: number;
  cor: string;
  titulo: string;
  texto: string;
  children: React.ReactNode;
}) {
  return (
    <div className="group relative flex flex-col gap-4 overflow-hidden rounded-card border border-border bg-card p-8 shadow-card transition-all hover:-translate-y-1 hover:-rotate-1 hover:shadow-card-hover">
      {/* quarto de círculo decorativo (linguagem do emblema 26) */}
      <div className={cn("shape-quarter-bl absolute right-0 top-0 size-16 opacity-10 transition-transform group-hover:scale-125", cor)} />
      <div className={cn("flex size-12 items-center justify-center rounded-button text-white shadow-sm", cor)}>
        <span className="font-display text-2xl font-black italic">{n}</span>
      </div>
      <h3 className="mt-2 font-display text-xl font-black">{titulo}</h3>
      <p className="flex-grow text-sm text-muted-foreground">{texto}</p>
      <div className="mt-2 border-t border-border/60 pt-4 opacity-70 transition-opacity group-hover:opacity-100">
        {children}
      </div>
    </div>
  );
}

function PoolNode({
  pos,
  cor,
  nome,
  extra,
}: {
  pos: string;
  cor: string;
  nome: string;
  extra: string;
}) {
  return (
    <div className={cn("absolute flex flex-col items-center gap-2", pos)}>
      <div className={cn("relative flex size-14 items-center justify-center rounded-full border-2 bg-card shadow-sm", cor)}>
        <User className="size-6" />
        <span className="absolute -bottom-2 -right-2 flex size-6 items-center justify-center rounded-full border border-border bg-surface-high text-[10px] font-bold text-foreground">
          {extra}
        </span>
      </div>
      <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-bold text-foreground shadow-sm">
        {nome}
      </span>
    </div>
  );
}
