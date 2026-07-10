/**
 * premiumGate.js — Reusable premium access control
 * Usage: if (!await gate.check(interaction, 'normal')) return;
 */
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const prem = require('../systems/premium');

const FEATURES = {
  normal: [
    'Custom welcome embeds con imagen y banner',
    'Perfil avanzado con campos extra y badges',
    'Stats premium (online, boosts en vivo)',
    'Reaction roles ilimitados',
    'Giveaways premium con rol requerido',
    'Autoresponder premium personalizado',
    'Temas de perfil exclusivos',
    'Economía +50% ganancias',
    'Soporte prioritario',
  ],
  pro: [
    'Todo de Normal',
    'Automod avanzado (AI-powered)',
    'Anti-raid con score dinámico',
    'Tickets premium con branding',
    'Logs avanzados con filtros',
    'Dashboard premium ampliado',
    'Verificación avanzada',
    'Backups automáticos diarios',
    'Analytics premium detalladas',
    'XP x2 en niveles',
  ],
  max: [
    'Todo de Pro',
    'AI moderation tools',
    'AI analytics y predicciones',
    'Live monitoring en tiempo real',
    'Investigation tools avanzadas',
    'Custom branding completo',
    'Enterprise security features',
    'Enterprise analytics',
    'API exclusiva de acceso',
    'Live dashboards premium',
    'Automations ilimitadas',
    'Soporte VIP 24/7',
  ],
};

const INFO = {
  normal: { emoji: '⭐', color: 0x57F287, price: '$4.99/mes' },
  pro:    { emoji: '💠', color: 0x5865F2, price: '$9.99/mes' },
  max:    { emoji: '💎', color: 0xF5C518, price: '$19.99/mes' },
};
const ORDER = ['normal', 'pro', 'max'];

/**
 * Check if user has required plan (or is owner).
 * Replies with block embed if access denied.
 * Returns true = access granted, false = denied (reply already sent).
 */
async function check(interaction, requiredPlan = 'normal') {
  // Owner bypass
  if (interaction.user.id === process.env.OWNER_ID) return true;

  const userId  = interaction.user.id;
  const guildId = interaction.guildId;
  const tier    = prem.getEffectiveTier(userId, guildId);
  const reqTier = prem.PLANS[requiredPlan]?.tier ?? 1;

  if (tier >= reqTier) return true;

  // Determine if user has premium but wrong tier
  const hasAny = prem.isActiveFull(userId, guildId);
  const reply  = hasAny
    ? _upgradeTierReply(requiredPlan, tier)
    : _noPremiumReply(requiredPlan);

  try {
    if (interaction.deferred || interaction.replied) await interaction.editReply(reply);
    else await interaction.reply(reply);
  } catch {}

  return false;
}

function _noPremiumReply(requiredPlan = 'normal') {
  const url = prem.getStoreUrl();
  const req = INFO[requiredPlan] || INFO.normal;

  const embed = new EmbedBuilder()
    .setColor(0x2b2d31)
    .setTitle('🔒 Función Premium Exclusiva')
    .setDescription(
      `> **No tienes acceso Premium.**\n> Adquiérelo en la tienda oficial.\n\n` +
      `Esta función requiere **${req.emoji} Premium ${requiredPlan.charAt(0).toUpperCase() + requiredPlan.slice(1)}** o superior.`
    )
    .addFields(
      { name: `⭐ Normal — $4.99/mes`,  value: FEATURES.normal.slice(0, 5).map(f => `✦ ${f}`).join('\n'), inline: true },
      { name: `💠 Pro — $9.99/mes`,     value: FEATURES.pro.slice(0, 5).map(f => `✦ ${f}`).join('\n'),    inline: true },
      { name: `💎 Max — $19.99/mes`,    value: FEATURES.max.slice(0, 5).map(f => `✦ ${f}`).join('\n'),    inline: true },
    )
    .setFooter({ text: 'System 777 · Premium · /premium compare para ver todo' })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setLabel('🛒 Ver Tienda').setURL(url).setStyle(ButtonStyle.Link),
    new ButtonBuilder().setLabel('📨 Solicitar Premium').setCustomId('prem_request_open').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setLabel('📊 Comparar Planes').setCustomId('prem_compare').setStyle(ButtonStyle.Secondary),
  );

  return { embeds: [embed], components: [row], flags: MessageFlags.Ephemeral };
}

function _upgradeTierReply(requiredPlan, currentTier) {
  const url      = prem.getStoreUrl();
  const reqInfo  = INFO[requiredPlan] || INFO.normal;
  const curName  = ORDER[currentTier - 1] || 'desconocido';
  const curInfo  = INFO[curName] || INFO.normal;

  const embed = new EmbedBuilder()
    .setColor(reqInfo.color)
    .setTitle('⬆️ Upgrade Requerido')
    .setDescription(
      `Tienes **${curInfo.emoji} Premium ${curName.charAt(0).toUpperCase() + curName.slice(1)}** pero esta función requiere **${reqInfo.emoji} Premium ${requiredPlan.charAt(0).toUpperCase() + requiredPlan.slice(1)}**.\n\n` +
      `Haz upgrade para desbloquear esta y muchas más funciones exclusivas.`
    )
    .addFields({
      name: `${reqInfo.emoji} Lo que obtienes con Premium ${requiredPlan.charAt(0).toUpperCase() + requiredPlan.slice(1)}`,
      value: FEATURES[requiredPlan]?.slice(0, 7).map(f => `✦ ${f}`).join('\n') || 'Beneficios exclusivos',
    })
    .setFooter({ text: 'System 777 · Premium Upgrade' })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel(`⬆️ Upgrade a ${requiredPlan.charAt(0).toUpperCase() + requiredPlan.slice(1)}`)
      .setURL(url).setStyle(ButtonStyle.Link),
  );

  return { embeds: [embed], components: [row], flags: MessageFlags.Ephemeral };
}

/** Generate full comparison embed (used by /premium compare) */
function compareEmbed() {
  const url = prem.getStoreUrl();

  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle('💎 Comparación de Planes Premium — System 777')
    .setDescription(
      'Todos los planes incluyen los beneficios de los inferiores.\n' +
      'Pago **manual** — solicita con `/premium request` y el owner activa tu plan.\n'
    )
    .addFields(
      {
        name:  `⭐ **Premium Normal** — $4.99/mes`,
        value: FEATURES.normal.map(f => `✦ ${f}`).join('\n'),
        inline: false,
      },
      {
        name:  `💠 **Premium Pro** — $9.99/mes`,
        value: FEATURES.pro.map(f => `✦ ${f}`).join('\n'),
        inline: false,
      },
      {
        name:  `💎 **Premium Max** — $19.99/mes`,
        value: FEATURES.max.map(f => `✦ ${f}`).join('\n'),
        inline: false,
      },
    )
    .setFooter({ text: 'System 777 · Premium · Usa /premium request para comprar' })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setLabel('🛒 Comprar Premium').setURL(url).setStyle(ButtonStyle.Link),
    new ButtonBuilder().setLabel('📨 Solicitar Plan').setCustomId('prem_request_open').setStyle(ButtonStyle.Primary),
  );

  return { embed, row };
}

module.exports = { check, compareEmbed, FEATURES, INFO, ORDER };
