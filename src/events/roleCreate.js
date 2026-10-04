const logger = require('../systems/logger');

module.exports = {
  name: 'roleCreate',
  async execute(role, client) {
    if (!role.guild) return;
    await logger.logRoleCreate(role.guild, role);
  }
};
