#!/bin/bash

# Comprehensive fix script for Expo/React Native development issues
# Kills stuck processes, clears caches, and prepares for a fresh start
# 
# Usage: npm run fix
#        ./fix.sh

echo "🔧 Comprehensive Expo/React Native Fix"
echo "========================================"
echo ""

# Step 1: Gracefully shutdown watchman and clear watches
echo "📍 Step 1: Shutting down watchman..."
watchman shutdown-server 2>/dev/null || true
watchman watch-del-all 2>/dev/null || true
echo "   ✓ Watchman shutdown (if it was running)"

# Step 1b: Force kill any remaining watchman processes (fallback)
echo "   Killing any remaining watchman processes..."
pkill -9 -f "watchman" 2>/dev/null || true
echo "   ✓ Killed all watchman processes"

# Step 2: Kill metro bundler processes
echo ""
echo "📍 Step 2: Killing metro bundler processes..."
pkill -9 -f "metro" 2>/dev/null || true
pkill -9 -f "react-native.*start" 2>/dev/null || true
echo "   ✓ Killed metro processes"

# Step 3: Kill expo processes
echo ""
echo "📍 Step 3: Killing expo processes..."
pkill -9 -f "expo start" 2>/dev/null || true
pkill -9 -f "expo-cli" 2>/dev/null || true
echo "   ✓ Killed expo processes"

# Step 4: Kill node processes for this project
echo ""
echo "📍 Step 4: Killing project node processes..."
pkill -9 -f "node.*earlyreader" 2>/dev/null || true
echo "   ✓ Killed project node processes"

# Step 5: Free common ports
echo ""
echo "📍 Step 5: Freeing ports 8081, 8082, 19000, 19001..."
for port in 8081 8082 19000 19001; do
    lsof -ti :$port 2>/dev/null | xargs -r kill -9 2>/dev/null || true
done
echo "   ✓ Freed ports"

# Step 6: Clear watchman state and cookie files
echo ""
echo "📍 Step 6: Clearing watchman state..."
rm -rf /usr/local/var/run/watchman 2>/dev/null || true
rm -rf "$HOME/.watchman" 2>/dev/null || true
rm -rf /tmp/watchman* 2>/dev/null || true
rm -rf /var/folders/*/*/watchman* 2>/dev/null || true
# Clear watchman cookie/trigger files that can cause hangs
find . -name ".watchman-cookie-*" -delete 2>/dev/null || true
find . -name ".metro-health-check*" -delete 2>/dev/null || true
echo "   ✓ Cleared watchman state"

# Step 7: Clear metro/react-native cache
echo ""
echo "📍 Step 7: Clearing metro cache..."
rm -rf "$TMPDIR/metro-*" 2>/dev/null || true
rm -rf "$TMPDIR/haste-map-*" 2>/dev/null || true
rm -rf "$TMPDIR/react-*" 2>/dev/null || true
rm -rf /tmp/metro-* 2>/dev/null || true
rm -rf /tmp/haste-map-* 2>/dev/null || true
echo "   ✓ Cleared metro cache"

# Step 8: Clear expo cache
echo ""
echo "📍 Step 8: Clearing expo cache..."
rm -rf .expo 2>/dev/null || true
rm -rf node_modules/.cache 2>/dev/null || true
echo "   ✓ Cleared expo cache"

# Step 9: Clear iOS build cache (optional but helpful)
echo ""
echo "📍 Step 9: Clearing iOS build cache..."
rm -rf ios/build 2>/dev/null || true
rm -rf ios/Pods 2>/dev/null || true
rm -rf ~/Library/Developer/Xcode/DerivedData/*earlyreader* 2>/dev/null || true
echo "   ✓ Cleared iOS build cache"

# Step 10: Wait briefly for processes to fully terminate
echo ""
echo "⏳ Waiting for cleanup to complete..."
sleep 1

# Step 11: Verify cleanup
echo ""
echo "📍 Verifying cleanup..."
WATCHMAN_COUNT=$(pgrep -f "watchman" 2>/dev/null | wc -l | tr -d ' ')
METRO_COUNT=$(pgrep -f "metro" 2>/dev/null | wc -l | tr -d ' ')
PORT_8081=$(lsof -ti :8081 2>/dev/null | wc -l | tr -d ' ')

if [ "$WATCHMAN_COUNT" -eq 0 ] && [ "$METRO_COUNT" -eq 0 ] && [ "$PORT_8081" -eq 0 ]; then
    echo "   ✓ All processes cleaned up!"
else
    echo "   ⚠️  Some processes may still be stuck:"
    [ "$WATCHMAN_COUNT" -gt 0 ] && echo "      - Watchman: $WATCHMAN_COUNT (may be in uninterruptible sleep)"
    [ "$METRO_COUNT" -gt 0 ] && echo "      - Metro: $METRO_COUNT"
    [ "$PORT_8081" -gt 0 ] && echo "      - Port 8081: $PORT_8081"
    echo ""
    echo "   If issues persist, try: sudo reboot"
fi

echo ""
echo "✅ Fix complete!"
echo ""
echo "To start fresh, run:"
echo "  npm run start:clear"
echo ""

