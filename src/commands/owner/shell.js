const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { exec } = require('child_process');

module.exports = {
  ownerOnly: true,
  data: new SlashCommandBuilder()
    .setName('shell')
    .setDescription('[OWNER] Ejecuta un comando de terminal en el VPS')
    .addStringOption(o => o.setName('cmd').setDescription('Comando a ejecutar').setRequired(true))
    .addIntegerOption(o => o.setName('timeout').setDescription('Timeout en segundos (default: 15)').setMinValue(1).setMaxValue(60)),

  async execute(interaction, client) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const cmd     = interaction.options.getString('cmd');
    const timeout = (interaction.options.getInteger('timeout') || 15) * 1000;

    // Bloquear comandos peligrosos irreversibles
    const blocked = ['rm -rf /', 'mkfs', ':(){ :|:& };:', 'dd if=/dev/zero'];
    if (blocked.some(b => cmd.includes(b))) {
      return interaction.editReply({ embeds: [new EmbedBuilder().setColor(0xFF0000).setTitle('🚫 Bloqueado').setDescription('Comando peligroso bloqueado.')] });
    }

    exec(cmd, { timeout, shell: '/bin/bash', maxBuffer: 1024 * 50 }, async (err, stdout, stderr) => {
      const out    = (stdout || '').slice(0, 1800);
      const errOut = (stderr || '').slice(0, 500);
      const embed  = new EmbedBuilder()
        .setColor(err ? 0xFF4444 : 0x00FF88)
        .setTitle(err ? '❌ Shell — Error' : '✅ Shell — OK')
        .addFields({ name: '📥 Comando', value: `\`\`\`bash\n${cmd.slice(0, 200)}\n\`\`\`` })
        .setFooter({ text: 'System 777 · Shell · Owner Only' })
        .setTimestamp();

      if (out)    embed.addFields({ name: '📤 Output',  value: `\`\`\`\n${out}\n\`\`\`` });
      if (errOut) embed.addFields({ name: '⚠️ Stderr', value: `\`\`\`\n${errOut}\n\`\`\`` });
      if (!out && !errOut) embed.addFields({ name: '📤 Output', value: '`(sin salida)`' });

      await interaction.editReply({ embeds: [embed] });
    });
  }
};
