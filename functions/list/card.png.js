// GET /list/card.png?id=<path-id>
// Dynamic share card for a reading path: path title + subtitle over the first
// reading's photo. Edge-cached. (Not claimed by the app — it's an image URL.)

import { ImageResponse } from "workers-og";

const BG = "#17140F", CREAM = "#ECE4D6", TERRA = "#C58A66", MUTED = "#B7AA9A";

const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

let FONTS = null;
async function loadFonts(origin) {
  if (FONTS) return FONTS;
  const get = async (p) => (await fetch(`${origin}${p}`, { cf: { cacheEverything: true } })).arrayBuffer();
  const [fr600, nr400, nr400i] = await Promise.all([
    get("/fonts/fraunces-600.woff"),
    get("/fonts/newsreader-400.woff"),
    get("/fonts/newsreader-400-italic.woff"),
  ]);
  FONTS = [
    { name: "Fraunces", data: fr600, weight: 600, style: "normal" },
    { name: "Newsreader", data: nr400, weight: 400, style: "normal" },
    { name: "Newsreader", data: nr400i, weight: 400, style: "italic" },
  ];
  return FONTS;
}

async function sb(env, path) {
  const base = env.SUPABASE_URL, key = env.SUPABASE_ANON_KEY;
  if (!base || !key) return null;
  const r = await fetch(`${base}/rest/v1/${path}`, {
    headers: { apikey: key, authorization: `Bearer ${key}` },
    cf: { cacheTtl: 300, cacheEverything: true },
  });
  if (!r.ok) return null;
  return r.json();
}

async function toDataUri(url) {
  try {
    const r = await fetch(url, { cf: { cacheEverything: true, cacheTtl: 86400 } });
    if (!r.ok) return null;
    const type = r.headers.get("content-type") || "image/jpeg";
    const bytes = new Uint8Array(await r.arrayBuffer());
    let bin = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    return `data:${type};base64,${btoa(bin)}`;
  } catch {
    return null;
  }
}

function titleSize(t) {
  const n = (t || "").length;
  if (n <= 14) return 76;
  if (n <= 22) return 64;
  if (n <= 34) return 52;
  if (n <= 48) return 42;
  return 36;
}

function cardHtml({ title, subtitle, imgUri }) {
  const bgLayer = imgUri
    ? `<img src="${imgUri}" width="1200" height="630" style="position:absolute;top:0;left:0;width:1200px;height:630px;object-fit:cover;" />`
    : "";
  return `
  <div style="width:1200px;height:630px;display:flex;position:relative;background-color:${BG};font-family:Newsreader;">
    ${bgLayer}
    <div style="position:absolute;top:0;left:0;width:1200px;height:630px;display:flex;background-image:linear-gradient(to bottom, rgba(23,20,15,0.14), rgba(23,20,15,0.48) 52%, rgba(23,20,15,0.94));"></div>
    <div style="position:absolute;left:0;bottom:0;width:1200px;display:flex;flex-direction:column;padding:0 72px 66px;">
      <div style="display:flex;font-family:Fraunces;font-weight:600;font-size:20px;letter-spacing:4px;text-transform:uppercase;color:${TERRA};margin-bottom:18px;">A Nightingale reading path</div>
      <div style="display:flex;font-family:Fraunces;font-weight:600;font-size:${titleSize(title)}px;line-height:1.03;color:${CREAM};letter-spacing:-1px;">${esc(title)}</div>
      ${subtitle ? `<div style="display:flex;font-family:Newsreader;font-style:italic;font-size:31px;color:${MUTED};margin-top:16px;">${esc(subtitle)}</div>` : ""}
    </div>
  </div>`;
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const origin = url.origin;
  const id = url.searchParams.get("id");

  let title = "Nightingale", subtitle = "", firstImage = null;
  if (id) {
    const rows = await sb(env, `paths?id=eq.${encodeURIComponent(id)}&select=title,subtitle,reading_ids&limit=1`);
    const path = rows && rows[0];
    if (path) {
      title = path.title || title;
      subtitle = path.subtitle || "";
      const firstId = (path.reading_ids || [])[0];
      if (firstId) {
        const rr = await sb(env, `readings?id=eq.${encodeURIComponent(firstId)}&select=image_url&limit=1`);
        firstImage = rr && rr[0] ? rr[0].image_url : null;
      }
    }
  }

  const [fonts, imgUri] = await Promise.all([
    loadFonts(origin),
    firstImage ? toDataUri(firstImage) : Promise.resolve(null),
  ]);

  const img = new ImageResponse(cardHtml({ title, subtitle, imgUri }), {
    width: 1200,
    height: 630,
    fonts,
    format: "png",
  });
  return new Response(img.body, {
    status: 200,
    headers: {
      "content-type": "image/png",
      "cache-control": "public, max-age=86400, s-maxage=604800, immutable",
    },
  });
}
