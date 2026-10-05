const fs   = require('fs');
const path = require('path');
const { dbFileCache } = require('./cache');

const DATA = path.join(__dirname, '../../data');

function file(name) { return path.join(DATA, `${name}.json`); }

function load(name) {
  const cached = dbFileCache.get(name);
  if (cached !== undefined) return cached;
  try {
    if (!fs.existsSync(file(name))) fs.writeFileSync(file(name), '{}');
    const data = JSON.parse(fs.readFileSync(file(name), 'utf8'));
    dbFileCache.set(name, data);
    return data;
  } catch { return {}; }
}

function save(name, data) {
  fs.writeFileSync(file(name), JSON.stringify(data, null, 2));
  dbFileCache.set(name, data);
}

const pendingWrites = new Map();
function scheduleWrite(name) {
  if (pendingWrites.has(name)) return;
  pendingWrites.set(name, setTimeout(() => {
    pendingWrites.delete(name);
    const data = load(name);
    save(name, data);
  }, 100));
}

function get(name, key, def = null) {
  const db = load(name);
  return key in db ? db[key] : def;
}

function set(name, key, value) {
  const db = load(name);
  db[key] = value;
  dbFileCache.set(name, db);
  scheduleWrite(name);
}

function del(name, key) {
  const db = load(name);
  delete db[key];
  dbFileCache.set(name, db);
  scheduleWrite(name);
}

function push(name, key, value) {
  const db  = load(name);
  const arr = Array.isArray(db[key]) ? db[key] : [];
  arr.push(value);
  db[key] = arr;
  dbFileCache.set(name, db);
  scheduleWrite(name);
}

function all(name) { return load(name); }

// ── Forma canónica de las entradas de activityLogs ──────────────────────────
// type/actionType → qué pasó · userId/targetId → quién · executor/target →
// objetos para la UI · action/details → texto del evento · timestamp → ms.
// Idempotente: se aplica tanto al escribir como al leer entradas antiguas.
function normalizeActivityEntry(entry) {
  if (!entry || typeof entry !== 'object') return null;
  const e = { ...entry };

  e.type = (typeof e.type === 'string' && e.type) || e.actionType || 'other';
  e.actionType = e.actionType || e.type;
  if (!e.action && typeof e.details === 'string' && e.details) e.action = e.details;

  const SNOWFLAKE = /^\d{17,20}$/;
  const firstId = (v) => {
    if (v == null) return null;
    if (typeof v === 'string') return SNOWFLAKE.test(v) ? v : null;
    if (typeof v === 'number') return String(v);
    if (typeof v === 'object' && v.id != null && SNOWFLAKE.test(String(v.id))) return String(v.id);
    return null;
  };

  const uid = e.userId ?? firstId(e.executor) ?? firstId(e.user);
  const tid = e.targetId ?? firstId(e.target);
  if (uid) e.userId = uid;
  if (tid) e.targetId = tid;
  if (!e.executor && uid) e.executor = { id: uid };
  if (!e.target && tid) e.target = { id: tid };

  return e;
}

function logActivity(guildId, entry) {
  const norm = normalizeActivityEntry(entry);
  if (!norm) return;
  const key = guildId || 'global';
  const db = load('activityLogs');
  const arr = Array.isArray(db[key]) ? db[key] : [];
  arr.push({ ...norm, timestamp: Date.now() });
  if (arr.length > 500) arr.splice(0, arr.length - 500);
  db[key] = arr;
  dbFileCache.set('activityLogs', db);
  scheduleWrite('activityLogs');
}

const locks = new Map();
async function withLock(name, fn) {
  while (locks.get(name)) await new Promise(r => setTimeout(r, 10));
  locks.set(name, true);
  try { return await fn(); } finally { locks.delete(name); }
}

function query(name, filterFn) {
  const data = load(name);
  return Object.entries(data).filter(([k, v]) => filterFn(k, v));
}

function commit(name, data) {
  dbFileCache.set(name, data);
  scheduleWrite(name);
}

// Elimina entradas null/undefined (y nulls dentro de arrays) — causa raíz
// del TypeError en cleanup() que rompía la tarea horaria.
function pruneNulls(data) {
  let changed = false;
  for (const k of Object.keys(data)) {
    const v = data[k];
    if (v === null || v === undefined) { delete data[k]; changed = true; continue; }
    if (Array.isArray(v)) {
      const filtered = v.filter(x => x !== null && x !== undefined);
      if (filtered.length !== v.length) { data[k] = filtered; changed = true; }
    }
  }
  return changed;
}

function cleanup() {
  const now = Date.now();
  const NS = ['tempbans', 'tickets', 'giveaways', 'activityLogs'];

  // 1) primer pase: purgar nulls ANTES de leer propiedades
  for (const ns of NS) {
    try {
      const data = load(ns);
      if (pruneNulls(data)) commit(ns, data);
    } catch { /* un namespace roto no detiene a los demás */ }
  }

  // 2) expiraciones (con guard: v puede ser primitivo según el contenido)
  try {
    const tempbans = load('tempbans');
    let changed = false;
    for (const [k, v] of Object.entries(tempbans)) {
      if (v && typeof v === 'object' && v.expiresAt && v.expiresAt < now) {
        delete tempbans[k];
        changed = true;
      }
    }
    if (changed) commit('tempbans', tempbans);
  } catch {}

  try {
    const tickets = load('tickets');
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    let changed = false;
    for (const [k, v] of Object.entries(tickets)) {
      if (v && typeof v === 'object' && v.status === 'closed' && v.closedAt && (now - v.closedAt > thirtyDays)) {
        delete tickets[k];
        changed = true;
      }
    }
    if (changed) commit('tickets', tickets);
  } catch {}

  try {
    const giveaways = load('giveaways');
    let changed = false;
    for (const [k, v] of Object.entries(giveaways)) {
      if (v && typeof v === 'object' && v.endsAt && v.endsAt < now) {
        delete giveaways[k];
        changed = true;
      }
    }
    if (changed) commit('giveaways', giveaways);
  } catch {}

  // 3) recorte de activityLogs a 500 entradas por guild
  try {
    const logs = load('activityLogs');
    let changed = false;
    for (const [k, v] of Object.entries(logs)) {
      if (!Array.isArray(v)) { delete logs[k]; changed = true; continue; }
      if (v.length > 500) { logs[k] = v.slice(-500); changed = true; }
    }
    if (changed) commit('activityLogs', logs);
  } catch {}
}

// Escribe YA todo lo pendiente (debounce de 100ms) — se llama al apagar
// para no perder la última ráfaga de escrituras.
function flush() {
  for (const [name, timer] of [...pendingWrites]) {
    clearTimeout(timer);
    pendingWrites.delete(name);
    try { save(name, load(name)); } catch {}
  }
}

// Última línea de defensa: si el proceso muere por exit(), sincronizar.
process.on('exit', () => { try { flush(); } catch {} });

module.exports = { load, save, get, set, del, push, all, file, logActivity, normalizeActivityEntry, withLock, query, cleanup, flush };
