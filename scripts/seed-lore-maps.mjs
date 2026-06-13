#!/usr/bin/env node
// Populate Game Maps (lore) with backgrounds, typed pins, and routes so the
// /games/:title/lore feature is demo-ready. Idempotent: any map that already
// has pins is skipped (pass --force to add anyway).
//
// Usage:
//   node scripts/seed-lore-maps.mjs                 # targets the live Render site
//   API_URL=http://localhost:4000 node scripts/seed-lore-maps.mjs
//   ADMIN_USER=admin ADMIN_PASS=admin node scripts/seed-lore-maps.mjs
//   node scripts/seed-lore-maps.mjs --force         # re-add pins even if some exist
//
// Maps attach by normalized game TITLE, so the titles below must match the
// games shown on the site (the game itself doesn't need to exist for a map to
// be authored, but it won't be reachable from a game page otherwise).

const API_URL = (process.env.API_URL || process.env.VITE_API_URL || 'https://gamelog-gek8.onrender.com').replace(/\/$/, '')
const API = `${API_URL}/api`
const ADMIN_USER = process.env.ADMIN_USER || 'admin'
const ADMIN_PASS = process.env.ADMIN_PASS || 'admin'
const FORCE = process.argv.includes('--force')

// Actual in-game maps, bundled in the app's own public/maps/ folder and served
// SAME-ORIGIN. They were sourced from Fandom but Fandom hotlink-protects images
// (cross-origin requests 404), so we self-host instead — same-origin assets have
// no referer/CORS/hotlink check and always load. In production frontend+backend
// share an origin, so the background base defaults to API_URL; override with
// BG_BASE when serving the frontend from a different origin (e.g. local Vite).
const BG_BASE = (process.env.BG_BASE || API_URL).replace(/\/$/, '')
const mapUrl = (file) => `${BG_BASE}/maps/${file}`
const MAP_BG = {
  'Elden Ring': mapUrl('elden-ring.webp'),
  'Hollow Knight': mapUrl('hollow-knight.webp'),
  'Dark Souls: Remastered': mapUrl('dark-souls.webp'),
  'The Witcher 3: Wild Hunt': mapUrl('witcher3.webp'),
  'God of War (2018)': mapUrl('god-of-war.webp'),
  'Cyberpunk 2077': mapUrl('cyberpunk.webp'),
}

// Each map: title (must match the site), pins, and routes (referencing pins by
// 0-based index). Backgrounds come from MAP_BG above. Pin coordinates are rough
// starting points — admins can drag pins on the map to fine-tune positions.
const MAPS = [
  {
    title: 'Elden Ring',
    background: MAP_BG['Elden Ring'],
    pins: [
      { label: 'Limgrave', type: 'location', x: 12, y: 58, description: 'Where every Tarnished begins. Open fields, the first Sites of Grace, and Torrent.' },
      { label: 'Stormveil Castle', type: 'dungeon', x: 26, y: 42, description: 'The legacy dungeon guarding Stormhill. A maze of ramparts, ballistae, and ambushes.' },
      { label: 'Margit, the Fell Omen', type: 'boss', x: 22, y: 33, description: 'Gatekeeper duel at the foot of Stormveil. A wall for most first-timers.' },
      { label: 'Godrick the Grafted', type: 'boss', x: 30, y: 36, description: 'Shardbearer at the heart of Stormveil. Grafts the limbs of the fallen.' },
      { label: 'Roundtable Hold', type: 'shop', x: 42, y: 18, description: 'The hub: vendors, the Twin Maiden Husks, and most early NPC questlines.' },
      { label: 'Liurnia of the Lakes', type: 'location', x: 50, y: 60, description: 'Sprawling moonlit wetlands east of Stormveil. Home to Raya Lucaria.' },
      { label: 'Raya Lucaria Academy', type: 'dungeon', x: 60, y: 50, description: 'Sorcerers’ academy sealed behind a glintstone barrier.' },
      { label: 'Rennala, Queen of the Full Moon', type: 'boss', x: 64, y: 46, description: 'Shardbearer of the Academy. A two-phase fight that gifts rebirth.' },
      { label: 'Malenia, Blade of Miquella', type: 'boss', x: 88, y: 72, description: 'Optional superboss in the Haligtree. Waterfowl Dance ends runs.' },
    ],
    routes: [[0, 1], [1, 2], [1, 3], [0, 5], [5, 6], [6, 7]],
  },
  {
    // Intentionally pin-free: the background map is set, but no pins are seeded
    // (owner prefers Hollow Knight left empty). Empty arrays mean a re-run sets
    // the background without ever adding pins back.
    title: 'Hollow Knight',
    background: MAP_BG['Hollow Knight'],
    pins: [],
    routes: [],
  },
  {
    title: 'Dark Souls: Remastered',
    background: MAP_BG['Dark Souls: Remastered'],
    pins: [
      { label: 'Firelink Shrine', type: 'location', x: 48, y: 40, description: 'The central hub. Bonfire, the Fire Keeper, and routes in every direction.' },
      { label: 'Undead Burg', type: 'location', x: 35, y: 30, description: 'The first proper gauntlet of hollows, dogs, and crossbowmen.' },
      { label: 'Taurus Demon', type: 'boss', x: 30, y: 24, description: 'Bridge-top brute — plunge-attack from the tower to learn the lesson.' },
      { label: 'Bell Gargoyles', type: 'boss', x: 38, y: 18, description: 'Rooftop duo guarding the first Bell of Awakening.' },
      { label: 'Blighttown', type: 'dungeon', x: 25, y: 70, description: 'The infamous poison swamp descent. Bring purple moss.' },
      { label: 'Andre of Astora', type: 'shop', x: 52, y: 45, description: 'Blacksmith who reinforces and ascends your weapons.' },
      { label: 'Anor Londo', type: 'dungeon', x: 70, y: 30, description: 'The golden city of the gods, reached by the great elevator.' },
      { label: 'Ornstein & Smough', type: 'boss', x: 74, y: 26, description: 'The legendary duo — a brutal skill gate, kill order matters.' },
      { label: 'Gwyn, Lord of Cinder', type: 'boss', x: 85, y: 55, description: 'The final flame. Parry him and the fight becomes poetry.' },
    ],
    routes: [[0, 1], [1, 2], [1, 3], [0, 4], [0, 5], [6, 7]],
  },
  {
    title: 'The Witcher 3: Wild Hunt',
    background: MAP_BG['The Witcher 3: Wild Hunt'],
    pins: [
      { label: 'White Orchard', type: 'location', x: 15, y: 55, description: 'The tutorial region. A griffin hunt and your first Gwent hands.' },
      { label: 'Velen (No Man’s Land)', type: 'location', x: 35, y: 50, description: 'War-torn mire ruled by the Bloody Baron and the Crones.' },
      { label: 'The Bloody Baron', type: 'quest', x: 38, y: 45, description: 'A questline about a missing family — a high point of RPG writing.' },
      { label: 'Crookback Bog', type: 'dungeon', x: 30, y: 65, description: 'Home of the Crones and the Whispering Hillock — a dark moral fork.' },
      { label: 'Novigrad', type: 'location', x: 55, y: 35, description: 'The free city: gangs, mages on the run, and the best Gwent players.' },
      { label: 'Gwent Merchant', type: 'shop', x: 58, y: 30, description: 'Card vendors scattered across the city — build the Northern Realms deck.' },
      { label: 'Skellige', type: 'location', x: 80, y: 40, description: 'Storm-lashed isles, a royal succession, and treasure-hunt wrecks.' },
      { label: 'Kaer Morhen', type: 'location', x: 70, y: 20, description: 'The witchers’ keep — the staging ground for the final stand.' },
      { label: 'Imlerith', type: 'boss', x: 75, y: 25, description: 'General of the Wild Hunt — a mace duel on Bald Mountain.' },
    ],
    routes: [[0, 1], [1, 2], [1, 3], [1, 4], [4, 6], [7, 8]],
  },
  {
    title: 'God of War (2018)',
    background: MAP_BG['God of War (2018)'],
    pins: [
      { label: 'Wildwoods', type: 'location', x: 12, y: 50, description: 'The forest around the cabin where the journey opens.' },
      { label: 'Kratos’ Home', type: 'location', x: 15, y: 38, description: 'Where Faye’s ashes set the whole pilgrimage in motion.' },
      { label: 'The Stranger (Baldur)', type: 'boss', x: 20, y: 33, description: 'The unforgettable opening brawl against an unkillable god.' },
      { label: 'Lake of Nine', type: 'location', x: 45, y: 55, description: 'The central hub realm — lowers to reveal new paths as you progress.' },
      { label: 'Brok & Sindri', type: 'shop', x: 40, y: 30, description: 'The dwarven smiths who upgrade the Leviathan Axe and your armour.' },
      { label: 'The Mountain', type: 'dungeon', x: 60, y: 30, description: 'The long ascent toward the heart of the realm.' },
      { label: 'Alfheim', type: 'location', x: 30, y: 70, description: 'Realm of the light and dark elves, reached through the Realm Travel Room.' },
      { label: 'Sigrun, Queen of the Valkyries', type: 'boss', x: 80, y: 65, description: 'The optional superboss — the true endgame skill test.' },
      { label: 'Jötunheim', type: 'location', x: 88, y: 25, description: 'The realm of the giants — the destination behind it all.' },
    ],
    routes: [[0, 1], [1, 2], [0, 3], [3, 4], [3, 5], [3, 6]],
  },
  {
    title: 'Cyberpunk 2077',
    background: MAP_BG['Cyberpunk 2077'],
    pins: [
      { label: 'Watson', type: 'location', x: 25, y: 30, description: 'V’s home district — Kabuki markets, ripperdocs, and the Afterlife nearby.' },
      { label: 'V’s Apartment', type: 'location', x: 22, y: 22, description: 'Megabuilding H10 — stash, wardrobe, and a place to catch your breath.' },
      { label: 'Lizzie’s Bar', type: 'shop', x: 30, y: 35, description: 'The Mox’s club — braindance gear and a key early contact.' },
      { label: 'The Heist (Konpeki Plaza)', type: 'quest', x: 40, y: 18, description: 'The job that goes wrong and puts Johnny in your head.' },
      { label: 'Heywood', type: 'location', x: 45, y: 55, description: 'Valentinos turf and the heart of the Hispanic community.' },
      { label: 'City Center', type: 'location', x: 55, y: 40, description: 'Corpo Plaza and Arasaka Tower loom over downtown.' },
      { label: 'Adam Smasher', type: 'boss', x: 70, y: 30, description: 'Arasaka’s full-borg killer — the climactic fight.' },
      { label: 'Pacifica', type: 'location', x: 18, y: 70, description: 'The abandoned combat zone, home to the Voodoo Boys.' },
      { label: 'Viktor’s Clinic', type: 'shop', x: 50, y: 60, description: 'Your ripperdoc — cyberware installs and upgrades.' },
    ],
    routes: [[0, 1], [0, 2], [0, 3], [4, 5], [5, 6], [4, 8]],
  },
]

const keyOf = (title) => encodeURIComponent(title.trim().toLowerCase())

let token = ''
const authHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token}` })

async function api(path, init = {}) {
  const res = await fetch(`${API}${path}`, init)
  const text = await res.text()
  let body = null
  try { body = text ? JSON.parse(text) : null } catch { body = text }
  if (!res.ok) {
    const msg = body && typeof body === 'object' && body.error ? JSON.stringify(body.error) : `HTTP ${res.status}`
    throw new Error(`${init.method || 'GET'} ${path} → ${msg}`)
  }
  return body
}

async function login() {
  const body = await api('/users/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: ADMIN_USER, password: ADMIN_PASS }),
  })
  if (!body?.token) throw new Error('Login succeeded but returned no token')
  token = body.token
  console.log(`✓ Logged in as ${ADMIN_USER}`)
}

async function seedMap(map) {
  const key = keyOf(map.title)
  const existing = await api(`/lore/${key}`)

  // Always (re)set the background — safe to re-run, and lets us swap maps on
  // boards that already have pins without touching the pins.
  await api(`/lore/${key}/meta`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ backgroundUrl: map.background }),
  })

  // Only add pins/routes when the board is empty (unless --force), so re-runs
  // refresh backgrounds without duplicating pins.
  if (existing?.nodes?.length && !FORCE) {
    console.log(`→ "${map.title}": background updated, kept existing ${existing.nodes.length} pins`)
    return
  }

  // Pins, capturing the created ids in order so routes can reference them.
  const ids = []
  for (const pin of map.pins) {
    const node = await api(`/lore/${key}/nodes`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(pin),
    })
    ids.push(node.id)
  }

  // Routes between pins.
  let edgeCount = 0
  for (const [from, to] of map.routes) {
    if (ids[from] == null || ids[to] == null) continue
    try {
      await api(`/lore/${key}/edges`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ fromNodeId: ids[from], toNodeId: ids[to] }),
      })
      edgeCount += 1
    } catch (err) {
      console.warn(`  ! edge ${from}→${to} skipped: ${err.message}`)
    }
  }

  console.log(`✓ "${map.title}": ${ids.length} pins, ${edgeCount} routes, background set`)
}

async function main() {
  console.log(`Target: ${API}`)
  await login()
  for (const map of MAPS) {
    try {
      await seedMap(map)
    } catch (err) {
      console.error(`✗ "${map.title}" failed: ${err.message}`)
    }
  }
  console.log('Done.')
}

main().catch((err) => {
  console.error(`Fatal: ${err.message}`)
  process.exit(1)
})
