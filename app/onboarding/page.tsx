import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OnboardingCarousel } from "@/components/features/registo/onboarding-carousel";
import { getPerfilAtual } from "@/lib/profile";

export const metadata: Metadata = { title: "Bem-vindo — Trocata" };
export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const perfil = await getPerfilAtual();
  if (!perfil) redirect("/login");

  return (
    <main className="mx-auto max-w-lg bg-background">
      <OnboardingCarousel />
    </main>
  );
}
