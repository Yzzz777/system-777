'use strict';

const { exec }   = require('child_process');
const db         = require('../utils/db');
const notifier   = require('./notifier');

const OWNER_TG   = process.env.TELEGRAM_OWNER_ID ? Number(process.env.TELEGRAM_OWNER_ID) : null;

function allowedIds() {
  const stored = db.get('telegram_config', 'allowed_ids', []);
  const ids = stored.map(Number).filter(Boolean);
  if (OWNER_TG && !ids.includes(OWNER_TG)) ids.push(OWNER_TG);
  return ids;
}
const isAllowed = (id) => allowedIds().includes(Number(id));
const isOwner   = (id) => Number(id) === OWNER_TG;

function fmtUptime(s) {
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${d}d ${h}h ${m}m`;
}

function esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

const MAIN_KB = {
  reply_markup: {
    keyboard: [
      ['📊 Status', '📋 Logs'],
      ['💎 Premium', '👑 Staff'],
      ['📈 Stats', '🖥️ Servidores'],
      ['🔄 Restart', '⚙️ Más comandos'],
    ],
    resize_keyboard: true,
  },
};

module.exports = {
  notifier,
  start(client) {
    const TOKEN = process.env.TELEGRAM_TOKEN;
    if (!TOKEN) {
      console.log('[TELEGRAM] Sin TELEGRAM_TOKEN — bot desactivado');
      return null;
    }

    let TelegramBot;
    try { TelegramBot = require('node-telegram-bot-api'); }
    catch { console.warn('[TELEGRAM] node-telegram-bot-api no instalado — ejecuta: npm install node-telegram-bot-api'); return null; }

    const bot = new TelegramBot(TOKEN, { polling: true });
    notifier.init(bot);

    // Cargar suscripciones guardadas
    for (const id of db.get('telegram_config', 'alert_chats', [])) notifier.addAlertChat(id);

    function guard(msg, onlyOwner, cb) {
      const cid = msg.chat.id;
      if (!isAllowed(cid)) {
        bot.sendMessage(cid, '⛔ Sin acceso. Contacta al owner para obtener permiso.');
        return;
      }
      if (onlyOwner && !isOwner(cid)) {
        bot.sendMessage(cid, '⛔ Solo el owner puede usar este comando.');
        return;
      }
      cb(cid);
    }

    /* ── /start ─────────────────────────────────────────────── */
    bot.onText(/^\/start/, (msg) => guard(msg, false, (cid) => {
      bot.sendMessage(cid,
        `🤖 <b>System 777 Manager</b>\n\n` +
        (isOwner(cid) ? '👑 <b>Owner autenticado</b>\n' : '') +
        `Bot de Discord conectado.\nUsa los botones o escribe <code>/help</code>.\n\n` +
        `<i>— System 777 · Manager Telegram</i>`,
        { parse_mode: 'HTML', ...MAIN_KB }
      );
    }));

    /* ── /help ──────────────────────────────────────────────── */
    bot.onText(/^\/help/, (msg) => guard(msg, false, (cid) => {
      let t = `<b>🤖 System 777 — Comandos Telegram</b>\n\n`;
      t += `<code>/status</code> — Estado del bot Discord\n`;
      t += `<code>/logs [n]</code> — Últimas N líneas del log\n`;
      t += `<code>/restart</code> — Reiniciar bot vía PM2\n`;
      t += `<code>/stats</code> — Analytics del bot\n`;
      t += `<code>/servers</code> — Lista de servidores\n`;
      t += `<code>/premium list</code> — Usuarios premium activos\n`;
      t += `<code>/premium grant &lt;userId&gt; &lt;plan&gt; [días]</code>\n`;
      t += `<code>/premium revoke &lt;userId&gt;</code>\n`;
      t += `<code>/premium check &lt;userId&gt;</code>\n`;
      t += `<code>/staff</code> — Lista de staff\n`;
      t += `<code>/blacklist list|add|remove</code>\n`;
      t += `<code>/broadcast &lt;mensaje&gt;</code> — Broadcast Discord\n`;
      t += `<code>/alerts on|off</code> — Alertas en este chat\n`;
      if (isOwner(cid)) {
        t += `\n<b>👑 Owner:</b>\n`;
        t += `<code>/shell &lt;cmd&gt;</code> — Comando en VPS\n`;
        t += `<code>/allow &lt;tgId&gt;</code> — Dar acceso Telegram\n`;
        t += `<code>/deny &lt;tgId&gt;</code> — Quitar acceso Telegram\n`;
      }
      t += `\n<i>— System 777 · Manager Telegram</i>`;
      bot.sendMessage(cid, t, { parse_mode: 'HTML' });
    }));

    /* ── /status ────────────────────────────────────────────── */
    function handleStatus(cid) {
      const online  = client.ws?.status === 0;
      const guilds  = client.guilds.cache.size;
      const users   = client.guilds.cache.reduce((a, g) => a + (g.memberCount || 0), 0);
      const uptime  = fmtUptime(process.uptime());
      const mem     = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);
      const ping    = client.ws?.ping ?? -1;
      const prem    = Object.values(db.all('premium')).filter(v => v?.active).length;

      bot.sendMessage(cid,
        `<b>📊 Estado — System 777</b>\n\n` +
        `${online ? '🟢 Online' : '🔴 Offline'}\n` +
        `📡 Ping: <b>${ping}ms</b>\n` +
        `🖥️ Servidores: <b>${guilds}</b>\n` +
        `👥 Usuarios: <b>${users.toLocaleString()}</b>\n` +
        `💎 Premium activos: <b>${prem}</b>\n` +
        `⏱️ Uptime: <b>${uptime}</b>\n` +
        `💾 RAM: <b>${mem} MB</b>\n\n` +
        `<i>— System 777 · Manager Telegram</i>`,
        { parse_mode: 'HTML' }
      );
    }
    bot.onText(/^\/status/, (msg) => guard(msg, false, handleStatus));

    /* ── /logs ──────────────────────────────────────────────── */
    function handleLogs(cid, n) {
      const lines = Math.min(n || 20, 50);
      exec(`pm2 logs system-777 --lines ${lines} --nostream 2>&1`, (err, stdout) => {
        const out = (stdout || err?.message || 'Sin logs').slice(-3500);
        bot.sendMessage(cid,
          `<b>📋 Últimas ${lines} líneas:</b>\n\n<pre>${esc(out)}</pre>`,
          { parse_mode: 'HTML' }
        );
      });
    }
    bot.onText(/^\/logs ?(\d*)/, (msg, match) => guard(msg, false, (cid) => {
      handleLogs(cid, parseInt(match[1]) || 20);
    }));

    /* ── /restart ───────────────────────────────────────────── */
    bot.onText(/^\/restart/, (msg) => guard(msg, true, (cid) => {
      bot.sendMessage(cid, '🔄 Reiniciando System 777...');
      exec('pm2 restart system-777', (err) => {
        bot.sendMessage(cid, err ? `❌ Error: ${esc(err.message)}` : '✅ Bot reiniciado.', { parse_mode: 'HTML' });
      });
    }));

    /* ── /stats ─────────────────────────────────────────────── */
    function handleStats(cid) {
      const analytics = db.get('analytics', 'commands_used') || {};
      const total = Object.values(analytics).reduce((a, v) => a + v, 0);
      const top = Object.entries(analytics).sort((a, b) => b[1] - a[1]).slice(0, 5);
      const prem = Object.values(db.all('premium')).filter(v => v?.active).length;
      const guilds = client.guilds.cache.size;
      const users = client.guilds.cache.reduce((a, g) => a + (g.memberCount || 0), 0);

      let t = `<b>📈 Analytics — System 777</b>\n\n`;
      t += `🖥️ Servidores: <b>${guilds}</b>\n`;
      t += `👥 Usuarios totales: <b>${users.toLocaleString()}</b>\n`;
      t += `💎 Premium activos: <b>${prem}</b>\n`;
      t += `⚡ Comandos ejecutados: <b>${total.toLocaleString()}</b>\n`;
      if (top.length) {
        t += `\n<b>Top 5 comandos:</b>\n`;
        top.forEach(([cmd, count], i) => { t += `${i + 1}. <code>/${esc(cmd)}</code> — ${count}\n`; });
      }
      t += `\n<i>— System 777 · Manager Telegram</i>`;
      bot.sendMessage(cid, t, { parse_mode: 'HTML' });
    }
    bot.onText(/^\/stats/, (msg) => guard(msg, false, handleStats));

    /* ── /servers ───────────────────────────────────────────── */
    function handleServers(cid) {
      const all = [...client.guilds.cache.values()].sort((a, b) => b.memberCount - a.memberCount);
      const shown = all.slice(0, 20);
      let t = `<b>🖥️ Servidores (${all.length} total)</b>\n\n`;
      shown.forEach((g, i) => {
        t += `${i + 1}. <b>${esc(g.name)}</b> — ${g.memberCount} miembros\n<code>${g.id}</code>\n\n`;
      });
      if (all.length > 20) t += `<i>...y ${all.length - 20} más</i>`;
      bot.sendMessage(cid, t, { parse_mode: 'HTML' });
    }
    bot.onText(/^\/servers/, (msg) => guard(msg, false, handleServers));

    /* ── /premium ───────────────────────────────────────────── */
    bot.onText(/^\/premium ?(.*)/, (msg, match) => guard(msg, false, (cid) => {
      const prem = require('../systems/premium');
      const args = (match[1] || '').trim().split(/\s+/);
      const sub  = args[0]?.toLowerCase() || 'list';

      if (sub === 'list') {
        const list = prem.list().filter(u => u.active).slice(0, 20);
        let t = `<b>💎 Premium Activos (${list.length})</b>\n\n`;
        if (!list.length) { t += 'Ninguno activo.'; }
        else {
          list.forEach(u => {
            const exp = u.expiresAt ? new Date(u.expiresAt).toLocaleDateString('es') : '∞';
            t += `• <code>${esc(u.userId)}</code> — <b>${esc(u.plan)}</b> · exp: ${exp}\n`;
          });
        }
        return bot.sendMessage(cid, t, { parse_mode: 'HTML' });
      }

      if (!isOwner(cid)) return bot.sendMessage(cid, '⛔ Solo el owner puede gestionar premium.');

      if (sub === 'grant') {
        const [, userId, plan, daysStr] = args;
        if (!userId || !plan) return bot.sendMessage(cid, '❌ Uso: /premium grant &lt;userId&gt; &lt;plan&gt; [días]', { parse_mode: 'HTML' });
        const days = parseInt(daysStr) || 30;
        try {
          prem.grant(userId, plan, days, String(cid));
          bot.sendMessage(cid, `✅ Premium <b>${esc(plan)}</b> concedido a <code>${esc(userId)}</code> por ${days} días.`, { parse_mode: 'HTML' });
        } catch (e) { bot.sendMessage(cid, `❌ ${esc(e.message)}`, { parse_mode: 'HTML' }); }
        return;
      }

      if (sub === 'revoke') {
        const userId = args[1];
        if (!userId) return bot.sendMessage(cid, '❌ Uso: /premium revoke &lt;userId&gt;', { parse_mode: 'HTML' });
        const ok = prem.revoke(userId, String(cid));
        bot.sendMessage(cid, ok ? `✅ Premium revocado de <code>${esc(userId)}</code>.` : '❌ Usuario no encontrado.', { parse_mode: 'HTML' });
        return;
      }

      if (sub === 'check') {
        const userId = args[1];
        if (!userId) return bot.sendMessage(cid, '❌ Uso: /premium check &lt;userId&gt;', { parse_mode: 'HTML' });
        const data = db.get('premium', userId);
        if (!data || !data.active) return bot.sendMessage(cid, `ℹ️ <code>${esc(userId)}</code> — Sin premium activo.`, { parse_mode: 'HTML' });
        const exp = data.expiresAt ? new Date(data.expiresAt).toLocaleDateString('es') : '∞';
        bot.sendMessage(cid, `💎 <code>${esc(userId)}</code>\nPlan: <b>${esc(data.plan)}</b>\nExpira: ${exp}`, { parse_mode: 'HTML' });
        return;
      }

      bot.sendMessage(cid, '❌ Sub-comando no reconocido. Opciones: list, grant, revoke, check');
    }));

    /* ── /staff ─────────────────────────────────────────────── */
    function handleStaff(cid) {
      const staffSys = require('../systems/staffSystem');
      const members  = staffSys.listStaff();
      let t = `<b>👑 Staff — System 777 (${members.length})</b>\n\n`;
      if (!members.length) { t += 'Sin staff registrado.'; }
      else {
        members.forEach(m => {
          t += `• <code>${esc(m.userId)}</code> — <b>${esc(m.rank)}</b>`;
          if (m.note) t += ` · <i>${esc(m.note)}</i>`;
          t += '\n';
        });
      }
      bot.sendMessage(cid, t, { parse_mode: 'HTML' });
    }
    bot.onText(/^\/staff/, (msg) => guard(msg, false, handleStaff));

    /* ── /blacklist ─────────────────────────────────────────── */
    bot.onText(/^\/blacklist ?(.*)/, (msg, match) => guard(msg, true, (cid) => {
      const args = (match[1] || '').trim().split(/\s+/);
      const sub  = args[0]?.toLowerCase() || 'list';

      if (sub === 'list') {
        const bl = db.get('blacklist', 'users', []);
        bot.sendMessage(cid,
          `<b>🚫 Blacklist Global (${bl.length})</b>\n\n${bl.length ? bl.map(id => `• <code>${esc(id)}</code>`).join('\n') : 'Vacío.'}`,
          { parse_mode: 'HTML' }
        );
        return;
      }
      if (sub === 'add') {
        const userId = args[1];
        const reason = args.slice(2).join(' ') || 'Blacklisted via Telegram';
        if (!userId) return bot.sendMessage(cid, '❌ Uso: /blacklist add &lt;userId&gt; [razón]', { parse_mode: 'HTML' });
        const bl = db.get('blacklist', 'users', []);
        if (!bl.includes(userId)) { bl.push(userId); db.set('blacklist', 'users', bl); }
        bot.sendMessage(cid, `✅ <code>${esc(userId)}</code> añadido al blacklist.\nRazón: ${esc(reason)}`, { parse_mode: 'HTML' });
        return;
      }
      if (sub === 'remove') {
        const userId = args[1];
        if (!userId) return bot.sendMessage(cid, '❌ Uso: /blacklist remove &lt;userId&gt;', { parse_mode: 'HTML' });
        const bl = db.get('blacklist', 'users', []).filter(id => id !== userId);
        db.set('blacklist', 'users', bl);
        bot.sendMessage(cid, `✅ <code>${esc(userId)}</code> removido del blacklist.`, { parse_mode: 'HTML' });
        return;
      }
      bot.sendMessage(cid, '❌ Opciones: list, add &lt;userId&gt;, remove &lt;userId&gt;', { parse_mode: 'HTML' });
    }));

    /* ── /broadcast ─────────────────────────────────────────── */
    bot.onText(/^\/broadcast (.+)/, (msg, match) => guard(msg, true, async (cid) => {
      const message = match[1];
      let ok = 0;
      for (const guild of client.guilds.cache.values()) {
        const ch = guild.systemChannel || guild.channels.cache.find(c => c.isTextBased?.());
        if (ch) await ch.send(`📢 **System 777:** ${message}`).then(() => ok++).catch(() => {});
      }
      bot.sendMessage(cid, `✅ Broadcast enviado a ${ok}/${client.guilds.cache.size} servidores.`);
    }));

    /* ── /shell ─────────────────────────────────────────────── */
    bot.onText(/^\/shell (.+)/, (msg, match) => guard(msg, true, (cid) => {
      const cmd = match[1];
      exec(cmd, { cwd: '/root/system-777', timeout: 10000 }, (err, stdout, stderr) => {
        const out = ((stdout || '') + (stderr || '') + (err?.message || '')).slice(-3500) || '(sin salida)';
        bot.sendMessage(cid,
          `<b>💻 $ ${esc(cmd)}</b>\n\n<pre>${esc(out)}</pre>`,
          { parse_mode: 'HTML' }
        );
      });
    }));

    /* ── /alerts ────────────────────────────────────────────── */
    bot.onText(/^\/alerts ?(.*)/, (msg, match) => guard(msg, false, (cid) => {
      const sub = (match[1] || '').trim().toLowerCase();
      if (sub === 'on') {
        notifier.addAlertChat(cid);
        db.set('telegram_config', 'alert_chats', notifier.getAlertChats());
        bot.sendMessage(cid, '🔔 Alertas activadas. Recibirás notificaciones de seguridad y eventos importantes.');
      } else if (sub === 'off') {
        notifier.removeAlertChat(cid);
        db.set('telegram_config', 'alert_chats', notifier.getAlertChats());
        bot.sendMessage(cid, '🔕 Alertas desactivadas.');
      } else {
        const active = notifier.hasAlertChat(cid);
        bot.sendMessage(cid,
          `Alertas: ${active ? '🔔 <b>ACTIVAS</b>' : '🔕 <b>INACTIVAS</b>'}\n\nUsa <code>/alerts on</code> o <code>/alerts off</code>`,
          { parse_mode: 'HTML' }
        );
      }
    }));

    /* ── /allow ─────────────────────────────────────────────── */
    bot.onText(/^\/allow (\d+)/, (msg, match) => guard(msg, true, (cid) => {
      const targetId = Number(match[1]);
      const ids = db.get('telegram_config', 'allowed_ids', []);
      if (!ids.includes(targetId)) { ids.push(targetId); db.set('telegram_config', 'allowed_ids', ids); }
      bot.sendMessage(cid, `✅ Acceso concedido a Telegram ID <code>${targetId}</code>.`, { parse_mode: 'HTML' });
    }));

    /* ── /deny ──────────────────────────────────────────────── */
    bot.onText(/^\/deny (\d+)/, (msg, match) => guard(msg, true, (cid) => {
      const targetId = Number(match[1]);
      if (targetId === OWNER_TG) return bot.sendMessage(cid, '⛔ No puedes quitarte acceso a ti mismo.');
      const ids = db.get('telegram_config', 'allowed_ids', []).filter(id => id !== targetId);
      db.set('telegram_config', 'allowed_ids', ids);
      bot.sendMessage(cid, `✅ Acceso revocado de Telegram ID <code>${targetId}</code>.`, { parse_mode: 'HTML' });
    }));

    /* ── /myid ──────────────────────────────────────────────── */
    bot.onText(/^\/myid/, (msg) => {
      bot.sendMessage(msg.chat.id, `Tu Telegram ID: <code>${msg.chat.id}</code>`, { parse_mode: 'HTML' });
    });

    /* ── Keyboard buttons ───────────────────────────────────── */
    bot.on('message', (msg) => {
      if (!msg.text || msg.text.startsWith('/')) return;
      if (!isAllowed(msg.chat.id)) return;
      const cid = msg.chat.id;
      switch (msg.text) {
        case '📊 Status':       handleStatus(cid); break;
        case '📋 Logs':        handleLogs(cid, 20); break;
        case '💎 Premium':     break; // cubre con /premium
        case '👑 Staff':       handleStaff(cid); break;
        case '📈 Stats':       handleStats(cid); break;
        case '🖥️ Servidores': handleServers(cid); break;
        case '🔄 Restart':
          if (!isOwner(cid)) { bot.sendMessage(cid, '⛔ Solo el owner puede reiniciar.'); break; }
          bot.sendMessage(cid, '🔄 Reiniciando...');
          exec('pm2 restart system-777', (err) => {
            bot.sendMessage(cid, err ? `❌ Error: ${esc(err.message)}` : '✅ Bot reiniciado.', { parse_mode: 'HTML' });
          });
          break;
        case '⚙️ Más comandos':
          bot.sendMessage(cid, 'Escribe <code>/help</code> para ver todos los comandos disponibles.', { parse_mode: 'HTML' });
          break;
      }
    });

    /* ── Errors ─────────────────────────────────────────────── */
    bot.on('polling_error', (err) => {
      if (err.code !== 'ETELEGRAM') console.error(`[TELEGRAM] Polling error: ${err.message}`);
    });

    console.log('[TELEGRAM] Bot activo');
    return bot;
  },
};
