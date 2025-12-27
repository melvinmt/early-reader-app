const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Exclude .webp files from asset processing since they're placeholder text files
config.resolver.assetExts = [...config.resolver.assetExts, 'webp'];

module.exports = config;
