#!/usr/bin/env bash
# Backs up all n8n workflows from the live instance to local + Backblaze B2.
#
# Exports every workflow definition via the n8n public API as individual JSON
# files, timestamped, then syncs to B2. This captures workflow LOGIC. It does
# NOT capture credentials or the encryption key — those live in the n8n SQLite
# volume on the VPS and must be dumped server-side (see VPS cron note below).
#
# Schedule (laptop/server that stays on):  0 */6 * * * /path/to/n8n-backup.sh
#
# Requires:
#   - N8N_API_KEY env var (create in n8n UI → Settings → n8n API)
#   - N8N_BASE_URL env var (default https://n8n.blackflowcodeai.com)
#   - rclone configured with a remote named "b2"
#
# ---------------------------------------------------------------------------
# Full DB backup (run THIS on the VPS via root crontab — captures credentials
# + encryption key, which the API cannot export):
#
#   0 3 * * * docker exec n8n-hich-n8n-1 sh -c \
#     'cp -r /home/node/.n8n /tmp/n8n-bk && tar czf /tmp/n8n-$(date +\%F).tar.gz -C /tmp n8n-bk' \
#     && docker cp n8n-hich-n8n-1:/tmp/n8n-$(date +\%F).tar.gz /root/n8n-backups/ \
#     && rclone copy /root/n8n-backups/ b2:blackflow-storage/n8n-db/
# ---------------------------------------------------------------------------

set -euo pipefail

BASE_URL="${N8N_BASE_URL:-https://n8n.blackflowcodeai.com}"
API="${BASE_URL%/}/api/v1"
BUCKET="${B2_BUCKET_NAME:-blackflow-storage}"
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STAMP="$(date '+%Y-%m-%d_%H%M%S')"
OUT_DIR="$PROJECT_ROOT/exports/n8n-backups/$STAMP"
LOG_FILE="$PROJECT_ROOT/scripts/n8n-backup.log"

log() { echo "[$(date '+%F %T')] $*" | tee -a "$LOG_FILE"; }

if [ -z "${N8N_API_KEY:-}" ]; then
  log "ERROR: N8N_API_KEY not set"; exit 1
fi

mkdir -p "$OUT_DIR"
log "Exporting workflows from $API ..."

curl -fsS -m 30 "$API/workflows?limit=250" -H "X-N8N-API-KEY: $N8N_API_KEY" > "$OUT_DIR/_all.json"

COUNT=$(node -e '
const fs=require("fs");
const j=JSON.parse(fs.readFileSync(process.argv[1]+"/_all.json"));
const slug=s=>s.toLowerCase().replace(/[—–]/g,"-").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,60);
for(const w of j.data){
  const out={name:w.name,nodes:w.nodes,connections:w.connections,settings:w.settings,active:w.active,_id:w.id,_tags:(w.tags||[]).map(t=>t.name)};
  fs.writeFileSync(process.argv[1]+"/"+slug(w.name)+"__"+w.id+".json",JSON.stringify(out,null,2));
}
console.log(j.data.length);
' "$OUT_DIR")

log "Exported $COUNT workflows to $OUT_DIR"

if command -v rclone >/dev/null 2>&1; then
  log "Syncing to b2:$BUCKET/n8n-workflows/$STAMP ..."
  rclone copy "$OUT_DIR" "b2:$BUCKET/n8n-workflows/$STAMP" --transfers 4 --log-level INFO
  log "B2 sync complete."
else
  log "WARN: rclone not found — skipped B2 upload (local copy kept at $OUT_DIR)"
fi

log "Done."
