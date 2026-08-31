// GET /list?type=path&id=<path-id>
// Server-renders a reading-path page (web fallback + link preview) for anyone
// without the app. Installed-app users never reach this — iOS resolves the
// Universal Link (/list is claimed in apple-app-site-association) first.

const ORIGIN = "https://nightingale.tambourineai.com";
const APP_STORE = "https://apps.apple.com/us/app/id6778192267";
const BADGE = "/Assets/Download_on_App_Store/White_lockup/SVG/Download_on_the_App_Store_Badge_US-UK_RGB_wht_092917.svg";

const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

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

async function fetchPath(env, id) {
  const rows = await sb(env, `paths?id=eq.${encodeURIComponent(id)}&select=id,title,subtitle,reading_ids&limit=1`);
  return rows && rows[0] ? rows[0] : null;
}

async function fetchReadings(env, ids) {
  if (!ids || !ids.length) return [];
  const list = ids.map((i) => `"${i}"`).join(",");
  const rows = await sb(env, `readings?id=in.(${encodeURIComponent(list)})&status=eq.published&select=id,title,author`);
  if (!rows) return [];
  const byId = Object.fromEntries(rows.map((r) => [r.id, r]));
  return ids.map((i) => byId[i]).filter(Boolean); // preserve path order
}

function genericFallback(origin) {
  return fetch(`${origin}/read`).then((res) =>
    new Response(res.body, { status: 200, headers: { "content-type": "text/html; charset=utf-8" } })
  );
}

function page({ path, readings, id, cardUrl }) {
  const title = path.title || "A reading path";
  const subtitle = path.subtitle || "A curated path from Nightingale.";
  const listUrl = `${ORIGIN}/list?type=path&id=${encodeURIComponent(id)}`;

  const items = readings
    .map(
      (r) =>
        `<li><span class="rt">${esc(r.title)}</span>${r.author ? `<span class="ra">${esc(r.author)}</span>` : ""}</li>`
    )
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)} · Nightingale</title>
<meta name="description" content="${esc(subtitle)}" />

<meta property="og:type" content="website" />
<meta property="og:site_name" content="Nightingale" />
<meta property="og:title" content="${esc(title)} — a reading path" />
<meta property="og:description" content="${esc(subtitle)}" />
<meta property="og:image" content="${esc(cardUrl)}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:url" content="${esc(listUrl)}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(title)} — a reading path" />
<meta name="twitter:description" content="${esc(subtitle)}" />
<meta name="twitter:image" content="${esc(cardUrl)}" />

<link rel="canonical" href="${esc(listUrl)}" />
<link rel="icon" href="/Assets/Nightingale_Home_Logo-cream.svg" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;1,9..144,600&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400&display=swap" rel="stylesheet" />
<style>
  :root{--bg:#17140F;--surface:#231719;--line:rgba(236,228,214,.12);
    --cream:#ECE4D6;--cream-2:#D8CAC3;--muted:#A2918B;--muted-2:#7E6F6A;--terra:#C58A66;
    --radius:18px;--ease:cubic-bezier(.22,.61,.36,1);}
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:var(--bg);color:var(--cream);
    font-family:'Newsreader',Georgia,serif;line-height:1.7;-webkit-font-smoothing:antialiased;
    min-height:100vh;display:flex;flex-direction:column}
  body::after{content:"";position:fixed;inset:0;z-index:0;pointer-events:none;opacity:.035;
    background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")}
  a{color:inherit;text-decoration:none}
  h1{font-family:'Fraunces',Georgia,serif;font-weight:600;letter-spacing:-.015em;line-height:1.08}
  header{position:relative;z-index:2;padding:26px clamp(22px,5vw,48px)}
  header img{height:26px;width:auto;display:block}
  main{position:relative;z-index:2;flex:1;width:100%;max-width:640px;margin:0 auto;
    padding:clamp(28px,6vw,60px) clamp(22px,5vw,48px) 80px}
  .eyebrow{font-size:.72rem;letter-spacing:.2em;text-transform:uppercase;color:var(--terra);font-weight:600}
  h1.title{font-size:clamp(2rem,6vw,3rem);margin:.5rem 0 .5rem}
  .subtitle{color:var(--cream-2);font-style:italic;font-size:1.2rem;margin-bottom:.5rem}
  .count{color:var(--muted);font-size:.95rem;margin-bottom:2rem}
  ol.readings{list-style:none;counter-reset:r;border-top:1px solid var(--line);margin-top:1.5rem}
  ol.readings li{counter-increment:r;display:flex;flex-direction:column;gap:2px;
    padding:1.05rem 0 1.05rem 2.4rem;border-bottom:1px solid var(--line);position:relative}
  ol.readings li::before{content:counter(r);position:absolute;left:0;top:1.1rem;
    font-family:'Fraunces',Georgia,serif;color:var(--terra);font-size:1rem;font-weight:600}
  .rt{font-family:'Fraunces',Georgia,serif;font-size:1.2rem;color:var(--cream)}
  .ra{color:var(--muted);font-style:italic;font-size:1rem}
  .cta{margin-top:2.6rem;padding-top:2rem;border-top:1px solid var(--line)}
  .cta p{color:var(--muted);margin-bottom:1rem}
  .badge-link{display:inline-block;line-height:0;padding:6px;
    transition:transform .3s var(--ease),opacity .3s var(--ease)}
  .badge-link:hover{transform:translateY(-2px);opacity:.9}
  .badge-link img{height:54px;width:auto;display:block}
  @media(max-width:640px){.badge-link img{height:46px}}
  footer{position:relative;z-index:2;padding:32px clamp(22px,5vw,48px);
    color:var(--muted-2);font-size:.85rem;border-top:1px solid var(--line);text-align:center}
</style>
</head>
<body>
  <header><a href="/"><img src="/Assets/Wordmark-cream.svg" alt="Nightingale" /></a></header>
  <main>
    <p class="eyebrow">A reading path</p>
    <h1 class="title">${esc(title)}</h1>
    <p class="subtitle">${esc(subtitle)}</p>
    <p class="count">${readings.length} reading${readings.length === 1 ? "" : "s"}</p>
    ${items ? `<ol class="readings">${items}</ol>` : ""}
    <div class="cta">
      <p>Follow this path in the Nightingale app — a quiet place to read, by mood and by the minute.</p>
      <a class="badge-link" href="${APP_STORE}" target="_blank" rel="noopener" aria-label="Download Nightingale on the App Store">
        <img src="${BADGE}" alt="Download on the App Store" width="120" height="40" />
      </a>
    </div>
  </main>
  <footer>© Nightingale · <a href="/">nightingale.tambourineai.com</a></footer>
</body>
</html>`;
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const origin = url.origin;
  const id = url.searchParams.get("id");

  if (!id) return genericFallback(origin);

  const path = await fetchPath(env, id);
  if (!path) return genericFallback(origin);

  const readings = await fetchReadings(env, path.reading_ids || []);
  const cardUrl = `${origin}/list/card.png?id=${encodeURIComponent(id)}`;

  return new Response(page({ path, readings, id, cardUrl }), {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=300, s-maxage=600",
    },
  });
}
