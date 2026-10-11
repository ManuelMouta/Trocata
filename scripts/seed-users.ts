/**
 * Seed de utilizadores SINTÉTICOS para testar o matching com volume realista.
 * Cria N contas de teste (email @trocata.test) espalhadas por zonas de Portugal,
 * cada uma com colecção aleatória (repetidos + faltas).
 *
 * Uso:   npx tsx scripts/seed-users.ts [N]
 * Limpar: npx tsx scripts/seed-users.ts --clean
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = process.env.SEED_USER_PASSWORD;
if (!url || !key) {
  console.error("Faltam vars Supabase.");
  process.exit(1);
}
if (!password || password.length < 8) {
  console.error(
    "Define SEED_USER_PASSWORD no .env.local (mínimo 8 caracteres). Não uses uma palavra-passe pessoal.",
  );
  process.exit(1);
}
const s = createClient(url, key, { auth: { persistSession: false } });

// Zonas (cidade, lat, lng) — clusters realistas.
const ZONAS = [
  ["Lisboa", 38.7223, -9.1393],
  ["Amadora", 38.7538, -9.2306],
  ["Oeiras", 38.6969, -9.3096],
  ["Porto", 41.1579, -8.6291],
  ["Vila Nova de Gaia", 41.1239, -8.6118],
  ["Coimbra", 40.2033, -8.4103],
  ["Braga", 41.5454, -8.4265],
] as const;

const PRIMEIROS = ["Ana", "João", "Rita", "Miguel", "Sofia", "Pedro", "Inês", "Rui", "Marta", "Tiago"];

function rndInt(a: number, b: number) {
  return a + Math.floor(Math.random() * (b - a + 1));
}
function sample<T>(arr: T[], n: number): T[] {
  const c = [...arr];
  const out: T[] = [];
  while (out.length < n && c.length) out.push(c.splice(rndInt(0, c.length - 1), 1)[0]);
  return out;
}

async function clean() {
  // apaga todos os utilizadores @trocata.test
  let removed = 0;
  for (let page = 1; page <= 20; page++) {
    const { data } = await s.auth.admin.listUsers({ page, perPage: 200 });
    const testers = (data?.users ?? []).filter((u) => u.email?.endsWith("@trocata.test"));
    for (const u of testers) {
      await s.auth.admin.deleteUser(u.id);
      removed++;
    }
    if (!data || data.users.length < 200) break;
  }
  console.log(`Removidos ${removed} utilizadores de teste.`);
}

async function main() {
  if (process.argv.includes("--clean")) return clean();

  const N = parseInt(process.argv[2] ?? "60", 10);
  const totalCromos = (await s.from("cromos").select("id", { count: "exact", head: true })).count ?? 680;
  const ordens = Array.from({ length: totalCromos }, (_, i) => i + 1);
  const { data: cromosRows } = await s.from("cromos").select("id, ordem");
  const idPorOrdem = new Map<number, number>();
  for (const c of cromosRows ?? []) idPorOrdem.set(c.ordem, c.id);

  console.log(`A criar ${N} utilizadores sintéticos...`);
  for (let i = 0; i < N; i++) {
    const [cidade, lat, lng] = ZONAS[i % ZONAS.length];
    const email = `u${Date.now()}_${i}@trocata.test`;
    const nome = `${PRIMEIROS[i % PRIMEIROS.length]} ${cidade.split(" ")[0]}`;
    const { data: u, error } = await s.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nome },
    });
    if (error || !u.user) {
      console.error("createUser:", error?.message);
      continue;
    }
    const uid = u.user.id;

    // localização com pequeno jitter dentro da zona
    await s.rpc("definir_localizacao_admin", {
      p_uid: uid,
      p_lat: (lat as number) + (Math.random() - 0.5) * 0.05,
      p_lng: (lng as number) + (Math.random() - 0.5) * 0.05,
      p_localidade: cidade,
      p_raio_km: [10, 15, 20, 30][rndInt(0, 3)],
    });

    // colecção: ~40 repetidos + ~40 faltas (disjuntos)
    const escolhidos = sample(ordens, 90);
    const repet = escolhidos.slice(0, 45);
    const falt = escolhidos.slice(45, 90);
    const rows = [
      ...repet.map((o) => ({ utilizador_id: uid, cromo_id: idPorOrdem.get(o)!, quantidade_tem: rndInt(2, 4), precisa: false })),
      ...falt.map((o) => ({ utilizador_id: uid, cromo_id: idPorOrdem.get(o)!, quantidade_tem: 0, precisa: true })),
    ];
    await s.from("colecao_utilizador").insert(rows);
    await s.from("utilizadores").update({ estado: "activo" }).eq("id", uid);

    if ((i + 1) % 10 === 0) console.log(`  ${i + 1}/${N}`);
  }
  console.log("Seed de utilizadores concluído ✅");
}

main();
