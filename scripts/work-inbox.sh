#!/bin/sh
# Fire-and-forget shares (#18): let an agent work the inbox. Run from the host's
# crontab every 15 minutes. Claude Code starts only when a share is waiting for
# an agent (a draft not yet flagged for me), so an empty inbox costs nothing.
#
# The food-map MCP key is read from a file only you can read (chmod 600), because
# cron can't unlock Bitwarden. Bitwarden keeps the master copy. The key reaches
# only this map, and `key-cli.ts revoke` stops it at once.
set -eu
cd "$(dirname "$0")/.."
DATA_DIR="${DATA_DIR:-./data}"
KEY_FILE="${FOOD_MAP_KEY_FILE:-$HOME/.config/food-map/mcp-key}"

waiting=$(find "$DATA_DIR/drafts" -name 'd_*.json' 2>/dev/null | xargs -r grep -L '"flagged": {' | wc -l)
[ "$waiting" -gt 0 ] || exit 0

FOOD_MAP_KEY=$(cat "$KEY_FILE")
export FOOD_MAP_KEY
export FOOD_MAP_URL="${FOOD_MAP_URL:-http://127.0.0.1:8088/mcp}"   # straight to the container, not through Cloudflare
# flock: a slow run is never overlapped by the next one.
exec flock -n /tmp/food-map-work-inbox.lock claude -p \
  "Work the food-map inbox: for every draft in list_inbox, resolve, flag or skip it, following the server's instructions." \
  --mcp-config scripts/work-inbox.mcp.json --strict-mcp-config --allowedTools mcp__food-map < /dev/null
