const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');

module.exports = {
  ownerOnly: true,
  data: new SlashCommandBuilder()
    .setName('servers')
    .setDescription('[OWNER] Lista todos los servidores donde está el bot'),

  async execute(interaction, client) {
    await client.guilds.fetch().catch(() => {});

    const guilds = [...client.guilds.cache.values()]
      .sort((a, b) => b.memberCount - a.memberCount)
      .slice(0, 25);

    const desc = guilds.length
      ? guilds.map((g, i) => `**${i+1}.** ${g.name} · \`${g.id}\` · 👥 ${g.memberCount}`).join('\n')
      : 'Sin servidores aún.';

    await interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(`🏠 Servidores de System 777 (${client.guilds.cache.size})`)
        .setDescription(desc)
        .setFooter({ text: 'System 777 · Developer 777 · Top 25 por miembros' })],
      flags: MessageFlags.Ephemeral,
    });
  }
};
