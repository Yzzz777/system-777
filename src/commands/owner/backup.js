const { SlashCommandBuilder, EmbedBuilder, MessageFlags, AttachmentBuilder } = require('discord.js');
const fs   = require('fs');
const path = require('path');
const zlib = require('zlib');

module.exports = {
  ownerOnly: true,
  data: new SlashCommandBuilder()
    .setName('backup')
    .setDescription('[OWNER] Genera un backup de todos los datos del bot'),

  async execute(interaction, client) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const dataDir = path.join(__dirname, '../../data');
    const files   = fs.readdirSync(dataDir).filter(f => f.endsWith('.json'));

    if (files.length === 0) {
      return interaction.editReply({ embeds: [new EmbedBuilder().setColor(0xFF4444).setTitle('❌ Sin datos').setDescription('No hay archivos JSON en /data')] });
    }

    const bundle = {};
    let totalSize = 0;

    for (const file of files) {
      try {
        const raw = fs.readFileSync(path.join(dataDir, file), 'utf8');
        bundle[file] = JSON.parse(raw);
        totalSize += raw.length;
      } catch {
        bundle[file] = { error: 'parse_failed' };
      }
    }

    bundle._meta = {
      timestamp: new Date().toISOString(),
      files: files.length,
      bot: client.user.tag,
      guilds: client.guilds.cache.size,
      version: '1.0'
    };

    const json    = JSON.stringify(bundle, null, 2);
    const compressed = zlib.gzipSync(Buffer.from(json, 'utf8'));
    const filename = `backup_${Date.now()}.json.gz`;

    const attachment = new AttachmentBuilder(compressed, { name: filename });

    const embed = new EmbedBuilder()
      .setColor(0x00FF88)
      .setTitle('💾 Backup Generado')
      .addFields(
        { name: '📁 Archivos', value: `\`${files.join('`, `')}\``, inline: false },
        { name: '📊 Stats', value: `Archivos: **${files.length}**\nTamaño raw: **${(totalSize / 1024).toFixed(1)} KB**\nComprimido: **${(compressed.length / 1024).toFixed(1)} KB**`, inline: false }
      )
      .setFooter({ text: 'System 777 · Backup · Owner Only' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed], files: [attachment] });
  }
};
