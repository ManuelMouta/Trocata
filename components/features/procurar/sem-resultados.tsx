"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Maximize, Bell, Share2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RaioSlider, type Raio } from "@/components/features/registo/raio-slider";
import { atualizarRaio } from "@/app/actions/perfil";
import { iniciarProcura } from "@/app/actions/pools";

export function SemResultados({ raioAtual }: { raioAtual: number }) {
  const router = useRouter();
  const [raio, setRaio] = useState<Raio>((raioAtual as Raio) ?? 15);
  const [loading, setLoading] = useState(false);
  const [notificar, setNotificar] = useState(false);
  const [copiado, setCopiado] = useState(false);

  async function procurarComRaio() {
    setLoading(true);
    await atualizarRaio(raio);
    const res = await iniciarProcura();
    if (res.requestId) router.push(`/procurar/processamento?req=${res.requestId}`);
    else setLoading(false);
  }

  async function partilhar() {
    const url =
      (process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin) +
      "/registo/passo-1";
    const texto = "Junta-te a mim na Trocata para trocarmos cromos do Mundial 2026!";
    if (navigator.share) {
      try {
        await navigator.share({ title: "Trocata", text: texto, url });
      } catch {
        /* cancelado */
      }
    } else {
      await navigator.clipboard.writeText(`${texto} ${url}`);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-muted text-4xl">
          😕
        </div>
        <h1 className="font-display text-xl font-bold text-navy">
          Ainda não há grupo perfeito para ti
        </h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Não encontrámos 3 pessoas na tua zona com match suficiente de cromos.
        </p>
      </div>

      <Card>
        <CardContent className="space-y-3 p-4">
          <p className="flex items-center gap-2 font-medium text-navy">
            <Maximize className="size-4 text-primary" /> Aumentar raio de pesquisa
          </p>
          <RaioSlider value={raio} onChange={setRaio} />
          <Button variant="primary" block loading={loading} onClick={procurarComRaio}>
            Procurar com {raio} km
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-2 p-4">
          <p className="flex items-center gap-2 font-medium text-navy">
            <Bell className="size-4 text-primary" /> Avisar quando houver match
          </p>
          <p className="text-sm text-muted-foreground">
            Vamos procurar automaticamente e avisamos-te.
          </p>
          <Button
            variant={notificar ? "primary" : "outline"}
            block
            onClick={() => setNotificar((v) => !v)}
          >
            {notificar ? (
              <>
                <Check /> Vais ser avisado
              </>
            ) : (
              "Notificar-me"
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-2 p-4">
          <p className="flex items-center gap-2 font-medium text-navy">
            <Share2 className="size-4 text-primary" /> Convidar amigos
          </p>
          <p className="text-sm text-muted-foreground">
            Se 3 amigos teus entrarem, formam um pool garantido!
          </p>
          <Button variant="outline" block onClick={partilhar}>
            {copiado ? "Link copiado!" : "Partilhar link"}
          </Button>
        </CardContent>
      </Card>

      <Button variant="ghost" block onClick={() => router.push("/dashboard")}>
        Voltar ao Dashboard
      </Button>
    </div>
  );
}
