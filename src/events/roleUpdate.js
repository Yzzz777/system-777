const logger = require('../systems/logger');

module.exports = {
  name: 'roleUpdate',
  async execute(oldRole, newRole, client) {
    if (!oldRole.guild) return;
    await logger.logRoleUpdate(oldRole.guild, oldRole, newRole);
  }
};
