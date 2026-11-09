#!/usr/bin/env bash
# Installs CORTEX as a launchd user agent: starts at login, restarts on crash.
# Uses the same `node` that ran `npm install` (better-sqlite3 is built for its ABI).
set -euo pipefail

LABEL="com.yahav.cortex"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NODE="$(command -v node)"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
LOGS="$ROOT/logs"

major="$("$NODE" -p 'process.versions.node.split(".")[0]')"
if [ "$major" -lt 24 ]; then echo "Need Node 24+, found $("$NODE" -v) at $NODE" >&2; exit 1; fi

mkdir -p "$LOGS" "$HOME/Library/LaunchAgents"
xattr -w "com.apple.fileprovider.ignore#P" 1 "$LOGS"
(cd "$ROOT" && npm run build >/dev/null)

cat > "$PLIST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>$NODE</string>
    <string>$ROOT/src/server/index.ts</string>
  </array>
  <key>WorkingDirectory</key><string>$ROOT</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>NODE_ENV</key><string>production</string>
    <key>PATH</key><string>$(dirname "$NODE"):/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$HOME/.local/bin</string>
  </dict>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>ThrottleInterval</key><integer>10</integer>
  <key>StandardOutPath</key><string>$LOGS/server.log</string>
  <key>StandardErrorPath</key><string>$LOGS/server.log</string>
</dict>
</plist>
PLIST

launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
# bootout is asynchronous; wait until the old instance is gone before loading again.
for _ in $(seq 1 50); do launchctl print "gui/$(id -u)/$LABEL" >/dev/null 2>&1 || break; sleep 0.2; done
launchctl bootstrap "gui/$(id -u)" "$PLIST"
echo "CORTEX service installed → http://127.0.0.1:4747  (node: $NODE, logs: $LOGS/server.log)"
