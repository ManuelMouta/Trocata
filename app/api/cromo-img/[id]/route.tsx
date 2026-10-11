import { ImageResponse } from "next/og";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** Paleta determinística por equipa (placeholder — sem arte oficial). */
const PALETA = [
  ["#00A651", "#e6f7ee"],
  ["#1A3A5C", "#eef3f8"],
  ["#C9A227", "#fbf6e7"],
  ["#E63946", "#fdecee"],
  ["#FF6B35", "#fff1eb"],
  ["#3f6d97", "#eef3f8"],
];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const USER_AGENT = "Trocata/1.0 (app de troca de cromos)";

/** Só fotos que nós próprios gravámos, a partir do Wikimedia. */
function urlDeFotoPermitida(raw: string): boolean {
  try {
    const url = new URL(raw);
    return url.protocol === "https:" && url.hostname === "upload.wikimedia.org";
  } catch {
    return false;
  }
}

/**
 * Vamos nós próprios buscar a foto (em vez de deixar o satori/next-og
 * seguir o <img src> remoto): sob rajadas de dezenas de pedidos em
 * simultâneo (grelha inteira da colecção), o fetch interno do satori não
 * tem timeout e pode ficar pendurado, derrubando o pedido inteiro
 * (ERR_EMPTY_RESPONSE, cartão permanentemente partido no browser). Com
 * timeout próprio, no pior caso cai para o layout placeholder.
 */
async function buscarFotoDataUri(url: string): Promise<string | null> {
  if (!urlDeFotoPermitida(url)) return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    let res = await fetch(url, {
      signal: controller.signal,
      redirect: "manual",
      headers: { "User-Agent": USER_AGENT },
    });
    if (res.status >= 300 && res.status < 400) {
      const destino = res.headers.get("location");
      const seguinte = destino ? new URL(destino, url).href : "";
      if (!urlDeFotoPermitida(seguinte)) return null;
      res = await fetch(seguinte, {
        signal: controller.signal,
        redirect: "error",
        headers: { "User-Agent": USER_AGENT },
      });
    }
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length > 2_000_000) return null;
    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    if (!contentType.startsWith("image/")) return null;
    return `data:${contentType};base64,${buffer.toString("base64")}`;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Limita a poucos pedidos em simultâneo ao Wikimedia por processo: uma
 * grelha inteira (20-40 cartões) a carregar de uma vez dispara rajadas que
 * levam a 429 do lado do Wikimedia (confirmado empiricamente). Enfileirar
 * em vez de disparar tudo ao mesmo tempo reduz drasticamente essa taxa de
 * falha, à custa de alguma latência adicional por pedido em fila.
 */
const MAX_FETCHES_CONCORRENTES = 4;
let emCurso = 0;
const fila: (() => void)[] = [];

async function comLimiteDeConcorrencia<T>(fn: () => Promise<T>): Promise<T> {
  if (emCurso >= MAX_FETCHES_CONCORRENTES) {
    await new Promise<void>((resolve) => fila.push(resolve));
  }
  emCurso++;
  try {
    return await fn();
  } finally {
    emCurso--;
    fila.shift()?.();
  }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: cromo } = await supabase
    .from("cromos")
    .select("numero, nome, equipa, tipo, imagem_url")
    .eq("id", Number(id))
    .single();

  const nome = cromo?.nome ?? "Cromo";
  const equipa = cromo?.equipa ?? "";
  const numero = cromo?.numero ?? "?";
  const tipo = cromo?.tipo ?? "jogador";
  const foto = cromo?.imagem_url
    ? await comLimiteDeConcorrencia(() => buscarFotoDataUri(cromo.imagem_url!))
    : null;
  const [fg, bg] = PALETA[hash(equipa) % PALETA.length];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: bg,
          border: `12px solid ${fg}`,
          padding: foto ? 16 : 32,
          justifyContent: "space-between",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 32, fontWeight: 700, color: foto ? "#1A3A5C" : fg }}>
            #{numero}
          </span>
          <span
            style={{
              fontSize: 18,
              color: "#fff",
              background: fg,
              padding: "5px 14px",
              borderRadius: 999,
              textTransform: "uppercase",
            }}
          >
            {tipo}
          </span>
        </div>

        {foto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={foto}
            alt=""
            style={{
              width: "100%",
              flex: 1,
              minHeight: 0,
              margin: "10px 0",
              objectFit: "cover",
              borderRadius: 12,
              border: `3px solid ${fg}`,
            }}
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 60, fontWeight: 800, color: "#1A3A5C", lineHeight: 1.1 }}>
              {nome}
            </span>
            <span style={{ fontSize: 34, color: fg, marginTop: 8 }}>{equipa}</span>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column" }}>
          {foto && (
            <span style={{ fontSize: 26, fontWeight: 800, color: "#1A3A5C", lineHeight: 1.15 }}>
              {nome}
            </span>
          )}
          <span style={{ fontSize: foto ? 18 : 20, color: foto ? fg : "#6c757d", marginTop: 4 }}>
            {foto ? equipa : "Trocata · Placeholder"}
          </span>
        </div>
      </div>
    ),
    {
      width: 300,
      height: 400,
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    },
  );
}
