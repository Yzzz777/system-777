const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const db = require('../../utils/db');

module.exports = {
  ownerOnly: true,
  data: new SlashCommandBuilder()
    .setName('maintenance')
    .setDescription('[OWNER] Activa o desactiva el modo mantenimiento')
    .addStringOption(o => o.setName('modo').setDescription('on/off').setRequired(true)
      .addChoices({ name: '🔴 Activar', value: 'on' }, { name: '🟢 Desactivar', value: 'off' }))
    .addStringOption(o => o.setName('mensaje').setDescription('Mensaje de mantenimiento').setRequired(false)),

  async execute(interaction, client) {
    const modo = interaction.options.getString('modo');
    const msg  = interaction.options.getString('mensaje') || 'El bot está en mantenimiento. Vuelve pronto.';
    const on   = modo === 'on';

    db.set('bot_config', 'maintenance', { active: on, message: msg, since: Date.now() });

    const embed = new EmbedBuilder()
      .setColor(on ? 0xFF4444 : 0x00FF88)
      .setTitle(on ? '🔴 Modo Mantenimiento ACTIVADO' : '🟢 Modo Mantenimiento DESACTIVADO')
      .setDescription(on ? `**Mensaje:** ${msg}\n\nTodos los comandos están bloqueados para usuarios normales.` : 'El bot vuelve a estar operativo.')
      .setFooter({ text: 'System 777 · Maintenance · Owner Only' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  }
};
