const crypto = require('crypto');
const fs     = require('fs');
const path   = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const ROOT      = path.join(__dirname, '../../');
const LOCK_FILE = path.join(ROOT, 'data', 'integrity.lock');
const DIRS      = ['src', 'dashboard'];

function secret() {
  const o = process.env.OWNER_ID || '';
  const t = (process.env.BOT_TOKEN || '').slice(-12);
  return `sys777:${o}:${t}`;
}

function hashFile(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function collectFiles() {
  const files = [];
  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.js')) files.push(full);
    }
  }
  for (const d of DIRS) walk(path.join(ROOT, d));
  return files;
}

function sign(hashes) {
  return crypto.createHmac('sha256', secret()).update(JSON.stringify(hashes)).digest('hex');
}

function generateLock() {
  const hashes = {};
  for (const f of collectFiles()) {
    hashes[path.relative(ROOT, f).replace(/\\/g, '/')] = hashFile(f);
  }
  const lock = { hashes, sig: sign(hashes), ts: Date.now(), by: 'owner' };
  fs.mkdirSync(path.dirname(LOCK_FILE), { recursive: true });
  fs.writeFileSync(LOCK_FILE, JSON.stringify(lock, null, 2));
  return Object.keys(hashes).length;
}

function verifyIntegrity() {
  if (!fs.existsSync(LOCK_FILE)) {
    const count = generateLock();
    return { ok: true, firstRun: true, files: count };
  }

  let lock;
  try { lock = JSON.parse(fs.readFileSync(LOCK_FILE, 'utf8')); }
  catch { return { ok: false, reason: 'LOCK_CORRUPTED', files: ['integrity.lock'] }; }

  // Lock file itself was tampered
  if (lock.sig !== sign(lock.hashes)) {
    return { ok: false, reason: 'LOCK_TAMPERED', files: ['data/integrity.lock'] };
  }

  const tampered = [];
  for (const [rel, expected] of Object.entries(lock.hashes)) {
    const full = path.join(ROOT, rel);
    if (!fs.existsSync(full)) {
      tampered.push(`DELETED: ${rel}`);
    } else if (hashFile(full) !== expected) {
      tampered.push(`MODIFIED: ${rel}`);
    }
  }

  // Check for NEW files added (potential injection)
  for (const f of collectFiles()) {
    const rel = path.relative(ROOT, f).replace(/\\/g, '/');
    if (!lock.hashes[rel]) tampered.push(`ADDED: ${rel}`);
  }

  if (tampered.length) return { ok: false, reason: 'TAMPERED', files: tampered };
  return { ok: true };
}

module.exports = { verifyIntegrity, generateLock };

// CLI: node src/utils/integrity.js --update
if (require.main === module) {
  if (process.argv.includes('--update')) {
    const n = generateLock();
    console.log(`[INTEGRITY] Lock actualizado: ${n} archivos protegidos.`);
  } else {
    const r = verifyIntegrity();
    if (r.ok) console.log('[INTEGRITY] ✅ Todo en orden.');
    else console.error('[INTEGRITY] ❌ Tampered:', r.files.join(', '));
  }
}
