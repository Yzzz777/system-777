#!/bin/bash
# ============================================================
# SYSTEM 777 — Setup Bot + Tunnel como servicios systemd
# ============================================================

set -e

echo "╔══════════════════════════════════════════╗"
echo "║  SYSTEM 777 — Setup Servicios Locales    ║"
echo "╚══════════════════════════════════════════╝"

BOT_DIR="/home/yzz777/Escritorio/proyectpsss/bot de discord"
CLOUDFLARED="/home/yzz777/bin/cloudflared"
SERVICE_DIR="$HOME/.config/systemd/user"

# ── 1. CREAR SERVICIO DEL BOT ────────────────────────
echo "📦 [1/3] Creando servicio del bot..."
cat > "$SERVICE_DIR/system-777.service" << EOF
[Unit]
Description=System 777 Discord Bot
After=network.target

[Service]
Type=simple
WorkingDirectory=$BOT_DIR
ExecStart=/usr/bin/node src/index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=default.target
EOF

# ── 2. CREAR SERVICIO DEL TUNNEL ─────────────────────
echo "🌐 [2/3] Creando servicio del tunnel..."
cat > "$SERVICE_DIR/cloudflared-bot.service" << EOF
[Unit]
Description=Cloudflare Tunnel for Bot
After=network.target system-777.service
Requires=system-777.service

[Service]
Type=simple
ExecStart=$CLOUDFLARED tunnel --url http://localhost:3000
Restart=always
RestartSec=5

[Install]
WantedBy=default.target
EOF

# ── 3. HABILITAR E INICIAR SERVICIOS ─────────────────
echo "🚀 [3/3] Iniciando servicios..."
systemctl --user daemon-reload
systemctl --user enable system-777.service
systemctl --user enable cloudflared-bot.service
systemctl --user start system-777.service
sleep 3
systemctl --user start cloudflared-bot.service

# ── OBTENER URL DEL TUNNEL ───────────────────────────
sleep 5
TUNNEL_URL=$(journalctl --user -u cloudflared-bot.service --no-pager -n 20 2>/dev/null | grep -o "https://[a-z0-9-]*.trycloudflare.com" | tail -1)

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║          ✅ SERVICIOS ACTIVOS            ║"
echo "╠══════════════════════════════════════════╣"
echo "║  Bot: pm2 status / systemctl --user status system-777"
echo "║  Tunnel: $TUNNEL_URL"
echo "║  Dashboard: http://localhost:3000"
echo "║"
echo "║  Comandos útiles:"
echo "║  systemctl --user status system-777"
echo "║  systemctl --user restart system-777"
echo "║  systemctl --user stop system-777"
echo "║  journalctl --user -u system-777 -f"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "⚠️  NOTA: El tunnel URL cambia al reiniciar."
echo "    Para URL fija, necesitas un VPS o cloudflared tunnel con nombre."
