/**
 * Seed de cromos — checklist REAL do álbum Panini FIFA World Cup 2026
 * (48 seleções × 20 cromos + 20 especiais = 980 cromos).
 *
 * Fonte: dados públicos de checklist da comunidade (scripts/data/wc2026-checklist-raw.json),
 * cruzados com as convocatórias oficiais publicadas pela FIFA. Números de cromo (código),
 * jogadores e seleções são factos reais/públicos; a estrutura de secções replica a
 * numeração impressa no álbum oficial da Panini.
 *
 * NOTA LEGAL: isto reproduz a estrutura/numeração do checklist compilado pela Panini.
 * Decisão tomada explicitamente pelo utilizador (troca da abordagem placeholder inicial).
 * Antes de qualquer lançamento público/comercial, validar licenciamento com aconselhamento
 * jurídico — este seed destina-se a desenvolvimento/demo.
 *
 * Uso:
 *   npx tsx scripts/seed-cromos.ts
 * (lê SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY de .env.local)
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  TRADUCAO_EQUIPA,
  NOME_ESPECIAL,
  NOME_SECCAO,
} from "./data/traducoes-equipas";

config({ path: ".env.local" });

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL =
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Faltam SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

interface ChecklistItem {
  code: string;
  team: string;
  section: string;
  foil: boolean;
  name: string;
  detail: string;
  flag: string;
  player: string;
}

interface Row {
  ordem: number;
  numero: string;
  nome: string;
  equipa: string;
  tipo: "jogador" | "escudo" | "especial";
}

const ESPECIAIS = new Set(["Welcome", "Host Countries", "FIFA Museum"]);

/**
 * A fonte de dados (checklist da comunidade) despe acentos de forma
 * inconsistente. Corrige apenas os casos de que temos confiança (jogadores
 * amplamente conhecidos) — não tentamos "adivinhar" grafias de jogadores
 * menos conhecidos das outras 47 selecções.
 */
const CORRECAO_NOME: Record<string, string> = {
  POR3: "José Sá",
  POR4: "Rúben Dias",
  POR11: "Rúben Neves",
  POR16: "Francisco Trincão",
  POR17: "João Félix",
};

function transformar(items: ChecklistItem[]): Row[] {
  return items.map((it, i) => {
    const especial = ESPECIAIS.has(it.section);
    const equipa = especial
      ? NOME_SECCAO[it.section]
      : (TRADUCAO_EQUIPA[it.section] ?? it.section);

    let tipo: Row["tipo"];
    let nome: string;

    if (it.player) {
      tipo = "jogador";
      nome = CORRECAO_NOME[it.code] ?? it.player; // nome próprio — não se traduz
    } else if (it.name.startsWith("Team Logo")) {
      tipo = "escudo";
      nome = `Escudo ${equipa}`;
    } else if (it.name.startsWith("Team Photo")) {
      tipo = "especial";
      nome = `Foto de Equipa ${equipa}`;
    } else {
      tipo = "especial";
      nome = NOME_ESPECIAL[it.name] ?? it.name;
    }

    return { ordem: i + 1, numero: it.code, nome, equipa, tipo };
  });
}

async function main() {
  const raw = JSON.parse(
    readFileSync(join(__dirname, "data/wc2026-checklist-raw.json"), "utf8"),
  ) as ChecklistItem[];

  if (raw.length !== 980) {
    console.warn(`Aviso: esperados 980 registos, encontrados ${raw.length}.`);
  }

  const rows = transformar(raw);
  console.log(`A inserir ${rows.length} cromos (checklist real WC2026)...`);

  const chunk = 200;
  for (let i = 0; i < rows.length; i += chunk) {
    const slice = rows.slice(i, i + chunk);
    const { error } = await supabase
      .from("cromos")
      .upsert(slice, { onConflict: "ordem" });
    if (error) {
      console.error("Erro no lote", i, error.message);
      process.exit(1);
    }
    console.log(`  ${Math.min(i + chunk, rows.length)}/${rows.length}`);
  }
  console.log("Seed concluído ✅");
}

main();
