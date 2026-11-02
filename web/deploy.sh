#!/usr/bin/env bash
# Build and upload VoidRunner to sadiwali.com/void-runner
# Usage: ./deploy.sh [ssh-target] [remote-dir]
#   defaults: sadiw@192.168.2.204  and  $REMOTE_DIR (must point at the site's void-runner folder)
set -euo pipefail
cd "$(dirname "$0")"
TARGET="${1:-sadiw@192.168.2.204}"
REMOTE_DIR="${2:-${REMOTE_DIR:?set REMOTE_DIR to the web root folder for /void-runner, e.g. /var/www/sadiwali.com/void-runner}}"
npm ci
npm run build
ssh "$TARGET" "mkdir -p '$REMOTE_DIR'"
rsync -avz --delete dist/ "$TARGET:$REMOTE_DIR/"
echo "Deployed to $TARGET:$REMOTE_DIR"
