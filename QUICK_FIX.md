# Quick Fix Guide

## iOS Bundling Stuck at 100%

If iOS bundling gets stuck at 100% after restarting:

```bash
npm run fix:ios
```

This will:
- Kill all Metro bundler processes
- Reset iOS Simulator connection
- Clear all caches
- Start fresh

## General Expo Issues

```bash
# Quick reset
npm run reset

# Complete fix (nuclear option)
npm run fix
```

## Best Practices

1. **Always use `--clear` after restarting:**
   ```bash
   npm run start:clear
   ```

2. **Wait for Metro to fully start** before opening iOS Simulator

3. **If bundling hangs**, press `Ctrl+C` and run:
   ```bash
   npm run fix:ios
   ```

4. **Use tunnel mode** if localhost is unreliable:
   ```bash
   npm run start:tunnel
   ```






