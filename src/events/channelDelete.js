const logger    = require('../systems/logger');
const antiNuke  = require('../systems/antiNuke');

module.exports = {
  name: 'channelDelete',
  async execute(channel, client) {
    try {
      if (!channel.guild) return;
      await logger.logChannelDelete(channel.guild, channel);
      await antiNuke.onChannelDelete(channel.guild, channel, client);
    } catch (error) {
      console.error('[EVENT ERROR] channelDelete:', error);
    }
  }
};
