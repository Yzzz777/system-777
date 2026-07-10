const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');

module.exports = {
  ownerOnly: true,
  data: new SlashCommandBuilder()
    .setName('status')
    .setDescription('[OWNER] Estado completo de System 777'),

  async execute(interaction, client) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const uptime = process.uptime();
    const d = Math.floor(uptime / 86400);
    const h = Math.floor((uptime % 86400) / 3600);
    const m = Math.floor((uptime % 3600) / 60);
    const s = Math.floor(uptime % 60);

    await client.guilds.fetch().catch(() => {});
    const totalUsers = client.guilds.cache.reduce((a, g) => a + g.memberCount, 0);
    const mem = process.memoryUsage();

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('📊 System 777 — Panel del Dueño')
      .setThumbnail(client.user.displayAvatarURL())
      .addFields(
        { name: '🤖 Bot',        value: client.user.tag,                             inline: true },
        { name: '🆔 ID',         value: client.user.id,                              inline: true },
        { name: '🔌 Versión',    value: 'v1.1.0 · Developer 777',                   inline: true },
        { name: '⏱️ Uptime',    value: `${d}d ${h}h ${m}m ${s}s`,                  inline: true },
        { name: '🏠 Servidores', value: `${client.guilds.cache.size}`,               inline: true },
        { name: '👥 Usuarios',   value: `${totalUsers.toLocaleString()}`,            inline: true },
        { name: '🧠 Memoria RSS', value: `${(mem.rss/1024/1024).toFixed(1)} MB`,    inline: true },
        { name: '💾 Heap',       value: `${(mem.heapUsed/1024/1024).toFixed(1)} MB`, inline: true },
        { name: '🟢 Node.js',    value: process.version,                             inline: true },
        { name: '📡 Ping',       value: `${client.ws.ping}ms`,                       inline: true },
        { name: '🌐 Dashboard',  value: `https://jrsystem7777.com`, inline: true },
        { name: '👑 Owner',      value: `<@${process.env.OWNER_ID}>`,               inline: true },
      )
      .setTimestamp()
      .setFooter({ text: 'System 777 · Developer 777 · Solo visible para el dueño' });

    await interaction.editReply({ embeds: [embed] });
  }
};
