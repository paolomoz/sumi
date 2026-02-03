#!/usr/bin/env bash
set -euo pipefail

# ─── Sumi Railway Setup ───────────────────────────────────────────────
# Provisions a Railway project with backend + frontend services.
# Prerequisites: railway CLI installed and authenticated.
#   npm i -g @railway/cli
#   railway login
# ──────────────────────────────────────────────────────────────────────

REPO="paolomoz/sumi"
PROJECT_NAME="sumi"

# ─── Preflight checks ────────────────────────────────────────────────

if ! command -v railway &>/dev/null; then
  echo "Error: railway CLI not found. Install with: npm i -g @railway/cli"
  exit 1
fi

if ! railway whoami &>/dev/null; then
  echo "Error: not logged in. Run: railway login"
  exit 1
fi

echo "Logged in as: $(railway whoami 2>&1 | head -1)"

# ─── Collect secrets ─────────────────────────────────────────────────

read -rp "ANTHROPIC_API_KEY: " ANTHROPIC_API_KEY
read -rp "GOOGLE_API_KEY: " GOOGLE_API_KEY
read -rp "Use AWS Bedrock? (y/N): " USE_BEDROCK_ANSWER

if [[ "${USE_BEDROCK_ANSWER,,}" == "y" ]]; then
  USE_BEDROCK=1
  read -rp "AWS_REGION [us-east-1]: " AWS_REGION
  AWS_REGION="${AWS_REGION:-us-east-1}"
  read -rp "ANTHROPIC_MODEL [global.anthropic.claude-opus-4-5-20251101-v1:0]: " ANTHROPIC_MODEL
  ANTHROPIC_MODEL="${ANTHROPIC_MODEL:-global.anthropic.claude-opus-4-5-20251101-v1:0}"
  read -rp "ANTHROPIC_AWS_BEARER_TOKEN_BEDROCK: " BEDROCK_TOKEN
else
  USE_BEDROCK=0
fi

# ─── Create project ─────────────────────────────────────────────────

echo ""
echo "Creating Railway project: ${PROJECT_NAME}..."
railway init --name "${PROJECT_NAME}"

# ─── Add backend service ────────────────────────────────────────────

echo ""
echo "Adding backend service..."
railway add --service backend --repo "${REPO}"

echo "Setting backend root directory..."
railway environment edit --service-config backend source.rootDirectory "backend"

echo "Setting backend environment variables..."
railway variables --service backend \
  --set "ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}" \
  --set "GOOGLE_API_KEY=${GOOGLE_API_KEY}"

if [[ "${USE_BEDROCK}" == "1" ]]; then
  railway variables --service backend \
    --set "USE_BEDROCK=1" \
    --set "AWS_REGION=${AWS_REGION}" \
    --set "ANTHROPIC_MODEL=${ANTHROPIC_MODEL}" \
    --set "ANTHROPIC_AWS_BEARER_TOKEN_BEDROCK=${BEDROCK_TOKEN}"
fi

# ─── Add frontend service ───────────────────────────────────────────

echo ""
echo "Adding frontend service..."
railway add --service frontend --repo "${REPO}"

echo "Setting frontend root directory..."
railway environment edit --service-config frontend source.rootDirectory "frontend"

# ─── Generate frontend domain ───────────────────────────────────────

echo ""
echo "Generating public domain for frontend..."
FRONTEND_DOMAIN=$(railway domain --service frontend --json 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin)['domain'])" 2>/dev/null || true)

if [[ -z "${FRONTEND_DOMAIN}" ]]; then
  echo "Generating domain (non-JSON fallback)..."
  FRONTEND_DOMAIN=$(railway domain --service frontend 2>&1 | grep -oE '[a-z0-9-]+\.up\.railway\.app' || true)
fi

if [[ -n "${FRONTEND_DOMAIN}" ]]; then
  echo "Frontend domain: https://${FRONTEND_DOMAIN}"

  # Set CORS on backend to allow the frontend origin
  railway variables --service backend \
    --set "CORS_ORIGINS=[\"https://${FRONTEND_DOMAIN}\"]"

  # Set BACKEND_URL on frontend using Railway private networking
  railway variables --service frontend \
    --set "BACKEND_URL=http://backend.railway.internal:8000"
else
  echo "Warning: could not parse frontend domain."
  echo "After deployment, manually set:"
  echo "  Backend var:  CORS_ORIGINS=[\"https://<frontend-domain>.up.railway.app\"]"
  echo "  Frontend var: BACKEND_URL=http://backend.railway.internal:<backend-port>"
fi

# ─── Done ────────────────────────────────────────────────────────────

echo ""
echo "═══════════════════════════════════════════════"
echo " Railway project '${PROJECT_NAME}' is set up!"
echo "═══════════════════════════════════════════════"
echo ""
echo "Next steps:"
echo "  1. Push to GitHub — Railway will auto-build both services"
echo "  2. Visit https://${FRONTEND_DOMAIN:-<your-frontend-domain>.up.railway.app}"
echo "  3. Check Railway dashboard for build logs"
echo ""
echo "If the backend port differs from 8000, update BACKEND_URL on the frontend:"
echo "  railway variables --service frontend --set \"BACKEND_URL=http://backend.railway.internal:<PORT>\""
