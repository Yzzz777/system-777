// ── Sistema unificado de warns y acciones de moderación ─────────────────────
// Canónico (lo que leen reputation, admin, profile, spy, util y el dashboard):
//   warns[guildId]   = { [userId]: [{ reason, mod, by, ts }] }
//   modlogs[guildId] = { [userId]: [{ action, type, userId, mod, reason, duration, ts }] }
//
// Claves legacy absorbidas en la primera lectura de cada guild:
//   warns['warn_<guild>_<user>'] = [{ reason, mod, ts }]   (comandos antiguos)
//   modlogs['mod_<guild>']       = [{ type, userId, ... }] (systems/logger antiguo)

const db = require('../utils/db');

const migrated = new Set();

function migrate(guildId) {
  if (!guildId || migrated.has(guildId)) return;
  migrated.add(guildId);
  try {
    // ── warns legacy ──
    const prefix = `warn_${guildId}_`;
    const allWarns = db.all('warns') || {};
    const legacyKeys = Object.keys(allWarns).filter(k => k.startsWith(prefix));
    if (legacyKeys.length) {
      const canon = db.get('warns', guildId, null) || {};
      for (const key of legacyKeys) {
        const value = allWarns[key];
        if (!Array.isArray(value)) continue;
        const uid = key.slice(prefix.length);
        canon[uid] = [...(Array.isArray(canon[uid]) ? canon[uid] : []), ...value];
      }
      db.set('warns', guildId, canon);
      for (const key of legacyKeys) db.del('warns', key);
    }

    // ── modlogs legacy ──
    const legacyMod = db.get('modlogs', `mod_${guildId}`, null);
    if (Array.isArray(legacyMod)) {
      const canon = db.get('modlogs', guildId, null) || {};
      for (const e of legacyMod) {
        if (!e || !e.userId) continue;
        const entry = { ...e, action: e.action || e.type || 'other', type: e.type || e.action || 'other' };
        canon[e.userId] = Array.isArray(canon[e.userId]) ? canon[e.userId] : [];
        canon[e.userId].unshift(entry);
      }
      db.set('modlogs', guildId, canon);
      db.del('modlogs', `mod_${guildId}`);
    }
  } catch (e) {
    console.error('[MODLOG] Error migrando datos legacy:', e.message);
  }
}

// ── Warns ─────────────────────────────────────────────────────────────────────
function allWarns(guildId) {
  migrate(guildId);
  const w = db.get('warns', guildId, null);
  return w && typeof w === 'object' && !Array.isArray(w) ? w : {};
}

function getWarns(guildId, userId) {
  const arr = allWarns(guildId)[userId];
  return Array.isArray(arr) ? arr : [];
}

function countWarns(guildId, userId) {
  return getWarns(guildId, userId).length;
}

function addWarn(guildId, userId, entry) {
  const canon = allWarns(guildId);
  const list = Array.isArray(canon[userId]) ? canon[userId] : [];
  list.push({
    reason: entry.reason || 'Sin razón',
    mod: entry.mod || null,
    by: entry.by || entry.modTag || null,
    ts: entry.ts || Date.now(),
  });
  canon[userId] = list;
  db.set('warns', guildId, canon);
  return list;
}

function clearWarns(guildId, userId) {
  const canon = allWarns(guildId);
  delete canon[userId];
  db.set('warns', guildId, canon);
}

// ── Acciones de moderación ────────────────────────────────────────────────────
function allActions(guildId) {
  migrate(guildId);
  const m = db.get('modlogs', guildId, null);
  return m && typeof m === 'object' && !Array.isArray(m) ? m : {};
}

function getActions(guildId, userId) {
  const arr = allActions(guildId)[userId];
  return Array.isArray(arr) ? arr : [];
}

function saveAction(guildId, entry) {
  if (!guildId || !entry || !entry.userId) return;
  const canon = allActions(guildId);
  const action = entry.action || entry.type || 'other';
  const record = {
    ...entry,
    action,
    type: entry.type || action,
    userId: entry.userId,
    mod: entry.mod || null,
    ts: entry.ts || Date.now(),
  };
  const list = Array.isArray(canon[entry.userId]) ? canon[entry.userId] : [];
  list.unshift(record);
  if (list.length > 50) list.length = 50;
  canon[entry.userId] = list;
  db.set('modlogs', guildId, canon);
}

function removeAction(guildId, userId) {
  const canon = allActions(guildId);
  delete canon[userId];
  db.set('modlogs', guildId, canon);
}

module.exports = {
  migrate, allWarns, getWarns, countWarns, addWarn, clearWarns,
  allActions, getActions, saveAction, removeAction,
};
