#!/usr/bin/env bash
# One-time (per session) setup for Proof posts: builds the vibeediting MCP (the product we sell) into
# .vibe-mcp/ so scripts/vibe-run.mts can drive it exactly like a customer's AI agent does.
# Needs VIBE_LICENSE_KEY in the environment when editing (not for this setup).
set -euo pipefail
cd "$(dirname "$0")/.."
dir=.vibe-mcp
if [ ! -d "$dir/.git" ]; then
  GIT_LFS_SKIP_SMUDGE=1 git clone --depth 1 https://github.com/highontrading/vibeediting-mcp "$dir"
else
  git -C "$dir" pull --ff-only -q
fi
(cd "$dir" && npm ci --no-audit --no-fund -s && npm run build -s)
# The runner lives in this repo but must resolve the MCP client from the MCP's own node_modules.
cp scripts/vibe-run.mts "$dir/scripts/vibe-run.mts"
echo "vibeediting MCP ready ($(git -C "$dir" rev-parse --short HEAD))"
