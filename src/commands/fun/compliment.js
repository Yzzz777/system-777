const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const compliments = [
  'Eres más brillante que el sol. ☀️',
  'Si fueras una estrella, serías la más brillante del cielo.',
  'Tu sonrisa ilumina cualquier habitación.',
  'Eres la razón por la que alguien sonríe hoy.',
  'No existen límites para lo que puedes lograr.',
  'Eres un diamante en bruto, solo necesitas pulirte.',
  'Tu energía es contagiosa de la mejor manera.',
  'El mundo es mejor porque estás en él.',
  'Eres más fuerte de lo que crees.',
  'Tu bondad no tiene precio.',
  'Eres el tipo de persona que todos quieren tener como amigo.',
  'Si pudieras verte como te ven los demás, nunca dudarías de ti mismo.',
  'Eres como el café: mejor con el tiempo.',
  'Tu creatividad no tiene límites.',
  'Eres una obra de arte que el mundo no sabía que necesitaba.',
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('compliment')
    .setDescription('💕 Halago aleatorio')
    .addUserOption(o => o.setName('usuario').setDescription('¿A quién halagar?')),

  async execute(interaction) {
    const target = interaction.options.getUser('usuario') || interaction.user;
    const compliment = compliments[Math.floor(Math.random() * compliments.length)];

    const embed = new EmbedBuilder()
      .setColor(0xFF69B4)
      .setTitle('💕 Machine de Halagos')
      .setDescription(`**${target.tag}**, esto es para ti:\n\n> ${compliment}`)
      .setThumbnail(target.displayAvatarURL({ dynamic: true }))
      .setFooter({ text: 'System 777 · Dev: 777 · IG: @yzz.yzx' });

    await interaction.reply({ embeds: [embed] });
  }
};
