#!/bin/bash
# Script para reiniciar el tunnel de Cloudflare y actualizar el BOT_API_URL en Cloudflare Pages
# Ejecutar cuando el bot se reinicie

# CLOUDFLARE_API_TOKEN debe estar en .env o como variable de entorno
if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
  echo "Error: CLOUDFLARE_API_TOKEN no configurado"
  exit 1
fi

# Matar tunnel anterior
pkill -f "cloudflared tunnel" 2>/dev/null
sleep 2

# Iniciar nuevo tunnel
nohup /home/yzz777/bin/cloudflared tunnel --url http://localhost:3000 > /tmp/cloudflared.log 2>&1 &
sleep 5

# Obtener nueva URL
NEW_URL=$(grep -o "https://[a-z0-9-]*\.trycloudflare\.com" /tmp/cloudflared.log | head -1)

if [ -z "$NEW_URL" ]; then
  echo "ERROR: No se pudo obtener la URL del tunnel"
  exit 1
fi

echo "Nuevo tunnel URL: $NEW_URL"

# Actualizar secret en Cloudflare Pages
cd "/home/yzz777/Escritorio/proyectos x/system777"
echo "$NEW_URL" | npx wrangler pages secret put BOT_API_URL --project-name system777

# Actualizar .env local
sed -i "s|BOT_API_URL=.*|BOT_API_URL=\"$NEW_URL\"|" .env

echo "BOT_API_URL actualizado a: $NEW_URL"
