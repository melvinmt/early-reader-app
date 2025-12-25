#!/bin/bash

# Reset Expo and Metro Bundler - Complete Clean Start
# This script clears all caches and resets the development environment

echo "🧹 Cleaning Expo and Metro caches..."

# Stop any running Metro/Expo processes
echo "📴 Stopping running processes..."
pkill -f "expo start" || true
pkill -f "metro" || true
pkill -f "node.*expo" || true

# Clear Expo cache
echo "🗑️  Clearing Expo cache..."
rm -rf ~/.expo 2>/dev/null || true

# Clear Metro bundler cache
echo "🗑️  Clearing Metro bundler cache..."
rm -rf $TMPDIR/metro-* 2>/dev/null || true
rm -rf $TMPDIR/haste-map-* 2>/dev/null || true
rm -rf $TMPDIR/react-* 2>/dev/null || true

# Clear watchman (if installed) - with timeout to prevent hanging
if command -v watchman &> /dev/null; then
    echo "🗑️  Clearing Watchman cache..."
    timeout 5 watchman watch-del-all 2>/dev/null || true
    # If timeout command doesn't exist, try without it but in background
    if ! command -v timeout &> /dev/null; then
        (watchman watch-del-all 2>/dev/null &)
        sleep 2
        pkill -f watchman 2>/dev/null || true
    fi
fi

# Clear npm/yarn cache (optional, uncomment if needed)
# echo "🗑️  Clearing npm cache..."
# npm cache clean --force

# Clear node_modules and reinstall (optional, uncomment if really stuck)
# echo "🗑️  Removing node_modules..."
# rm -rf node_modules
# echo "📦 Reinstalling dependencies..."
# npm install

echo "✅ Cache cleared! Starting Expo..."
echo ""
echo "🚀 Starting Expo with cleared cache..."
npx expo start --clear

