const db = require('../utils/db');

const inviteCache = new Map(); // guildId → Map<code, {uses, inviterId, code}>

async function cacheGuildInvites(guild) {
  try {
    const invites = await guild.invites.fetch();
    inviteCache.set(guild.id, new Map(invites.map(i => [i.code, { uses: i.uses || 0, inviterId: i.inviter?.id || null, code: i.code }])));
  } catch {}
}

async function findUsedInvite(guild) {
  const cached = inviteCache.get(guild.id) || new Map();
  try {
    const current = await guild.invites.fetch();
    for (const [code, inv] of current) {
      const prev = cached.get(code);
      if (prev && (inv.uses || 0) > prev.uses) {
        return { code, inviterId: inv.inviter?.id || null };
      }
    }
  } catch {}
  return null;
}

function trackInvite(guildId, inviterId, invitedId) {
  if (!inviterId) return;
  const key = `${guildId}_${inviterId}`;
  const data = db.get('invite_tracker', key, { count: 0, invites: [] });
  data.count++;
  data.invites.push({ userId: invitedId, ts: Date.now() });
  db.set('invite_tracker', key, data);
  db.set('invite_tracker', `invited_${guildId}_${invitedId}`, { inviterId, ts: Date.now() });
}

function getInviterOf(guildId, userId) {
  return db.get('invite_tracker', `invited_${guildId}_${userId}`, null);
}

function getTopInviters(guildId, limit = 10) {
  const all = db.all('invite_tracker');
  const prefix = `${guildId}_`;
  return Object.entries(all)
    .filter(([k]) => k.startsWith(prefix) && !k.includes('invited_'))
    .map(([k, v]) => ({ userId: k.slice(prefix.length), count: v.count || 0 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

module.exports = { cacheGuildInvites, findUsedInvite, trackInvite, getInviterOf, getTopInviters, inviteCache };
