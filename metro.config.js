const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Exclude .webp files from asset processing since they're placeholder text files
config.resolver.assetExts = [...config.resolver.assetExts, 'webp'];

// Ensure expo-router/entry resolves correctly after prebuild
const defaultResolver = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'expo-router/entry' || moduleName.startsWith('expo-router/entry')) {
    const entryPath = path.resolve(__dirname, 'node_modules/expo-router/entry.js');
    return {
      filePath: entryPath,
      type: 'sourceFile',
    };
  }
  // Use default resolution for other modules
  return defaultResolver ? defaultResolver(context, moduleName, platform) : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
