# Expo Stuck on "New update available, downloading..." - Root Causes & Fixes

## Root Causes Identified

### 1. **Port 8081 Conflict** (Most Common)
Metro bundler uses port 8081. If another process is using it, Expo can't start properly.

**Symptoms:**
- Stuck on "downloading..."
- Metro bundler won't start
- Connection refused errors

**Fix:**
```bash
# Check what's using port 8081
lsof -i:8081

# Kill it
lsof -ti:8081 | xargs kill -9
```

### 2. **Zombie Metro/Expo Processes**
Old processes can hold onto resources and prevent new ones from starting.

**Fix:**
```bash
# Kill all Expo/Metro processes
pkill -9 -f expo
pkill -9 -f metro
pkill -9 -f "node.*8081"
```

### 3. **iOS Simulator Cache**
The simulator caches the old bundle and won't download the new one.

**Fix:**
```bash
# Reset simulator
xcrun simctl shutdown all
xcrun simctl erase all  # Nuclear option - erases all simulators
```

Or manually:
1. iOS Simulator → Device → Erase All Content and Settings
2. Or delete the app from simulator and reinstall

### 4. **Persistent Expo Cache**
Expo caches in multiple locations that aren't cleared by `--clear` flag.

**Locations:**
- `~/.expo`
- `~/.expo-shared`
- `.expo/` (project directory)
- `node_modules/.cache`
- `$TMPDIR/metro-*`

**Fix:**
```bash
rm -rf ~/.expo ~/.expo-shared .expo node_modules/.cache
rm -rf $TMPDIR/metro-* $TMPDIR/haste-map-*
```

### 5. **File Watcher Limits (macOS)**
macOS has limits on file watchers. When exceeded, Metro can't watch for changes.

**Symptoms:**
- "ENOSPC: System limit for number of file watchers reached"
- Metro stops detecting file changes

**Fix:**
```bash
# Check current limit
launchctl limit maxfiles

# Increase limit (requires restart or manual setup)
sudo launchctl limit maxfiles 524288 524288
```

**Permanent fix:** Add to `~/.zshrc` or `~/.bash_profile`:
```bash
ulimit -n 524288
```

### 6. **Network/Localhost Issues**
iOS Simulator sometimes can't connect to localhost:8081.

**Symptoms:**
- "Unable to connect to Metro"
- Network request failed

**Fixes:**

**Option A: Use Tunnel Mode**
```bash
npx expo start --tunnel
```

**Option B: Use LAN IP**
```bash
# Find your local IP
ifconfig | grep "inet " | grep -v 127.0.0.1

# Start Expo and connect using LAN IP instead of localhost
npx expo start --lan
```

**Option C: Reset network**
```bash
sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder
```

### 7. **Metro Bundler Stuck in Bad State**
Metro bundler can get stuck mid-bundle and won't recover.

**Fix:**
```bash
# Complete reset
npm run fix
# Or manually:
./fix-expo-stuck.sh
```

### 8. **iOS Bundling Stuck at 100%** (Most Common After Restart)
iOS bundling shows 100% but never completes. This happens when:
- Metro bundler is waiting for simulator acknowledgment
- Simulator has stale connection
- Bundle cache is corrupted

**Symptoms:**
- `iOS node_modules/expo-router/entry.js ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ 100.0% (1086/1228)`
- Stuck at 100% and never finishes
- Happens frequently after restarting `npm start`

**Quick Fix:**
```bash
npm run fix:ios
```

This runs `fix-ios-bundling.sh` which:
1. Kills all Metro bundler processes
2. Resets iOS Simulator connection
3. Clears Metro bundler cache
4. Uninstalls app from simulator
5. Starts fresh with `--clear` flag

**Manual Steps:**
```bash
# Kill Metro
pkill -9 -f metro
lsof -ti:8081 | xargs kill -9

# Reset simulator
killall Simulator
xcrun simctl uninstall booted com.instareader.app

# Clear cache
rm -rf $TMPDIR/metro-* $TMPDIR/haste-map-*

# Restart
npm run start:clear
```

**Prevention:**
- Always use `npm run start:clear` instead of `npm start` after restarting
- Wait for Metro to fully start before opening iOS Simulator
- If bundling hangs, press `Ctrl+C` and run `npm run fix:ios`

## Quick Fix Commands

### Nuclear Option (Most Thorough)
```bash
npm run fix
```

This runs `fix-expo-stuck.sh` which:
1. Kills all Expo/Metro processes
2. Frees port 8081
3. Clears all caches
4. Resets iOS Simulator connection
5. Increases file watcher limits
6. Flushes DNS cache
7. Starts Expo with tunnel mode

### Quick Reset
```bash
npm run reset
```

### Start with Tunnel (Avoids localhost issues)
```bash
npm run start:tunnel
```

## Prevention

1. **Always use `--clear` when restarting:**
   ```bash
   npm run start:clear
   ```

2. **Kill processes before restarting:**
   ```bash
   pkill -f expo
   npm start
   ```

3. **Use tunnel mode if localhost is unreliable:**
   ```bash
   npm run start:tunnel
   ```

4. **Monitor port 8081:**
   ```bash
   lsof -i:8081
   ```

## When Nothing Works

1. **Restart iOS Simulator:**
   ```bash
   killall Simulator
   # Then reopen from Xcode or Spotlight
   ```

2. **Reset Simulator:**
   - iOS Simulator → Device → Erase All Content and Settings

3. **Full system restart** (last resort)
   - This clears all system-level caches and network state

## Debugging Steps

1. **Check if Metro is running:**
   ```bash
   curl http://localhost:8081/status
   ```
   Should return Metro status. If connection refused, Metro isn't running.

2. **Check Expo logs:**
   Look for errors in the terminal where you ran `expo start`

3. **Check iOS Simulator logs:**
   ```bash
   xcrun simctl spawn booted log stream --predicate 'processImagePath contains "Expo"'
   ```

4. **Verify network connection:**
   ```bash
   # From simulator, try to access:
   curl http://localhost:8081
   # Or use your Mac's IP address
   ```



