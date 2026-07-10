const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('music')
    .setDescription('🎮 Controles de música')
    .addSubcommand(s => s.setName('skip').setDescription('⏭️ Salta la canción actual'))
    .addSubcommand(s => s.setName('stop').setDescription('⏹️ Para la música y limpia la cola'))
    .addSubcommand(s => s.setName('pause').setDescription('⏸️ Pausa la reproducción'))
    .addSubcommand(s => s.setName('resume').setDescription('▶️ Reanuda la reproducción'))
    .addSubcommand(s => s.setName('shuffle').setDescription('🔀 Mezcla la cola'))
    .addSubcommand(s => s.setName('loop').setDescription('🔁 Cambia el modo de repetición')
      .addStringOption(o => o.setName('modo').setDescription('Modo').setRequired(true)
        .addChoices(
          { name: '🚫 Sin loop',  value: '0' },
          { name: '🎵 Canción',   value: '1' },
          { name: '🔁 Cola',      value: '2' },
          { name: '🔀 Autoplay',  value: '3' }
        )))
    .addSubcommand(s => s.setName('volume').setDescription('🔊 Ajusta el volumen (1-100)')
      .addIntegerOption(o => o.setName('nivel').setDescription('Volumen').setRequired(true).setMinValue(1).setMaxValue(100)))
    .addSubcommand(s => s.setName('nowplaying').setDescription('🎵 Muestra la canción actual')),

  async execute(interaction, client) {
    const sub   = interaction.options.getSubcommand();
    const queue = client.player.nodes.get(interaction.guild);

    if (!queue?.isPlaying() && sub !== 'stop') {
      return interaction.reply({ content: '🔇 No hay música reproduciéndose.', flags: MessageFlags.Ephemeral });
    }

    const ok = (msg) => interaction.reply({ embeds: [new EmbedBuilder().setColor(0x00FF88).setDescription(msg).setFooter({ text: 'System 777' })] });

    if (sub === 'skip') {
      queue.node.skip();
      return ok('⏭️ Canción saltada.');

    } else if (sub === 'stop') {
      queue?.delete();
      return ok('⏹️ Música detenida y cola limpiada.');

    } else if (sub === 'pause') {
      if (queue.node.isPaused()) return interaction.reply({ content: 'Ya está pausado.', flags: MessageFlags.Ephemeral });
      queue.node.pause();
      return ok('⏸️ Música pausada.');

    } else if (sub === 'resume') {
      queue.node.resume();
      return ok('▶️ Música reanudada.');

    } else if (sub === 'shuffle') {
      queue.tracks.shuffle();
      return ok('🔀 Cola mezclada.');

    } else if (sub === 'loop') {
      const modo = parseInt(interaction.options.getString('modo'));
      queue.setRepeatMode(modo);
      const names = ['Sin loop', 'Canción', 'Cola', 'Autoplay'];
      return ok(`🔁 Modo: **${names[modo]}**`);

    } else if (sub === 'volume') {
      const v = interaction.options.getInteger('nivel');
      queue.node.setVolume(v);
      return ok(`🔊 Volumen: **${v}%**`);

    } else if (sub === 'nowplaying') {
      const t   = queue.currentTrack;
      const bar = queue.node.createProgressBar();
      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('🎵 Sonando Ahora')
        .setDescription(`**[${t.title}](${t.url})**\n${bar}`)
        .setThumbnail(t.thumbnail)
        .addFields(
          { name: '🎤 Artista',  value: t.author || '?',        inline: true },
          { name: '⏱️ Duración', value: t.duration || '?',      inline: true },
          { name: '🔊 Volumen',  value: `${queue.node.volume}%`, inline: true },
        )
        .setFooter({ text: 'System 777 · Developer 777' });
      return interaction.reply({ embeds: [embed] });
    }
  }
};
