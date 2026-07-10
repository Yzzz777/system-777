const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('urban')
    .setDescription('📖 Busca una definición en Urban Dictionary')
    .addStringOption(o => o.setName('termino').setDescription('Término a buscar').setRequired(true)),

  async execute(interaction) {
    const term = interaction.options.getString('termino');

    const definitions = {
      'bot': 'Una programa automatizado que hace el trabajo que un humano no quiere hacer.',
      'discord': 'Un app donde los programadores fingen tener vida social.',
      'linux': 'Un sistema operativo para personas que disfrutan sufrir.',
      'javascript': 'Un lenguaje donde null == undefined pero null !== undefined.',
      'git': 'Un sistema de control de版本 que nadie entiende del todo.',
      'wifi': 'La única relación que no quieres que se corte.',
      'sleep': 'Esa cosa que los programadores hacen cuando no están programando.',
      'coffee': 'El líquido que mantiene vivo al 90% de los desarrolladores.',
      'bug': 'Una feature no documentada.',
      'coding': 'El arte de escribir bugs y después buscarlos.',
      'pizza': 'La única razón por la que un programador sale de su cuarto.',
      'money': 'Eso que los programadores gastan en snacks y energía.',
      'love': 'Un error 404 que todos buscan pero nadie encuentra.',
      'hack': 'Lo que hace tu tío cuando le pides que arregle la compu.',
      'server': 'Una caja que alguien puso en un cuarto oscuro y le tiene miedo.',
    };

    const lower = term.toLowerCase();
    let definition = definitions[lower];

    if (!definition) {
      const keys = Object.keys(definitions);
      const match = keys.find(k => lower.includes(k) || k.includes(lower));
      if (match) definition = definitions[match];
    }

    if (!definition) {
      const adjectives = ['epico', 'legendario', 'cuestionable', 'misterioso', 'extremo'];
      const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
      definition = `**${term}**: Algo tan ${adj} que ni Urban Dictionary sabe qué es. Probablemente lo inventó tu abuela.`;
    }

    const embed = new EmbedBuilder()
      .setColor(0x1A1A2E)
      .setTitle(`📖 Urban Dictionary: ${term}`)
      .setDescription(definition)
      .setFooter({ text: 'System 777 · Dev: 777 · IG: @yzz.yzx' });

    await interaction.reply({ embeds: [embed] });
  }
};
