/**
 * Preenche cromos.imagem_url com fotos REAIS dos jogadores, mas apenas a
 * partir de fontes livres de licença: a imagem de destaque (page image) da
 * Wikipedia em inglês, que por política de conteúdo não-livre da Wikipedia
 * é, para biografias de pessoas vivas, quase sempre um ficheiro do Wikimedia
 * Commons (licença livre — CC-BY-SA / CC-BY / domínio público).
 *
 * Não há garantia de encontrar foto para todos os 816 jogadores (nomes menos
 * mediáticos podem não ter página, ou a correspondência não é suficientemente
 * confiante). Nesses casos o cromo mantém-se sem imagem_url e o endpoint
 * /api/cromo-img cai de volta no cartão placeholder gerado.
 *
 * Uso:
 *   npx tsx scripts/fetch-fotos-jogadores.ts
 * (lê SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY de .env.local; requer que a
 * migration 0008_imagem_jogador.sql já tenha sido aplicada)
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

config({ path: ".env.local" });

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

const __dirname = dirname(fileURLToPath(import.meta.url));
const CACHE_PATH = join(__dirname, "data/fotos-jogadores-cache.json");

interface ChecklistItem {
  code: string;
  team: string;
  player: string;
}

const raw: ChecklistItem[] = JSON.parse(
  readFileSync(join(__dirname, "data/wc2026-checklist-raw.json"), "utf8"),
);
const equipaInglesPorCodigo = new Map(raw.map((r) => [r.code, r.team]));

// Identifica-nos junto da API da Wikipedia (boa prática / evita bloqueios).
const USER_AGENT = "Trocata/1.0 (app de troca de cromos)";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * A Wikipedia devolve 429 sob carga sustentada (confirmado empiricamente:
 * ~25% dos pedidos falhavam a partir do request ~200 num burst de 250).
 * Sem retry, isso era tratado (incorrectamente) como "sem correspondência"
 * em vez de falha transitória — retry com backoff evita degradar a taxa de
 * sucesso à medida que o script avança.
 */
async function fetchComRetry(url: string, tentativas = 4): Promise<Response | null> {
  for (let i = 0; i < tentativas; i++) {
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    if (res.ok) return res;
    if (res.status !== 429 && res.status !== 503) return res;
    await sleep(500 * 2 ** i);
  }
  return null;
}

/**
 * Entre os resultados de pesquisa, prefere um cujo título seja
 * exactamente o nome do jogador — evita casos como "Kylian Mbappé" perder
 * para "Wilfrid Mbappé" (o pai, também figura do futebol) só por ranking
 * de relevância do motor de busca.
 */
async function wikiMelhorTitulo(query: string, nome?: string): Promise<string | null> {
  const url =
    `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=` +
    `${encodeURIComponent(query)}&format=json&srlimit=3&origin=*`;
  const res = await fetchComRetry(url);
  if (!res || !res.ok) return null;
  const data = await res.json();
  const hits: { title: string }[] = data?.query?.search ?? [];
  if (nome) {
    const exato = hits.find((h) => h.title.toLowerCase() === nome.toLowerCase());
    if (exato) return exato.title;
  }
  return hits[0]?.title ?? null;
}

interface Resumo {
  extract: string;
  description: string;
  thumb: string | null;
  tipo: string;
}

async function wikiResumo(title: string): Promise<Resumo | null> {
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
  const res = await fetchComRetry(url);
  if (!res || !res.ok) return null;
  const data = await res.json();
  return {
    extract: data.extract ?? "",
    description: data.description ?? "",
    thumb: data.thumbnail?.source ?? null,
    tipo: data.type ?? "",
  };
}

/**
 * Gentílicos usados nas biografias da Wikipedia. Sem isto, a verificação de
 * país falhava para dezenas de jogadores legítimos: a bio diz "Dutch
 * professional footballer" e não contém "Netherlands", "Spanish" não contém
 * "Spain", etc. — foi a principal causa de a 1.ª passagem ficar nos 619/816.
 */
const GENTILICO: Record<string, string[]> = {
  Algeria: ["algerian"],
  Argentina: ["argentine", "argentinian"],
  Australia: ["australian"],
  Austria: ["austrian"],
  Belgium: ["belgian"],
  "Bosnia and Herzegovina": ["bosnian"],
  Brazil: ["brazilian"],
  Canada: ["canadian"],
  "Ivory Coast": ["ivorian"],
  "DR Congo": ["congolese"],
  Colombia: ["colombian"],
  "Cape Verde": ["cape verdean", "cabo verdean"],
  Croatia: ["croatian"],
  Curaçao: ["curaçaoan", "curacao", "dutch"],
  "Czech Republic": ["czech"],
  Ecuador: ["ecuadorian", "ecuadorean"],
  Egypt: ["egyptian"],
  England: ["english"],
  Spain: ["spanish"],
  France: ["french"],
  Mexico: ["mexican"],
  USA: ["american", "united states"],
  Germany: ["german"],
  Ghana: ["ghanaian"],
  Haiti: ["haitian"],
  Iran: ["iranian"],
  Iraq: ["iraqi"],
  Jordan: ["jordanian"],
  Japan: ["japanese"],
  "South Korea": ["south korean", "korean"],
  "Saudi Arabia": ["saudi"],
  Morocco: ["moroccan"],
  Netherlands: ["dutch"],
  Norway: ["norwegian"],
  "New Zealand": ["new zealander"],
  Panama: ["panamanian"],
  Paraguay: ["paraguayan"],
  Portugal: ["portuguese"],
  Qatar: ["qatari"],
  "South Africa": ["south african"],
  Scotland: ["scottish"],
  Senegal: ["senegalese"],
  Switzerland: ["swiss"],
  Sweden: ["swedish"],
  Tunisia: ["tunisian"],
  Turkey: ["turkish"],
  Uruguay: ["uruguayan"],
  Uzbekistan: ["uzbek", "uzbekistani"],
};

/** Confiança mínima: descreve um futebolista E menciona o país ou gentílico. */
function confiante(resumo: Resumo, equipaIngles: string): boolean {
  const texto = `${resumo.description} ${resumo.extract}`.toLowerCase();
  const ehFutebolista =
    texto.includes("footballer") ||
    texto.includes("football player") ||
    texto.includes("soccer player"); // Wikipedia usa "soccer" para AUS/EUA/Canadá/NZ
  const termos = [equipaIngles.toLowerCase(), ...(GENTILICO[equipaIngles] ?? [])];
  const paisMencionado = termos.some((t) => texto.includes(t));
  return ehFutebolista && paisMencionado;
}

/**
 * Rejeita fotos de grupo/treino sem recorte identificável do jogador (ex.
 * "...Teamcamp June 2017 (057).jpg" — foto de plantel inteiro). Ficheiros já
 * recortados ("cropped") ou com o nome do próprio jogador entre parêntesis
 * ficam válidos, pois nesses casos alguém já isolou a pessoa certa.
 */
function pareceFotoDeGrupo(urlFoto: string): boolean {
  const nomeFicheiro = decodeURIComponent(urlFoto);
  if (/cropped/i.test(nomeFicheiro)) return false;
  return /team|squad|teamcamp|training|line-?up|celebrat|\bvisits\b|\bmeet\b/i.test(nomeFicheiro);
}

/**
 * Gralhas conhecidas na fonte do checklist (nomes mal escritos que não
 * existem na Wikipedia). Corrige apenas a QUERY de pesquisa — o nome
 * mostrado na app continua a vir da BD.
 */
const CORRECAO_PESQUISA: Record<string, string> = {
  ALG9: "Houssem Aouar", // fonte: "Houssem Aquar"
  ALG12: "Nabil Bentaleb", // fonte: "Nabil Bentalab"
  AUS18: "Kusini Yengi", // fonte: "Kusini Vengi"
  FRA20: "Kylian Mbappé", // nome correcto, mas a pesquisa preferia "Wilfrid Mbappé" (o pai)
};

async function tentarQuery(query: string, equipaIngles: string, nome: string): Promise<string | null> {
  const titulo = await wikiMelhorTitulo(query, nome);
  if (!titulo) return null;
  const resumo = await wikiResumo(titulo);
  if (!resumo || resumo.tipo === "disambiguation" || !resumo.thumb) return null;
  if (!confiante(resumo, equipaIngles)) return null;
  if (pareceFotoDeGrupo(resumo.thumb)) return null;
  return resumo.thumb;
}

async function buscarFoto(nome: string, equipaIngles: string): Promise<string | null> {
  // várias formulações — a mais específica primeiro
  const queries = [
    `${nome} footballer ${equipaIngles}`,
    `${nome} footballer`,
    `${nome} ${equipaIngles}`,
  ];
  for (const q of queries) {
    const foto = await tentarQuery(q, equipaIngles, nome);
    if (foto) return foto;
  }
  return null;
}

async function processarEmLotes<T, R>(
  items: T[],
  tamanhoLote: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const resultados: R[] = [];
  for (let i = 0; i < items.length; i += tamanhoLote) {
    const lote = items.slice(i, i + tamanhoLote);
    const parcial = await Promise.all(lote.map(fn));
    resultados.push(...parcial);
    await sleep(300);
  }
  return resultados;
}

async function main() {
  const { data: jogadores, error } = await supabase
    .from("cromos")
    .select("id, numero, nome, equipa")
    .eq("tipo", "jogador")
    .order("id");

  if (error) {
    console.error("Erro a ler cromos:", error.message);
    process.exit(1);
  }
  if (!jogadores || jogadores.length === 0) {
    console.log("Nenhum cromo de tipo 'jogador' encontrado.");
    return;
  }

  const cache: Record<string, string | null> = existsSync(CACHE_PATH)
    ? JSON.parse(readFileSync(CACHE_PATH, "utf8"))
    : {};

  // Reprocessa também os `null` (falhas anteriores) — as heurísticas melhoram
  // entre execuções (gentílicos, queries de fallback, correcção de gralhas).
  const porProcessar = jogadores.filter((j) => cache[j.numero] == null);
  console.log(
    `${jogadores.length} jogadores no total, ${porProcessar.length} por consultar ` +
      `(${jogadores.length - porProcessar.length} já em cache).`,
  );

  let processados = 0;
  await processarEmLotes(porProcessar, 3, async (j) => {
    const equipaIngles = equipaInglesPorCodigo.get(j.numero) ?? j.equipa;
    const nomePesquisa = CORRECAO_PESQUISA[j.numero] ?? j.nome;
    try {
      cache[j.numero] = await buscarFoto(nomePesquisa, equipaIngles);
    } catch (e) {
      console.error(`Erro em ${j.nome} (${j.numero}):`, (e as Error).message);
      cache[j.numero] = null;
    }
    processados++;
    if (processados % 40 === 0) {
      writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));
      console.log(`  ${processados}/${porProcessar.length}`);
    }
  });
  writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));

  const encontrados = jogadores.filter((j) => cache[j.numero]).length;
  console.log(
    `Fotos encontradas: ${encontrados}/${jogadores.length} ` +
      `(${jogadores.length - encontrados} ficam com o cartão placeholder).`,
  );

  console.log("A actualizar Supabase...");
  const comFoto = jogadores.filter((j) => cache[j.numero]);
  const chunk = 40;
  for (let i = 0; i < comFoto.length; i += chunk) {
    const slice = comFoto.slice(i, i + chunk);
    await Promise.all(
      slice.map((j) =>
        supabase.from("cromos").update({ imagem_url: cache[j.numero] }).eq("id", j.id),
      ),
    );
    console.log(`  actualizados ${Math.min(i + chunk, comFoto.length)}/${comFoto.length}`);
  }
  console.log("Concluído ✅");
}

main();
