/**
 * Detects if the app is running in an environment where native modules are not available
 * (like Expo Go or Web) or if the required native modules are missing.
 *
 * @returns {boolean} True if the app is running in an environment where native modules are not available
 * (like Expo Go or Web) or if the required native modules are missing.
 */
export declare function shouldUseBrowserMode(): boolean;
declare global {
    var expo: {
        modules?: {
            ExpoGo?: boolean;
        };
    };
}
/**
 * Detects if the app is running in Expo Go
 */
export declare function isExpoGo(): boolean;
/**
 * Detects if the app is running in the Rork app
 */
export declare function isRorkSandbox(): boolean;
