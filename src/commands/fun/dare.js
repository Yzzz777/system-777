const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const RETOS = [
  'Imita a alguien del servidor durante 1 minuto.',
  'Escribe un poema sobre alguien del servidor en este chat.',
  'Cambia tu nombre en el servidor a "Patata" por 10 minutos.',
  'Di algo bonito sobre el último usuario que escribió en este canal.',
  'Cuenta un chiste (malo) en el chat.',
  'Escribe con los ojos cerrados: "System 777 es el mejor bot".',
  'Di el nombre de tu crush en voz alta.',
  'Envía el último meme que mandaste a alguien.',
  'Haz una reverencia y di "Soy humilde, Jefe".',
  'Escribe el alfabeto al revés en el chat.',
  'Menciona a alguien y dile algo que nunca le hayas dicho.',
  'Pon tu foto de perfil actual de Discord en el chat.',
  'Di 5 cosas que te gusten de ti mismo.',
  'Imita a un personaje famoso con solo emojis.',
  'Escribe un texto de amor a una silla.',
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dare')
    .setDescription('🔥 Reto aleatorio'),

  async execute(interaction) {
    const reto = RETOS[Math.floor(Math.random() * RETOS.length)];

    const embed = new EmbedBuilder()
      .setColor(0xFF4500)
      .setTitle('🔥 Reto')
      .setDescription(`> ${reto}`)
      .setFooter({ text: 'System 777 · Dev: 777 · IG: @yzz.yzx' });

    await interaction.reply({ embeds: [embed] });
  }
};
