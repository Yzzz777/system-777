const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('love')
    .setDescription('❤️ Calcula el amor entre dos usuarios')
    .addUserOption(o => o.setName('usuario1').setDescription('Primer usuario').setRequired(true))
    .addUserOption(o => o.setName('usuario2').setDescription('Segundo usuario').setRequired(true)),

  async execute(interaction) {
    const u1 = interaction.options.getUser('usuario1');
    const u2 = interaction.options.getUser('usuario2');

    const seed = (u1.id + u2.id).split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const pct = (seed % 101);

    let emoji, color, desc;
    if (pct >= 80)      { emoji = '💞'; color = 0xFF69B4; desc = '¡Amor verdadero! Se madearon en otra vida.'; }
    else if (pct >= 60) { emoji = '💕'; color = 0xFFB6C1; desc = 'Hay algo ahí... ¡denle una oportunidad!'; }
    else if (pct >= 40) { emoji = '💔'; color = 0xFF6347; desc = 'Pueden ser amigos... tal vez.'; }
    else if (pct >= 20) { emoji = '😭'; color = 0x8B0000; desc = 'Ni con alcohol se arregla esto.'; }
    else                { emoji = '💀'; color = 0x2F2F2F; desc = 'Better call Saul antes de que sea tarde.'; }

    const bar = '█'.repeat(Math.floor(pct / 5)) + '░'.repeat(20 - Math.floor(pct / 5));

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(`${emoji} Calculadora de Amor`)
      .setDescription(`**${u1.tag}** ❤️ **${u2.tag}**`)
      .addFields(
        { name: 'compatibilidad', value: `\`${bar}\` **${pct}%**`, inline: false },
        { name: '📖 Veredicto', value: desc, inline: false },
      )
      .setThumbnail(u1.displayAvatarURL({ dynamic: true }))
      .setImage(u2.displayAvatarURL({ dynamic: true }))
      .setFooter({ text: 'System 777 · Dev: 777 · IG: @yzz.yzx' });

    await interaction.reply({ embeds: [embed] });
  }
};
