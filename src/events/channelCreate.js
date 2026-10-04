const logger = require('../systems/logger');

module.exports = {
  name: 'channelCreate',
  async execute(channel, client) {
    try {
      if (!channel.guild) return;
      await logger.logChannelCreate(channel.guild, channel);
    } catch (error) {
      console.error('[EVENT ERROR] channelCreate:', error);
    }
  }
};
