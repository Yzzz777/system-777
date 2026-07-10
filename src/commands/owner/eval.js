const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');

module.exports = {
  ownerOnly: true,
  data: new SlashCommandBuilder()
    .setName('eval')
    .setDescription('[OWNER] Ejecuta código JavaScript en el servidor')
    .addStringOption(o => o.setName('codigo').setDescription('Código JS a ejecutar').setRequired(true)),

  async execute(interaction, client) {
    const code = interaction.options.getString('codigo');

    let resultado, tipo = 'success', output;

    try {
      // eslint-disable-next-line no-eval
      resultado = await eval(code);
      if (typeof resultado !== 'string') resultado = require('util').inspect(resultado, { depth: 2 });
      output = resultado?.slice(0, 1900) ?? 'undefined';
    } catch (e) {
      output = e.message?.slice(0, 1900) ?? String(e);
      tipo = 'error';
    }

    // Ocultar el token del output por seguridad
    const token = process.env.BOT_TOKEN ?? '';
    const safe  = token ? output.replace(new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '[TOKEN OCULTO]') : output;

    await interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(tipo === 'success' ? 0x00FF88 : 0xFF4444)
        .setTitle(tipo === 'success' ? '✅ Eval — OK' : '❌ Eval — Error')
        .addFields(
          { name: '📥 Input',  value: `\`\`\`js\n${code.slice(0, 900)}\n\`\`\`` },
          { name: '📤 Output', value: `\`\`\`js\n${safe}\n\`\`\`` },
        )
        .setFooter({ text: 'System 777 · Owner Only 👑' })
        .setTimestamp()],
      flags: MessageFlags.Ephemeral
    });
  }
};
