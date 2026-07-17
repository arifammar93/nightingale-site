// GET /read/{id}
// Server-renders the reading page with per-reading Open Graph tags so links
// unfurl into a rich card. Installed-app users never reach this — iOS resolves
// the Universal Link via /.well-known/apple-app-site-association first.

const ORIGIN = "https://nightingale.tambourineai.com";

const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

async function fetchReading(env, id) {
  const base = env.SUPABASE_URL;
  const key = env.SUPABASE_ANON_KEY;
  if (!base || !key) return null;
  const url =
    `${base}/rest/v1/readings?id=eq.${encodeURIComponent(id)}` +
    `&status=eq.published&select=id,title,author,source,pull,body,image_url&limit=1`;
  const r = await fetch(url, {
    headers: { apikey: key, authorization: `Bearer ${key}` },
    cf: { cacheTtl: 300, cacheEverything: true },
  });
  if (!r.ok) return null;
  const rows = await r.json();
  return rows[0] || null;
}

function teaser(body, max = 320) {
  if (!body) return "";
  const first = body.split(/\n\n+/).find((p) => p.trim()) || "";
  return first.length > max ? first.slice(0, max).trimEnd() + "…" : first;
}

function page({ reading, id, cardUrl }) {
  const title = reading.title || "A reading";
  const author = reading.author || "";
  const quote = reading.pull || teaser(reading.body, 160);
  const ogTitle = author ? `${title} — ${author}` : title;
  const readUrl = `${ORIGIN}/read/${encodeURIComponent(id)}`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(ogTitle)} · Nightingale</title>
<meta name="description" content="${esc(quote)}" />

<meta property="og:type" content="article" />
<meta property="og:site_name" content="Nightingale" />
<meta property="og:title" content="${esc(ogTitle)}" />
<meta property="og:description" content="${esc(quote)}" />
<meta property="og:image" content="${esc(cardUrl)}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:url" content="${esc(readUrl)}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(ogTitle)}" />
<meta name="twitter:description" content="${esc(quote)}" />
<meta name="twitter:image" content="${esc(cardUrl)}" />

<link rel="canonical" href="${esc(readUrl)}" />
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
  main{position:relative;z-index:2;flex:1;width:100%;max-width:680px;margin:0 auto;
    padding:clamp(28px,6vw,60px) clamp(22px,5vw,48px) 80px}
  .hero{width:100%;aspect-ratio:1200/630;object-fit:cover;border-radius:var(--radius);
    border:1px solid var(--line);margin-bottom:2.2rem;display:block}
  .eyebrow{font-size:.72rem;letter-spacing:.2em;text-transform:uppercase;color:var(--terra);font-weight:600}
  h1.title{font-size:clamp(2rem,6vw,3rem);margin:.5rem 0 .3rem}
  .author{color:var(--muted);font-size:1.05rem;font-style:italic}
  .pull{margin:2.2rem 0;padding:1.3rem 1.5rem;border-left:2px solid var(--terra);
    background:var(--surface);border-radius:0 var(--radius) var(--radius) 0;
    font-size:clamp(1.2rem,3.2vw,1.5rem);line-height:1.45;color:var(--cream-2);font-style:italic}
  .body{font-size:1.13rem;color:var(--cream-2)}
  .body p{margin:0 0 1.15rem}
  .cta{margin-top:2.6rem;padding-top:2rem;border-top:1px solid var(--line)}
  .cta p{color:var(--muted);margin-bottom:1rem}
  .btn{display:inline-flex;align-items:center;gap:.6rem;padding:.85rem 1.5rem;border-radius:999px;
    background:var(--cream);color:var(--bg);font-family:'Fraunces',Georgia,serif;font-weight:600;font-size:1rem;
    transition:transform .3s var(--ease),background .3s var(--ease)}
  .btn:hover{transform:translateY(-2px);background:#fff}
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
    ${reading.image_url ? `<img class="hero" src="${esc(reading.image_url)}" alt="" />` : ""}
    <p class="eyebrow">A reading from Nightingale</p>
    <h1 class="title">${esc(title)}</h1>
    ${author ? `<p class="author">${esc(author)}${reading.source ? " · " + esc(reading.source) : ""}</p>` : ""}
    ${reading.pull ? `<blockquote class="pull">${esc(reading.pull)}</blockquote>` : ""}
    <div class="body"><p>${esc(teaser(reading.body, 420))}</p></div>
    <div class="cta">
      <p>Read this and more in the Nightingale app — a quiet place to read, by mood and by the minute.</p>
      <a class="badge-link" href="https://apps.apple.com/us/app/id6778192267" target="_blank" rel="noopener" aria-label="Download Nightingale on the App Store">
        <img src="/Assets/Download_on_App_Store/White_lockup/SVG/Download_on_the_App_Store_Badge_US-UK_RGB_wht_092917.svg" alt="Download on the App Store" width="120" height="40" />
      </a>
    </div>
  </main>
  <footer>© Nightingale · <a href="/">nightingale.tambourineai.com</a></footer>
</body>
</html>`;
}

export async function onRequest(context) {
  const { params, request, env } = context;
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const origin = new URL(request.url).origin;

  const reading = await fetchReading(env, id);

  // Unknown / unpublished id → serve the branded generic fallback (200 so the
  // link still previews), not a 404.
  if (!reading) {
    const res = await fetch(`${origin}/read`);
    return new Response(res.body, {
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }

  const cardUrl = `${origin}/read/${encodeURIComponent(id)}/card.png`;
  return new Response(page({ reading, id, cardUrl }), {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=300, s-maxage=600",
    },
  });
}
