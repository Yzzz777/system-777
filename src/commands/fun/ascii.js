const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ascii')
    .setDescription('🔤 Convierte texto a ASCII art')
    .addStringOption(o => o.setName('texto').setDescription('Texto a convertir').setRequired(true).setMaxLength(20)),

  async execute(interaction) {
    try {
      const text = interaction.options.getString('texto').toUpperCase();

      const font = {
        A: ['  █  ', ' █ █ ', '█████', '█   █', '█   █'],
        B: ['████ ', '█   █', '████ ', '█   █', '████ '],
        C: [' ████', '█    ', '█    ', '█    ', ' ████'],
        D: ['████ ', '█   █', '█   █', '█   █', '████ '],
        E: ['█████', '█    ', '████ ', '█    ', '█████'],
        F: ['█████', '█    ', '████ ', '█    ', '█    '],
        G: [' ████', '█    ', '█  ██', '█   █', ' ████'],
        H: ['█   █', '█   █', '█████', '█   █', '█   █'],
        I: ['█████', '  █  ', '  █  ', '  █  ', '█████'],
        J: ['█████', '   █ ', '   █ ', '█  █ ', ' ██  '],
        K: ['█   █', '█  █ ', '███  ', '█  █ ', '█   █'],
        L: ['█    ', '█    ', '█    ', '█    ', '█████'],
        M: ['█   █', '██ ██', '█ █ █', '█   █', '█   █'],
        N: ['█   █', '██  █', '█ █ █', '█  ██', '█   █'],
        O: [' ███ ', '█   █', '█   █', '█   █', ' ███ '],
        P: ['████ ', '█   █', '████ ', '█    ', '█    '],
        Q: [' ███ ', '█   █', '█ █ █', '█  █ ', ' ██ █'],
        R: ['████ ', '█   █', '████ ', '█  █ ', '█   █'],
        S: [' ████', '█    ', ' ███ ', '    █', '████ '],
        T: ['█████', '  █  ', '  █  ', '  █  ', '  █  '],
        U: ['█   █', '█   █', '█   █', '█   █', ' ███ '],
        V: ['█   █', '█   █', '█   █', ' █ █ ', '  █  '],
        W: ['█   █', '█   █', '█ █ █', '██ ██', '█   █'],
        X: ['█   █', ' █ █ ', '  █  ', ' █ █ ', '█   █'],
        Y: ['█   █', ' █ █ ', '  █  ', '  █  ', '  █  '],
        Z: ['█████', '   █ ', '  █  ', ' █   ', '█████'],
        '0': [' ███ ', '█  ██', '█ █ █', '██  █', ' ███ '],
        '1': ['  █  ', ' ██  ', '  █  ', '  █  ', '█████'],
        '2': [' ███ ', '█   █', '  ██ ', ' █   ', '█████'],
        '3': ['████ ', '    █', ' ███ ', '    █', '████ '],
        '4': ['█   █', '█   █', '█████', '    █', '    █'],
        '5': ['█████', '█    ', '████ ', '    █', '████ '],
        '6': [' ███ ', '█    ', '████ ', '█   █', ' ███ '],
        '7': ['█████', '    █', '   █ ', '  █  ', ' █   '],
        '8': [' ███ ', '█   █', ' ███ ', '█   █', ' ███ '],
        '9': [' ███ ', '█   █', ' ████', '    █', ' ███ '],
        ' ': ['     ', '     ', '     ', '     ', '     '],
        '!': ['  █  ', '  █  ', '  █  ', '     ', '  █  '],
        '?': [' ███ ', '█   █', '  ██ ', '     ', '  █  '],
      };

      const lines = ['', '', '', '', ''];
      for (const char of text.slice(0, 15)) {
        const glyph = font[char] || font[' '];
        for (let i = 0; i < 5; i++) {
          lines[i] += glyph[i] + ' ';
        }
      }

      const result = '```\n' + lines.join('\n') + '\n```';

      if (result.length > 2000) {
        return interaction.reply({ content: '❌ Texto demasiado largo para convertir.', flags: MessageFlags.Ephemeral });
      }

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('🔤 ASCII Art')
        .setDescription(result)
        .setFooter({ text: 'System 777 • jrsystem7777.com' });

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('[ERROR] ascii:', error);
      const reply = { content: '❌ Error interno del comando.', ephemeral: true };
      if (interaction.deferred) await interaction.editReply(reply).catch(() => {});
      else await interaction.reply(reply).catch(() => {});
    }
  }
};
