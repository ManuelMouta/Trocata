"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MessageCircle,
  Check,
  MoreVertical,
  LogOut,
  ExternalLink,
  ArrowLeftRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import {
  confirmarMembro,
  sairPool,
  submeterLinkWhatsapp,
  limparLinkWhatsapp,
} from "@/app/actions/pool-membros";

export interface MembroView {
  utilizador_id: string;
  estado: string;
  is_solicitante: boolean;
  nome: string;
  localidade: string | null;
}
export interface PoolData {
  id: string;
  estado: string;
  whatsapp_link: string | null;
  whatsapp_link_expires_at: string | null;
}
interface Props {
  pool: PoolData;
  membros: MembroView[];
  eu: string;
  recebes: number;
  das: number;
}

export function PoolView({ pool, membros, eu, recebes, das }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState("");
  const [linkErro, setLinkErro] = useState<string | null>(null);
  const [menu, setMenu] = useState(false);

  const meu = membros.find((m) => m.utilizador_id === eu);
  const confirmados = membros.filter((m) => m.estado === "confirmado").length;
  const activa = pool.estado === "activa";
  const cancelada = pool.estado === "cancelada";
  const linkExpirado =
    !!pool.whatsapp_link_expires_at &&
    new Date(pool.whatsapp_link_expires_at) < new Date();
  const temLink = !!pool.whatsapp_link && !linkExpirado;

  // Realtime: refrescar quando o pool/membros mudam.
  useEffect(() => {
    const supabase = createClient();
    const ch = supabase
      .channel(`pool-${pool.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pool_membro", filter: `pool_id=eq.${pool.id}` },
        () => router.refresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pool", filter: `id=eq.${pool.id}` },
        () => router.refresh(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [pool.id, router]);

  async function confirmar() {
    setBusy(true);
    await confirmarMembro(pool.id);
    router.refresh();
    setBusy(false);
  }
  async function sair() {
    if (!confirm("Tens a certeza que queres sair? O pool será dissolvido.")) return;
    setBusy(true);
    await sairPool(pool.id);
    router.push("/dashboard");
  }
  async function enviarLink() {
    setLinkErro(null);
    setBusy(true);
    const res = await submeterLinkWhatsapp(pool.id, link);
    setBusy(false);
    if (res.data === "ok") {
      setLink("");
      router.refresh();
    } else if (res.data === "link_invalido") {
      setLinkErro("O link deve ser um convite chat.whatsapp.com/...");
    } else {
      setLinkErro(res.error ?? "Não foi possível guardar o link");
    }
  }
  async function novoLink() {
    setBusy(true);
    await limparLinkWhatsapp(pool.id);
    router.refresh();
    setBusy(false);
  }

  if (cancelada) {
    return (
      <div className="space-y-4 py-10 text-center">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-muted text-3xl">
          💔
        </div>
        <h1 className="font-display text-xl font-bold text-navy">
          Este pool foi dissolvido
        </h1>
        <p className="text-sm text-muted-foreground">
          Um membro saiu ou o tempo de confirmação expirou. Podes procurar outro
          grupo.
        </p>
        <Link
          href="/procurar"
          className="inline-flex h-11 items-center rounded-button bg-primary px-5 font-medium text-primary-foreground"
        >
          Procurar novo pool
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-navy">
          Pool #{pool.id.slice(0, 4).toUpperCase()}
        </h1>
        <div className="flex items-center gap-2">
          <Badge variant={activa ? "confirmado" : "pendente"}>
            {activa ? "Activa" : "A aguardar confirmações"}
          </Badge>
          <div className="relative">
            <button
              type="button"
              aria-label="Opções"
              onClick={() => setMenu((v) => !v)}
              className="rounded-full p-1.5 text-navy hover:bg-muted"
            >
              <MoreVertical className="size-5" />
            </button>
            {menu && (
              <div className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-card border border-border bg-card shadow-card-hover">
                <button
                  type="button"
                  onClick={sair}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-danger hover:bg-muted"
                >
                  <LogOut className="size-4" /> Sair do pool
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        {confirmados} de {membros.length} confirmaram.
      </p>

      {/* CTA de confirmação */}
      {meu?.estado === "convidado" && (
        <Card className="border-primary-300 bg-primary-50">
          <CardContent className="space-y-2 p-4">
            <p className="font-medium text-navy">Confirmas a tua participação?</p>
            <p className="text-sm text-primary-800">
              Ao confirmar, entras neste grupo de troca. Tens 24h para o fazer.
            </p>
            <Button variant="primary" block loading={busy} onClick={confirmar}>
              <Check /> Confirmar participação
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Membros 2x2 */}
      <div className="grid grid-cols-2 gap-3">
        {membros.map((m) => (
          <Card
            key={m.utilizador_id}
            className={m.utilizador_id === eu ? "border-primary-300 bg-primary-50" : ""}
          >
            <CardContent className="flex flex-col items-center gap-1 p-3 text-center">
              <Avatar name={m.nome} size="md" />
              <span className="text-sm font-semibold text-navy">
                {m.utilizador_id === eu ? "Tu" : m.nome}
              </span>
              <span className="text-xs text-muted-foreground">
                {m.localidade ?? "—"}
              </span>
              <Badge variant={m.estado === "confirmado" ? "confirmado" : "pendente"}>
                {m.estado === "confirmado" ? "Confirmado" : "A aguardar"}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Sala WhatsApp */}
      <Card className="border-primary-200">
        <CardContent className="space-y-3 p-4">
          <p className="flex items-center gap-2 font-medium text-navy">
            <MessageCircle className="size-5 text-primary" /> Sala do Grupo
          </p>

          {!activa ? (
            <p className="text-sm text-muted-foreground">
              Quando os 4 membros confirmarem, poderão partilhar aqui o link do
              grupo de WhatsApp.
            </p>
          ) : temLink ? (
            <div className="space-y-2">
              <a
                href={pool.whatsapp_link!}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-button bg-primary font-medium text-primary-foreground hover:bg-primary-600"
              >
                <ExternalLink className="size-4" /> Abrir grupo de WhatsApp
              </a>
              <p className="text-xs text-muted-foreground">
                Link válido por 7 dias.{" "}
                <button onClick={novoLink} className="underline" disabled={busy}>
                  Gerar novo link
                </button>
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {linkExpirado && (
                <p className="text-xs text-alert">O link anterior expirou.</p>
              )}
              <p className="text-sm text-muted-foreground">
                Um de vocês cria o grupo no WhatsApp e cola aqui o link de convite
                (chat.whatsapp.com/...). Os outros entram por aí.
              </p>
              <Input
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://chat.whatsapp.com/..."
                error={!!linkErro}
              />
              {linkErro && <p className="text-xs text-danger">{linkErro}</p>}
              <Button variant="primary" block loading={busy} onClick={enviarLink}>
                Guardar link do grupo
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resumo de trocas */}
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="grid grid-cols-2 gap-3 text-center">
            <div>
              <p className="font-display text-2xl font-bold text-navy">{recebes}</p>
              <p className="text-xs text-muted-foreground">Vais receber</p>
            </div>
            <div>
              <p className="font-display text-2xl font-bold text-navy">{das}</p>
              <p className="text-xs text-muted-foreground">Vais dar</p>
            </div>
          </div>
          <Link
            href={`/pool/${pool.id}/trocas`}
            className="flex items-center justify-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            <ArrowLeftRight className="size-4" /> Ver todas as trocas do grupo
          </Link>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Timeline activa={activa} temLink={temLink} />
    </div>
  );
}

function Timeline({ activa, temLink }: { activa: boolean; temLink: boolean }) {
  const passos = [
    { txt: "Pool formada", done: true },
    { txt: "Todos confirmaram", done: activa },
    { txt: "Sala de WhatsApp criada", done: temLink },
    { txt: "Encontro agendado", done: false },
    { txt: "Caderneta mais completa! 🎉", done: false },
  ];
  return (
    <div>
      <h2 className="mb-2 font-display text-lg font-semibold text-navy">Progresso</h2>
      <ol className="space-y-3">
        {passos.map((p, i) => (
          <li key={i} className="flex items-center gap-3">
            <span
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-full text-xs",
                p.done
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-card text-muted-foreground",
              )}
            >
              {p.done ? <Check className="size-3.5" /> : i + 1}
            </span>
            <span className={cn("text-sm", p.done ? "text-navy" : "text-muted-foreground")}>
              {p.txt}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
