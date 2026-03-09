#!/usr/bin/env bash
set -euo pipefail

APP_DIR=${APP_DIR:-/opt/wzd-app}
BRANCH=${BRANCH:-main}

if [ ! -d "$APP_DIR/.git" ]; then
  echo "[deploy] APP_DIR does not contain git repo: $APP_DIR"
  exit 1
fi

cd "$APP_DIR"

echo "[deploy] fetching latest source"
git fetch origin
git checkout "$BRANCH"
git reset --hard "origin/$BRANCH"

echo "[deploy] install deps"
npm ci

echo "[deploy] build frontend"
npm run build

echo "[deploy] restart agent server"
if command -v pm2 >/dev/null 2>&1; then
  pm2 startOrRestart ecosystem.config.cjs --only wzd-agent || pm2 restart wzd-agent
else
  sudo systemctl restart wzd-agent.service
fi

echo "[deploy] done"
