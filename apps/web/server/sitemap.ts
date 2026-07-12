import { defineHandler } from "nitro";

/**
 * /sitemap.xml を動的生成する。トップ・Archive に加え、公開議案(/bills/:id)と
 * 会期ページ(/sessions/:slug/bills)を列挙する。議案一覧は api から取得する
 * （SSR と同じく Service Binding、ローカルは HTTP fallback）。
 */
interface ApiBinding {
  fetch: (request: Request) => Promise<Response>;
}

function getApiBinding(req: unknown): ApiBinding | undefined {
  const fromReq = (
    req as { runtime?: { cloudflare?: { env?: { API?: ApiBinding } } } }
  )?.runtime?.cloudflare?.env?.API;
  const fromGlobal = (globalThis as { __env__?: { API?: ApiBinding } }).__env__
    ?.API;
  return fromReq ?? fromGlobal;
}

type SitemapUrl = { loc: string; priority: string; changefreq: string };

export default defineHandler(async (event) => {
  const req = event.req as Request;
  const host = req.headers.get("host") ?? "localhost:3001";
  const proto =
    host.startsWith("localhost") || host.startsWith("127.0.0.1")
      ? "http"
      : "https";
  const base = `${proto}://${host}`;

  const api = getApiBinding(req);
  const call = (path: string): Promise<Response> =>
    api
      ? api.fetch(new Request(`https://api.internal${path}`))
      : fetch(`${process.env.API_ORIGIN ?? "http://localhost:8787"}${path}`);

  let bills: { id: string }[] = [];
  let sessions: { slug: string | null }[] = [];
  try {
    const [billsRes, sessionsRes] = await Promise.all([
      call("/api/bills"),
      call("/api/council-sessions"),
    ]);
    if (billsRes.ok) {
      bills =
        ((await billsRes.json()) as { bills?: { id: string }[] }).bills ?? [];
    }
    if (sessionsRes.ok) {
      sessions =
        (
          (await sessionsRes.json()) as {
            councilSessions?: { slug: string | null }[];
          }
        ).councilSessions ?? [];
    }
  } catch {
    // 取得失敗時は静的 URL のみ返す（sitemap を落とさない）
  }

  const urls: SitemapUrl[] = [
    { loc: `${base}/`, priority: "1.0", changefreq: "daily" },
    { loc: `${base}/archive`, priority: "0.6", changefreq: "weekly" },
    ...bills.map((b) => ({
      loc: `${base}/bills/${b.id}`,
      priority: "0.8",
      changefreq: "weekly",
    })),
    ...sessions
      .filter((s): s is { slug: string } => Boolean(s.slug))
      .map((s) => ({
        loc: `${base}/sessions/${s.slug}/bills`,
        priority: "0.5",
        changefreq: "weekly",
      })),
  ];

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) =>
      `  <url><loc>${u.loc}</loc><changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`
  )
  .join("\n")}
</urlset>`;

  return new Response(body, {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
});
