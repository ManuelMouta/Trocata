import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { StepIndicator } from "@/components/features/registo/step-indicator";
import { LocationPicker } from "@/components/features/registo/location-picker";
import { getPerfilAtual } from "@/lib/profile";

export const metadata: Metadata = { title: "Registo — Localização | Trocata" };
export const dynamic = "force-dynamic";

export default async function Passo2Page() {
  const perfil = await getPerfilAtual();
  if (!perfil) redirect("/registo/passo-1");

  return (
    <div className="space-y-6">
      <StepIndicator atual={2} />
      <div className="space-y-1 text-center">
        <h1 className="font-display text-2xl font-bold text-navy">
          Onde queres trocar cromos?
        </h1>
        <p className="text-sm text-muted-foreground">
          Vamos procurar pessoas perto de ti.
        </p>
      </div>
      <LocationPicker
        initial={
          perfil.tem_localizacao
            ? {
                lat: 38.7223,
                lng: -9.1393,
                localidade: perfil.localidade ?? "",
                raioKm: perfil.raio_km,
              }
            : null
        }
      />
    </div>
  );
}
