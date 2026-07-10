const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('poll')
    .setDescription('📊 Crea una encuesta')
    .addStringOption(o => o.setName('pregunta').setDescription('La pregunta').setRequired(true))
    .addStringOption(o => o.setName('opcion1').setDescription('Opción A').setRequired(true))
    .addStringOption(o => o.setName('opcion2').setDescription('Opción B').setRequired(true))
    .addStringOption(o => o.setName('opcion3').setDescription('Opción C (opcional)'))
    .addStringOption(o => o.setName('opcion4').setDescription('Opción D (opcional)')),

  async execute(interaction) {
    const pregunta = interaction.options.getString('pregunta');
    const opciones = [
      interaction.options.getString('opcion1'),
      interaction.options.getString('opcion2'),
      interaction.options.getString('opcion3'),
      interaction.options.getString('opcion4'),
    ].filter(Boolean);

    const emojis = ['🇦', '🇧', '🇨', '🇩'];

    const desc = opciones.map((op, i) => `${emojis[i]} **${op}**`).join('\n\n');

    const embed = new EmbedBuilder()
      .setColor(0xF5C518)
      .setTitle(`📊 ${pregunta}`)
      .setDescription(desc)
      .addFields({ name: 'Creado por', value: interaction.user.toString(), inline: true })
      .setFooter({ text: 'System 777 · Dev: 777 · IG: @yzz.yzx' })
      .setTimestamp();

    const msg = await interaction.reply({ embeds: [embed], fetchReply: true });

    for (let i = 0; i < opciones.length; i++) {
      await msg.react(emojis[i]);
    }
  }
};
