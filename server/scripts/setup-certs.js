import { execSync, spawnSync } from 'child_process'
import { mkdirSync } from 'fs'
import { networkInterfaces } from 'os'

mkdirSync('./certs', { recursive: true })

const getLocalIPs = () =>
  Object.values(networkInterfaces())
    .flat()
    .filter(n => n && n.family === 'IPv4' && !n.internal && !n.address.startsWith('169.254'))
    .map(n => n.address)

// Check mkcert is installed
try {
  execSync('mkcert -version', { stdio: 'ignore' })
} catch {
  console.error('\nmkcert not found. Install it first:\n')
  console.error('  winget install FiloSottile.mkcert')
  console.error('  -- or --')
  console.error('  choco install mkcert\n')
  console.error('Then re-run: npm run setup:certs\n')
  process.exit(1)
}

// Install the local CA into the system trust store.
// mkcert exits non-zero if it can't update Java/Firefox stores — that's fine.
console.log('Installing local CA into system trust store...')
spawnSync('mkcert', ['-install'], { stdio: 'inherit' })

const ips = getLocalIPs()
const hosts = ['localhost', '127.0.0.1', ...ips]
console.log(`\nGenerating certs for: ${hosts.join(' ')}\n`)

const result = spawnSync(
  'mkcert',
  ['-key-file', 'certs/server.key', '-cert-file', 'certs/server.crt', ...hosts],
  { stdio: 'inherit' }
)

if (result.status !== 0) {
  console.error('\nCert generation failed.')
  process.exit(1)
}

// Print the CAROOT path so the user can import it into Firefox
const caroot = execSync('mkcert -CAROOT').toString().trim()

console.log('\n✅ Done! Certs saved to ./certs/')
console.log('\n─────────────────────────────────────────────────────────')
console.log('FIREFOX SETUP (one-time):')
console.log('')
console.log('Option A — let Firefox trust the Windows cert store:')
console.log('  1. Open Firefox and go to: about:config')
console.log('  2. Search for: security.enterprise_roots.enabled')
console.log('  3. Set it to: true')
console.log('  4. Restart Firefox')
console.log('')
console.log('Option B — import the CA manually into Firefox:')
console.log('  1. Open Firefox → Settings → Privacy & Security')
console.log('  2. Scroll to Certificates → "View Certificates..."')
console.log('  3. Authorities tab → Import')
console.log(`  4. Import: ${caroot}\\rootCA.pem`)
console.log('  5. Check "Trust this CA to identify websites" → OK')
console.log('─────────────────────────────────────────────────────────')
console.log('\nThen start the server: npm run dev:server')
