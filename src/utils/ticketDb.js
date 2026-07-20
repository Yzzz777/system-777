const { Pool } = require('pg');

let pool = null;

try {
  const connectionString = process.env.TICKET_DATABASE_URL;
  if (connectionString) {
    pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
    pool.on('error', (err) => {
      console.error('[TICKET_DB] Pool error:', err.message);
    });
  } else {
    console.warn('[TICKET_DB] TICKET_DATABASE_URL not set. Ticket DB disabled.');
  }
} catch (err) {
  console.error('[TICKET_DB] Failed to create pool:', err.message);
  pool = null;
}

async function query(text, params) {
  if (!pool) return null;
  try {
    const result = await pool.query(text, params);
    return result;
  } catch (err) {
    console.error('[TICKET_DB] Query error:', err.message);
    return null;
  }
}

async function initDatabase() {
  if (!pool) return;

  await query(`
    CREATE TABLE IF NOT EXISTS ticket_categories (
      id SERIAL PRIMARY KEY,
      guild_id VARCHAR(20) NOT NULL,
      category_id VARCHAR(50) NOT NULL,
      label VARCHAR(100) NOT NULL,
      emoji VARCHAR(50) DEFAULT '',
      description TEXT DEFAULT '',
      color VARCHAR(20) DEFAULT '#5865F2',
      priority VARCHAR(20) DEFAULT 'low',
      staff_role VARCHAR(20) DEFAULT '',
      channel_category_id VARCHAR(20) DEFAULT '',
      log_channel VARCHAR(20) DEFAULT '',
      welcome_msg TEXT DEFAULT '',
      custom_fields JSONB DEFAULT '[]',
      auto_message TEXT DEFAULT '',
      status VARCHAR(20) DEFAULT 'active',
      sort_order INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS ticket_config (
      guild_id VARCHAR(20) PRIMARY KEY,
      panel_channel VARCHAR(20) DEFAULT '',
      panel_message_id VARCHAR(20) DEFAULT '',
      support_role VARCHAR(20) DEFAULT '',
      log_channel VARCHAR(20) DEFAULT '',
      ticket_category VARCHAR(20) DEFAULT '',
      channel_prefix VARCHAR(50) DEFAULT 'ticket',
      max_per_user INT DEFAULT 3,
      ping_on_open BOOLEAN DEFAULT true,
      dm_transcript BOOLEAN DEFAULT true,
      auto_close_minutes INT DEFAULT 60,
      rating_enabled BOOLEAN DEFAULT true,
      rating_required BOOLEAN DEFAULT false,
      welcome_message TEXT DEFAULT '',
      panel_title VARCHAR(100) DEFAULT 'Soporte',
      panel_description TEXT DEFAULT '',
      panel_color VARCHAR(20) DEFAULT '#5865F2',
      panel_image TEXT DEFAULT '',
      form_fields JSONB DEFAULT '{}',
      auto_close_enabled BOOLEAN DEFAULT false,
      auto_close_message TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await query(`ALTER TABLE ticket_config ADD COLUMN IF NOT EXISTS form_fields JSONB DEFAULT '{}'`);
  await query(`ALTER TABLE ticket_config ADD COLUMN IF NOT EXISTS auto_close_enabled BOOLEAN DEFAULT false`);
  await query(`ALTER TABLE ticket_config ADD COLUMN IF NOT EXISTS auto_close_message TEXT DEFAULT ''`);

  await query(`
    CREATE TABLE IF NOT EXISTS tickets (
      id SERIAL PRIMARY KEY,
      ticket_number INT NOT NULL,
      channel_id VARCHAR(20) NOT NULL,
      user_id VARCHAR(20) NOT NULL,
      user_tag VARCHAR(100) DEFAULT '',
      guild_id VARCHAR(20) NOT NULL,
      category_id VARCHAR(50) DEFAULT '',
      category_label VARCHAR(100) DEFAULT '',
      reason TEXT DEFAULT '',
      priority VARCHAR(20) DEFAULT 'low',
      status VARCHAR(20) DEFAULT 'open',
      claimed_by VARCHAR(20) DEFAULT '',
      claimed_by_tag VARCHAR(100) DEFAULT '',
      created_at TIMESTAMP DEFAULT NOW(),
      closed_at TIMESTAMP,
      close_reason TEXT DEFAULT '',
      closed_by VARCHAR(20) DEFAULT '',
      rating INT,
      rating_comment TEXT DEFAULT '',
      rated_at TIMESTAMP,
      custom_fields JSONB DEFAULT '{}',
      notes JSONB DEFAULT '[]',
      tags JSONB DEFAULT '[]',
      UNIQUE(channel_id)
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS ticket_stats (
      id SERIAL PRIMARY KEY,
      guild_id VARCHAR(20) NOT NULL,
      ticket_id INT REFERENCES tickets(id),
      rating INT,
      staff_id VARCHAR(20) DEFAULT '',
      staff_tag VARCHAR(100) DEFAULT '',
      category_label VARCHAR(100) DEFAULT '',
      duration_minutes INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS ticket_log (
      id SERIAL PRIMARY KEY,
      guild_id VARCHAR(20) NOT NULL,
      ticket_id INT,
      ticket_number INT,
      action VARCHAR(50) NOT NULL,
      user_id VARCHAR(20) DEFAULT '',
      user_tag VARCHAR(100) DEFAULT '',
      details JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await query(`CREATE INDEX IF NOT EXISTS idx_tickets_guild ON tickets(guild_id);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_tickets_user ON tickets(user_id);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_tickets_channel ON tickets(channel_id);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_categories_guild ON ticket_categories(guild_id);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_log_guild ON ticket_log(guild_id);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_log_ticket ON ticket_log(ticket_id);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_stats_guild ON ticket_stats(guild_id);`);

  console.log('[TICKET_DB] Database initialized successfully.');
}

initDatabase();

async function getConfig(guildId) {
  const result = await query('SELECT * FROM ticket_config WHERE guild_id = $1', [guildId]);
  if (!result || !result.rows.length) return null;
  const row = result.rows[0];
  return {
    guildId: row.guild_id,
    panelChannel: row.panel_channel,
    panelMessageId: row.panel_message_id,
    supportRole: row.support_role,
    logChannel: row.log_channel,
    ticketCategory: row.ticket_category,
    channelPrefix: row.channel_prefix,
    maxPerUser: row.max_per_user,
    pingOnOpen: row.ping_on_open,
    dmTranscript: row.dm_transcript,
    autoCloseMinutes: row.auto_close_minutes,
    ratingEnabled: row.rating_enabled,
    ratingRequired: row.rating_required,
    welcomeMessage: row.welcome_message,
    panelTitle: row.panel_title,
    panelDescription: row.panel_description,
    panelColor: row.panel_color,
    panelImage: row.panel_image,
    formFields: row.form_fields || {},
    autoCloseEnabled: row.auto_close_enabled || false,
    autoCloseMessage: row.auto_close_message || '',
  };
}

async function saveConfig(guildId, config) {
  await query(`
    INSERT INTO ticket_config (guild_id, panel_channel, panel_message_id, support_role, log_channel, ticket_category, channel_prefix, max_per_user, ping_on_open, dm_transcript, auto_close_minutes, rating_enabled, rating_required, welcome_message, panel_title, panel_description, panel_color, panel_image, form_fields, auto_close_enabled, auto_close_message, updated_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,NOW())
    ON CONFLICT (guild_id) DO UPDATE SET
      panel_channel=$2, panel_message_id=$3, support_role=$4, log_channel=$5, ticket_category=$6, channel_prefix=$7, max_per_user=$8, ping_on_open=$9, dm_transcript=$10, auto_close_minutes=$11, rating_enabled=$12, rating_required=$13, welcome_message=$14, panel_title=$15, panel_description=$16, panel_color=$17, panel_image=$18, form_fields=$19, auto_close_enabled=$20, auto_close_message=$21, updated_at=NOW()
  `, [
    guildId,
    config.panelChannel || '',
    config.panelMessageId || '',
    config.supportRole || '',
    config.logChannel || '',
    config.ticketCategory || '',
    config.channelPrefix || 'ticket',
    config.maxPerUser ?? 3,
    config.pingOnOpen ?? true,
    config.dmTranscript ?? true,
    config.autoCloseMinutes ?? 60,
    config.ratingEnabled ?? true,
    config.ratingRequired ?? false,
    config.welcomeMessage || '',
    config.panelTitle || 'Soporte',
    config.panelDescription || '',
    config.panelColor || '#5865F2',
    config.panelImage || '',
    JSON.stringify(config.formFields || {}),
    config.autoCloseEnabled ?? false,
    config.autoCloseMessage || '',
  ]);
}

async function getCategories(guildId) {
  const result = await query('SELECT * FROM ticket_categories WHERE guild_id = $1 ORDER BY sort_order ASC, created_at ASC', [guildId]);
  if (!result) return [];
  return result.rows.map(row => ({
    id: row.id,
    guildId: row.guild_id,
    categoryId: row.category_id,
    label: row.label,
    emoji: row.emoji,
    description: row.description,
    color: row.color,
    priority: row.priority,
    staffRole: row.staff_role,
    channelCategoryId: row.channel_category_id,
    logChannel: row.log_channel,
    welcomeMsg: row.welcome_msg,
    customFields: row.custom_fields,
    autoMessage: row.auto_message,
    status: row.status,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  }));
}

async function getCategoryById(categoryId) {
  const result = await query('SELECT * FROM ticket_categories WHERE id = $1', [categoryId]);
  if (!result || !result.rows.length) return null;
  const row = result.rows[0];
  return {
    id: row.id,
    guildId: row.guild_id,
    categoryId: row.category_id,
    label: row.label,
    emoji: row.emoji,
    description: row.description,
    color: row.color,
    priority: row.priority,
    staffRole: row.staff_role,
    channelCategoryId: row.channel_category_id,
    logChannel: row.log_channel,
    welcomeMsg: row.welcome_msg,
    customFields: row.custom_fields,
    autoMessage: row.auto_message,
    status: row.status,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  };
}

async function addCategory(guildId, category) {
  const result = await query(`
    INSERT INTO ticket_categories (guild_id, category_id, label, emoji, description, color, priority, staff_role, channel_category_id, log_channel, welcome_msg, custom_fields, auto_message, status, sort_order)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING id
  `, [
    guildId,
    category.categoryId || category.id || `cat_${Date.now()}`,
    category.label || 'Soporte',
    category.emoji || '',
    category.description || '',
    category.color || '#5865F2',
    category.priority || 'low',
    category.staffRole || '',
    category.channelCategoryId || '',
    category.logChannel || '',
    category.welcomeMsg || '',
    JSON.stringify(category.customFields || []),
    category.autoMessage || '',
    category.status || 'active',
    category.sortOrder ?? 0,
  ]);
  return result?.rows?.[0]?.id || null;
}

async function updateCategory(categoryId, updates) {
  const fields = [];
  const values = [];
  let idx = 1;

  const map = {
    categoryId: 'category_id',
    label: 'label',
    emoji: 'emoji',
    description: 'description',
    color: 'color',
    priority: 'priority',
    staffRole: 'staff_role',
    channelCategoryId: 'channel_category_id',
    logChannel: 'log_channel',
    welcomeMsg: 'welcome_msg',
    customFields: 'custom_fields',
    autoMessage: 'auto_message',
    status: 'status',
    sortOrder: 'sort_order',
  };

  for (const [key, col] of Object.entries(map)) {
    if (key in updates) {
      fields.push(`${col} = $${idx}`);
      values.push(key === 'customFields' ? JSON.stringify(updates[key]) : updates[key]);
      idx++;
    }
  }

  if (!fields.length) return;
  values.push(categoryId);
  await query(`UPDATE ticket_categories SET ${fields.join(', ')} WHERE id = $${idx}`, values);
}

async function deleteCategory(categoryId) {
  await query('DELETE FROM ticket_categories WHERE id = $1', [categoryId]);
}

async function reorderCategories(guildId, categoryIds) {
  for (let i = 0; i < categoryIds.length; i++) {
    await query('UPDATE ticket_categories SET sort_order = $1 WHERE id = $2 AND guild_id = $3', [i, categoryIds[i], guildId]);
  }
}

async function createTicket(ticketData) {
  const result = await query(`
    INSERT INTO tickets (ticket_number, channel_id, user_id, user_tag, guild_id, category_id, category_label, reason, priority, status, claimed_by, claimed_by_tag, created_at, custom_fields, notes, tags)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW(),$13,$14,$15) RETURNING *
  `, [
    ticketData.ticketNumber,
    ticketData.channelId,
    ticketData.userId,
    ticketData.userTag || '',
    ticketData.guildId,
    ticketData.categoryId || null,
    ticketData.categoryLabel || '',
    ticketData.reason || '',
    ticketData.priority || 'low',
    ticketData.status || 'open',
    ticketData.claimedBy || '',
    ticketData.claimedByTag || '',
    JSON.stringify(ticketData.customFields || {}),
    JSON.stringify(ticketData.notes || []),
    JSON.stringify(ticketData.tags || []),
  ]);
  if (!result || !result.rows.length) return null;
  return mapTicketRow(result.rows[0]);
}

async function getTicket(channelId) {
  const result = await query('SELECT * FROM tickets WHERE channel_id = $1', [channelId]);
  if (!result || !result.rows.length) return null;
  return mapTicketRow(result.rows[0]);
}

async function getTicketById(ticketId) {
  const result = await query('SELECT * FROM tickets WHERE id = $1', [ticketId]);
  if (!result || !result.rows.length) return null;
  return mapTicketRow(result.rows[0]);
}

async function getOpenTickets(guildId) {
  const result = await query('SELECT * FROM tickets WHERE guild_id = $1 AND status = $2', [guildId, 'open']);
  if (!result) return [];
  return result.rows.map(mapTicketRow);
}

async function getOpenTicketsByUser(guildId, userId) {
  const result = await query('SELECT * FROM tickets WHERE guild_id = $1 AND user_id = $2 AND status = $3', [guildId, userId, 'open']);
  if (!result) return [];
  return result.rows.map(mapTicketRow);
}

async function updateTicket(channelId, updates) {
  const fields = [];
  const values = [];
  let idx = 1;

  const map = {
    ticketNumber: 'ticket_number',
    userId: 'user_id',
    userTag: 'user_tag',
    guildId: 'guild_id',
    categoryId: 'category_id',
    categoryLabel: 'category_label',
    reason: 'reason',
    priority: 'priority',
    status: 'status',
    claimedBy: 'claimed_by',
    claimedByTag: 'claimed_by_tag',
    closedAt: 'closed_at',
    closeReason: 'close_reason',
    closedBy: 'closed_by',
    rating: 'rating',
    ratingComment: 'rating_comment',
    ratedAt: 'rated_at',
    customFields: 'custom_fields',
    notes: 'notes',
    tags: 'tags',
  };

  for (const [key, col] of Object.entries(map)) {
    if (key in updates) {
      fields.push(`${col} = $${idx}`);
      const val = updates[key];
      if (key === 'customFields' || key === 'notes' || key === 'tags') {
        values.push(JSON.stringify(val));
      } else {
        values.push(val);
      }
      idx++;
    }
  }

  if (!fields.length) return;
  values.push(channelId);
  await query(`UPDATE tickets SET ${fields.join(', ')} WHERE channel_id = $${idx}`, values);
}

async function closeTicket(channelId, reason, closedBy) {
  await query(`
    UPDATE tickets SET status = 'closed', closed_at = NOW(), close_reason = $1, closed_by = $2 WHERE channel_id = $3
  `, [reason || '', closedBy || '', channelId]);
}

async function reopenTicket(channelId) {
  await query(`
    UPDATE tickets SET status = 'open', closed_at = NULL, close_reason = '', closed_by = '' WHERE channel_id = $1
  `, [channelId]);
}

async function claimTicket(channelId, userId, userTag) {
  await query(`
    UPDATE tickets SET claimed_by = $1, claimed_by_tag = $2 WHERE channel_id = $3
  `, [userId, userTag || '', channelId]);
}

async function unclaimTicket(channelId) {
  await query(`
    UPDATE tickets SET claimed_by = '', claimed_by_tag = '' WHERE channel_id = $1
  `, [channelId]);
}

async function setPriority(channelId, priority) {
  await query('UPDATE tickets SET priority = $1 WHERE channel_id = $2', [priority, channelId]);
}

async function moveTicket(channelId, newCategoryId, newCategoryLabel) {
  await query('UPDATE tickets SET category_id = $1, category_label = $2 WHERE channel_id = $3', [newCategoryId, newCategoryLabel || '', channelId]);
}

async function addNote(channelId, note) {
  const result = await query('SELECT notes FROM tickets WHERE channel_id = $1', [channelId]);
  if (!result || !result.rows.length) return;
  const notes = result.rows[0].notes || [];
  notes.push(note);
  await query('UPDATE tickets SET notes = $1 WHERE channel_id = $2', [JSON.stringify(notes), channelId]);
}

async function setTags(channelId, tags) {
  await query('UPDATE tickets SET tags = $1 WHERE channel_id = $2', [JSON.stringify(tags), channelId]);
}

async function getNextTicketNumber(guildId) {
  const result = await query('SELECT COALESCE(MAX(ticket_number), 0) + 1 AS next FROM tickets WHERE guild_id = $1', [guildId]);
  if (!result || !result.rows.length) return 1;
  return result.rows[0].next;
}

async function saveRating(channelId, rating, comment) {
  await query(`
    UPDATE tickets SET rating = $1, rating_comment = $2, rated_at = NOW() WHERE channel_id = $3
  `, [rating, comment || '', channelId]);
}

async function getStats(guildId) {
  const totalResult = await query('SELECT COUNT(*) AS total FROM tickets WHERE guild_id = $1', [guildId]);
  const openResult = await query('SELECT COUNT(*) AS open FROM tickets WHERE guild_id = $1 AND status = $2', [guildId, 'open']);
  const closedResult = await query('SELECT COUNT(*) AS closed FROM tickets WHERE guild_id = $1 AND status = $2', [guildId, 'closed']);
  const ratingResult = await query('SELECT AVG(rating) AS avg_rating, COUNT(rating) AS total_ratings FROM tickets WHERE guild_id = $1 AND rating IS NOT NULL', [guildId]);

  return {
    totalTickets: totalResult?.rows?.[0]?.total || 0,
    openTickets: openResult?.rows?.[0]?.open || 0,
    closedTickets: closedResult?.rows?.[0]?.closed || 0,
    avgRating: parseFloat(ratingResult?.rows?.[0]?.avg_rating) || 0,
    totalRatings: ratingResult?.rows?.[0]?.total_ratings || 0,
  };
}

async function getStaffStats(guildId) {
  const result = await query(`
    SELECT claimed_by AS staff_id, claimed_by_tag AS staff_tag, COUNT(*) AS total, AVG(rating) AS avg_rating
    FROM tickets WHERE guild_id = $1 AND claimed_by != '' AND claimed_by IS NOT NULL
    GROUP BY claimed_by, claimed_by_tag ORDER BY total DESC
  `, [guildId]);
  return result?.rows || [];
}

async function getCategoryStats(guildId) {
  const result = await query(`
    SELECT category_label, COUNT(*) AS total, AVG(rating) AS avg_rating
    FROM tickets WHERE guild_id = $1 AND category_label != ''
    GROUP BY category_label ORDER BY total DESC
  `, [guildId]);
  return result?.rows || [];
}

async function logAction(guildId, ticketId, ticketNumber, action, userId, userTag, details) {
  await query(`
    INSERT INTO ticket_log (guild_id, ticket_id, ticket_number, action, user_id, user_tag, details)
    VALUES ($1,$2,$3,$4,$5,$6,$7)
  `, [guildId, ticketId, ticketNumber, action, userId || '', userTag || '', JSON.stringify(details || {})]);
}

async function getLogs(guildId, limit = 50, offset = 0) {
  const result = await query('SELECT * FROM ticket_log WHERE guild_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3', [guildId, limit, offset]);
  return result?.rows || [];
}

async function getTicketLogs(ticketId) {
  const result = await query('SELECT * FROM ticket_log WHERE ticket_id = $1 ORDER BY created_at ASC', [ticketId]);
  return result?.rows || [];
}

async function cleanupOldTickets(daysOld = 30) {
  const result = await query(
    `DELETE FROM tickets WHERE status = 'closed' AND closed_at < NOW() - INTERVAL '1 day' * $1`,
    [parseInt(daysOld) || 30]
  );
  const logResult = await query(
    `DELETE FROM ticket_log WHERE created_at < NOW() - INTERVAL '90 days'`
  );
  return (result?.rowCount || 0) + (logResult?.rowCount || 0);
}

function mapTicketRow(row) {
  return {
    id: row.id,
    number: row.ticket_number,
    channelId: row.channel_id,
    userId: row.user_id,
    userTag: row.user_tag,
    guildId: row.guild_id,
    categoryId: row.category_id,
    categoryLabel: row.category_label,
    category: row.category_label,
    reason: row.reason,
    priority: row.priority,
    status: row.status,
    claimedBy: row.claimed_by,
    claimedByTag: row.claimed_by_tag,
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    closedAt: row.closed_at ? new Date(row.closed_at).getTime() : null,
    closeReason: row.close_reason,
    closedBy: row.closed_by,
    rating: row.rating,
    ratingComment: row.rating_comment,
    ratedAt: row.rated_at ? new Date(row.rated_at).getTime() : null,
    customFields: row.custom_fields || {},
    notes: row.notes || [],
    tags: row.tags || [],
  };
}

module.exports = {
  getConfig,
  saveConfig,
  getCategories,
  getCategoryById,
  addCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
  createTicket,
  getTicket,
  getTicketById,
  getOpenTickets,
  getOpenTicketsByUser,
  updateTicket,
  closeTicket,
  reopenTicket,
  claimTicket,
  unclaimTicket,
  setPriority,
  moveTicket,
  addNote,
  setTags,
  getNextTicketNumber,
  saveRating,
  getStats,
  getStaffStats,
  getCategoryStats,
  logAction,
  getLogs,
  getTicketLogs,
  cleanupOldTickets,
};
