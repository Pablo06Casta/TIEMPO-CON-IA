#!/usr/bin/env bash
set -euo pipefail

read -r -p 'Correo para entrar en TIEMPO CON IA: ' OWNER_EMAIL
read -r -s -p 'Contraseña (12 caracteres como mínimo): ' OWNER_PASSWORD
printf '\n'
export OWNER_EMAIL OWNER_PASSWORD
npm run owner:create
unset OWNER_PASSWORD OWNER_EMAIL
