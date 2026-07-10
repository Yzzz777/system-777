const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const os = require('os');
const db = require('../../utils/db');

module.exports = {
  ownerOnly: true,
  data: new SlashCommandBuilder()
    .setName('analytics')
    .setDescription('[OWNER] Estadísticas y analíticas del bot'),

  async execute(interaction, client) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const uptimeSec = process.uptime();
    const h = Math.floor(uptimeSec / 3600);
    const m = Math.floor((uptimeSec % 3600) / 60);
    const s = Math.floor(uptimeSec % 60);
    const uptime = `${h}h ${m}m ${s}s`;

    const memUsage = process.memoryUsage();
    const memMB = (memUsage.heapUsed / 1024 / 1024).toFixed(1);
    const memTotalMB = (memUsage.heapTotal / 1024 / 1024).toFixed(1);
    const rssMB = (memUsage.rss / 1024 / 1024).toFixed(1);

    const cpus = os.cpus();
    const cpuModel = cpus[0]?.model || 'Unknown';
    const cpuCount = cpus.length;
    const loadAvg = os.loadavg().map(v => v.toFixed(2)).join(' / ');

    const totalMem = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
    const freeMem  = (os.freemem()  / 1024 / 1024 / 1024).toFixed(2);

    const guilds  = client.guilds.cache.size;
    const users   = client.guilds.cache.reduce((a, g) => a + g.memberCount, 0);
    const channels = client.channels.cache.size;
    const cmds    = client.commands.size;
    const ping    = client.ws.ping;

    const stats = db.get('analytics', 'commands_used') || {};
    const totalCmds = Object.values(stats).reduce((a, v) => a + v, 0);
    const topCmds = Object.entries(stats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([k, v]) => `\`${k}\` × ${v}`)
      .join('\n') || 'Sin datos';

    const embed = new EmbedBuilder()
      .setColor(0x6366f1)
      .setTitle('📊 Bot Analytics — System 777')
      .setThumbnail(client.user.displayAvatarURL())
      .addFields(
        { name: '🌐 Discord', value: `Servidores: **${guilds}**\nUsuarios: **${users.toLocaleString()}**\nCanales: **${channels}**\nComandos: **${cmds}**\nPing: **${ping}ms**`, inline: true },
        { name: '⏱️ Runtime', value: `Uptime: **${uptime}**\nNode: **${process.version}**\nPlataforma: **${process.platform}**\nPID: **${process.pid}**`, inline: true },
        { name: '💾 Memoria', value: `Heap: **${memMB}/${memTotalMB} MB**\nRSS: **${rssMB} MB**\nSistema: **${freeMem}/${totalMem} GB** libre`, inline: true },
        { name: '🖥️ CPU', value: `Modelo: **${cpuModel.slice(0, 30)}**\nNúcleos: **${cpuCount}**\nLoad avg: **${loadAvg}**`, inline: false },
        { name: `📈 Comandos ejecutados (total: ${totalCmds})`, value: topCmds, inline: false }
      )
      .setFooter({ text: 'System 777 · Analytics · Owner Only' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
};
