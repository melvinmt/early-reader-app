#!/bin/bash

# =============================================================================
# clean-start.sh - Clean startup script for Early Reader
# =============================================================================
# This script kills all existing development processes, clears caches,
# and starts a fresh development environment.
#
# Usage:
#   ./clean-start.sh [mode] [--full]
#
# Modes:
#   start   - Start Expo development server (default)
#   ios     - Build and run on iOS (skips pod install)
#   android - Build and run on Android
#   tunnel  - Start with tunnel for remote devices
#
# Options:
#   --full  - Full rebuild (clears Xcode derived data, runs pod install)
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse arguments
MODE="start"
FULL_REBUILD=false

for arg in "$@"; do
    case $arg in
        --full)
            FULL_REBUILD=true
            ;;
        start|ios|android|tunnel)
            MODE=$arg
            ;;
    esac
done

echo -e "${BLUE}🧹 Early Reader - Clean Start${NC}"
echo "=================================="
if [ "$FULL_REBUILD" = true ]; then
    echo -e "${YELLOW}Mode: $MODE (full rebuild)${NC}"
else
    echo -e "Mode: $MODE"
fi

# -----------------------------------------------------------------------------
# Step 1: Kill existing processes
# -----------------------------------------------------------------------------
echo -e "\n${YELLOW}Step 1: Killing existing processes...${NC}"

# Kill Metro bundler
echo "  → Killing Metro bundler (port 8081)..."
lsof -ti:8081 | xargs kill -9 2>/dev/null || true

# Kill Expo CLI
echo "  → Killing Expo processes..."
pkill -f "expo start" 2>/dev/null || true
pkill -f "expo-cli" 2>/dev/null || true

# Kill xcodebuild and related processes
echo "  → Killing xcodebuild and Xcode processes..."
killall -9 xcodebuild 2>/dev/null || true
killall -9 XCBuild 2>/dev/null || true
killall -9 "com.apple.dt.SKAgent" 2>/dev/null || true

# Remove locked Xcode build database files
echo "  → Removing locked Xcode build database..."
rm -rf ~/Library/Developer/Xcode/DerivedData/EarlyReader-*/Build/Intermediates.noindex/XCBuildData/*.db* 2>/dev/null || true

# Kill node processes related to this project
echo "  → Killing node processes for this project..."
pgrep -f "node.*instareader" | xargs kill -9 2>/dev/null || true

# Give processes time to terminate
sleep 2

echo -e "${GREEN}  ✓ Processes killed${NC}"

# -----------------------------------------------------------------------------
# Step 2: Clear caches
# -----------------------------------------------------------------------------
echo -e "\n${YELLOW}Step 2: Clearing caches...${NC}"

# Clear Expo cache
echo "  → Clearing Expo cache..."
rm -rf .expo 2>/dev/null || true

# Clear Metro cache
echo "  → Clearing Metro cache..."
rm -rf node_modules/.cache 2>/dev/null || true
rm -rf /tmp/metro-* 2>/dev/null || true
rm -rf /tmp/haste-* 2>/dev/null || true
rm -rf "$TMPDIR/metro-*" 2>/dev/null || true
rm -rf "$TMPDIR/haste-*" 2>/dev/null || true

# Clear Watchman (if installed)
echo "  → Clearing Watchman..."
watchman watch-del-all 2>/dev/null || true

# Clear React Native cache
echo "  → Clearing React Native cache..."
rm -rf "$TMPDIR/react-*" 2>/dev/null || true

# Only clear Xcode derived data on full rebuild
if [ "$FULL_REBUILD" = true ]; then
    echo "  → Clearing Xcode derived data (full rebuild)..."
    rm -rf ~/Library/Developer/Xcode/DerivedData/EarlyReader-* 2>/dev/null || true
else
    echo "  → Skipping Xcode derived data (use --full to clear)"
fi

echo -e "${GREEN}  ✓ Caches cleared${NC}"

# -----------------------------------------------------------------------------
# Step 3: Verify node_modules
# -----------------------------------------------------------------------------
echo -e "\n${YELLOW}Step 3: Verifying node_modules...${NC}"

if [ ! -d "node_modules" ] || [ ! -d "node_modules/expo" ]; then
    echo "  → Installing dependencies..."
    npm install
else
    echo -e "${GREEN}  ✓ node_modules exists${NC}"
fi

# -----------------------------------------------------------------------------
# Step 4: Handle full rebuild (pods, prebuild)
# -----------------------------------------------------------------------------
if [ "$FULL_REBUILD" = true ] && [ "$MODE" = "ios" ]; then
    echo -e "\n${YELLOW}Step 4: Full iOS rebuild...${NC}"
    echo "  → Running prebuild..."
    npx expo prebuild --platform ios --clean
    echo "  → Installing CocoaPods..."
    cd ios && pod install && cd ..
    echo -e "${GREEN}  ✓ Full rebuild complete${NC}"
fi

# -----------------------------------------------------------------------------
# Step 5: Start development server
# -----------------------------------------------------------------------------
echo -e "\n${YELLOW}Step 5: Starting development server...${NC}"

case $MODE in
    "ios")
        echo -e "  → Starting iOS build..."
        echo -e "${BLUE}Running: npx expo run:ios --no-build-cache${NC}"
        npx expo run:ios --no-build-cache
        ;;
    "android")
        echo -e "  → Starting Android build..."
        echo -e "${BLUE}Running: npx expo run:android${NC}"
        npx expo run:android
        ;;
    "start")
        echo -e "  → Starting Expo development server..."
        echo -e "${BLUE}Running: npx expo start --clear${NC}"
        npx expo start --clear
        ;;
    "tunnel")
        echo -e "  → Starting Expo with tunnel..."
        echo -e "${BLUE}Running: npx expo start --tunnel --clear${NC}"
        npx expo start --tunnel --clear
        ;;
    *)
        echo -e "${RED}Unknown mode: $MODE${NC}"
        echo "Usage: ./clean-start.sh [start|ios|android|tunnel] [--full]"
        echo ""
        echo "Modes:"
        echo "  start   - Start Expo development server (default)"
        echo "  ios     - Build and run on iOS (quick, no pod install)"
        echo "  android - Build and run on Android"
        echo "  tunnel  - Start with tunnel for remote devices"
        echo ""
        echo "Options:"
        echo "  --full  - Full rebuild (clears Xcode data, runs pod install)"
        exit 1
        ;;
esac
