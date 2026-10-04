const { cacheGuildInvites } = require('../systems/inviteTracker');

module.exports = {
  name: 'inviteCreate',
  async execute(invite) {
    try {
      if (invite.guild) await cacheGuildInvites(invite.guild).catch(() => {});
    } catch (error) {
      console.error('[EVENT ERROR] inviteCreate:', error);
    }
  },
};
