const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Exclude .webp files from asset processing since they're placeholder text files
config.resolver.assetExts = [...config.resolver.assetExts, 'webp'];

// Note: Using Expo's default resolver for expo-router/entry resolution.
// Expo SDK 54 automatically handles expo-router entry point resolution,
// so no custom resolveRequest override is needed.

module.exports = config;
