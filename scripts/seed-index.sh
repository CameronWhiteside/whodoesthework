#!/usr/bin/env bash
# scripts/seed-index.sh
# Bulk-ingest GitHub developers into the wdtw index.
# Queues specific users, then discovers contributors from popular repos.
#
# Usage:
#   GITHUB_TOKEN=ghp_... ./scripts/seed-index.sh
#   GITHUB_TOKEN=ghp_... API_URL=https://whodoesthe.work ./scripts/seed-index.sh
#
# Runs the progress monitor in a loop after queuing — Ctrl+C to stop watching.

set -euo pipefail

API_URL="${API_URL:-https://whodoesthe.work}"
GITHUB_TOKEN="${GITHUB_TOKEN:-}"
DELAY=1   # seconds between ingest requests (keeps DO pressure low)
GH_LIMIT=30  # max contributors to pull per repo

# ── Colours ────────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; RESET='\033[0m'

queue_user() {
  local username="$1"
  local result
  result=$(curl -s -X POST "$API_URL/admin/ingest" \
    -H "Content-Type: application/json" \
    --data-raw "{\"username\":\"$username\"}")
  local status
  status=$(echo "$result" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('status','?'))" 2>/dev/null || echo "?")
  printf "  ${GREEN}%-20s${RESET} %s\n" "$username" "$status"
  sleep "$DELAY"
}

discover_repo() {
  local repo="$1"   # owner/repo
  local limit="${2:-$GH_LIMIT}"
  printf "\n${CYAN}→ contributors from %s${RESET}\n" "$repo"

  if [[ -z "$GITHUB_TOKEN" ]]; then
    echo "  (skip — set GITHUB_TOKEN to enable contributor discovery)"
    return
  fi

  local auth_header="Authorization: Bearer $GITHUB_TOKEN"
  local logins
  logins=$(curl -sf \
    -H "$auth_header" \
    -H "Accept: application/vnd.github+json" \
    "https://api.github.com/repos/$repo/contributors?per_page=$limit&anon=0" \
    2>/dev/null | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    logins = [u['login'] for u in data if u.get('type') == 'User']
    print('\n'.join(logins))
except Exception as e:
    pass
" 2>/dev/null || true)

  if [[ -z "$logins" ]]; then
    echo "  (no results — private repo or rate limit hit)"
    return
  fi

  while IFS= read -r login; do
    [[ -n "$login" ]] && queue_user "$login"
  done <<< "$logins"
}

show_stats() {
  printf "\n${YELLOW}[%s] stats:${RESET}\n" "$(date '+%H:%M:%S')"
  curl -s "$API_URL/admin/stats" | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(f\"  developers:    {d.get('developers',0)}\")
print(f\"  contributions: {d.get('contributions',0)}\")
print(f\"  classified:    {d.get('classified',0)}\")
print(f\"  scored:        {d.get('scored',0)}\")
print(f\"  reviews:       {d.get('reviews',0)}\")
" 2>/dev/null || curl -s "$API_URL/admin/stats"
}

# ══════════════════════════════════════════════════════════════════════════════
echo ""
echo "  wdtw — bulk index seeder"
echo "  API: $API_URL"
echo ""

# ── 1. Specific users ─────────────────────────────────────────────────────────
printf "${CYAN}→ seeding specific users${RESET}\n"
SPECIFIC_USERS=(
  CameronWhiteside
  B0Y3R
  PrestigePvP
  ronaldstoner
  f023
  aleciavogel
  elinzer
  RockyPhoenix
  bryanlatten
)
for u in "${SPECIFIC_USERS[@]}"; do
  queue_user "$u"
done

# ── 2. Contributor discovery from popular repos ───────────────────────────────
# These repos span security, crypto, web, devtools — good cross-section
REPOS=(
  "dropbox/zxcvbn"          # password strength lib — security devs
  "nicowillis/storybook"    # component devs
  "nicowillis/outline"      # docs/collab devs
  "outline/outline"         # real-time collab
  "hashicorp/vault"         # security/infra devs
  "solidjs/solid"           # frontend compiler nerds
  "withastro/astro"         # web framework devs
  "trufflesecurity/trufflehog" # security tooling
  "nicowillis/zxcvbn-ts"    # TS security
  "tldraw/tldraw"           # canvas/creative devs
)

for repo in "${REPOS[@]}"; do
  discover_repo "$repo" "$GH_LIMIT"
done

# ── 3. Progress monitor ───────────────────────────────────────────────────────
echo ""
echo "════════════════════════════════════════"
echo "  All users queued. Ingestion runs in"
echo "  the background — typically 5-15 min"
echo "  per developer. Watching stats..."
echo "  Ctrl+C to stop watching."
echo "════════════════════════════════════════"

show_stats
while true; do
  sleep 30
  show_stats
done
