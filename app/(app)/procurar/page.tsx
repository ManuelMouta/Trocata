import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { MapPin, Package, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ProcurarCTA } from "@/components/features/procurar/procurar-cta";
import { getPerfilAtual } from "@/lib/profile";

export const metadata: Metadata = { title: "Procurar Pool — Trocata" };
export const dynamic = "force-dynamic";

export default async function ProcurarPage() {
  const perfil = (await getPerfilAtual())!;

  if (perfil.estado === "em_pool") redirect("/dashboard");

  const nRep = perfil.repetidos_cache.length;
  const nFal = perfil.faltas_cache.length;
  const pode = nRep + nFal >= 5 && nRep >= 1 && nFal >= 1;

  return (
    <div className="space-y-5">
      <h1 className="font-display text-2xl font-bold text-navy">
        Encontrar grupo de troca
      </h1>

      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex items-center gap-2 text-sm">
            <Package className="size-4 text-primary" />
            Tens <strong>{nRep}</strong> repetidos e <strong>{nFal}</strong> em falta
          </div>
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="size-4 text-primary" />
            A tua zona: <strong>{perfil.localidade ?? "—"}</strong> (raio {perfil.raio_km} km)
          </div>
          <Link href="/perfil" className="text-sm font-medium text-primary hover:underline">
            Alterar localização ou raio
          </Link>
        </CardContent>
      </Card>

      {pode ? (
        <>
          <p className="text-sm text-muted-foreground">
            Vamos analisar os cromos das pessoas na tua zona e formar o melhor
            grupo de 4 para maximizar as trocas.
          </p>
          <ProcurarCTA />
        </>
      ) : (
        <div className="flex items-start gap-2 rounded-card border border-alert/30 bg-orange-50 p-4 text-sm text-alert">
          <AlertCircle className="mt-0.5 size-5 shrink-0" />
          <div>
            <p className="font-medium">Ainda não podes procurar.</p>
            <p>
              Precisas de pelo menos 5 cromos registados, com 1 repetido e 1 em
              falta.{" "}
              <Link href="/colecao" className="underline">
                Ir para a caderneta
              </Link>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
