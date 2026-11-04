// Renders the Open Graph cards into public/og/ with headless Chrome.
// Usage: pnpm dev (running), then `node scripts/og.mjs [http://localhost:3206]`.
// Each post card takes a live frame of that post's isometric figure from the home page.
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const BASE = process.argv[2] ?? "http://localhost:3206";
const CHROME = process.env.CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OUT = new URL("../public/og/", import.meta.url).pathname;
const tmp = mkdtempSync(join(tmpdir(), "og-"));
const chrome = (...args) => execFileSync(CHROME, ["--headless", "--disable-gpu", "--hide-scrollbars", ...args], { encoding: "utf8", maxBuffer: 1 << 26, stdio: ["ignore", "pipe", "ignore"] });

// Let the figures animate a few seconds so the still isn't the resting first frame.
const dom = chrome("--window-size=1400,5000", "--virtual-time-budget=3500", "--dump-dom", BASE + "/");
const styles = (dom.match(/<style[^>]*>[\s\S]*?<\/style>/g) ?? []).join("\n");

/** Outer markup of every `<svg class="iso-svg">`, balancing nested svgs. */
function figures(html) {
  const out = [];
  for (let i = html.indexOf('<svg class="iso-svg"'); i >= 0; i = html.indexOf('<svg class="iso-svg"', i + 1)) {
    const re = /<svg\b|<\/svg>/g; re.lastIndex = i; let depth = 0, m;
    while ((m = re.exec(html))) { depth += m[0] === "</svg>" ? -1 : 1; if (!depth) break; }
    out.push(html.slice(i, re.lastIndex));
  }
  return out;
}
const figs = figures(dom);
// Same order as PAPERS on the home page.
const slugs = [...dom.matchAll(/class="post-row-art"[^>]*href="\/research\/([^"]+)"|href="\/research\/([^"]+)"[^>]*class="post-row-art"/g)].map((m) => m[1] ?? m[2]);
const titles = [...dom.matchAll(/<h2[^>]*><a href="\/research\/[^"]+"[^>]*>([\s\S]*?)<\/a><\/h2>/g)].map((m) => m[1]);
if (figs.length !== slugs.length || titles.length !== slugs.length) throw new Error(`found ${figs.length} figures, ${slugs.length} slugs, ${titles.length} titles`);

const LOGO = (size) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffb36b"/><stop offset="1" stop-color="#ed6300"/></linearGradient></defs><ellipse cx="12" cy="5" rx="10" ry="3" fill="url(#g)"/><ellipse cx="12" cy="12" rx="5.6" ry="2.4" fill="url(#g)"/><circle cx="12" cy="18.6" r="2.4" fill="url(#g)"/></svg>`;

const page = (body) => `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Instrument+Sans:wght@400..700&display=swap">
${styles}
<style>
  html, body { margin: 0; width: 1200px; height: 630px; overflow: hidden; background: var(--paper); }
  .og { position: relative; width: 1200px; height: 630px; overflow: hidden; font-family: "Instrument Sans", sans-serif; color: var(--ink); }
  .og .glow { opacity: .32; } .og .glow::before, .og .glow::after, .og .glow span { animation: none; }
  .og > *:not(.glow) { position: relative; z-index: 1; }
  .og-brand { display: flex; align-items: center; gap: 12px; font-size: 24px; font-weight: 500; letter-spacing: -0.01em; }
  .home { display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
  .home h1 { margin: 36px 0 0; font-size: 84px; line-height: 1; letter-spacing: -0.035em; font-weight: 500; }
  .home p { margin: 22px 0 0; font-size: 38px; color: var(--ink-2); letter-spacing: -0.02em; }
  .og-post { display: grid; grid-template-columns: 1fr 580px; align-items: center; gap: 16px; padding: 0 36px 0 72px; box-sizing: border-box; }
  .og-post h1 { margin: 36px 0 0; font-size: 58px; line-height: 1.05; letter-spacing: -0.035em; font-weight: 500; text-wrap: balance; }
  .og-post .iso-svg { width: 100%; height: auto; }
</style></head><body>${body}</body></html>`;

function shot(name, html) {
  const file = join(tmp, name + ".html");
  writeFileSync(file, html);
  chrome("--window-size=1200,630", "--virtual-time-budget=3000", `--screenshot=${join(OUT, name + ".png")}`, "file://" + file);
  console.log("public/og/" + name + ".png");
}

mkdirSync(OUT, { recursive: true });
const glow = `<div class="glow" aria-hidden="true"><span></span></div>`;
shot("home", page(`<div class="og home">${glow}${LOGO(120)}<h1>Telepath Research</h1><p>Intelligence that evolves</p></div>`));
slugs.forEach((slug, i) => shot(slug, page(
  `<div class="og og-post">${glow}<div><div class="og-brand">${LOGO(30)}Telepath Research</div><h1>${titles[i]}</h1></div><div class="iso" data-theme="light">${figs[i]}</div></div>`,
)));
