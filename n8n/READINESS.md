# n8n Production Readiness Runbook

Live instance: **https://n8n.blackflowcodeai.com** (VPS `1689263`, project `n8n-hich`,
container `n8n-hich-n8n-1`, behind Traefik). Fallback URL:
`https://n8n-hich.srv1689263.hstgr.cloud`.

## ✅ Done (this session)
- Deleted 5 duplicate/UAT workflows (21 → 16 live).
- Wired the Error Handler (`ylOdF4oZn4lgMqON`) as `errorWorkflow` on all 6 active workflows.
- Exported all 16 workflows to `n8n/live-export/` (Slack webhooks redacted) — committed.
- Added `scripts/n8n-backup.sh` (API export → B2).
- Moved Vonage secrets out of the inline `docker-compose.yml` into the project env store
  (zero downtime; snapshot `284358` taken first, expires 2026-07-08).

---

## ☐ 3. Configure rclone B2 remote  *(your terminal — keeps the secret local)*
```bash
rclone config
#  n → new   name: b2   storage: b2 (Backblaze B2)
#  account: <B2 keyID>   key: <B2 applicationKey>   (scope to bucket blackflow-storage)
rclone lsd b2:blackflow-storage          # verify
```
Then enable the workflow backup (laptop/server that stays on):
```bash
crontab -e
0 */6 * * * N8N_API_KEY="<key>" /ABS/PATH/scripts/n8n-backup.sh
```

## ☐ 4. VPS-side full DB backup  *(SSH to the VPS — captures creds + encryption key)*
```bash
ssh root@187.77.193.235
mkdir -p /root/n8n-backups
crontab -e
0 3 * * * docker exec n8n-hich-n8n-1 sh -c 'cd /home/node/.n8n && tar czf /tmp/n8n-$(date +\%F).tar.gz database.sqlite* config' && docker cp n8n-hich-n8n-1:/tmp/n8n-$(date +\%F).tar.gz /root/n8n-backups/ && rclone copy /root/n8n-backups/ b2:blackflow-storage/n8n-db/
```

## ☐ Back up the encryption key  *(highest DR priority)*
The `N8N_ENCRYPTION_KEY` lives only in the VPS project env store. If lost, **every stored
n8n credential becomes permanently undecryptable.** Copy it into Vaultwarden (already running
on this VPS) as a secure note. Retrieve it with:
```bash
ssh root@187.77.193.235 'cat /docker/n8n-hich/.env | grep N8N_ENCRYPTION_KEY'
```

## ☐ Rotate the n8n API key  *(n8n UI — current key is exposed in chat history)*
Settings → n8n API → revoke the old key, create a new one.

## ☐ Re-enable `availableInMCP` on WF8 & WF8b  *(n8n UI — public API can't set it)*
Open each workflow → Settings → toggle "Make available in MCP". The API stripped this flag
during the error-handler wiring.

## ☐ Activate inactive workflows when ready  *(verify each one's credentials first)*
Currently off: WF2 Procore Switcher, WF3 Notion Sync, WF4 AI Email, WF6 Cert Checker,
WF11 OCR, WF12 Email Reminder, WF13 OSHA, System 1 Monthly Report, Payment Gate Routing.
Activate one via API:
```bash
curl -X POST "https://n8n.blackflowcodeai.com/api/v1/workflows/<ID>/activate" \
  -H "X-N8N-API-KEY: <key>"
```

## ☐ Merge PR
https://github.com/mmldevops/blackflowcode-site/pull/1 — review and merge to `main`.
Note: merging may trigger a site rebuild/deploy if `main` is wired to Netlify/Vercel.

---

## Rollback (if a config change breaks the instance)
- VM snapshot `284358` → restore via Hostinger (`VPS_restoreSnapshotV1`, ~30 min).
- Previous compose saved at `ops/n8n-vps-rollback/n8n-hich.compose.PREVIOUS.yml` (gitignored).
- Weekly auto VM backups also exist (most recent before this work: 2026-06-11).
