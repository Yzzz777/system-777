const { cacheGuildInvites } = require('../systems/inviteTracker');

module.exports = {
  name: 'inviteCreate',
  async execute(invite) {
    if (invite.guild) await cacheGuildInvites(invite.guild).catch(() => {});
  },
};
