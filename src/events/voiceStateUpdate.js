const logger       = require('../systems/logger');
const voiceTracker = require('../systems/voiceTracker');
const db           = require('../utils/db');

module.exports = {
  name: 'voiceStateUpdate',
  async execute(oldState, newState, client) {
    if (!newState.guild) return;

    const guild  = newState.guild;
    const userId = newState.member?.id || oldState.member?.id;
    if (!userId) return;

    // ── Voice time tracker ──────────────────────────────────────────
    const wasInVoice = !!oldState.channelId;
    const isInVoice  = !!newState.channelId;
    if (!wasInVoice && isInVoice)        voiceTracker.join(userId, guild.id);
    else if (wasInVoice && !isInVoice)   voiceTracker.leave(userId, guild.id);

    // ── Temp voice channels ─────────────────────────────────────────
    const cfg = db.get('guilds', guild.id, {}).tempVoice;
    if (cfg?.triggerChannelId) {
      // Joined trigger → create personal channel
      if (newState.channelId === cfg.triggerChannelId) {
        try {
          const member = newState.member;
          const name   = (cfg.nameTemplate || '🎮 Sala de {username}').replace('{username}', member.user.username);
          const created = await guild.channels.create({
            name,
            type: 2,
            parent: cfg.categoryId || newState.channel?.parentId || null,
            userLimit: cfg.userLimit || 0,
            reason: 'System 777 · Canal temporal',
          });
          await member.voice.setChannel(created).catch(() => {});
          const active = db.get('temp_voice', guild.id, {});
          active[created.id] = member.id;
          db.set('temp_voice', guild.id, active);
        } catch {}
      }

      // Left a temp channel → delete if empty
      if (oldState.channelId) {
        const active = db.get('temp_voice', guild.id, {});
        if (active[oldState.channelId] !== undefined) {
          const ch = guild.channels.cache.get(oldState.channelId);
          if (!ch || ch.members.size === 0) {
            try { await ch?.delete('System 777 · Canal temporal vacío'); } catch {}
            delete active[oldState.channelId];
            db.set('temp_voice', guild.id, active);
          }
        }
      }
    }

    await logger.logVoice(guild, oldState, newState);
  }
};
