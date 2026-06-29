#!/bin/bash
set -e
echo "Deploying FbReels Auth Worker..."
cd "$(dirname "$0")/../worker"
if ! command -v npx &> /dev/null; then
  echo "Error: npx not found. Install Node.js first."
  exit 1
fi
npx wrangler deploy
echo ""
echo "Done! Note your worker URL (e.g., https://fb-reels-auth.xxxx.workers.dev)"
echo "Then update __WORKER_URL__ in src/main.js, src/remote.js, and service.js"
