const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const db        = require('../../utils/db');
const sysLogger = require('../../systems/logger');

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
    const key    = `warn_${interaction.guild.id}_${target.id}`;

    if (sub === 'add') {
      const reason = interaction.options.getString('razon');
      const warns  = db.get('warns', key, []);
      warns.push({ reason, mod: interaction.user.id, ts: Date.now() });
      db.set('warns', key, warns);

      const embed = new EmbedBuilder()
        .setColor(0xFFCC00)
        .setTitle('⚠️ Advertencia Añadida')
        .addFields(
          { name: 'Usuario',     value: `${target.tag} \`(${target.id})\``, inline: true },
          { name: 'Moderador',   value: interaction.user.tag,                inline: true },
          { name: 'Total warns', value: `${warns.length}`,                   inline: true },
          { name: 'Razón',       value: reason }
        )
        .setTimestamp()
        .setFooter({ text: 'System 777 · Developer 777' });

      await interaction.reply({ embeds: [embed] });
      await sysLogger.logWarn(interaction.guild, target, interaction.user, reason);

    } else if (sub === 'list') {
      const warns = db.get('warns', key, []);
      const desc  = warns.length
        ? warns.map((w, i) => `**${i+1}.** ${w.reason} — <t:${Math.floor(w.ts/1000)}:R>`).join('\n')
        : 'Sin advertencias.';

      await interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(0xFFAA00)
          .setTitle(`⚠️ Advertencias de ${target.tag}`)
          .setDescription(desc)
          .setFooter({ text: 'System 777 · Developer 777' })]
      });

    } else if (sub === 'clear') {
      db.set('warns', key, []);
      await interaction.reply({ content: `✅ Advertencias de **${target.tag}** borradas.`, flags: MessageFlags.Ephemeral });
    }
  }
};
