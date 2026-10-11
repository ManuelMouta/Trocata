"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpenCheck, Users, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const slides = [
  {
    icon: BookOpenCheck,
    titulo: "A tua caderneta está registada",
    texto: "Guardámos os teus repetidos e as tuas faltas. Podes actualizá-los quando quiseres.",
  },
  {
    icon: Users,
    titulo: "Nós encontramos o melhor grupo para ti",
    texto: "O nosso sistema junta-te a 3 pessoas na tua zona com o melhor match de cromos.",
  },
  {
    icon: MessageCircle,
    titulo: "Marca o encontro via WhatsApp",
    texto: "Quando o grupo estiver completo, combinam tudo num grupo de WhatsApp.",
  },
];

export function OnboardingCarousel() {
  const router = useRouter();
  const [i, setI] = useState(0);
  const ultimo = i === slides.length - 1;
  const S = slides[i];
  const Icon = S.icon;

  return (
    <div className="flex min-h-[70dvh] flex-col justify-between">
      <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
        <div className="flex size-24 items-center justify-center rounded-full bg-primary-50 text-primary">
          <Icon className="size-12" />
        </div>
        <h1 className="mt-6 font-display text-2xl font-bold text-navy">
          {S.titulo}
        </h1>
        <p className="mt-3 max-w-sm text-muted-foreground">{S.texto}</p>
      </div>

      <div className="space-y-4 p-4">
        <div className="flex justify-center gap-2" aria-hidden>
          {slides.map((_, idx) => (
            <span
              key={idx}
              className={cn(
                "h-2 rounded-full transition-all",
                idx === i ? "w-6 bg-primary" : "w-2 bg-muted",
              )}
            />
          ))}
        </div>
        <Button
          variant="primary"
          size="lg"
          block
          onClick={() => (ultimo ? router.push("/dashboard") : setI((v) => v + 1))}
        >
          {ultimo ? "Ir para o Dashboard" : "Continuar"}
        </Button>
        {!ultimo && (
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="mx-auto block text-sm text-muted-foreground hover:text-navy"
          >
            Saltar
          </button>
        )}
      </div>
    </div>
  );
}
