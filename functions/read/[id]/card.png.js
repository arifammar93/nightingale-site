// GET /read/{id}/card.png
// Generates the per-reading share image on the fly (workers-og = Satori + resvg),
// composed from the reading's own photo + title + author. Edge-cached after first render.

import { ImageResponse } from "workers-og";

const BG = "#17140F", CREAM = "#ECE4D6", TERRA = "#C58A66", MUTED = "#B7AA9A";

const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

// --- module-scoped caches (reused within an isolate) ---
let FONTS = null;

async function loadFonts(origin) {
  if (FONTS) return FONTS;
  const get = async (path) => {
    const r = await fetch(`${origin}${path}`, { cf: { cacheEverything: true } });
    return r.arrayBuffer();
  };
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

async function fetchReading(env, id) {
  const base = env.SUPABASE_URL, key = env.SUPABASE_ANON_KEY;
  if (!base || !key) return null;
  const url =
    `${base}/rest/v1/readings?id=eq.${encodeURIComponent(id)}` +
    `&status=eq.published&select=id,title,author,image_url&limit=1`;
  const r = await fetch(url, {
    headers: { apikey: key, authorization: `Bearer ${key}` },
    cf: { cacheTtl: 300, cacheEverything: true },
  });
  if (!r.ok) return null;
  return (await r.json())[0] || null;
}

async function toDataUri(url) {
  try {
    const r = await fetch(url, { cf: { cacheEverything: true, cacheTtl: 86400 } });
    if (!r.ok) return null;
    const type = r.headers.get("content-type") || "image/jpeg";
    const bytes = new Uint8Array(await r.arrayBuffer());
    let binary = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return `data:${type};base64,${btoa(binary)}`;
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

function cardHtml({ title, author, imgUri }) {
  const bgLayer = imgUri
    ? `<img src="${imgUri}" width="1200" height="630" style="position:absolute;top:0;left:0;width:1200px;height:630px;object-fit:cover;" />`
    : "";
  return `
  <div style="width:1200px;height:630px;display:flex;position:relative;background-color:${BG};font-family:Newsreader;">
    ${bgLayer}
    <div style="position:absolute;top:0;left:0;width:1200px;height:630px;display:flex;background-image:linear-gradient(to bottom, rgba(23,20,15,0.12), rgba(23,20,15,0.45) 52%, rgba(23,20,15,0.93));"></div>
    <div style="position:absolute;left:0;bottom:0;width:1200px;display:flex;flex-direction:column;padding:0 72px 66px;">
      <div style="display:flex;font-family:Fraunces;font-weight:600;font-size:20px;letter-spacing:4px;text-transform:uppercase;color:${TERRA};margin-bottom:18px;">A reading from Nightingale</div>
      <div style="display:flex;font-family:Fraunces;font-weight:600;font-size:${titleSize(title)}px;line-height:1.03;color:${CREAM};letter-spacing:-1px;">${esc(title)}</div>
      ${author ? `<div style="display:flex;font-family:Newsreader;font-style:italic;font-size:31px;color:${MUTED};margin-top:16px;">${esc(author)}</div>` : ""}
    </div>
  </div>`;
}

export async function onRequest(context) {
  const { params, request, env } = context;
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const origin = new URL(request.url).origin;

  const reading = await fetchReading(env, id);
  const [fonts, imgUri] = await Promise.all([
    loadFonts(origin),
    reading?.image_url ? toDataUri(reading.image_url) : Promise.resolve(null),
  ]);

  const html = cardHtml({
    title: reading?.title || "Nightingale",
    author: reading?.author || "",
    imgUri,
  });

  const img = new ImageResponse(html, { width: 1200, height: 630, fonts, format: "png" });
  // Edge + browser cache the generated PNG.
  return new Response(img.body, {
    status: 200,
    headers: {
      "content-type": "image/png",
      "cache-control": "public, max-age=86400, s-maxage=604800, immutable",
    },
  });
}
