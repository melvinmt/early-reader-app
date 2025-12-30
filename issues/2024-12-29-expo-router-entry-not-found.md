# expo-router/entry Could Not Be Found

## Symptoms

When running `expo start` or building the app, Metro bundler fails with:

```
Unable to resolve module expo-router/entry from /path/to/project/index.js:
expo-router/entry could not be found within the project or in these directories:
  node_modules
  ../../node_modules
```

This error persists even after:
- Running `npm install`
- Clearing Metro cache with `npx expo start --clear`
- Verifying `expo-router` is installed in `node_modules`
- Checking that `node_modules/expo-router/entry.js` exists

## Root Cause

The `.watchmanconfig` file had `node_modules` in the `ignore_dirs` array:

```json
{
  "ignore_dirs": [
    ".git",
    "node_modules",  // ← This was the problem
    ".expo",
    "ios/Pods",
    ...
  ]
}
```

**Why this causes the issue:**
- Watchman is responsible for telling Metro which files exist in the project
- By ignoring `node_modules`, Watchman never reports the existence of any files in that directory
- Metro's Haste module map doesn't include `expo-router/entry.js`
- Even though the file physically exists, Metro cannot resolve it

Node.js can still resolve the module (e.g., `node -e "console.log(require.resolve('expo-router/entry'))"` works), but Metro bundler cannot.

## Solution

1. **Edit `.watchmanconfig`** and remove `node_modules` from the `ignore_dirs` array:

```json
{
  "ignore_dirs": [
    ".git",
    ".expo",
    "ios/Pods",
    "ios/build",
    "android/build",
    "android/.gradle"
  ]
}
```

2. **Clear Watchman's cache:**

```bash
watchman watch-del-all
```

3. **Clear Metro cache and restart:**

```bash
rm -rf node_modules/.cache .expo
npx expo start --clear
```

## Additional Notes

If you also have `assets` in `ignore_dirs` and are using static asset imports (like `.webp`, `.png`, `.mp3` files), you'll get similar "Unable to resolve module" errors for those assets. Remove `assets` from `ignore_dirs` as well if you need Metro to bundle static assets.

## Prevention

- Don't add `node_modules` to Watchman's ignore list
- Only ignore directories that Metro doesn't need to read (build outputs, caches, etc.)
- If Watchman is slow due to large `node_modules`, consider using `.watchmanconfig`'s `settle` and `fsevents_latency` options instead of ignoring the directory entirely

