#!/usr/bin/env bash
set -euo pipefail
LABEL="com.yahav.cortex"
launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
rm -f "$HOME/Library/LaunchAgents/$LABEL.plist"
echo "CORTEX service removed. Data stays in data/."
