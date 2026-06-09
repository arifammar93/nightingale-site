# Nightingale — Landing Page

A single-page, static marketing site for the Nightingale reading app. Plain HTML/CSS with a little vanilla JS — no build step.

## Files
- `index.html` — the whole site (styles + script inline)
- `Home Screen.png` — phone mockup used in the hero
- `Assets/` — logos (cream versions are recolored for the dark theme)

## Run locally
Just open `index.html` in a browser, or serve the folder:
```
python3 -m http.server
```
then visit http://localhost:8000

## Deploy to GitHub Pages
1. Create a repo and push this folder (keep `index.html` at the repo root).
2. On GitHub: **Settings → Pages → Build and deployment**.
3. Source: **Deploy from a branch**. Branch: `main`, folder: `/ (root)`. Save.
4. Your site goes live at `https://<username>.github.io/<repo>/` within a minute or two.

That's it — no framework, no build.

## Notes
- The App Store / sign-in / list links are placeholders (`#`); point them where you need.
- Time-bucket chips (1/2/5/10 min) swap the featured quote — edit the `picks` array near the bottom of `index.html`.
- Theme is Pinot dark. Colors live in the `:root` CSS variables at the top, so it's easy to retheme.
- Fonts (Fraunces + Inter) load from Google Fonts.
