const sysLogger  = require('../systems/logger');
const { sendWelcome } = require('../systems/welcome');
const shield     = require('../systems/botShield');

module.exports = {
  name: 'guildMemberRemove',
  async execute(member, client) {
    // Shield: detectar si el bot fue kickeado
    if (member.user.id === client?.user?.id) {
      await shield.onMemberRemove(member, client);
      return;
    }
    await sysLogger.logLeave(member.guild, member);
    await sendWelcome(member, 'goodbye');
  }
};
