#!/bin/bash

# =============================================================================
# clean-start.sh - Clean startup script for Early Reader
# =============================================================================
# This script kills all existing development processes, clears caches,
# and starts a fresh development environment.
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧹 Early Reader - Clean Start${NC}"
echo "=================================="

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

# Kill xcodebuild
echo "  → Killing xcodebuild..."
killall xcodebuild 2>/dev/null || true

# Kill iOS Simulator (optional - comment out if you want to keep simulator running)
# echo "  → Killing iOS Simulator..."
# killall "Simulator" 2>/dev/null || true

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

# Clear Xcode derived data for this project
echo "  → Clearing Xcode derived data..."
rm -rf ~/Library/Developer/Xcode/DerivedData/EarlyReader-* 2>/dev/null || true

# Clear Watchman (if installed)
echo "  → Clearing Watchman..."
watchman watch-del-all 2>/dev/null || true

# Clear React Native cache
echo "  → Clearing React Native cache..."
rm -rf "$TMPDIR/react-*" 2>/dev/null || true

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
# Step 4: Start development server
# -----------------------------------------------------------------------------
echo -e "\n${YELLOW}Step 4: Starting development server...${NC}"

# Parse command line arguments
MODE=${1:-"start"}

case $MODE in
    "ios")
        echo -e "  → Starting iOS build..."
        echo -e "${BLUE}Running: npx expo run:ios${NC}"
        npx expo run:ios
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
        echo "Usage: ./clean-start.sh [start|ios|android|tunnel]"
        echo "  start   - Start Expo development server (default)"
        echo "  ios     - Build and run on iOS"
        echo "  android - Build and run on Android"
        echo "  tunnel  - Start with tunnel for remote devices"
        exit 1
        ;;
esac

