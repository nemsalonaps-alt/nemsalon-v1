#!/usr/bin/env bash
set -euo pipefail

API_URL="${API_BASE_URL:-http://127.0.0.1:3000}"
WEB_URL="${E2E_BASE_URL:-http://127.0.0.1:5173}"

API_LOG="${API_LOG:-/tmp/nemsalon-api.log}"
WEB_LOG="${WEB_LOG:-/tmp/nemsalon-web.log}"

TMP_BASE="/var/folders/2p/b72dxswx6f519cf9nsph8vwc0000gn/T"
export TMPDIR="${TMPDIR:-$TMP_BASE}"
export TMP="${TMP:-$TMP_BASE}"
export TEMP="${TEMP:-$TMP_BASE}"

cleanup() {
  echo "Stopping dev servers..."
  if [[ -n "${API_PID:-}" ]]; then
    kill "${API_PID}" >/dev/null 2>&1 || true
  fi
  if [[ -n "${WEB_PID:-}" ]]; then
    kill "${WEB_PID}" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

echo "Cleaning existing dev servers..."
for pid in $(lsof -ti tcp:3000,5173 2>/dev/null); do
  kill "${pid}" >/dev/null 2>&1 || true
done

echo "Starting API..."
TSX_RUNTIME_DIR="${TMP_BASE}/tsx"
mkdir -p "${TSX_RUNTIME_DIR}"
HOST=127.0.0.1 PORT=3000 TMPDIR="${TMP_BASE}" TSX_TMPDIR="${TSX_RUNTIME_DIR}" pnpm -C apps/api exec node --import tsx src/index.ts > "${API_LOG}" 2>&1 &
API_PID=$!

echo "Starting Web..."
pnpm -C apps/web dev -- --host 127.0.0.1 --port 5173 --strictPort > "${WEB_LOG}" 2>&1 &
WEB_PID=$!

echo "Waiting for API health..."
for i in {1..60}; do
  if curl -sf "${API_URL}/health" >/dev/null; then
    break
  fi
  sleep 1
done
if ! curl -sf "${API_URL}/health" >/dev/null; then
  echo "API did not become ready. Check ${API_LOG}"
  exit 1
fi

echo "Resetting dev data..."
if ! curl -sf -X POST "${API_URL}/v1/dev/reset" >/dev/null; then
  echo "Dev reset failed. Check ${API_LOG}"
  exit 1
fi

echo "Seeding dev data..."
if ! curl -sf -X POST "${API_URL}/v1/dev/setup" >/dev/null; then
  echo "Dev setup failed. Check ${API_LOG}"
  exit 1
fi

echo "Waiting for Web..."
for i in {1..60}; do
  if curl -sf "${WEB_URL}/login" >/dev/null; then
    break
  fi
  sleep 1
done
if ! curl -sf "${WEB_URL}/login" >/dev/null; then
  echo "Web did not become ready. Check ${WEB_LOG}"
  exit 1
fi

echo "Running Playwright..."
E2E_REUSE_SERVERS=true API_BASE_URL="${API_URL}" E2E_BASE_URL="${WEB_URL}" pnpm e2e ${E2E_ARGS:-}
