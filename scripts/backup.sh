#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
data_dir="${DATA_DIR:-$PWD/.data}"
if [[ ! -f "$data_dir/app.sqlite" ]]; then
  echo 'No se encontró la base de datos.' >&2
  exit 1
fi
mkdir -p backups
chmod 700 backups
archive="backups/tiempo-con-ia-$(date -u +%Y%m%dT%H%M%SZ).tar.gz"
umask 077
tar -czf "$archive" -C "$data_dir" .
echo "Copia guardada en $archive"
