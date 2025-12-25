#!/bin/bash

# Fix iOS Bundling Stuck at 100% - Targeted Fix
# This script specifically addresses the issue where iOS bundling hangs at 100%

set -e

echo "🔧 Fixing iOS bundling stuck at 100%..."

# 1. Kill ALL Metro bundler processes (most critical)
echo "📴 Step 1: Killing Metro bundler processes..."
pkill -9 -f "metro" || true
pkill -9 -f "node.*metro" || true
pkill -9 -f "expo.*metro" || true
# Kill any process using port 8081
lsof -ti:8081 | xargs kill -9 2>/dev/null || true
sleep 2

# 2. Kill Expo processes
echo "📴 Step 2: Killing Expo processes..."
pkill -9 -f "expo start" || true
pkill -9 -f "expo.*start" || true
sleep 1

# 3. Reset iOS Simulator connection (critical for stuck bundling)
echo "📱 Step 3: Resetting iOS Simulator connection..."
# Kill simulator if running
killall Simulator 2>/dev/null || true
sleep 2

# Uninstall the app from simulator to force fresh install
xcrun simctl uninstall booted com.instareader.app 2>/dev/null || true

# Reset simulator's network connection
xcrun simctl shutdown all 2>/dev/null || true
sleep 1

# 4. Clear Metro bundler cache (corrupted cache can cause hangs)
echo "🗑️  Step 4: Clearing Metro bundler cache..."
rm -rf $TMPDIR/metro-* 2>/dev/null || true
rm -rf $TMPDIR/haste-map-* 2>/dev/null || true
rm -rf $TMPDIR/react-* 2>/dev/null || true
rm -rf /tmp/metro-* 2>/dev/null || true
rm -rf /tmp/haste-map-* 2>/dev/null || true

# 5. Clear Expo cache
echo "🗑️  Step 5: Clearing Expo cache..."
rm -rf ~/.expo 2>/dev/null || true
rm -rf .expo 2>/dev/null || true
rm -rf node_modules/.cache 2>/dev/null || true

# 6. Verify port 8081 is free
echo "✅ Step 6: Verifying port 8081 is free..."
if lsof -ti:8081 > /dev/null 2>&1; then
    echo "⚠️  WARNING: Port 8081 is still in use!"
    echo "   Attempting to force kill..."
    lsof -ti:8081 | xargs kill -9 2>/dev/null || true
    sleep 1
fi

# 7. Wait a moment for everything to settle
sleep 1

echo ""
echo "✅ iOS bundling fix complete!"
echo ""
echo "🚀 Starting Expo with clean slate..."
echo "   (Wait for Metro to fully start before opening iOS Simulator)"
echo ""

# Start Expo with --clear to ensure fresh bundle
npx expo start --clear

