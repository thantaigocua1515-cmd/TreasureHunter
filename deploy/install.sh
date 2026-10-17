#!/bin/bash
# ============================================================================
# Treasure Hunter Survival — cài server multiplayer lên VPS Ubuntu (1 lệnh)
# Chạy với quyền root (hoặc sudo) trên VPS:
#   scp -r treasure-hunter-survival root@VPS:/root/ths-pkg
#   ssh root@VPS "bash /root/ths-pkg/deploy/install.sh"
# ============================================================================
set -e
PKG_DIR="$(cd "$(dirname "$0")/.." && pwd)"
APP_DIR=/opt/ths
PORT="${PORT:-8080}"

echo "[1/4] Cài Node.js 20..."
if ! command -v node >/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
node --version

echo "[2/4] Copy code -> $APP_DIR ..."
mkdir -p "$APP_DIR"
cp -r "$PKG_DIR/server" "$PKG_DIR/shared" "$PKG_DIR/client" "$APP_DIR/"
cd "$APP_DIR/server" && npm install --omit=dev --no-audit --no-fund

echo "[3/4] Cài systemd service..."
cp "$PKG_DIR/deploy/ths-server.service" /etc/systemd/system/ths-server.service
sed -i "s/{{PORT}}/$PORT/" /etc/systemd/system/ths-server.service
systemctl daemon-reload
systemctl enable --now ths-server
sleep 2
systemctl is-active ths-server

IP="$(hostname -I | awk '{print $1}')"
echo ""
echo "=== XONG ==="
echo "Game server (WebSocket): ws://$IP:$PORT"
echo "Client tĩnh            : file://$APP_DIR/client/index.html"
echo "                       hoặc host thư mục $APP_DIR/client bằng nginx (xem deploy/nginx-ths.conf)"
echo "Nhớ mở firewall: ufw allow $PORT/tcp"
