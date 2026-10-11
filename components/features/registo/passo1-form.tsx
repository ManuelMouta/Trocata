"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { PasswordStrength } from "@/components/features/registo/password-strength";
import { registarPasso1, type ActionState } from "@/app/actions/auth";

export function Passo1Form() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    registarPasso1,
    {},
  );
  const [password, setPassword] = useState("");
  const fe = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-4">
      <Field label="Nome/Alcunha" htmlFor="nome" error={fe.nome} hint="Como queres ser chamado?">
        <Input id="nome" name="nome" error={!!fe.nome} placeholder="O teu nome" required />
      </Field>

      <Field label="Email" htmlFor="email" error={fe.email}>
        <Input id="email" name="email" type="email" error={!!fe.email} placeholder="ola@exemplo.pt" required />
      </Field>

      <Field label="Palavra-passe" htmlFor="password" error={fe.password} hint="Mín. 8 caracteres, 1 maiúscula e 1 número">
        <Input
          id="password"
          name="password"
          type="password"
          error={!!fe.password}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </Field>
      <PasswordStrength value={password} />

      <Field label="Confirmar palavra-passe" htmlFor="confirmarPassword" error={fe.confirmarPassword}>
        <Input
          id="confirmarPassword"
          name="confirmarPassword"
          type="password"
          error={!!fe.confirmarPassword}
          required
        />
      </Field>

      <Field label="Telemóvel" htmlFor="telemovel" error={fe.telemovel} hint="Usado para o link WhatsApp do grupo">
        <Input id="telemovel" name="telemovel" type="tel" error={!!fe.telemovel} placeholder="912345678" required />
      </Field>

      {state.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}

      <Button type="submit" variant="primary" size="lg" block loading={pending}>
        Continuar
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Já tens conta?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Entrar
        </Link>
      </p>
    </form>
  );
}
