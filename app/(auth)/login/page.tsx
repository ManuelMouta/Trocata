import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/features/auth/login-form";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Entrar — Trocata" };
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) redirect("/dashboard");
  } catch {
    // sem Supabase configurado
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="font-display text-2xl font-bold text-navy">Bem-vindo de volta</h1>
        <p className="text-sm text-muted-foreground">
          Entra para veres a tua caderneta e pools.
        </p>
      </div>
      <LoginForm />
    </div>
  );
}
