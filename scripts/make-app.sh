#!/usr/bin/env bash
# Builds /Applications/CORTEX.app: a launcher with the CORTEX icon that makes sure the
# background service is running, then opens CORTEX in the browser.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP="/Applications/CORTEX.app"
NODE="$(command -v node)"
TMP="$(mktemp -d)"

# Icon: .icns from public/icon-1024.png
ICONSET="$TMP/AppIcon.iconset"
mkdir -p "$ICONSET"
for s in 16 32 128 256 512; do
  sips -z $s $s "$ROOT/public/icon-1024.png" --out "$ICONSET/icon_${s}x${s}.png" >/dev/null
  sips -z $((s*2)) $((s*2)) "$ROOT/public/icon-1024.png" --out "$ICONSET/icon_${s}x${s}@2x.png" >/dev/null
done
iconutil -c icns "$ICONSET" -o "$TMP/AppIcon.icns"

rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"
cp "$TMP/AppIcon.icns" "$APP/Contents/Resources/AppIcon.icns"

cat > "$APP/Contents/Info.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key><string>CORTEX</string>
  <key>CFBundleDisplayName</key><string>CORTEX</string>
  <key>CFBundleIdentifier</key><string>com.yahav.cortex.launcher</string>
  <key>CFBundleExecutable</key><string>CORTEX</string>
  <key>CFBundleIconFile</key><string>AppIcon</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleShortVersionString</key><string>0.1.0</string>
  <key>LSMinimumSystemVersion</key><string>13.0</string>
</dict>
</plist>
PLIST

cat > "$APP/Contents/MacOS/CORTEX" <<LAUNCHER
#!/bin/bash
# Start the service if it isn't loaded, wait until it answers, open the UI.
LABEL="com.yahav.cortex"
PLIST="\$HOME/Library/LaunchAgents/\$LABEL.plist"
if ! launchctl print "gui/\$(id -u)/\$LABEL" >/dev/null 2>&1; then
  if [ -f "\$PLIST" ]; then
    launchctl bootstrap "gui/\$(id -u)" "\$PLIST"
  else
    cd "$ROOT" && PATH="$(dirname "$NODE"):\$PATH" bash scripts/install-service.sh >/dev/null 2>&1
  fi
fi
for _ in \$(seq 1 40); do
  curl -sf http://127.0.0.1:4747/api/health >/dev/null && break
  sleep 0.25
done
open "http://127.0.0.1:4747"
LAUNCHER
chmod +x "$APP/Contents/MacOS/CORTEX"

touch "$APP"
rm -rf "$TMP"
echo "Created $APP"
