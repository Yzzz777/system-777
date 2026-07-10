const db = require('../utils/db');

const MAX_CMDS = 50;

function get(guildId, name) {
  return db.get('custom_cmds', `${guildId}_${name.toLowerCase()}`) || null;
}

function getAll(guildId) {
  return Object.values(db.all('custom_cmds')).filter(c => c?.guildId === guildId);
}

function create(guildId, name, response, createdBy, options = {}) {
  const n = name.toLowerCase().replace(/[^a-z0-9_-]/g, '');
  if (!n) return { ok: false, reason: 'Nombre inválido (solo letras, números, _ y -)' };
  if (get(guildId, n)) return { ok: false, reason: 'Ese comando ya existe' };
  if (getAll(guildId).length >= MAX_CMDS) return { ok: false, reason: `Límite de ${MAX_CMDS} comandos personalizados alcanzado` };
  const cmd = {
    name: n, response, createdBy, guildId,
    uses: 0, createdAt: Date.now(),
    embed: options.embed || false,
    color: options.color || '#5865F2',
    deleteInvoke: options.deleteInvoke || false,
    cooldown: options.cooldown || 0,
    requiredRole: options.requiredRole || null,
  };
  db.set('custom_cmds', `${guildId}_${n}`, cmd);
  return { ok: true, cmd };
}

function remove(guildId, name, requesterId, isAdmin = false) {
  const cmd = get(guildId, name);
  if (!cmd) return { ok: false, reason: 'Comando no encontrado' };
  if (!isAdmin && cmd.createdBy !== requesterId) return { ok: false, reason: 'Solo el creador o un admin puede eliminarlo' };
  db.del('custom_cmds', `${guildId}_${name.toLowerCase()}`);
  return { ok: true };
}

function use(guildId, name) {
  const cmd = get(guildId, name);
  if (!cmd) return;
  cmd.uses++;
  db.set('custom_cmds', `${guildId}_${name}`, cmd);
}

module.exports = { get, getAll, create, remove, use };
