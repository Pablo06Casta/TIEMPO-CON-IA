#!/usr/bin/env bash
set -euo pipefail
umask 077

if [[ "$(uname -s)" != 'Darwin' ]]; then
  echo 'Este instalador es para Mac.' >&2
  exit 1
fi
if ! command -v node >/dev/null || ! command -v npm >/dev/null || [[ "$(node -p 'process.versions.node.split(".")[0]')" != '24' ]]; then
  echo 'Instala Node.js 24 desde https://nodejs.org/en/download y vuelve a ejecutar este archivo.' >&2
  exit 1
fi

cd "$(dirname "$0")/.."
app_dir="$PWD"
data_dir="$HOME/Library/Application Support/TIEMPO-CON-IA"
plist_path="$HOME/Library/LaunchAgents/com.tiempoconia.studio.plist"
mkdir -p "$data_dir"
chmod 700 "$data_dir"
launchctl bootout "gui/$(id -u)" "$plist_path" >/dev/null 2>&1 || true

echo 'Instalando y preparando TIEMPO CON IA…'
npm ci
npm run build

if [[ ! -f "$data_dir/.owner-created" ]]; then
  read -r -p 'Tu correo para entrar en TIEMPO CON IA: ' OWNER_EMAIL
  read -r -s -p 'Elige una contraseña de al menos 12 caracteres: ' OWNER_PASSWORD
  printf '\n'
  export DATA_DIR="$data_dir" OWNER_EMAIL OWNER_PASSWORD
  npm run owner:create
  unset OWNER_PASSWORD OWNER_EMAIL
  touch "$data_dir/.owner-created"
fi

node scripts/create-mac-launch-agent.mjs "$app_dir" "$(command -v node)" "$data_dir" "$plist_path"
launchctl bootstrap "gui/$(id -u)" "$plist_path"

echo 'Aplicación instalada. Abre http://127.0.0.1:3000/login en Safari.'
echo 'Para verla desde otros dispositivos, configura Tailscale según docs/mac-gratis.md.'
