import { z } from "zod";

/** Telemóvel PT: +351 opcional seguido de 9 dígitos começados por 9, ou 9xxxxxxxx. */
const telemovelPT = z
  .string()
  .trim()
  .regex(
    /^(\+351\s?)?9\d{8}$/,
    "Número de telemóvel português inválido (ex: 912345678)",
  );

export const passwordSchema = z
  .string()
  .min(8, "Mínimo 8 caracteres")
  .regex(/[A-Z]/, "Precisa de 1 letra maiúscula")
  .regex(/[0-9]/, "Precisa de 1 número");

/** Passo 1 — dados pessoais. */
export const passo1Schema = z
  .object({
    nome: z
      .string()
      .trim()
      .min(2, "Mínimo 2 caracteres")
      .max(50, "Máximo 50 caracteres"),
    email: z.string().trim().email("Email inválido"),
    password: passwordSchema,
    confirmarPassword: z.string(),
    telemovel: telemovelPT,
  })
  .refine((d) => d.password === d.confirmarPassword, {
    path: ["confirmarPassword"],
    message: "As palavras-passe não coincidem",
  });

export type Passo1Input = z.infer<typeof passo1Schema>;

export const loginSchema = z.object({
  email: z.string().trim().email("Email inválido"),
  password: z.string().min(1, "Introduz a palavra-passe"),
});

export type LoginInput = z.infer<typeof loginSchema>;

/** Passo 2 — localização. */
export const localizacaoSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  localidade: z.string().trim().min(1, "Indica uma localidade").max(120),
  raioKm: z.coerce.number().refine((v) => [5, 10, 15, 20, 30, 50].includes(v), {
    message: "Raio inválido",
  }),
});

export type LocalizacaoInput = z.infer<typeof localizacaoSchema>;

/** Força da password: 0-4 (para o indicador visual). */
export function passwordStrength(pw: string): {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
} {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw) || pw.length >= 12) score++;
  const labels = ["Muito fraca", "Fraca", "Razoável", "Boa", "Forte"];
  return { score: score as 0 | 1 | 2 | 3 | 4, label: labels[score] };
}
