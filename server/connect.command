#!/bin/bash
# Astrodoc: finish connecting the Claude server (run once)
cd "$(dirname "$0")"
echo ""
echo "=== Astrodoc server setup ==="
echo "1) Cloudflare will ask to register a workers.dev subdomain: answer y, then type a name (e.g. astrodoc-dombit)."
echo ""
npx -y wrangler@3 deploy
echo ""
echo "2) Now paste your Claude API key (starts with sk-ant-) and press Enter. It is not shown while you type."
npx -y wrangler@3 secret put ANTHROPIC_API_KEY
echo ""
echo "Done. You can close this window and tell Claude Code 'done'."
