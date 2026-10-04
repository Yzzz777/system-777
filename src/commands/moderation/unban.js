const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const db = require('../../utils/db');
const { errorEmbed, successEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unban')
    .setDescription('✅ Desbanea a un usuario por su ID')
    .addStringOption(o => o.setName('id').setDescription('User ID').setRequired(true))
    .addStringOption(o => o.setName('razon').setDescription('Razón'))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  userPermissions: [PermissionFlagsBits.BanMembers],

  async execute(interaction) {
    const id     = interaction.options.getString('id');
    const reason = interaction.options.getString('razon') || 'Sin razón';

    // Block unban if globally banned — only owner can lift global bans
    const gbans = db.get('globalbans', 'users', {});
    if (gbans[id] && interaction.user.id !== process.env.OWNER_ID) {
      return interaction.reply({
        embeds: [errorEmbed('⛔ Ban Global — No puedes levantar este ban', `\`${id}\` tiene un **ban global permanente**.\nSolo el owner del bot puede levantarlo con \`/globalban remove\`.`, {
          fields: [{ name: 'Razón del ban global', value: gbans[id].reason }]
        })],
        flags: MessageFlags.Ephemeral
      });
    }

    try {
      const ban = await interaction.guild.bans.fetch(id);
      await interaction.guild.bans.remove(id, `${reason} | Mod: ${interaction.user.tag}`);

      await interaction.reply({
        embeds: [successEmbed('✅ Usuario Desbaneado', null, {
          fields: [
            { name: 'Usuario',   value: `${ban.user.tag} \`(${id})\``, inline: true },
            { name: 'Moderador', value: interaction.user.tag,           inline: true },
            { name: 'Razón',     value: reason }
          ]
        })]
      });
    } catch {
      await interaction.reply({ content: `❌ No encontré un ban para el ID \`${id}\`.`, flags: MessageFlags.Ephemeral });
    }
  }
};
