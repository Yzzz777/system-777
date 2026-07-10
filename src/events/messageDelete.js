const sysLogger  = require('../systems/logger');
const security   = require('../systems/securityGuard');

module.exports = {
  name: 'messageDelete',
  async execute(message, client) {
    if (!message.guild || message.author?.bot) return;

    // Ghost ping detection
    await security.checkGhostPing(message.id, client);

    // Cache para /snipe
    if (!client.snipeCache) client.snipeCache = new Map();

    const imageUrl = message.attachments?.find(a => a.contentType?.startsWith('image/'))?.url ?? null;

    client.snipeCache.set(message.channelId, {
      content:      message.content || '',
      authorId:     message.author.id,
      authorTag:    message.author.tag,
      authorAvatar: message.author.displayAvatarURL({ size: 128 }),
      deletedAt:    Date.now(),
      imageUrl,
    });

    await sysLogger.logDelete(message.guild, message);
  }
};
