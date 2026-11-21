// Password gate for /deck. The deck is one static file, so the check has to happen before it is served:
//  - on Vercel, a route in .vercel/output/config.json (DECK_GATE_ROUTES, passed to modulato in vite.config.ts) rewrites any
//    /deck request that lacks the unlock cookie to the __deckgate function (scripts/deck-gate-output.mjs writes it);
//  - in dev, gateMiddleware does the same inside Vite's server.
// Both end in handle(): it serves the password page (cover-style, below) and, on a correct password, sets the cookie and
// sends the visitor on to the deck. Only a SHA-256 of the password lives here; the cookie holds a token derived from it,
// so changing the password signs everyone out. Plain Node, no dependencies: the function copies this file as is.
import { createHash, timingSafeEqual } from 'node:crypto'

const sha256 = (s) => createHash('sha256').update(s).digest()

/** SHA-256 of the deck password. To change it: printf '<new password>' | shasum -a 256 */
export const PASSWORD_SHA256 = 'ee2a589eb3c7f9581cf708dc0876ed51b5d2c395b315cadef05a95aee37e43ce'
export const COOKIE = 'tp_deck'
export const TOKEN = sha256(`telepath-deck:${PASSWORD_SHA256}`).toString('hex')
const MAX_AGE = 60 * 60 * 24 * 30 // a month

/** Build Output API routes: /deck and anything under it, without the cookie, goes to the gate. */
export const DECK_GATE_ROUTES = [
  { src: '^/deck(?:/.*)?$', missing: [{ type: 'cookie', key: COOKIE, value: TOKEN }], dest: '/__deckgate' },
]

export function unlocked(cookieHeader = '') {
  for (const part of cookieHeader.split(';')) {
    const i = part.indexOf('=')
    if (i > 0 && part.slice(0, i).trim() === COOKIE) return part.slice(i + 1).trim() === TOKEN
  }
  return false
}

const isDeckPath = (p) => /^\/deck(?:\/|$)/.test(p)

/** Where to go after unlocking: a /deck path (with its slide hash), never anywhere else. */
function safeNext(next) {
  return typeof next === 'string' && /^\/deck(?:\/[\w./-]*)?(?:#[\w-]*)?$/.test(next) ? next : '/deck'
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = ''
    req.setEncoding('utf8')
    req.on('data', (c) => {
      data += c
      if (data.length > 4096) req.destroy() // a password form is tiny
    })
    req.on('end', () => resolve(data))
    req.on('error', reject)
  })
}

function send(res, status, html) {
  res.statusCode = status
  res.setHeader('content-type', 'text/html; charset=utf-8')
  res.setHeader('cache-control', 'no-store')
  res.setHeader('x-robots-tag', 'noindex')
  res.end(html)
}

/** Node (req, res): the Vercel function's handler and the dev middleware's. */
export async function handle(req, res) {
  if (req.method === 'POST') {
    const form = new URLSearchParams(await readBody(req))
    const ok = timingSafeEqual(sha256(form.get('password') ?? ''), Buffer.from(PASSWORD_SHA256, 'hex'))
    if (!ok) return send(res, 401, page(true, safeNext(form.get('next'))))
    const https = (req.headers['x-forwarded-proto'] ?? '').split(',')[0].trim() === 'https' || req.socket?.encrypted
    res.statusCode = 303
    res.setHeader('set-cookie', `${COOKIE}=${TOKEN}; Path=/; Max-Age=${MAX_AGE}; HttpOnly; SameSite=Lax${https ? '; Secure' : ''}`)
    res.setHeader('location', safeNext(form.get('next')))
    res.setHeader('cache-control', 'no-store')
    return res.end()
  }
  return send(res, 200, page(false))
}

/** Vite middleware: gate /deck in dev exactly as the Vercel route does in production. */
export function gateMiddleware(req, res, next) {
  const path = (req.url ?? '').split('?')[0]
  if (path === '/__deckgate' || (isDeckPath(path) && !unlocked(req.headers.cookie))) {
    handle(req, res).catch(next)
    return
  }
  next()
}

// The deck's orange ground (keep in step with --orange in public/deck/index.html)
const ORANGE = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='1 0 0 0 0 1 0 0 0 0 1 0 0 0 0 0 0 0 0 .04'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E") 0 0/160px 160px,radial-gradient(140% 105% at 50% 0%,rgba(80,16,0,0) 58%,rgba(80,16,0,.11) 100%),linear-gradient(180deg,#fc9a56 0%,#fb9450 5%,#fa8e49 10%,#f88842 15%,#f6823d 20%,#f47b39 25%,#f17533 30%,#ee6f2e 35%,#ea6829 40%,#e56223 45%,#e15b20 50%,#da551b 55%,#d34f19 60%,#cb4916 65%,#c44312 70%,#ba3d0f 75%,#b1370d 80%,#a8310b 85%,#9d2c0a 90%,#922708 95%,#882207 100%)`

// The password page, in the cover's vibe: the orange ground, the liquid-glass mark at the top, and at the foot the glass
// "Telepath" caption and headline over a glass pill to type into. The social-card tags match the deck's, so a shared
// /deck link still previews the same way.
function page(wrong, next = '/deck') {
  return `<!doctype html>
<html lang="en">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Telepath - Intelligence that grows</title>
<meta name="description" content="Telepath pitch deck.">
<meta name="robots" content="noindex">
<meta name="theme-color" content="#e56223">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Telepath">
<meta property="og:title" content="Telepath - Intelligence that grows">
<meta property="og:description" content="Telepath pitch deck.">
<meta property="og:url" content="https://telepath-research.vercel.app/deck">
<meta property="og:image" content="https://telepath-research.vercel.app/og/telepath.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="https://telepath-research.vercel.app/og/telepath.png">
<link rel="icon" type="image/png" sizes="64x64" href="/favicon.png">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@400&display=swap">
<style>
html{-webkit-text-size-adjust:100%;text-size-adjust:100%;background:#e56223}
html,body{margin:0;min-height:100%}
body{background:${ORANGE};background-attachment:fixed;color:#fff;font-family:Geist,system-ui,sans-serif;font-weight:400;-webkit-font-smoothing:antialiased}
main{box-sizing:border-box;min-height:100vh;min-height:100svh;display:flex;flex-direction:column;justify-content:space-between;gap:64px;padding:clamp(32px,5vw,96px) clamp(24px,7vw,134px) clamp(40px,5vw,96px)}
/* the mark: a pill over two circles, each liquid glass (as on the cover) */
.mark{position:relative;display:block;width:clamp(72px,7.24vw,139px);aspect-ratio:110/113.2}
.mark i{position:absolute;left:35.27%;width:29.41%;height:28.58%;border-radius:999px;
  background:linear-gradient(180deg,rgba(255,255,255,.3),rgba(255,250,240,.12) 55%,rgba(255,245,230,.18));
  -webkit-backdrop-filter:blur(1.4px);backdrop-filter:blur(1.4px);
  box-shadow:0 5px 14px rgba(90,26,6,.22),inset 0 3px 5px -1px rgba(255,255,255,.38),inset 0 -3px 5px -1px rgba(255,255,255,.16)}
.mark i:nth-child(1){left:0;top:0;width:100%}.mark i:nth-child(2){top:35.73%}.mark i:nth-child(3){top:71.47%}
.mark i::before,.field::before,button::before{content:"";position:absolute;inset:0;border-radius:inherit;padding:1.2px;filter:blur(.5px);pointer-events:none;
  background:linear-gradient(135deg,rgba(255,255,255,.6),rgba(255,255,255,.1) 22%,rgba(255,255,255,0) 45%,rgba(255,255,255,0) 80%,rgba(255,255,255,.32));
  -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask:linear-gradient(#000 0 0) content-box exclude,linear-gradient(#000 0 0)}
/* the caption and headline in glass text */
.cap,h1{margin:0;color:transparent;
  background:linear-gradient(135deg,rgba(255,255,255,.45),rgba(255,255,255,0) 32%,rgba(255,255,255,0) 72%,rgba(255,255,255,.22)),
    linear-gradient(180deg,rgba(255,255,255,.9),rgba(255,250,240,.66) 55%,rgba(255,246,232,.78));
  -webkit-background-clip:text;background-clip:text;
  filter:drop-shadow(0 -1px 0 rgba(255,255,255,.35)) drop-shadow(0 5px 12px rgba(90,26,6,.22))}
.cap{font-size:clamp(20px,1.46vw,28px);line-height:1.2;letter-spacing:-.01em;padding-bottom:.25em;margin-bottom:calc(14px - .25em)}
h1{font-weight:400;font-size:clamp(58px,6.25vw,120px);line-height:1;letter-spacing:-.045em;padding-bottom:.22em;margin-bottom:-.22em}
.l{margin:28px 0 0;font-size:clamp(18px,1.46vw,28px);line-height:1.4;color:rgba(255,232,196,.78)}
.wrong .l{color:#fff}
/* the password pill and its button, the same glass */
form{display:flex;gap:12px;margin-top:40px;max-width:560px}
.field,button{position:relative;border-radius:999px;
  background:linear-gradient(180deg,rgba(255,255,255,.3),rgba(255,250,240,.12) 55%,rgba(255,245,230,.18));
  -webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);
  box-shadow:0 5px 14px rgba(90,26,6,.22),inset 0 3px 5px -1px rgba(255,255,255,.38),inset 0 -3px 5px -1px rgba(255,255,255,.16)}
.field{flex:1;display:flex}
input{flex:1;min-width:0;height:64px;box-sizing:border-box;padding:0 28px;border:0;border-radius:999px;background:none;outline:none;
  font:400 22px Geist,system-ui,sans-serif;letter-spacing:.02em;color:#fff;caret-color:#fff}
input::placeholder{color:rgba(255,246,232,.66);letter-spacing:0}
.field:focus-within,button:focus-visible{box-shadow:0 5px 14px rgba(90,26,6,.22),inset 0 3px 5px -1px rgba(255,255,255,.38),inset 0 -3px 5px -1px rgba(255,255,255,.16),0 0 0 2px rgba(255,246,232,.5)}
button{flex:none;width:64px;height:64px;border:0;padding:0;cursor:pointer;display:grid;place-items:center;color:#fff;outline:none}
button svg{width:24px;height:24px}
button:active{transform:scale(.97)}
.wrong form{animation:no .42s cubic-bezier(.36,.07,.19,.97)}
@keyframes no{20%{transform:translateX(-10px)}40%{transform:translateX(9px)}60%{transform:translateX(-6px)}80%{transform:translateX(3px)}}
@media (prefers-reduced-motion:reduce){.wrong form{animation:none}}
@media (max-width:760px){
  main{padding:28px 24px 40px}
  .mark{width:64px}
  h1{font-size:clamp(48px,14vw,64px)}
  form{max-width:none}
  input{height:56px;font-size:18px;padding:0 22px}
  button{width:56px;height:56px}
}
</style>
<main${wrong ? ' class="wrong"' : ''}>
  <span class="mark" aria-hidden="true"><i></i><i></i><i></i></span>
  <div>
    <p class="cap">Telepath</p>
    <h1>Intelligence<br>that grows</h1>
    <p class="l" role="status">${wrong ? 'That’s not the password. Try again.' : 'This deck is private. Enter the password to continue.'}</p>
    <form method="post" action="/__deckgate" autocomplete="off">
      <input type="hidden" name="next" value="${next}">
      <span class="field"><input name="password" type="password" placeholder="Password" aria-label="Password" autocomplete="current-password" autofocus required></span>
      <button type="submit" aria-label="Enter"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button>
    </form>
  </div>
</main>
<script>
// come back to the same slide: the hash never reaches the server, so carry it in the form
var n=document.querySelector('[name=next]'),p=location.pathname;if(/^\\/deck(\\/|$)/.test(p))n.value=p+location.hash;
</script>
</html>`
}
