import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Check } from "lucide-react";

export const metadata: Metadata = {
  title: "Design System — Trocata",
};

/** Escalas de cor a mostrar (token → passos disponíveis). */
const colorScales = [
  { name: "primary", label: "Verde Panini (primário)" },
  { name: "navy", label: "Azul escuro (secundário)" },
  { name: "gold", label: "Dourado (Mundial 2026)" },
] as const;
const steps = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900] as const;

const semantic = [
  { cls: "bg-primary", label: "primary", hex: "#00A651" },
  { cls: "bg-navy", label: "navy", hex: "#1A3A5C" },
  { cls: "bg-gold", label: "gold", hex: "#C9A227" },
  { cls: "bg-ink", label: "ink", hex: "#10151C" },
  { cls: "bg-alert", label: "alert", hex: "#FF6B35" },
  { cls: "bg-danger", label: "danger", hex: "#E63946" },
  { cls: "bg-wc-red", label: "wc-red", hex: "#E4002B" },
  { cls: "bg-wc-blue", label: "wc-blue", hex: "#0057FF" },
  { cls: "bg-wc-yellow", label: "wc-yellow", hex: "#FFC72C" },
  { cls: "bg-wc-purple", label: "wc-purple", hex: "#8B2FC9" },
];

const typeScale = [
  { cls: "text-4xl", label: "4xl · 32px · Título hero" },
  { cls: "text-3xl", label: "3xl · 28px · Título" },
  { cls: "text-2xl", label: "2xl · 24px" },
  { cls: "text-xl", label: "xl · 20px · Subtítulo" },
  { cls: "text-lg", label: "lg · 18px" },
  { cls: "text-base", label: "base · 16px · Corpo" },
  { cls: "text-sm", label: "sm · 14px" },
  { cls: "text-xs", label: "xs · 12px · Legenda" },
];

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <h2 className="font-display text-2xl font-semibold text-navy">{title}</h2>
      {children}
    </section>
  );
}

export default function DesignSystemPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-12 px-4 py-10">
      <header className="space-y-2">
        <Badge variant="especial">Design System</Badge>
        <h1 className="font-display text-4xl font-bold text-navy">Trocata</h1>
        <p className="text-muted-foreground">
          Referência viva de tokens e componentes. Paleta inspirada na
          identidade Panini (verde/azul) e no emblema do Mundial 2026
          (preto/dourado).
        </p>
      </header>

      {/* CORES ------------------------------------------------------------- */}
      <Section title="Cores semânticas">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {semantic.map((c) => (
            <div key={c.label} className="space-y-1">
              <div className={`h-16 rounded-card ${c.cls}`} />
              <p className="text-sm font-medium">{c.label}</p>
              <p className="font-mono text-xs text-muted-foreground">{c.hex}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Escalas (50 → 900)">
        <div className="space-y-4">
          {colorScales.map((scale) => (
            <div key={scale.name} className="space-y-1">
              <p className="text-sm font-medium">{scale.label}</p>
              <div className="flex overflow-hidden rounded-card">
                {steps.map((s) => (
                  <div
                    key={s}
                    className={`h-12 flex-1 bg-${scale.name}-${s}`}
                    title={`${scale.name}-${s}`}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* TIPOGRAFIA -------------------------------------------------------- */}
      <Section title="Tipografia">
        <p className="text-sm text-muted-foreground">
          Títulos: Archivo (800/900, itálico para cartaz desportivo) · Corpo: Inter
        </p>
        <div className="space-y-2">
          {typeScale.map((t) => (
            <p key={t.cls} className={`font-display ${t.cls} text-navy`}>
              {t.label}
            </p>
          ))}
        </div>
      </Section>

      {/* BOTÕES ------------------------------------------------------------ */}
      <Section title="Botões">
        <div className="flex flex-wrap gap-3">
          <Button variant="primary">Primário</Button>
          <Button variant="secondary">Secundário</Button>
          <Button variant="gold">Dourado</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Perigo</Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm">Pequeno</Button>
          <Button size="md">Médio</Button>
          <Button size="lg">Grande</Button>
          <Button size="icon" aria-label="Procurar">
            <Search />
          </Button>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button disabled>Desactivado</Button>
          <Button loading>A carregar</Button>
          <Button variant="primary">
            <Check /> Com ícone
          </Button>
        </div>
        <Button block variant="primary" size="lg">
          <Search /> Procurar Pool de Troca
        </Button>
      </Section>

      {/* INPUTS ------------------------------------------------------------ */}
      <Section title="Campos de formulário">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome/Alcunha" htmlFor="ds-nome" hint="Como queres ser chamado?">
            <Input id="ds-nome" placeholder="O teu nome" />
          </Field>
          <Field
            label="Email"
            htmlFor="ds-email"
            error="Este email já está registado"
          >
            <Input id="ds-email" type="email" defaultValue="ola@" error />
          </Field>
        </div>
      </Section>

      {/* BADGES ------------------------------------------------------------ */}
      <Section title="Badges">
        <div className="flex flex-wrap gap-2">
          <Badge variant="neutral">Neutro</Badge>
          <Badge variant="repetido">Repetido · 3x</Badge>
          <Badge variant="falta">Em falta</Badge>
          <Badge variant="confirmado">
            <Check className="size-3" /> Confirmado
          </Badge>
          <Badge variant="pendente">A aguardar</Badge>
          <Badge variant="especial">Especial</Badge>
        </div>
      </Section>

      {/* CARDS ------------------------------------------------------------- */}
      <Section title="Cards">
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Estás pronto para trocar! 🎉</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Tens 12 repetidos e 8 em falta. Procura um pool na tua zona.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Pool #A4F2</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-2">
              <Avatar name="Ana Silva" size="sm" />
              <Avatar name="Bruno Costa" size="sm" />
              <Avatar name="Carla Dias" size="sm" />
              <Avatar name="Tu" size="sm" />
            </CardContent>
          </Card>
        </div>
      </Section>

      {/* AVATARES + SKELETON ---------------------------------------------- */}
      <Section title="Avatares & Skeletons">
        <div className="flex items-center gap-3">
          <Avatar name="Ana Silva" size="sm" />
          <Avatar name="Bruno Costa" size="md" />
          <Avatar name="Carla Dias" size="lg" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-24 w-full" />
        </div>
      </Section>

      {/* RAIOS & SOMBRAS --------------------------------------------------- */}
      <Section title="Raios & Sombras">
        <div className="flex flex-wrap gap-4">
          <div className="rounded-input border border-border bg-card px-4 py-6 text-sm shadow-card">
            radius-input · 6px
          </div>
          <div className="rounded-button border border-border bg-card px-4 py-6 text-sm shadow-card">
            radius-button · 8px
          </div>
          <div className="rounded-card border border-border bg-card px-4 py-6 text-sm shadow-card">
            radius-card · 12px
          </div>
        </div>
      </Section>
    </div>
  );
}
