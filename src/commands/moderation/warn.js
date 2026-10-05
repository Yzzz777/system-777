const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const modLog   = require('../../systems/modLog');
const sysLogger = require('../../systems/logger');
const { warningEmbed, successEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Advierte a un usuario')
    .addSubcommand(s => s
      .setName('add')
      .setDescription('Añade una advertencia')
      .addUserOption(o => o.setName('usuario').setDescription('Usuario').setRequired(true))
      .addStringOption(o => o.setName('razon').setDescription('Razón').setRequired(true)))
    .addSubcommand(s => s
      .setName('list')
      .setDescription('Lista las advertencias de un usuario')
      .addUserOption(o => o.setName('usuario').setDescription('Usuario').setRequired(true)))
    .addSubcommand(s => s
      .setName('clear')
      .setDescription('Borra las advertencias de un usuario')
      .addUserOption(o => o.setName('usuario').setDescription('Usuario').setRequired(true)))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  userPermissions: [PermissionFlagsBits.ModerateMembers],

  async execute(interaction) {
    const sub    = interaction.options.getSubcommand();
    const target = interaction.options.getUser('usuario');
    const gid    = interaction.guild.id;

    if (sub === 'add') {
      const reason = interaction.options.getString('razon');
      const warns  = modLog.addWarn(gid, target.id, {
        reason, mod: interaction.user.id, by: interaction.user.tag, ts: Date.now()
      });

      const embed = warningEmbed('⚠️ Advertencia Añadida', null, {
        fields: [
          { name: 'Usuario',     value: `${target.tag} \`(${target.id})\``, inline: true },
          { name: 'Moderador',   value: interaction.user.tag,                inline: true },
          { name: 'Total warns', value: `${warns.length}`,                   inline: true },
          { name: 'Razón',       value: reason }
        ]
      });

      await interaction.reply({ embeds: [embed] });
      await sysLogger.logWarn(interaction.guild, target, interaction.user, reason);

    } else if (sub === 'list') {
      const warns = modLog.getWarns(gid, target.id);
      const desc  = warns.length
        ? warns.map((w, i) => `**${i+1}.** ${w.reason} — <t:${Math.floor(w.ts/1000)}:R>`).join('\n')
        : 'Sin advertencias.';

      await interaction.reply({
        embeds: [warningEmbed(`⚠️ Advertencias de ${target.tag}`, desc)]
      });

    } else if (sub === 'clear') {
      modLog.clearWarns(gid, target.id);
      await interaction.reply({ content: `✅ Advertencias de **${target.tag}** borradas.`, flags: MessageFlags.Ephemeral });
    }
  }
};
