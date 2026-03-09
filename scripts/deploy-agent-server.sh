#!/usr/bin/env bash
set -euo pipefail

APP_DIR=${APP_DIR:-/home/$USER/wzd-app}
BRANCH=${BRANCH:-main}

if [ ! -d "$APP_DIR" ]; then
  echo "[deploy] APP_DIR not found: $APP_DIR"
  exit 1
fi

cd "$APP_DIR"

echo "[deploy] app dir: $APP_DIR"

if [ -d .git ]; then
  echo "[deploy] fetching latest source"
  git fetch origin
  git checkout "$BRANCH"
  git reset --hard "origin/$BRANCH"
else
  echo "[deploy] no .git directory detected (artifact upload mode), skip git sync"
fi

echo "[deploy] install deps"
npm ci

echo "[deploy] build frontend"
npm run build

echo "[deploy] restart agent server"
if command -v pm2 >/dev/null 2>&1; then
  APP_DIR="$APP_DIR" pm2 startOrRestart ecosystem.config.cjs --only wzd-agent || pm2 restart wzd-agent
else
  sudo systemctl restart wzd-agent.service
fi

echo "[deploy] done"
