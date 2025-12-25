#!/bin/bash

# Comprehensive fix for Expo stuck on "New update available, downloading..."
# Addresses root causes: port conflicts, simulator cache, Metro bundler issues

set -e

echo "🔍 Diagnosing Expo/Metro bundler issues..."

# 1. Kill ALL Expo, Metro, and Node processes related to the project
echo "📴 Step 1: Killing all Expo/Metro/Node processes..."
pkill -9 -f "expo" || true
pkill -9 -f "metro" || true
pkill -9 -f "react-native" || true
pkill -9 -f "node.*8081" || true
# Kill any node processes in the project directory
ps aux | grep -i "node.*instareader" | grep -v grep | awk '{print $2}' | xargs kill -9 2>/dev/null || true
sleep 2

# 2. Free up port 8081 (Metro bundler default port)
echo "🔌 Step 2: Freeing port 8081..."
lsof -ti:8081 | xargs kill -9 2>/dev/null || true
lsof -ti:19000 | xargs kill -9 2>/dev/null || true  # Expo dev server
lsof -ti:19001 | xargs kill -9 2>/dev/null || true  # Expo dev server (alternative)
sleep 1

# 3. Clear ALL Expo caches (including persistent ones)
echo "🗑️  Step 3: Clearing all Expo caches..."
rm -rf ~/.expo 2>/dev/null || true
rm -rf ~/.expo-shared 2>/dev/null || true
rm -rf .expo 2>/dev/null || true
rm -rf node_modules/.cache 2>/dev/null || true

# 4. Clear Metro bundler cache (all locations)
echo "🗑️  Step 4: Clearing Metro bundler cache..."
rm -rf $TMPDIR/metro-* 2>/dev/null || true
rm -rf $TMPDIR/haste-map-* 2>/dev/null || true
rm -rf $TMPDIR/react-* 2>/dev/null || true
rm -rf $TMPDIR/react-native-* 2>/dev/null || true
rm -rf /tmp/metro-* 2>/dev/null || true
rm -rf /tmp/haste-map-* 2>/dev/null || true

# 5. Clear iOS Simulator cache and reset connection
echo "📱 Step 5: Resetting iOS Simulator connection..."
# Kill simulator if running
killall Simulator 2>/dev/null || true
sleep 1

# Clear simulator's Expo cache
xcrun simctl uninstall booted com.instareader.app 2>/dev/null || true
# Note: We can't easily clear simulator's cache without resetting, but we can try

# 6. Increase file watcher limits (macOS often hits these)
echo "👀 Step 6: Checking file watcher limits..."
# Check current limits
CURRENT_LIMIT=$(launchctl limit maxfiles | awk '{print $2}')
if [ "$CURRENT_LIMIT" -lt 524288 ]; then
    echo "⚠️  File watcher limit is low ($CURRENT_LIMIT). Increasing..."
    sudo launchctl limit maxfiles 524288 524288 2>/dev/null || echo "   (Requires sudo - run manually if needed)"
fi

# 7. Clear npm/yarn cache (can cause module resolution issues)
echo "📦 Step 7: Clearing npm cache..."
npm cache clean --force 2>/dev/null || true

# 8. Reset network interfaces (fix localhost connection issues)
echo "🌐 Step 8: Resetting network connections..."
# Flush DNS cache
sudo dscacheutil -flushcache 2>/dev/null || echo "   (DNS flush requires sudo)"
sudo killall -HUP mDNSResponder 2>/dev/null || echo "   (mDNS reset requires sudo)"

# 9. Verify port 8081 is free
echo "✅ Step 9: Verifying ports are free..."
if lsof -ti:8081 > /dev/null 2>&1; then
    echo "⚠️  WARNING: Port 8081 is still in use!"
    echo "   Run: lsof -ti:8081 | xargs kill -9"
    exit 1
else
    echo "   ✓ Port 8081 is free"
fi

# 10. Start fresh
echo ""
echo "✅ All caches cleared and processes killed!"
echo ""
echo "🚀 Starting Expo with clean slate..."
echo "   (This may take a minute to rebuild)"
echo ""

# Start Expo with tunnel mode to avoid localhost issues
npx expo start --clear --tunnel

