#!/bin/sh
# Backs up the data directory (places.json, drafts/, images/) as a dated archive.
#
#   scripts/backup.sh <destination dir>
#
# Keeps the newest 30 archives in the destination. Meant for nightly host cron;
# see README "Backups". data/ is the only copy of the map, so the destination
# should be on another disk or machine.
set -eu

DEST="${1:?usage: scripts/backup.sh <destination dir>}"
SRC="$(cd "$(dirname "$0")/.." && pwd)/data"
[ -f "$SRC/places.json" ] || { echo "backup: no $SRC/places.json, refusing to archive an empty map" >&2; exit 1; }

mkdir -p "$DEST"
name="food-map-$(date +%Y-%m-%d_%H%M).tar.gz"
# Write under a temporary name, so a half-written archive never looks like a backup.
tar -czf "$DEST/.$name.part" -C "$SRC" --exclude='*.tmp' .
tar -tzf "$DEST/.$name.part" ./places.json >/dev/null
mv "$DEST/.$name.part" "$DEST/$name"

# Oldest beyond 30 go.
ls -1t "$DEST"/food-map-*.tar.gz | tail -n +31 | while read -r old; do rm -- "$old"; done
echo "backup: $DEST/$name ($(du -h "$DEST/$name" | cut -f1))"
