const logger = require('../systems/logger');

module.exports = {
  name: 'guildMemberUpdate',
  async execute(oldMember, newMember, client) {
    await logger.logNick(newMember.guild, oldMember, newMember);
    await logger.logRoleChange(newMember.guild, oldMember, newMember);
  }
};
