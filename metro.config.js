const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Optimize watchman to prevent stuck processes
config.watchFolders = [__dirname];

// Reduce watched file patterns
config.resolver.blockList = [
  /node_modules\/.*\/node_modules/,
  /\.git\/.*/,
  /android\/.*\/build\/.*/,
  /ios\/Pods\/.*/,
];

// Increase file watcher health check timeout
config.watcher = {
  ...config.watcher,
  healthCheck: {
    enabled: true,
    interval: 30000, // 30 seconds
    timeout: 5000,   // 5 seconds
    filePrefix: '.metro-health-check',
  },
  watchman: {
    deferStates: ['hg.update'],
  },
};

module.exports = config;





