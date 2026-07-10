const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('🎵 Reproduce una canción o playlist')
    .addStringOption(o => o.setName('cancion').setDescription('Nombre o URL').setRequired(true)),

  async execute(interaction, client) {
    const query = interaction.options.getString('cancion');
    const vc    = interaction.member.voice.channel;

    if (!vc) return interaction.reply({ content: '🔇 Debes estar en un canal de voz.', flags: MessageFlags.Ephemeral });

    await interaction.deferReply();

    try {
      const { track } = await client.player.play(vc, query, {
        nodeOptions: {
          metadata: { channel: interaction.channel },
          selfDeaf: true,
          volume: 80,
          leaveOnEmpty: true,
          leaveOnEmptyCooldown: 30000,
          leaveOnEnd: true,
          leaveOnEndCooldown: 30000,
        }
      });

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('🎵 Reproduciendo')
        .setDescription(`**[${track.title}](${track.url})**`)
        .setThumbnail(track.thumbnail)
        .addFields(
          { name: '🎤 Artista',  value: track.author || '?',       inline: true },
          { name: '⏱️ Duración', value: track.duration || '?',     inline: true },
          { name: '🔊 Canal',    value: vc.name,                    inline: true },
          { name: '📡 Fuente',   value: track.source || 'youtube',  inline: true },
        )
        .setFooter({ text: `Pedido por ${interaction.user.tag} · System 777` })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      await interaction.editReply({ content: `❌ Error: \`${err.message}\`` });
    }
  }
};
