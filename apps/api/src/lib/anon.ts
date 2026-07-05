import { z } from "zod";

/**
 * 署名付き匿名 ID クッキー（TARGET_ARCHITECTURE §4.2）。
 *
 * 住民にアカウント登録を求めず、HMAC 署名付きの匿名 UUID で
 * レート制限・コスト集計の主体を識別する。個人特定情報は一切ひもづけない。
 * クッキー削除＝別人になることを許容する（匿名性を優先する設計判断）。
 *
 * ストリーミング応答は Hono の Context を経由しない素の Response を返すため、
 * フレームワークのクッキーヘルパーに依存せず、Request の解析と
 * Set-Cookie 文字列の生成を自前で行う（どの Response にも明示付与できる）。
 * 署名は Web Crypto（crypto.subtle）で Node / Workers 両対応。
 */

const COOKIE_NAME = "mg_anon";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

function getSecret(): string {
  const secret = process.env.ANON_COOKIE_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("ANON_COOKIE_SECRET が未設定です（本番では必須）");
  }
  return "dev-only-anon-cookie-secret";
}

async function hmacHex(value: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function readCookie(req: Request): string | undefined {
  const header = req.headers.get("cookie");
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === COOKIE_NAME) return rest.join("=");
  }
  return undefined;
}

export type AnonIdentity = {
  anonId: string;
  /** 新規発行時のみ。レスポンスの Set-Cookie ヘッダーへ付与する */
  setCookie?: string;
};

/**
 * リクエストの匿名 ID を解決する。有効なクッキーが無ければ新規発行し、
 * 呼び出し側がレスポンスへ付与すべき Set-Cookie 文字列を返す。
 *
 * NOTE: 署名比較は文字列比較で行う。匿名 ID は権限を持たない識別子であり、
 * タイミング攻撃で得られるものが無いため定数時間比較は不要と判断。
 */
export async function resolveAnonId(req: Request): Promise<AnonIdentity> {
  const raw = readCookie(req);
  if (raw) {
    const [id, sig] = raw.split(".");
    if (
      id !== undefined &&
      sig !== undefined &&
      z.uuid().safeParse(id).success &&
      (await hmacHex(id)) === sig
    ) {
      return { anonId: id };
    }
  }

  const id = crypto.randomUUID();
  const attrs = [
    `${COOKIE_NAME}=${id}.${await hmacHex(id)}`,
    "Path=/",
    `Max-Age=${ONE_YEAR_SECONDS}`,
    "HttpOnly",
    "SameSite=Lax",
    ...(process.env.NODE_ENV === "production" ? ["Secure"] : []),
  ];
  return { anonId: id, setCookie: attrs.join("; ") };
}
