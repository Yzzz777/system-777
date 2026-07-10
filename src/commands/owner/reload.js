const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { readdirSync } = require('fs');
const path = require('path');

module.exports = {
  ownerOnly: true,
  data: new SlashCommandBuilder()
    .setName('reload')
    .setDescription('[OWNER] Recarga comandos en caliente sin reiniciar')
    .addStringOption(o => o.setName('comando').setDescription('Nombre del comando a recargar (o "all")').setRequired(true)),

  async execute(interaction, client) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const target = interaction.options.getString('comando').toLowerCase();
    const cmdPath = path.join(__dirname, '../');
    const results = [];

    function reloadCmd(filePath, name) {
      try {
        delete require.cache[require.resolve(filePath)];
        const cmd = require(filePath);
        if (!cmd.data?.name) return `❌ ${name}: sin data.name`;
        client.commands.set(cmd.data.name, cmd);
        return `✅ ${cmd.data.name}`;
      } catch (e) {
        return `❌ ${name}: ${e.message.slice(0,60)}`;
      }
    }

    if (target === 'all') {
      const cats = readdirSync(cmdPath);
      for (const cat of cats) {
        const files = readdirSync(path.join(cmdPath, cat)).filter(f => f.endsWith('.js'));
        for (const file of files) {
          results.push(reloadCmd(path.join(cmdPath, cat, file), file));
        }
      }
    } else {
      let found = false;
      const cats = readdirSync(cmdPath);
      for (const cat of cats) {
        const files = readdirSync(path.join(cmdPath, cat)).filter(f => f.endsWith('.js'));
        for (const file of files) {
          if (file.replace('.js','') === target || file === target) {
            results.push(reloadCmd(path.join(cmdPath, cat, file), file));
            found = true;
          }
        }
      }
      if (!found) results.push(`❌ Comando "${target}" no encontrado`);
    }

    const ok  = results.filter(r => r.startsWith('✅')).length;
    const err = results.filter(r => r.startsWith('❌')).length;

    await interaction.editReply({
      embeds: [new EmbedBuilder()
        .setColor(err > 0 ? 0xFF9900 : 0x00FF88)
        .setTitle(`🔄 Reload — ${ok} OK, ${err} errores`)
        .setDescription(results.slice(0,20).join('\n') || 'Sin resultados')
        .setFooter({ text: 'System 777 · Reload · Owner Only' })
        .setTimestamp()]
    });
  }
};
