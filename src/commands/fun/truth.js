const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const VERDADES = [
  '¿Cuál es la cosa más vergonzosa que te ha pasado en público?',
  '¿Alguna vez le has mentido a tu mejor amigo? ¿En qué?',
  '¿Cuál es tu crush secreto en este servidor?',
  '¿Cuál es el peor error que has cometido en tu vida?',
  '¿Has hecho stalking al perfil de alguien? ¿De quién?',
  '¿Cuál es la mentira más grande que le has dicho a tus padres?',
  '¿Cuál es tu mayor miedo que nadie conoce?',
  '¿Alguna vez te han pillado haciendo algo que no debías?',
  '¿Has fingido estar enfermo para no ir a algo? ¿A qué?',
  '¿Cuál es el mensaje más cringe que has enviado?',
  '¿A quién de este servidor le mandarías un mensaje privado ahora mismo?',
  '¿Cuál es el secreto más grande que guardas?',
  '¿Alguna vez lloraste por una serie o película? ¿Cuál?',
  '¿Cuánto tiempo llevas sin ducharte en lo más largo?',
  '¿Tienes algún hábito raro que nadie sepa?',
];

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
    .setName('truth')
    .setDescription('💬 Verdad o Reto aleatorio')
    .addSubcommand(s => s.setName('verdad').setDescription('💬 Pregunta de verdad aleatoria'))
    .addSubcommand(s => s.setName('reto').setDescription('🔥 Reto aleatorio')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'verdad') {
      const verdad = VERDADES[Math.floor(Math.random() * VERDADES.length)];
      return interaction.reply({ embeds: [new EmbedBuilder()
        .setColor(0x00AAFF)
        .setTitle('💬 Verdad')
        .setDescription(`> ${verdad}`)
        .setFooter({ text: 'System 777 · Dev: 777 · IG: @yzz.yzx' })
      ]});
    }

    if (sub === 'reto') {
      const reto = RETOS[Math.floor(Math.random() * RETOS.length)];
      return interaction.reply({ embeds: [new EmbedBuilder()
        .setColor(0xFF4500)
        .setTitle('🔥 Reto')
        .setDescription(`> ${reto}`)
        .setFooter({ text: 'System 777 · Dev: 777 · IG: @yzz.yzx' })
      ]});
    }
  }
};
