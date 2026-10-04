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

function logActivity(guildId, entry) {
  const key = guildId || 'global';
  const db = load('activityLogs');
  const arr = Array.isArray(db[key]) ? db[key] : [];
  arr.push({ ...entry, timestamp: Date.now() });
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

function cleanup() {
  const now = Date.now();
  const tempbans = load('tempbans');
  let tempbansChanged = false;
  for (const [k, v] of Object.entries(tempbans)) {
    if (v.expiresAt && v.expiresAt < now) {
      delete tempbans[k];
      tempbansChanged = true;
    }
  }
  if (tempbansChanged) { dbFileCache.set('tempbans', tempbans); scheduleWrite('tempbans'); }

  const tickets = load('tickets');
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  let ticketsChanged = false;
  for (const [k, v] of Object.entries(tickets)) {
    if (v.status === 'closed' && v.closedAt && (now - v.closedAt > thirtyDays)) {
      delete tickets[k];
      ticketsChanged = true;
    }
  }
  if (ticketsChanged) { dbFileCache.set('tickets', tickets); scheduleWrite('tickets'); }

  const giveaways = load('giveaways');
  let giveawaysChanged = false;
  for (const [k, v] of Object.entries(giveaways)) {
    if (v.endsAt && v.endsAt < now) {
      delete giveaways[k];
      giveawaysChanged = true;
    }
  }
  if (giveawaysChanged) { dbFileCache.set('giveaways', giveaways); scheduleWrite('giveaways'); }

  const logs = load('activityLogs');
  let logsChanged = false;
  for (const [k, v] of Object.entries(logs)) {
    if (!Array.isArray(v)) { delete logs[k]; logsChanged = true; continue; }
    if (v.length > 500) { logs[k] = v.slice(-500); logsChanged = true; }
    for (let i = logs[k].length - 1; i >= 0; i--) {
      if (logs[k][i] == null) { logs[k].splice(i, 1); logsChanged = true; }
    }
  }
  if (logsChanged) { dbFileCache.set('activityLogs', logs); scheduleWrite('activityLogs'); }

  const allNames = ['tempbans', 'tickets', 'giveaways', 'activityLogs'];
  for (const ns of allNames) {
    const data = load(ns);
    let changed = false;
    for (const [k, v] of Object.entries(data)) {
      if (v === null || v === undefined) { delete data[k]; changed = true; }
    }
    if (changed) { dbFileCache.set(ns, data); scheduleWrite(ns); }
  }
}

module.exports = { load, save, get, set, del, push, all, file, logActivity, withLock, query, cleanup };
