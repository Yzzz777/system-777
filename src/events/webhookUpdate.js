const logger = require('../systems/logger');

module.exports = {
  name: 'webhookUpdate',
  async execute(channel, client) {
    if (!channel.guild) return;
    await logger.logWebhookUpdate(channel.guild, channel);
  }
};
