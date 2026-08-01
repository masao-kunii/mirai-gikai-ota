import type { MiddlewareHandler } from "hono";
import { createRemoteJWKSet, type JWTVerifyGetKey, jwtVerify } from "jose";

/**
 * 管理 API（/api/admin/*）の認証境界。
 *
 * 本番は Cloudflare Access（Zero Trust + Google IdP）でドメインを保護し、
 * エッジが検証済みリクエストに `Cf-Access-Jwt-Assertion`（署名付き JWT）を
 * 付与する。ここではその JWT を Access の公開鍵（JWKS）で再検証し、
 * aud / iss を確認して初めて後続ハンドラ（app_admin ロール）へ通す。
 * 自前のログイン/セッションは持たない（TARGET_ARCHITECTURE Phase 4）。
 *
 * 認可モデル（2026-08-01 決定・docs/20260801_0758_adminカットオーバー準備.md §1-1）:
 *   **誰が管理者かは Cloudflare Access のポリシーが唯一の真実**。アプリ側に管理者
 *   テーブルや role は持たず、Access を通ったリクエストは app_admin として扱う。
 *   管理者の追加・削除は Zero Trust のポリシー変更で行う。
 *   → ここに role 判定を足す場合は、この決定自体の見直しとセットで行うこと。
 *
 * フェイルクローズ方針:
 *   - ローカル開発だけ `ADMIN_AUTH_DEV_BYPASS=true` で素通しする。
 *   - 本番でこのフラグは設定しない。設定漏れ（team domain / aud 未設定）時は
 *     誰も通さず 500 を返す（誤って全開放しないため）。
 *
 * 設定（process.env / wrangler vars。nodejs_compat で Workers でも process.env に来る）:
 *   - CF_ACCESS_TEAM_DOMAIN: 例 https://<team>.cloudflareaccess.com
 *   - CF_ACCESS_AUD: Access アプリケーションの Application Audience (AUD) タグ
 *   - ADMIN_AUTH_DEV_BYPASS: ローカル開発時のみ "true"
 */

// JWKS はチームドメイン単位でモジュールスコープにキャッシュする
// （createRemoteJWKSet が鍵を取得・キャッシュする。isolate 内で再利用される）。
let cachedJwks: JWTVerifyGetKey | undefined;
let cachedJwksDomain: string | undefined;

function getJwks(teamDomain: string): JWTVerifyGetKey {
  if (!cachedJwks || cachedJwksDomain !== teamDomain) {
    cachedJwks = createRemoteJWKSet(
      new URL(`${teamDomain}/cdn-cgi/access/certs`)
    );
    cachedJwksDomain = teamDomain;
  }
  return cachedJwks;
}

export const requireAdminAccess: MiddlewareHandler = async (c, next) => {
  // ローカル開発のみバイパス（本番では未設定 → 必ず検証 = フェイルクローズ）
  if (process.env.ADMIN_AUTH_DEV_BYPASS === "true") {
    await next();
    return;
  }

  const teamDomain = process.env.CF_ACCESS_TEAM_DOMAIN;
  const aud = process.env.CF_ACCESS_AUD;
  if (!teamDomain || !aud) {
    // Access 設定漏れ。全開放を避けるため誰も通さない。
    return c.json({ error: "admin_auth_misconfigured" }, 500);
  }

  const token = c.req.header("Cf-Access-Jwt-Assertion");
  if (!token) {
    return c.json({ error: "unauthorized" }, 401);
  }

  try {
    await jwtVerify(token, getJwks(teamDomain), {
      issuer: teamDomain,
      audience: aud,
    });
  } catch {
    return c.json({ error: "unauthorized" }, 401);
  }

  await next();
};
