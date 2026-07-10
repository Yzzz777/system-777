const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const db = require('../../utils/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('levels')
    .setDescription('⭐ Sistema de niveles')
    .addSubcommand(s => s.setName('rank').setDescription('Ver tu rango y nivel').addUserOption(o => o.setName('usuario').setDescription('Usuario')))
    .addSubcommand(s => s.setName('top').setDescription('Leaderboard del servidor'))
    .addSubcommand(s => s.setName('logros').setDescription('Ver tus logros').addUserOption(o => o.setName('usuario').setDescription('Usuario'))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const target = interaction.options.getUser('usuario') || interaction.user;

    if (sub === 'rank') {
      const lvl = db.get('levels', target.id, { xp: 0, level: 1 });
      const xpNeeded = lvl.level * 100;
      const progress = Math.min((lvl.xp / xpNeeded) * 100, 100);
      const bar = '█'.repeat(Math.floor(progress / 10)) + '░'.repeat(10 - Math.floor(progress / 10));

      const embed = new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle(`⭐ Rango de ${target.username}`)
        .setThumbnail(target.displayAvatarURL({ dynamic: true }))
        .addFields(
          { name: '📊 Nivel', value: `**${lvl.level}**`, inline: true },
          { name: '✨ XP', value: `**${lvl.xp}** / ${xpNeeded}`, inline: true },
          { name: '📈 Progreso', value: `\`${bar}\` ${progress.toFixed(0)}%`, inline: false },
        )
        .setFooter({ text: 'System 777 · Dev: 777' });
      await interaction.reply({ embeds: [embed] });

    } else if (sub === 'top') {
      const all = {};
      try {
        const fs = require('fs');
        const path = require('path');
        const dbPath = path.join(__dirname, '../../data/economy.json');
        if (fs.existsSync(dbPath)) Object.assign(all, JSON.parse(fs.readFileSync(dbPath)));
      } catch {}
      const lvlPath = require('path').join(__dirname, '../../data/levels.json');
      let lvlData = {};
      try { lvlData = JSON.parse(require('fs').readFileSync(lvlPath)); } catch {}
      Object.keys(lvlData).forEach(k => { if (!all[k]) all[k] = {}; all[k].level = lvlData[k].level || 1; all[k].xp = lvlData[k].xp || 0; });

      const sorted = Object.entries(all)
        .map(([id, v]) => ({ id, level: v.level || 1, xp: v.xp || 0 }))
        .sort((a, b) => b.level - a.level || b.xp - a.xp)
        .slice(0, 15);

      const desc = sorted.length
        ? sorted.map((v, i) => `${['🥇','🥈','🥉'][i]||`**${i+1}.**`} <@${v.id}> — Nv.**${v.level}** (${v.xp} XP)`).join('\n')
        : 'Nadie tiene niveles aún.';

      await interaction.reply({ embeds: [new EmbedBuilder().setColor(0x57F287).setTitle('🏆 Leaderboard').setDescription(desc).setFooter({ text: 'System 777 · Dev: 777' })] });

    } else if (sub === 'logros') {
      const lvl = db.get('levels', target.id, { xp: 0, level: 1 });
      const achievements = [];
      if (lvl.level >= 5) achievements.push('⭐ **Nivel 5** — Principiante');
      if (lvl.level >= 10) achievements.push('🌟 **Nivel 10** — Intermedio');
      if (lvl.level >= 25) achievements.push('💫 **Nivel 25** — Avanzado');
      if (lvl.level >= 50) achievements.push('🏅 **Nivel 50** — Maestro');
      if (lvl.level >= 100) achievements.push('👑 **Nivel 100** — Leyenda');
      if (lvl.xp >= 1000) achievements.push('🔥 **1000 XP** — Guerrero');
      if (lvl.xp >= 5000) achievements.push('⚔️ **5000 XP** — Veterano');
      if (lvl.xp >= 10000) achievements.push('💎 **10000 XP** — Diamante');

      const desc = achievements.length ? achievements.join('\n') : 'Sin logros aún. ¡Escribe para ganar XP!';

      await interaction.reply({ embeds: [new EmbedBuilder().setColor(0xFFD93D).setTitle(`🏅 Logros de ${target.username}`).setDescription(desc).setFooter({ text: 'System 777 · Dev: 777' })] });
    }
  }
};
