#!/bin/bash
# ============================================================
# SYSTEM 777 — Deploy Bot a Oracle Cloud Free Tier (VPS)
# ============================================================
# Ejecuta esto en tu VPS de Oracle Cloud después de crear la instancia
# Imagen: Ubuntu 22.04, ARM64 (VM.Standard.A1.Flex)
# ============================================================

set -e

echo "╔══════════════════════════════════════════╗"
echo "║   SYSTEM 777 — Deploy Bot a VPS Gratis   ║"
echo "╚══════════════════════════════════════════╝"

# ── 1. ACTUALIZAR SISTEMA ─────────────────────────────
echo "📦 [1/8] Actualizando sistema..."
sudo apt update && sudo apt upgrade -y

# ── 2. INSTALAR NODE.JS 20 ────────────────────────────
echo "🟢 [2/8] Instalando Node.js 20..."
if ! command -v node &> /dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt install -y nodejs
fi
echo "Node: $(node -v) | NPM: $(npm -v)"

# ── 3. INSTALAR PM2 ───────────────────────────────────
echo "⚙️ [3/8] Instalando PM2..."
if ! command -v pm2 &> /dev/null; then
  sudo npm install -g pm2
  sudo pm2 startup systemd -u $USER --hp /home/$USER
fi

# ── 4. INSTALAR DEPENDENCIAS ──────────────────────────
echo "📚 [4/8] Instalando dependencias del sistema..."
sudo apt install -y git ffmpeg build-essential python3

# ── 5. CLONAR REPO ────────────────────────────────────
echo "📥 [5/8] Clonando repositorio..."
REPO_DIR="$HOME/system-777"
if [ ! -d "$REPO_DIR" ]; then
  git clone https://github.com/Yzzz777/system-777.git "$REPO_DIR"
fi
cd "$REPO_DIR"

# ── 6. INSTALAR DEPENDENCIAS NODE ─────────────────────
echo "📥 [6/8] Instalando dependencias npm..."
npm install --legacy-peer-deps

# ── 7. CONFIGURAR .env ────────────────────────────────
echo "🔧 [7/8] Configurando variables de entorno..."
if [ ! -f .env ]; then
  cp .env.example .env 2>/dev/null || cat > .env << 'ENVEOF'
# EDITA ESTOS VALORES ANTES DE INICIAR
BOT_TOKEN=TU_BOT_TOKEN_AQUI
CLIENT_ID=TU_CLIENT_ID_AQUI
CLIENT_SECRET=TU_CLIENT_SECRET_AQUI
OWNER_ID=TU_DISCORD_USER_ID
DASHBOARD_PORT=3000
DASHBOARD_SECRET=CHANGE_THIS_SECRET
WEB_URL=https://jrsystem7777.com
DASHBOARD_PUBLIC_URL=https://TU_IP_PUBLICA:3000
BASE_URL=https://jrsystem7777.com
CORS_ORIGIN=https://jrsystem7777.com
RAID_JOIN_THRESHOLD=10
RAID_JOIN_WINDOW_MS=10000
MIN_ACCOUNT_AGE_DAYS=7
NODE_ENV=production
GROQ_API_KEYS=["TU_GROQ_KEY_1","TU_GROQ_KEY_2"]
ENVEOF
  echo "  ⚠️  Edita el .env con tus tokens reales: nano $REPO_DIR/.env"
fi

# ── 8. INICIAR CON PM2 ────────────────────────────────
echo "🚀 [8/8] Iniciando bot con PM2..."
node src/utils/integrity.js --update 2>/dev/null || true
pm2 delete system-777 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║          ✅ BOT DEPLOYADO                ║"
echo "╠══════════════════════════════════════════╣"
echo "║  Dashboard: http://$(hostname -I | awk '{print $1}'):3000"
echo "║  Logs: pm2 logs system-777"
echo "║  Restart: pm2 restart system-777"
echo "║  Status: pm2 status"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "📝 SIGUIENTE PASO:"
echo "   1. Edita .env: nano $REPO_DIR/.env"
echo "   2. Reinicia: pm2 restart system-777"
echo "   3. Abre Firewall: sudo ufw allow 3000"
