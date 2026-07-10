const db = require('../utils/db');

const MAX_MEMBERS = 20;

function _key(guildId, clanId) { return `${guildId}_${clanId}`; }

function getClan(guildId, clanId) {
  return db.get('clans', _key(guildId, clanId)) || null;
}

function getUserClan(userId, guildId) {
  const all = db.all('clans');
  for (const [k, c] of Object.entries(all)) {
    if (!k.startsWith(`${guildId}_`)) continue;
    if (c?.members?.includes(userId)) return c;
  }
  return null;
}

function listGuild(guildId) {
  const all = db.all('clans');
  return Object.values(all)
    .filter(c => c?.guildId === guildId)
    .sort((a, b) => (b.xp || 0) - (a.xp || 0));
}

function create(name, tag, ownerId, guildId) {
  if (getUserClan(ownerId, guildId)) return { ok: false, reason: 'Ya estás en un clan' };
  const tagUpper = tag.toUpperCase().slice(0, 5);
  for (const [k, c] of Object.entries(db.all('clans'))) {
    if (!k.startsWith(`${guildId}_`)) continue;
    if (c.name.toLowerCase() === name.toLowerCase()) return { ok: false, reason: 'Ese nombre ya existe' };
    if (c.tag === tagUpper) return { ok: false, reason: 'Ese tag ya existe' };
  }
  const id = `${Date.now()}`;
  const clan = { id, name, tag: tagUpper, ownerId, guildId, members: [ownerId], level: 1, xp: 0, bank: 0, description: '', wins: 0, createdAt: Date.now() };
  db.set('clans', _key(guildId, id), clan);
  return { ok: true, clan };
}

function join(userId, guildId, clanId) {
  if (getUserClan(userId, guildId)) return { ok: false, reason: 'Ya estás en un clan' };
  const clan = getClan(guildId, clanId);
  if (!clan) return { ok: false, reason: 'Clan no encontrado' };
  if (clan.members.length >= MAX_MEMBERS) return { ok: false, reason: `Clan lleno (máx ${MAX_MEMBERS})` };
  clan.members.push(userId);
  db.set('clans', _key(guildId, clanId), clan);
  return { ok: true, clan };
}

function leave(userId, guildId) {
  const clan = getUserClan(userId, guildId);
  if (!clan) return { ok: false, reason: 'No estás en un clan' };
  if (clan.ownerId === userId) return { ok: false, reason: 'El fundador no puede salir — usa disolver' };
  clan.members = clan.members.filter(m => m !== userId);
  db.set('clans', _key(guildId, clan.id), clan);
  return { ok: true };
}

function disband(userId, guildId) {
  const clan = getUserClan(userId, guildId);
  if (!clan) return { ok: false, reason: 'No estás en un clan' };
  if (clan.ownerId !== userId) return { ok: false, reason: 'Solo el fundador puede disolver el clan' };
  db.del('clans', _key(guildId, clan.id));
  return { ok: true };
}

function kick(ownerId, targetId, guildId) {
  const clan = getUserClan(ownerId, guildId);
  if (!clan || clan.ownerId !== ownerId) return { ok: false, reason: 'Sin permiso' };
  if (!clan.members.includes(targetId)) return { ok: false, reason: 'Ese usuario no está en tu clan' };
  if (targetId === ownerId) return { ok: false, reason: 'No puedes expulsarte a ti mismo' };
  clan.members = clan.members.filter(m => m !== targetId);
  db.set('clans', _key(guildId, clan.id), clan);
  return { ok: true };
}

function setDescription(ownerId, guildId, desc) {
  const clan = getUserClan(ownerId, guildId);
  if (!clan || clan.ownerId !== ownerId) return { ok: false, reason: 'Solo el fundador puede cambiar la descripción' };
  clan.description = desc.slice(0, 200);
  db.set('clans', _key(guildId, clan.id), clan);
  return { ok: true };
}

function addXP(guildId, clanId, amount) {
  const clan = getClan(guildId, clanId);
  if (!clan) return;
  clan.xp    = (clan.xp || 0) + amount;
  clan.level = Math.floor(clan.xp / 500) + 1;
  db.set('clans', _key(guildId, clanId), clan);
}

function deposit(userId, guildId, amount) {
  const clan = getUserClan(userId, guildId);
  if (!clan) return { ok: false, reason: 'No estás en un clan' };
  const eco = require('./economy');
  if ((eco.getBalance(userId).coins || 0) < amount) return { ok: false, reason: 'Monedas insuficientes' };
  eco.removeCoins(userId, amount);
  clan.bank = (clan.bank || 0) + amount;
  db.set('clans', _key(guildId, clan.id), clan);
  return { ok: true, bank: clan.bank };
}

module.exports = { getClan, getUserClan, listGuild, create, join, leave, disband, kick, setDescription, addXP, deposit };
