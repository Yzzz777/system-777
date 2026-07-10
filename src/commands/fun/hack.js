const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const PASOS = [
  '`[█░░░░░░░░░]` Iniciando ataque...',
  '`[███░░░░░░░]` Buscando vulnerabilidades...',
  '`[█████░░░░░]` Accediendo al sistema...',
  '`[███████░░░]` Descargando datos...',
  '`[█████████░]` Borrando rastros...',
  '`[██████████]` ✅ Hack completado.',
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('hack')
    .setDescription('💻 Hackea a un usuario (solo de mentiras xd)')
    .addUserOption(o => o.setName('usuario').setDescription('La víctima').setRequired(true)),

  async execute(interaction) {
    const target = interaction.options.getUser('usuario');

    const embed = new EmbedBuilder()
      .setColor(0x00FF00)
      .setTitle(`💻 Hackeando a ${target.username}...`)
      .setDescription(PASOS[0])
      .setThumbnail(target.displayAvatarURL({ size: 128 }))
      .setFooter({ text: 'System 777 · Dev: 777 · IG: @yzz.yzx' });

    const msg = await interaction.reply({ embeds: [embed], fetchReply: true });

    for (let i = 1; i < PASOS.length; i++) {
      await new Promise(r => setTimeout(r, 1200));
      embed.setDescription(PASOS[i]);
      if (i === PASOS.length - 1) {
        embed
          .setColor(0xFF2222)
          .setTitle(`💀 ${target.username} ha sido hackeado`)
          .addFields(
            { name: '📧 Email',       value: `${target.username.toLowerCase()}@gmail.com`,         inline: true },
            { name: '🔑 Contraseña',  value: `••••••••`,                                           inline: true },
            { name: '📍 IP',          value: `${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}`, inline: true },
            { name: '💳 Tarjeta',     value: `****-****-****-${Math.floor(1000+Math.random()*9000)}`, inline: true },
          );
      }
      await msg.edit({ embeds: [embed] });
    }
  }
};
