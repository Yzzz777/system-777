const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const roasts = [
  'Tu vida es tan triste que hasta tu sombra se fue.',
  'Eres como una nube... cuando desapareces, es un día hermoso.',
  'No eres completo... pero te falta algo.',
  'Si fueras un insulto, serías el peor de todos.',
  'Tu cara no la ni el paint la quiere.',
  'Hablas tanto que hasta el silencio se fue.',
  'Eres la razón por la que Dios cierra los ojos.',
  'Si la estupidez doliera, estarías en coma.',
  'Tu ex no te extraña, ni tu mamá te extraña.',
  'Eres como un semáforo: rojo todo el tiempo.',
  'No tienes cara de bueno, tienes cara de "¿qué hago aquí?"',
  'Eres el tipo de persona que se auto-likea.',
  'Tu vida es un bug que nadie puede fixear.',
  'Si fueras pizza, serías la de anchoa de 3AM.',
  'Eres como WiFi sin señal: todos te ven pero nadie te conecta.',
  'Tu nivel de inteligencia está en modo avión.',
  'No eres tonto, solo piensas diferente... al revés.',
  'Si fueras un error 404, nadie te buscaría.',
  'Tu ex te dejó por un bot de Discord... y tiene razón.',
  'Eres la actualización que nadie pidió.',
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('roast')
    .setDescription('🔥 Insulta aleatorio (con cariño)')
    .addUserOption(o => o.setName('usuario').setDescription('¿A quién roastear?')),

  async execute(interaction) {
    const target = interaction.options.getUser('usuario') || interaction.user;
    const roast = roasts[Math.floor(Math.random() * roasts.length)];

    const embed = new EmbedBuilder()
      .setColor(0xFF4500)
      .setTitle('🔥 Roast Machine')
      .setDescription(`**${target.tag}**, esto es para ti:\n\n> ${roast}`)
      .setThumbnail(target.displayAvatarURL({ dynamic: true }))
      .setFooter({ text: 'System 777 · Dev: 777 · IG: @yzz.yzx' });

    await interaction.reply({ embeds: [embed] });
  }
};
