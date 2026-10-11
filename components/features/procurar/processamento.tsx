"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { executarProcura } from "@/app/actions/pools";

const MENSAGENS = [
  "A analisar cromos repetidos na tua zona...",
  "A calcular combinações óptimas...",
  "A verificar compatibilidade geográfica...",
  "Quase lá... a finalizar o melhor grupo para ti!",
];

export function Processamento({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [msg, setMsg] = useState(0);
  const [demora, setDemora] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const arrancou = useRef(false);

  // Executa o matching uma vez.
  useEffect(() => {
    if (arrancou.current) return;
    arrancou.current = true;
    (async () => {
      const res = await executarProcura(requestId);
      if (res.status === "completed")
        router.replace(`/procurar/resultado?req=${requestId}`);
      else if (res.status === "no_match")
        router.replace(`/procurar/sem-resultados?req=${requestId}`);
      else setErro(res.error ?? "Ocorreu um erro na procura.");
    })();
  }, [requestId, router]);

  // Mensagens rotativas + aviso de demora aos 30s.
  useEffect(() => {
    const rot = setInterval(() => setMsg((m) => (m + 1) % MENSAGENS.length), 3000);
    const t = setTimeout(() => setDemora(true), 30000);
    return () => {
      clearInterval(rot);
      clearTimeout(t);
    };
  }, []);

  if (erro) {
    return (
      <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-4 text-center">
        <p className="text-danger">{erro}</p>
        <Button variant="outline" onClick={() => router.push("/procurar")}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-6 text-center">
      <div className="relative">
        <div className="flex size-24 items-center justify-center rounded-full bg-primary-50">
          <Loader2 className="size-12 animate-spin text-primary" />
        </div>
      </div>

      <div className="space-y-2">
        <p className="font-display text-lg font-semibold text-navy" aria-live="polite">
          {demora
            ? "A procura está a demorar mais do que o normal. A expandir raio de pesquisa..."
            : MENSAGENS[msg]}
        </p>
        <p className="text-sm text-muted-foreground">
          Isto costuma demorar 5-10 segundos
        </p>
      </div>

      {/* barra shimmer indeterminada */}
      <div className="h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-muted">
        <div className="shimmer h-full w-full bg-primary/30" />
      </div>

      <Button variant="ghost" onClick={() => router.push("/procurar")}>
        Cancelar
      </Button>
    </div>
  );
}
