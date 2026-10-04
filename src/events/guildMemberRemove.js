const sysLogger  = require('../systems/logger');
const { sendWelcome } = require('../systems/welcome');
const shield     = require('../systems/botShield');
const db         = require('../utils/db');

module.exports = {
  name: 'guildMemberRemove',
  async execute(member, client) {
    if (member.user.id === client?.user?.id) {
      await shield.onMemberRemove(member, client);
      return;
    }
    await sysLogger.logLeave(member.guild, member);
    await sendWelcome(member, 'goodbye');
    db.logActivity(member.guild.id, { actionType: 'other', userId: member.id, details: `Miembro salido: ${member.user.tag}` });
  }
};
