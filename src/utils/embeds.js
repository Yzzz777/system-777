/**
 * embeds.js — EmbedBuilder centralizado para System 777
 *
 * Unifica colores, footers y estilos de embeds en todo el bot.
 * Usa these helpers en vez de crear EmbedBuilder directamente.
 */

const { EmbedBuilder } = require('discord.js');

// ── PALETA DE COLORES ────────────────────────────────────────────────────────
const COLORS = {
  primary:    0x5865F2,  // Discord blurple — embeds por defecto
  success:    0x57F287,  // Verde — acciones exitosas
  warning:    0xFEE75C,  // Amarillo — alertas, warnings
  error:      0xED4245,  // Rojo — errores, bans
  danger:     0xFF4444,  // Rojo suave — errores menores
  orange:     0xFF9900,  // Naranja — timeouts, alertas medias
  info:       0x5865F2,  // Info (mismo que primary)
  economy:    0xF5C518,  // Dorado — economía
  mod:        0x2F3136,  // Oscuro — moderación
  fun:        0x7C3AED,  // Púrpura — comandos fun
  network:    0x6366F1,  // Índigo — comandos de red
  pink:       0xFF69B4,  // Rosa — compliment, love
  gray:       0x949BA4,  // Graying — embeds neutros
  dark:       0x2C2F33,  // Oscuro — embeds especiales
  ticket:     0x7C3AED,  // Púrpura — tickets
  premium:    0xF1C40F,  // Oro — premium
};

// ── FOOTER ESTÁNDAR ─────────────────────────────────────────────────────────
const FOOTER_BASE = 'System 777';
const FOOTER_DEFAULT = `${FOOTER_BASE} • jrsystem7777.com`;
const FOOTER_OWNER   = `${FOOTER_BASE} • Developer 777`;

// Mapeo de categorías a footer específico
const CATEGORY_FOOTERS = {
  moderation: `${FOOTER_BASE} • Moderación`,
  protection: `${FOOTER_BASE} • Protección`,
  economy:    `${FOOTER_BASE} • Economía`,
  levels:     `${FOOTER_BASE} • Niveles`,
  fun:        `${FOOTER_BASE} • Diversión`,
  utility:    `${FOOTER_BASE} • Utilidad`,
  music:      `${FOOTER_BASE} • Música`,
  tickets:    `${FOOTER_BASE} • Soporte`,
  owner:      `${FOOTER_BASE} • Owner Only`,
  network:    `${FOOTER_BASE} • Network`,
  giveaway:   `${FOOTER_BASE} • Sorteos`,
  social:     `${FOOTER_BASE} • Social`,
};

// ── EMBED CREATORS ───────────────────────────────────────────────────────────

/**
 * Embed base con estilo unificado
 * @param {Object} opts
 * @param {string} opts.title - Título del embed
 * @param {string} opts.description - Descripción
 * @param {number|string} opts.color - Color (usa COLORS o hex)
 * @param {string} opts.category - Categoría para footer automático
 * @param {string} opts.footer - Footer custom (override)
 * @param {string} opts.footerIcon - Icono del footer
 * @param {string} opts.thumbnail - URL del thumbnail
 * @param {string} opts.image - URL de la imagen
 * @param {boolean} opts.timestamp - Si agregar timestamp (default: true)
 */
function createEmbed(opts = {}) {
  const color = typeof opts.color === 'string'
    ? parseInt(opts.color.replace('#', ''), 16) || COLORS.primary
    : opts.color || COLORS.primary;

  const footerText = opts.footer
    || (opts.category && CATEGORY_FOOTERS[opts.category])
    || FOOTER_DEFAULT;

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTimestamp(opts.timestamp !== false ? Date.now() : null);

  if (opts.title) embed.setTitle(opts.title);
  if (opts.description) embed.setDescription(opts.description);
  if (opts.footer) embed.setFooter({ text: footerText, iconURL: opts.footerIcon });
  else embed.setFooter({ text: footerText });
  if (opts.thumbnail) embed.setThumbnail(opts.thumbnail);
  if (opts.image) embed.setImage(opts.image);
  if (opts.author) embed.setAuthor(opts.author);
  if (opts.fields?.length) embed.addFields(opts.fields);

  return embed;
}

/**
 * Embed de éxito (verde)
 */
function successEmbed(title, description, extra = {}) {
  return createEmbed({ color: COLORS.success, title, description, ...extra, category: extra.category || undefined });
}

/**
 * Embed de error (rojo)
 */
function errorEmbed(description, title = '❌ Error', extra = {}) {
  return createEmbed({ color: COLORS.error, title, description, ...extra });
}

/**
 * Embed de warning (amarillo)
 */
function warningEmbed(description, title = '⚠️ Advertencia', extra = {}) {
  return createEmbed({ color: COLORS.warning, title, description, ...extra });
}

/**
 * Embed informativo (blurple)
 */
function infoEmbed(title, description, extra = {}) {
  return createEmbed({ color: COLORS.primary, title, description, ...extra });
}

/**
 * Embed de moderación (naranja)
 */
function modEmbed(title, description, extra = {}) {
  return createEmbed({ color: COLORS.orange, title, description, category: 'moderation', ...extra });
}

/**
 * Embed de economía (dorado)
 */
function econEmbed(title, description, extra = {}) {
  return createEmbed({ color: COLORS.economy, title, description, category: 'economy', ...extra });
}

/**
 * Embed de tickets (púrpura)
 */
function ticketEmbed(title, description, extra = {}) {
  return createEmbed({ color: COLORS.ticket, title, description, category: 'tickets', ...extra });
}

/**
 * Embed de premium (oro)
 */
function premiumEmbed(title, description, extra = {}) {
  return createEmbed({ color: COLORS.premium, title, description, ...extra });
}

module.exports = {
  COLORS,
  FOOTER_BASE,
  FOOTER_DEFAULT,
  FOOTER_OWNER,
  CATEGORY_FOOTERS,
  createEmbed,
  successEmbed,
  errorEmbed,
  warningEmbed,
  infoEmbed,
  modEmbed,
  econEmbed,
  ticketEmbed,
  premiumEmbed,
};
