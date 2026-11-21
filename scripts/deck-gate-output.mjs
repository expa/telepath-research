// After `modulato build` on Vercel: add the /deck password gate as its own function in the Build Output, next to
// modulato's SSR function. vite.config.ts already put the route that sends locked /deck requests here into
// config.json; this checks it is there and fails the build if not, so the deck is never deployed ungated.
import fs from 'node:fs'
import path from 'node:path'
import { DECK_GATE_ROUTES } from '../lib/deck-gate.mjs'

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const out = path.join(root, '.vercel/output')
if (!process.env.VERCEL) {
  console.log('deck gate: not a Vercel build, nothing to emit')
  process.exit(0)
}

const config = JSON.parse(fs.readFileSync(path.join(out, 'config.json'), 'utf8'))
const routed = DECK_GATE_ROUTES.every((r) => config.routes.some((c) => c.src === r.src && c.dest === r.dest))
const before = config.routes.findIndex((c) => c.handle === 'filesystem')
const at = config.routes.findIndex((c) => c.dest === '/__deckgate')
if (!routed || at < 0 || at > before) {
  console.error('deck gate: the /deck route is missing from .vercel/output/config.json (or after the filesystem phase)')
  process.exit(1)
}

const fn = path.join(out, 'functions/__deckgate.func')
fs.rmSync(fn, { recursive: true, force: true })
fs.mkdirSync(fn, { recursive: true })
fs.copyFileSync(path.join(root, 'lib/deck-gate.mjs'), path.join(fn, 'gate.mjs'))
fs.writeFileSync(path.join(fn, 'index.mjs'), "export { handle as default } from './gate.mjs'\n")
fs.writeFileSync(path.join(fn, 'package.json'), JSON.stringify({ type: 'module' }))
// the same Node runtime modulato picked for its SSR function
const ssr = JSON.parse(fs.readFileSync(path.join(out, 'functions/__ssr.func/.vc-config.json'), 'utf8'))
fs.writeFileSync(
  path.join(fn, '.vc-config.json'),
  JSON.stringify({ runtime: ssr.runtime, handler: 'index.mjs', launcherType: 'Nodejs', shouldAddHelpers: false }, null, 2),
)
console.log('deck gate: emitted functions/__deckgate.func')
