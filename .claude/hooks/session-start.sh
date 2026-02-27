#!/bin/bash
set -euo pipefail

# Only run in remote Claude Code on the web sessions
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

echo "Installing Node.js dependencies..."
cd "${CLAUDE_PROJECT_DIR:-$(dirname "$(dirname "$(realpath "$0")")")}"
npm install

echo "Session start hook complete."
