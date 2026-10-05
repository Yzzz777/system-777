const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const db           = require('../../utils/db');
const modLog       = require('../../systems/modLog');
const { getBalance } = require('../../systems/economy');
const { xpForLevel } = require('../../systems/levels');
const achievements = require('../../systems/achievements');
const afk          = require('../../systems/afk');
const clans        = require('../../systems/clans');
const { infoEmbed, successEmbed, warningEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('profile')
    .setDescription('👤 Perfil, bio, AFK y clanes')
    .addSubcommand(s => s
      .setName('ver')
      .setDescription('Ver perfil completo de un usuario')
      .addUserOption(o => o.setName('usuario').setDescription('Usuario (default: tú)')))
    .addSubcommand(s => s
      .setName('bio')
      .setDescription('Actualizar tu bio del perfil')
      .addStringOption(o => o.setName('texto').setDescription('Tu bio (máx 150 chars)').setRequired(true).setMaxLength(150)))
    .addSubcommand(s => s
      .setName('afk')
      .setDescription('Activar o desactivar modo AFK')
      .addStringOption(o => o.setName('razon').setDescription('Razón del AFK (opcional)')))
    .addSubcommand(s => s
      .setName('clan')
      .setDescription('Sistema de clanes del servidor')
      .addStringOption(o => o.setName('accion').setDescription('Acción').setRequired(true)
        .addChoices(
          { name: 'Ver mi clan',   value: 'ver'      },
          { name: 'Crear clan',    value: 'crear'    },
          { name: 'Unirse',        value: 'unirse'   },
          { name: 'Salir',         value: 'salir'    },
          { name: 'Disolver',      value: 'disolver' },
          { name: 'Lista',         value: 'lista'    },
          { name: 'Descripción',   value: 'desc'     },
        ))
      .addStringOption(o => o.setName('valor').setDescription('Nombre, ID o descripción del clan'))
      .addStringOption(o => o.setName('tag').setDescription('Tag del clan (2-5 chars, solo para crear)'))
      .addUserOption(o => o.setName('usuario').setDescription('Usuario (solo para expulsar)'))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    // ── VER PERFIL ───────────────────────────────────────────────
    if (sub === 'ver') {
      const target  = interaction.options.getUser('usuario') ?? interaction.user;
      const member  = await interaction.guild.members.fetch(target.id).catch(() => null);
      const lvl     = db.get('levels',   `${interaction.guild.id}_${target.id}`, { level: 0, xp: 0, messages: 0 });
      const eco     = getBalance(target.id);
      const marr    = db.get('marriages', target.id, null);
      const warns   = modLog.getWarns(interaction.guild.id, target.id);
      const bio     = db.get('bios', target.id) || null;
      const clan    = clans.getUserClan(target.id, interaction.guild.id);
      const pts     = achievements.getPoints(target.id, interaction.guild.id);
      const earned  = achievements.getEarned(target.id, interaction.guild.id);
      const afkData = afk.get(target.id);

      const xpNext   = xpForLevel(lvl.level + 1);
      const progress = Math.min(10, xpNext > 0 ? Math.floor((lvl.xp / xpNext) * 10) : 10);
      const bar      = '█'.repeat(progress) + '░'.repeat(10 - progress);

      const descParts = [];
      if (bio) descParts.push(`*"${bio}"*`);
      if (afkData) descParts.push(`> 💤 **AFK:** ${afkData.reason}`);

      const embed = infoEmbed(`👤 Perfil de ${target.username}`, descParts.length ? descParts.join('\n') : null, {
        color: member?.displayColor || undefined,
        thumbnail: target.displayAvatarURL({ size: 256 }),
        fields: [
          { name: '🏆 Nivel',      value: `**${lvl.level}**`,                          inline: true },
          { name: '✨ XP',         value: `${lvl.xp} / ${xpNext}`,                    inline: true },
          { name: '💬 Mensajes',   value: `${lvl.messages}`,                           inline: true },
          { name: '📈 Progreso',   value: `\`${bar}\` ${progress * 10}%`,              inline: false },
          { name: '👛 Bolsillo',   value: `${eco.coins.toLocaleString()} 🪙`,          inline: true },
          { name: '🏦 Banco',      value: `${eco.bank.toLocaleString()} 🪙`,           inline: true },
          { name: '🏅 Logros',     value: `${earned.length} (${pts} pts)`,             inline: true },
          { name: '⚠️ Warns',     value: `${warns.length}`,                            inline: true },
          { name: '💍 Casado con', value: marr ? `<@${marr.partnerId}>` : 'Soltero/a', inline: true },
          { name: '🛡️ Clan',      value: clan ? `[${clan.tag}] ${clan.name}` : 'Sin clan', inline: true },
          { name: '📅 Discord',    value: `<t:${Math.floor(target.createdTimestamp / 1000)}:R>`, inline: true },
          ...(member ? [{ name: '📅 Servidor', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true }] : [])
        ]
      });
      return interaction.reply({ embeds: [embed] });
    }

    // ── BIO ──────────────────────────────────────────────────────
    if (sub === 'bio') {
      const texto = interaction.options.getString('texto');
      db.set('bios', interaction.user.id, texto);
      return interaction.reply({
        embeds: [successEmbed('✅ Bio Actualizada', `Bio actualizada:\n*"${texto}"*`)],
        flags: MessageFlags.Ephemeral,
      });
    }

    // ── AFK ──────────────────────────────────────────────────────
    if (sub === 'afk') {
      const razon = interaction.options.getString('razon') || 'AFK';
      if (afk.isAfk(interaction.user.id)) {
        afk.remove(interaction.user.id);
        return interaction.reply({
          embeds: [successEmbed('✅ AFK Desactivado', 'Modo AFK desactivado. ¡Bienvenido de vuelta!')],
          flags: MessageFlags.Ephemeral,
        });
      }
      afk.set(interaction.user.id, razon);
      return interaction.reply({
        embeds: [warningEmbed('💤 Modo AFK Activado', `Razón: **${razon}**\nSe notificará a quienes te mencionen.`)],
        flags: MessageFlags.Ephemeral,
      });
    }

    // ── CLAN ────────────────────────────────────────────────────
    if (sub === 'clan') {
      const accion = interaction.options.getString('accion');
      const valor  = interaction.options.getString('valor');
      const tag    = interaction.options.getString('tag');

      if (accion === 'ver') {
        const clan = clans.getUserClan(interaction.user.id, interaction.guild.id);
        if (!clan) return interaction.reply({ content: '❌ No estás en ningún clan.', flags: MessageFlags.Ephemeral });
        const memberLines = clan.members.map(id => `<@${id}>${id === clan.ownerId ? ' 👑' : ''}`);
        return interaction.reply({ embeds: [infoEmbed(`🛡️ [${clan.tag}] ${clan.name}`, clan.description || '*Sin descripción*', {
          fields: [
            { name: '🏅 Nivel',  value: `${clan.level}`,                inline: true },
            { name: '✨ XP',     value: `${clan.xp}`,                   inline: true },
            { name: '🏦 Banco',  value: `${clan.bank} 🪙`,              inline: true },
            { name: `👥 Miembros (${clan.members.length}/${20})`, value: memberLines.join(', ') },
          ]
        })]});
      }

      if (accion === 'crear') {
        if (!valor || !tag) return interaction.reply({ content: '❌ Indica nombre y tag. Ej: `/profile clan crear valor:MiClan tag:CLAN`', flags: MessageFlags.Ephemeral });
        const r = clans.create(valor, tag, interaction.user.id, interaction.guild.id);
        if (!r.ok) return interaction.reply({ content: `❌ ${r.reason}`, flags: MessageFlags.Ephemeral });
        return interaction.reply({ embeds: [successEmbed('🛡️ ¡Clan Creado!', `**[${r.clan.tag}] ${r.clan.name}** fundado por <@${interaction.user.id}>\nInvita a tus amigos con \`/profile clan unirse\`!`)]});
      }

      if (accion === 'unirse') {
        if (!valor) return interaction.reply({ content: '❌ Indica el nombre o ID del clan.', flags: MessageFlags.Ephemeral });
        const all = clans.listGuild(interaction.guild.id);
        const target = all.find(c => c.id === valor || c.name.toLowerCase() === valor.toLowerCase() || c.tag === valor.toUpperCase());
        if (!target) return interaction.reply({ content: '❌ Clan no encontrado. Usa `/profile clan lista` para ver los clanes disponibles.', flags: MessageFlags.Ephemeral });
        const r = clans.join(interaction.user.id, interaction.guild.id, target.id);
        if (!r.ok) return interaction.reply({ content: `❌ ${r.reason}`, flags: MessageFlags.Ephemeral });
        return interaction.reply({ embeds: [successEmbed('✅ Clan Unido', `Te uniste a **[${target.tag}] ${target.name}**`)]});
      }

      if (accion === 'salir') {
        const r = clans.leave(interaction.user.id, interaction.guild.id);
        if (!r.ok) return interaction.reply({ content: `❌ ${r.reason}`, flags: MessageFlags.Ephemeral });
        return interaction.reply({ content: '✅ Saliste del clan.', flags: MessageFlags.Ephemeral });
      }

      if (accion === 'disolver') {
        const r = clans.disband(interaction.user.id, interaction.guild.id);
        if (!r.ok) return interaction.reply({ content: `❌ ${r.reason}`, flags: MessageFlags.Ephemeral });
        return interaction.reply({ content: '✅ Clan disuelto correctamente.', flags: MessageFlags.Ephemeral });
      }

      if (accion === 'lista') {
        const all = clans.listGuild(interaction.guild.id);
        if (!all.length) return interaction.reply({ content: '❌ No hay clanes en este servidor todavía.', flags: MessageFlags.Ephemeral });
        const lines = all.slice(0, 10).map((c, i) =>
          `**${i + 1}.** [${c.tag}] **${c.name}** · Lv.${c.level} · ${c.members.length}👥 · ${c.xp}xp`
        );
        return interaction.reply({ embeds: [infoEmbed(`🛡️ Clanes del Servidor (${all.length})`, lines.join('\n'))]});
      }

      if (accion === 'desc') {
        if (!valor) return interaction.reply({ content: '❌ Indica la nueva descripción.', flags: MessageFlags.Ephemeral });
        const r = clans.setDescription(interaction.user.id, interaction.guild.id, valor);
        if (!r.ok) return interaction.reply({ content: `❌ ${r.reason}`, flags: MessageFlags.Ephemeral });
        return interaction.reply({ content: '✅ Descripción del clan actualizada.', flags: MessageFlags.Ephemeral });
      }
    }
  }
};
