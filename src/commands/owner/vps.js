const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

module.exports = {
  ownerOnly: true,
  data: new SlashCommandBuilder()
    .setName('vps')
    .setDescription('[OWNER] Estado detallado del VPS y servicios'),

  async execute(interaction, client) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    async function run(cmd) {
      try {
        const { stdout } = await execAsync(cmd, { timeout: 8000, shell: '/bin/bash' });
        return stdout.trim();
      } catch (e) {
        return e.stdout?.trim() || e.message.slice(0, 80);
      }
    }

    const [uname, cpu, mem, disk, pm2, mongo, nodeV, ports, uptime] = await Promise.all([
      run('uname -r'),
      run("top -bn1 | grep 'Cpu(s)' | awk '{print $2+$4\"%\"}'"),
      run("free -h | awk '/^Mem:/{print $3\"/\"$2\" (\"int($3/$2*100)\"%)\"}' 2>/dev/null || free -h | grep Mem | awk '{print $3\"/\"$2}'"),
      run("df -h / | tail -1 | awk '{print $3\"/\"$2\" (\"$5\")\"}'"),
      run('pm2 jlist 2>/dev/null | node -e "const d=JSON.parse(require(\'fs\').readFileSync(\'/dev/stdin\',\'utf8\')); d.forEach(p=>console.log(p.name+\'|\'+p.pm2_env.status+\'|\'+p.pm2_env.restart_time+\'|\'+Math.round(p.monit?.memory/1024/1024||0)+\'MB\'))" 2>/dev/null || pm2 list --no-color 2>/dev/null | tail -20'),
      run('systemctl is-active mongod 2>/dev/null || echo "unknown"'),
      run('node --version'),
      run("ss -tlnp 2>/dev/null | grep -E 'LISTEN' | awk '{print $4}' | sort -u | head -10"),
      run("uptime -p 2>/dev/null || uptime")
    ]);

    const embed = new EmbedBuilder()
      .setColor(0x00FF88)
      .setTitle('🖥️ VPS Status — System 777')
      .addFields(
        { name: '⚙️ Sistema', value: `Kernel: \`${uname}\`\nUptime: \`${uptime}\`\nNode.js: \`${nodeV}\``, inline: true },
        { name: '📊 Recursos', value: `CPU: \`${cpu}\`\nRAM: \`${mem}\`\nDisco: \`${disk}\``, inline: true },
        { name: '🗄️ Servicios', value: `MongoDB: \`${mongo}\`\nPuertos activos:\n\`\`\`${ports || 'N/A'}\`\`\``, inline: false },
        { name: '⚡ PM2 Procesos', value: `\`\`\`\n${pm2.slice(0, 800) || 'Sin procesos'}\n\`\`\``, inline: false }
      )
      .setFooter({ text: 'System 777 · VPS Status · Owner Only' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
};
