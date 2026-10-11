"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  passo1Schema,
  loginSchema,
  localizacaoSchema,
} from "@/lib/validations/auth";

export type ActionState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

/** Passo 1 — cria conta e inicia sessão (confirmação de email desactivada no MVP). */
export async function registarPasso1(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = passo1Schema.safeParse({
    nome: formData.get("nome"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmarPassword: formData.get("confirmarPassword"),
    telemovel: formData.get("telemovel"),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !fieldErrors[key])
        fieldErrors[key] = issue.message;
    }
    return { fieldErrors };
  }

  const { nome, email, password, telemovel } = parsed.data;
  const supabase = await createClient();

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { nome, telemovel } },
  });

  if (error) {
    if (error.message.toLowerCase().includes("already"))
      return { fieldErrors: { email: "Este email já está registado" } };
    return { error: "Não foi possível criar a conta. Tenta outra vez." };
  }

  redirect("/registo/passo-2");
}

/** Login. */
export async function entrar(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !fieldErrors[key])
        fieldErrors[key] = issue.message;
    }
    return { fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: "Email ou palavra-passe incorrectos" };

  redirect("/dashboard");
}

/** Passo 2 — grava localização (point PostGIS via RPC) e raio. */
export async function guardarLocalizacao(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = localizacaoSchema.safeParse({
    lat: formData.get("lat"),
    lng: formData.get("lng"),
    localidade: formData.get("localidade"),
    raioKm: formData.get("raioKm"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { lat, lng, localidade, raioKm } = parsed.data;

  // Grava o ponto via RPC (WKT -> geography). Ver migration 0001b.
  const { error } = await supabase.rpc("definir_localizacao", {
    p_lat: lat,
    p_lng: lng,
    p_localidade: localidade,
    p_raio_km: raioKm,
  });

  if (error) {
    const conhecidas = new Set([
      "Raio inválido",
      "Coordenadas inválidas",
      "Localidade inválida",
      "Sessão expirada",
    ]);
    return {
      error: conhecidas.has(error.message)
        ? error.message
        : "Não foi possível guardar a localização.",
    };
  }

  revalidatePath("/registo/passo-3");
  redirect("/registo/passo-3");
}

export async function sair() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
