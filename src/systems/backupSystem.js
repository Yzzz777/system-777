const db = require('../utils/db');

async function createBackup(guild, requestedBy) {
  const backup = {
    id: Date.now().toString(36),
    guildId: guild.id,
    guildName: guild.name,
    createdAt: Date.now(),
    requestedBy,
    roles: [],
    channels: [],
  };

  const sortedRoles = [...guild.roles.cache.values()].sort((a, b) => b.position - a.position);
  for (const role of sortedRoles) {
    if (role.id === guild.id || role.managed) continue;
    backup.roles.push({
      name: role.name,
      color: role.hexColor,
      hoist: role.hoist,
      mentionable: role.mentionable,
      permissions: role.permissions.bitfield.toString(),
      position: role.position,
    });
  }

  const sortedChannels = [...guild.channels.cache.values()].sort((a, b) => (a.rawPosition ?? 0) - (b.rawPosition ?? 0));
  for (const ch of sortedChannels) {
    const parent = ch.parentId ? guild.channels.cache.get(ch.parentId) : null;
    backup.channels.push({
      name: ch.name,
      type: ch.type,
      parentName: parent?.name || null,
      position: ch.rawPosition ?? 0,
      topic: ch.topic || null,
      nsfw: ch.nsfw || false,
      slowmode: ch.rateLimitPerUser || 0,
    });
  }

  const backups = db.get('backups', guild.id, []);
  backups.unshift(backup);
  if (backups.length > 5) backups.splice(5);
  db.set('backups', guild.id, backups);
  return backup;
}

function listBackups(guildId) {
  return db.get('backups', guildId, []);
}

async function restoreBackup(guild, backupId) {
  const backups = db.get('backups', guild.id, []);
  const backup = backups.find(b => b.id === backupId);
  if (!backup) throw new Error('Backup no encontrado');

  const catMap = new Map(); // parentName → new channelId

  // Restore categories first
  for (const ch of backup.channels.filter(c => c.type === 4)) {
    try {
      const created = await guild.channels.create({ name: ch.name, type: 4, reason: 'System 777 · Backup restore' });
      catMap.set(ch.name, created.id);
    } catch {}
  }

  // Restore roles (reversed so lower positions go first)
  for (const roleData of [...backup.roles].reverse()) {
    try {
      await guild.roles.create({
        name: roleData.name,
        color: roleData.color !== '#000000' ? roleData.color : undefined,
        hoist: roleData.hoist,
        mentionable: roleData.mentionable,
        permissions: BigInt(roleData.permissions),
        reason: 'System 777 · Backup restore',
      });
    } catch {}
  }

  // Restore text/voice channels
  for (const ch of backup.channels.filter(c => c.type !== 4)) {
    try {
      const parentId = ch.parentName ? catMap.get(ch.parentName) : undefined;
      await guild.channels.create({
        name: ch.name,
        type: ch.type,
        parent: parentId,
        topic: ch.topic || undefined,
        nsfw: ch.nsfw,
        rateLimitPerUser: ch.slowmode,
        reason: 'System 777 · Backup restore',
      });
    } catch {}
  }

  return backup;
}

module.exports = { createBackup, listBackups, restoreBackup };
