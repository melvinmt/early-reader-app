import { NitroModules } from 'react-native-nitro-modules';
let factory;
let platformContext;
export function getPlatformContext() {
    if (platformContext == null) {
        // Lazy-init the platform-context HybridObject
        platformContext = NitroModules.createHybridObject('MMKVPlatformContext');
    }
    return platformContext;
}
export function getMMKVFactory() {
    if (factory == null) {
        // Lazy-init the factory HybridObject
        factory = NitroModules.createHybridObject('MMKVFactory');
        const context = getPlatformContext();
        const baseDirectory = context.getBaseDirectory();
        factory.initializeMMKV(baseDirectory);
    }
    return factory;
}
