const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('queue')
    .setDescription('📋 Muestra la cola de reproducción'),

  async execute(interaction, client) {
    const queue = client.player.nodes.get(interaction.guild);
    if (!queue?.isPlaying()) return interaction.reply({ content: '🔇 No hay nada reproduciéndose.', flags: MessageFlags.Ephemeral });

    const tracks   = queue.tracks.toArray();
    const current  = queue.currentTrack;
    const trackList = tracks.slice(0, 10)
      .map((t, i) => `**${i+1}.** [${t.title}](${t.url}) — \`${t.duration}\``)
      .join('\n') || 'Cola vacía';

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('📋 Cola de Reproducción')
      .addFields(
        { name: '▶️ Ahora',             value: `[${current.title}](${current.url}) — \`${current.duration}\`` },
        { name: `Siguiente (${tracks.length})`, value: trackList }
      )
      .setFooter({ text: `System 777 · Volumen: ${queue.node.volume}%` });

    await interaction.reply({ embeds: [embed] });
  }
};
