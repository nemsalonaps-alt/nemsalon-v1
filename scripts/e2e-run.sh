#!/usr/bin/env bash
set -euo pipefail

API_PORT="${API_PORT:-3000}"
WEB_PORT="${WEB_PORT:-5173}"

is_listening() {
  local port="$1"
  lsof -n -i "tcp:${port}" -sTCP:LISTEN >/dev/null 2>&1
}

api_running=false
web_running=false

if is_listening "${API_PORT}"; then
  api_running=true
fi

if is_listening "${WEB_PORT}"; then
  web_running=true
fi

if [[ "${api_running}" == "true" && "${web_running}" == "true" ]]; then
  echo "[e2e-run] Detected running API/Web on ${API_PORT}/${WEB_PORT}. Reusing servers."
  E2E_USE_RUNNING=1 pnpm e2e ${E2E_ARGS:-}
  exit $?
fi

if [[ "${api_running}" == "true" || "${web_running}" == "true" ]]; then
  echo "[e2e-run] One of the ports is already in use."
  echo "[e2e-run] API running: ${api_running}, Web running: ${web_running}"
  echo "[e2e-run] Stop the running process or start both servers, then retry."
  exit 1
fi

pnpm e2e:preflight
bash scripts/e2e-local.sh
