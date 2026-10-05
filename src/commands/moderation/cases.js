const {
  SlashCommandBuilder, PermissionFlagsBits,
  MessageFlags, AttachmentBuilder
} = require('discord.js');
const db = require('../../utils/db');
const { createEmbed, COLORS } = require('../../utils/embeds');

const CASE_TYPES  = ['warn', 'mute', 'kick', 'ban', 'note', 'unban', 'unmute', 'watchlist'];
const TYPE_COLORS = { warn: COLORS.warning, mute: COLORS.orange, kick: COLORS.error, ban: COLORS.error, note: COLORS.primary, unban: COLORS.success, unmute: COLORS.success, watchlist: 0xAA00FF };
const TYPE_ICONS  = { warn: '⚠️', mute: '🔇', kick: '👢', ban: '🔨', note: '📝', unban: '✅', unmute: '🔊', watchlist: '👁️' };

function getCases(guildId) { return db.get('mod_cases', guildId) || {}; }
function saveCases(guildId, data) { db.set('mod_cases', guildId, data); }

function nextCaseId(guildId) {
  const meta = db.get('mod_cases_meta', guildId) || { next: 1 };
  const id   = meta.next++;
  db.set('mod_cases_meta', guildId, meta);
  return id;
}

module.exports = {
  userPermissions: [PermissionFlagsBits.ManageMessages],
  data: new SlashCommandBuilder()
    .setName('cases')
    .setDescription('📋 Sistema de casos de moderación')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)

    .addSubcommand(s => s.setName('create').setDescription('Crear nuevo caso')
      .addUserOption(o => o.setName('usuario').setDescription('Usuario del caso').setRequired(true))
      .addStringOption(o => o.setName('tipo').setDescription('Tipo de acción').setRequired(true)
        .addChoices(...CASE_TYPES.map(t => ({ name: `${TYPE_ICONS[t]} ${t.charAt(0).toUpperCase() + t.slice(1)}`, value: t }))))
      .addStringOption(o => o.setName('razon').setDescription('Razón del caso').setRequired(true))
      .addStringOption(o => o.setName('evidencia').setDescription('URL de evidencia (screenshot, etc.)').setRequired(false)))

    .addSubcommand(s => s.setName('view').setDescription('Ver un caso por ID')
      .addIntegerOption(o => o.setName('id').setDescription('ID del caso').setRequired(true).setMinValue(1)))

    .addSubcommand(s => s.setName('list').setDescription('Listar casos')
      .addUserOption(o => o.setName('usuario').setDescription('Filtrar por usuario').setRequired(false))
      .addStringOption(o => o.setName('tipo').setDescription('Filtrar por tipo').setRequired(false)
        .addChoices(...CASE_TYPES.map(t => ({ name: t, value: t }))))
      .addStringOption(o => o.setName('estado').setDescription('Filtrar por estado').setRequired(false)
        .addChoices({ name: 'Abierto', value: 'open' }, { name: 'Cerrado', value: 'closed' })))

    .addSubcommand(s => s.setName('note').setDescription('Añadir nota a un caso')
      .addIntegerOption(o => o.setName('id').setDescription('ID del caso').setRequired(true).setMinValue(1))
      .addStringOption(o => o.setName('nota').setDescription('Contenido de la nota').setRequired(true)))

    .addSubcommand(s => s.setName('close').setDescription('Cerrar/resolver un caso')
      .addIntegerOption(o => o.setName('id').setDescription('ID del caso').setRequired(true).setMinValue(1))
      .addStringOption(o => o.setName('resolucion').setDescription('Resolución del caso').setRequired(false)))

    .addSubcommand(s => s.setName('delete').setDescription('Eliminar un caso (requiere Admin)')
      .addIntegerOption(o => o.setName('id').setDescription('ID del caso').setRequired(true).setMinValue(1)))

    .addSubcommand(s => s.setName('search').setDescription('Buscar casos por razón o usuario')
      .addStringOption(o => o.setName('query').setDescription('Texto a buscar').setRequired(true)))

    .addSubcommand(s => s.setName('export').setDescription('Exportar todos los casos como JSON')),

  async execute(interaction, client) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const sub     = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    // ── CREATE ─────────────────────────────────────────────────────────────
    if (sub === 'create') {
      const user      = interaction.options.getUser('usuario');
      const tipo      = interaction.options.getString('tipo');
      const razon     = interaction.options.getString('razon');
      const evidencia = interaction.options.getString('evidencia') || null;
      const caso = createCase(guildId, {
        userId: user.id, userTag: user.tag,
        modId: interaction.user.id, modTag: interaction.user.tag,
        type: tipo, reason: razon, evidence: evidencia,
      });
      const caseId = caso.id;

      // Log to mod log channel if configured
      const cfg   = db.get('guilds', guildId, {});
      const logCh = interaction.guild.channels.cache.get(cfg.logChannel);
      if (logCh) {
        const logEmbed = createEmbed({
          color: TYPE_COLORS[tipo] || COLORS.primary,
          title: `${TYPE_ICONS[tipo]} Caso #${caseId} — ${tipo.toUpperCase()}`,
          fields: [
            { name: 'Usuario',     value: `${user.tag} (\`${user.id}\`)`, inline: true },
            { name: 'Moderador',   value: `${interaction.user.tag}`, inline: true },
            { name: 'Razón',       value: razon, inline: false },
            ...(evidencia ? [{ name: 'Evidencia', value: evidencia, inline: false }] : [])
          ],
          category: 'moderation'
        });
        await logCh.send({ embeds: [logEmbed] }).catch(() => {});
      }

      return interaction.editReply({ embeds: [createEmbed({
        color: TYPE_COLORS[tipo] || COLORS.primary,
        title: `${TYPE_ICONS[tipo]} Caso #${caseId} Creado`,
        fields: [
          { name: 'Usuario',   value: `${user.tag}`, inline: true },
          { name: 'Tipo',      value: tipo, inline: true },
          { name: 'Razón',     value: razon, inline: false }
        ],
        category: 'moderation'
      })] });
    }

    // ── VIEW ───────────────────────────────────────────────────────────────
    if (sub === 'view') {
      const id    = interaction.options.getInteger('id');
      const cases = getCases(guildId);
      const caso  = cases[id];
      if (!caso) return interaction.editReply({ content: `❌ Caso #${id} no encontrado.` });

      const notesText = caso.notes.length
        ? caso.notes.map(n => `[<t:${Math.floor(n.ts / 1000)}:R>] **${n.modTag}**: ${n.text}`).join('\n').slice(0, 800)
        : 'Sin notas';

      const embed = createEmbed({
        color: caso.status === 'closed' ? 0x888888 : (TYPE_COLORS[caso.type] || COLORS.primary),
        title: `${TYPE_ICONS[caso.type]} Caso #${caso.id} — ${caso.type.toUpperCase()} [${caso.status.toUpperCase()}]`,
        fields: [
          { name: 'Usuario',    value: `<@${caso.userId}> (\`${caso.userTag}\`)`, inline: true },
          { name: 'Moderador',  value: `<@${caso.modId}>`, inline: true },
          { name: 'Fecha',      value: `<t:${Math.floor(caso.createdAt / 1000)}:F>`, inline: true },
          { name: 'Razón',      value: caso.reason, inline: false },
          ...(caso.evidence ? [{ name: 'Evidencia', value: caso.evidence, inline: false }] : []),
          ...(caso.resolution ? [{ name: '✅ Resolución', value: caso.resolution, inline: false }] : []),
          { name: `📝 Notas (${caso.notes.length})`, value: notesText, inline: false }
        ],
        category: 'moderation'
      });

      return interaction.editReply({ embeds: [embed] });
    }

    // ── LIST ───────────────────────────────────────────────────────────────
    if (sub === 'list') {
      const user   = interaction.options.getUser('usuario');
      const tipo   = interaction.options.getString('tipo');
      const estado = interaction.options.getString('estado');
      const cases  = getCases(guildId);

      let entries = Object.values(cases).sort((a, b) => b.createdAt - a.createdAt);
      if (user)   entries = entries.filter(c => c.userId === user.id);
      if (tipo)   entries = entries.filter(c => c.type   === tipo);
      if (estado) entries = entries.filter(c => c.status === estado);

      if (!entries.length) return interaction.editReply({ content: '📋 Sin casos que mostrar.' });

      const lines = entries.slice(0, 15).map(c =>
        `\`#${String(c.id).padStart(4, '0')}\` ${TYPE_ICONS[c.type]} **${c.type}** — <@${c.userId}> — ${c.reason.slice(0, 40)} — <t:${Math.floor(c.createdAt / 1000)}:R> ${c.status === 'closed' ? '✅' : '🔴'}`
      ).join('\n');

      return interaction.editReply({ embeds: [createEmbed({
        color: COLORS.primary,
        title: `📋 Casos — ${interaction.guild.name} (${entries.length} total)`,
        description: lines,
        category: 'moderation'
      })] });
    }

    // ── NOTE ───────────────────────────────────────────────────────────────
    if (sub === 'note') {
      const id    = interaction.options.getInteger('id');
      const nota  = interaction.options.getString('nota');
      const cases = getCases(guildId);
      if (!cases[id]) return interaction.editReply({ content: `❌ Caso #${id} no encontrado.` });

      cases[id].notes.push({ text: nota, modId: interaction.user.id, modTag: interaction.user.tag, ts: Date.now() });
      cases[id].updatedAt = Date.now();
      saveCases(guildId, cases);

      return interaction.editReply({ content: `✅ Nota añadida al caso #${id}.` });
    }

    // ── CLOSE ──────────────────────────────────────────────────────────────
    if (sub === 'close') {
      const id         = interaction.options.getInteger('id');
      const resolucion = interaction.options.getString('resolucion') || 'Cerrado por moderador';
      const cases      = getCases(guildId);
      if (!cases[id]) return interaction.editReply({ content: `❌ Caso #${id} no encontrado.` });
      if (cases[id].status === 'closed') return interaction.editReply({ content: `⚠️ Caso #${id} ya está cerrado.` });

      cases[id].status     = 'closed';
      cases[id].resolution = resolucion;
      cases[id].closedBy   = interaction.user.id;
      cases[id].closedAt   = Date.now();
      cases[id].updatedAt  = Date.now();
      saveCases(guildId, cases);

      return interaction.editReply({ embeds: [createEmbed({
        color: COLORS.success,
        title: `✅ Caso #${id} Cerrado`,
        fields: [{ name: 'Resolución', value: resolucion }],
        category: 'moderation'
      })] });
    }

    // ── DELETE ─────────────────────────────────────────────────────────────
    if (sub === 'delete') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.editReply({ content: '❌ Requiere permisos de Administrador.' });
      }
      const id    = interaction.options.getInteger('id');
      const cases = getCases(guildId);
      if (!cases[id]) return interaction.editReply({ content: `❌ Caso #${id} no encontrado.` });
      delete cases[id];
      saveCases(guildId, cases);
      return interaction.editReply({ content: `🗑️ Caso #${id} eliminado.` });
    }

    // ── SEARCH ─────────────────────────────────────────────────────────────
    if (sub === 'search') {
      const query   = interaction.options.getString('query').toLowerCase();
      const cases   = getCases(guildId);
      const results = Object.values(cases).filter(c =>
        c.reason.toLowerCase().includes(query) ||
        c.userTag.toLowerCase().includes(query) ||
        c.userId.includes(query) ||
        c.type.includes(query)
      ).sort((a, b) => b.createdAt - a.createdAt).slice(0, 10);

      if (!results.length) return interaction.editReply({ content: `🔍 Sin resultados para \`${query}\`.` });

      const lines = results.map(c =>
        `\`#${String(c.id).padStart(4, '0')}\` ${TYPE_ICONS[c.type]} **${c.type}** — ${c.userTag} — ${c.reason.slice(0, 50)}`
      ).join('\n');

      return interaction.editReply({ embeds: [createEmbed({
        color: COLORS.primary,
        title: `🔍 Búsqueda: "${query}" — ${results.length} resultados`,
        description: lines,
        category: 'moderation'
      })] });
    }

    // ── EXPORT ─────────────────────────────────────────────────────────────
    if (sub === 'export') {
      const cases  = getCases(guildId);
      const count  = Object.keys(cases).length;
      if (!count) return interaction.editReply({ content: '⚠️ Sin casos para exportar.' });

      const json   = JSON.stringify({ guildId, guildName: interaction.guild.name, exportedAt: new Date().toISOString(), totalCases: count, cases }, null, 2);
      const buf    = Buffer.from(json, 'utf8');
      const file   = new AttachmentBuilder(buf, { name: `cases_${guildId}_${Date.now()}.json` });

      return interaction.editReply({
        embeds: [createEmbed({
          color: COLORS.success,
          title: `📤 Casos Exportados — ${count} casos`,
          description: `Tamaño: **${(buf.length / 1024).toFixed(1)} KB**`,
          category: 'moderation'
        })],
        files:  [file]
      });
    }
  }
};

// Crea un caso y lo persiste. Usado por el comando /cases create y por el
// dashboard (POST /api/guild/:id/action) para que toda acción tenga caso.
function createCase(guildId, { userId, userTag, modId, modTag, type, reason, evidence = null }) {
  const caseId = nextCaseId(guildId);
  const caso = {
    id: caseId, guildId,
    userId, userTag: userTag || userId,
    modId: modId || null, modTag: modTag || null,
    type, reason: reason || 'Sin razón', evidence: evidence || null,
    status: 'open', notes: [],
    createdAt: Date.now(), updatedAt: Date.now()
  };
  const cases = getCases(guildId);
  cases[caseId] = caso;
  saveCases(guildId, cases);
  return caso;
}

module.exports.createCase = createCase;
