"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { entrar, type ActionState } from "@/app/actions/auth";

export function LoginForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    entrar,
    {},
  );
  const fe = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-4">
      <Field label="Email" htmlFor="email" error={fe.email}>
        <Input id="email" name="email" type="email" error={!!fe.email} placeholder="ola@exemplo.pt" required />
      </Field>

      <Field label="Palavra-passe" htmlFor="password" error={fe.password}>
        <Input id="password" name="password" type="password" error={!!fe.password} required />
      </Field>

      {state.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}

      <Button type="submit" variant="primary" size="lg" block loading={pending}>
        Entrar
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Ainda não tens conta?{" "}
        <Link href="/registo/passo-1" className="font-medium text-primary hover:underline">
          Criar conta
        </Link>
      </p>
    </form>
  );
}
