const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const db = require('../../utils/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('levels')
    .setDescription('⭐ Sistema de niveles')
    .addSubcommand(s => s.setName('rank').setDescription('Ver tu rango y nivel').addUserOption(o => o.setName('usuario').setDescription('Usuario')))
    .addSubcommand(s => s.setName('top').setDescription('Leaderboard del servidor'))
    .addSubcommand(s => s.setName('logros').setDescription('Ver tus logros').addUserOption(o => o.setName('usuario').setDescription('Usuario')))
    .addSubcommand(s => s
      .setName('config')
      .setDescription('Configurar sistema de niveles')
      .addChannelOption(o => o.setName('canal_nivel').setDescription('Canal donde se anuncian subidas de nivel'))
      .addBooleanOption(o => o.setName('xp_habilitado').setDescription('Activar/desactivar ganancia de XP'))
      .addStringOption(o => o.setName('canales_xp').setDescription('IDs de canales donde se gana XP (separados por coma). Vacío = todos')))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply();
    try {
    const sub = interaction.options.getSubcommand();
    const target = interaction.options.getUser('usuario') || interaction.user;

    if (sub === 'rank') {
      const lvl = db.get('levels', target.id, { xp: 0, level: 1 });
      const xpNeeded = lvl.level * lvl.level * 100;
      const prevXp = (lvl.level - 1) * (lvl.level - 1) * 100;
      const denom = xpNeeded - prevXp;
      const progress = Math.max(0, Math.min(denom > 0 ? Math.floor(((lvl.xp - prevXp) / denom) * 100) : 0, 100));
      const filled = Math.floor(progress / 10);
      const bar = '█'.repeat(filled) + '░'.repeat(10 - filled);

      const embed = new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle(`⭐ Rango de ${target.username}`)
        .setThumbnail(target.displayAvatarURL({ dynamic: true }))
        .addFields(
          { name: '📊 Nivel', value: `**${lvl.level}**`, inline: true },
          { name: '✨ XP', value: `**${lvl.xp}** / ${xpNeeded}`, inline: true },
          { name: '📈 Progreso', value: `\`${bar}\` ${progress.toFixed(0)}%`, inline: false },
        )
        .setFooter({ text: 'System 777 • jrsystem7777.com' });
      await interaction.editReply({ embeds: [embed] });

    } else if (sub === 'top') {
      const lvlPath = require('path').join(__dirname, '../../data/levels.json');
      let lvlData = {};
      try { lvlData = JSON.parse(require('fs').readFileSync(lvlPath)); } catch {}
      const all = {};
      Object.keys(lvlData).forEach(k => { all[k] = { level: lvlData[k].level || 1, xp: lvlData[k].xp || 0 }; });

      const sorted = Object.entries(all)
        .map(([id, v]) => ({ id, level: v.level || 1, xp: v.xp || 0 }))
        .sort((a, b) => b.level - a.level || b.xp - a.xp)
        .slice(0, 15);

      const desc = sorted.length
        ? sorted.map((v, i) => `${['🥇','🥈','🥉'][i]||`**${i+1}.**`} <@${v.id}> — Nv.**${v.level}** (${v.xp} XP)`).join('\n')
        : 'Nadie tiene niveles aún.';

      await interaction.editReply({ embeds: [new EmbedBuilder().setColor(0x57F287).setTitle('🏆 Leaderboard').setDescription(desc).setFooter({ text: 'System 777 • jrsystem7777.com' })] });

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

      await interaction.editReply({ embeds: [new EmbedBuilder().setColor(0xFFD93D).setTitle(`🏅 Logros de ${target.username}`).setDescription(desc).setFooter({ text: 'System 777 • jrsystem7777.com' })] });

    } else if (sub === 'config') {
      const cfg = db.get('guilds', interaction.guild.id, {});
      if (!cfg.levels) cfg.levels = {};

      const canalNivel = interaction.options.getChannel('canal_nivel');
      const xpHabilitado = interaction.options.getBoolean('xp_habilitado');
      const canalesXp = interaction.options.getString('canales_xp');

      if (canalNivel) {
        cfg.levels.channelId = canalNivel.id;
        cfg.levels.announceChannel = canalNivel.id;
      }
      if (xpHabilitado !== null && xpHabilitado !== undefined) {
        cfg.levels.enabled = xpHabilitado;
        cfg.levels.xpEnabled = xpHabilitado;
      }
      if (canalesXp !== null && canalesXp !== undefined) {
        cfg.levels.xpChannels = canalesXp.trim() ? canalesXp.split(',').map(id => id.trim()).filter(Boolean) : [];
      }

      db.set('guilds', interaction.guild.id, cfg);

      const ch = cfg.levels.channelId ? `<#${cfg.levels.channelId}>` : 'Mismo canal (default)';
      const enabled = cfg.levels.enabled !== false;
      const channels = cfg.levels.xpChannels?.length
        ? cfg.levels.xpChannels.map(id => `<#${id}>`).join(', ')
        : 'Todos los canales';

      await interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(0x57F287)
          .setTitle('⭐ Configuración de Niveles')
          .addFields(
            { name: '📢 Canal de subida', value: ch, inline: true },
            { name: '⚡ XP habilitado', value: enabled ? '✅ Sí' : '❌ No', inline: true },
            { name: '📢 Canales con XP', value: channels, inline: false },
          )
          .setFooter({ text: 'System 777 • Configuración guardada' })],
        flags: MessageFlags.Ephemeral
      });
    }
    } catch (err) {
      await interaction.editReply({content:`❌ Error: ${err.message}`}).catch(()=>{});
    }
  }
};
