"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isRorkSandbox = exports.isExpoGo = exports.shouldUseBrowserMode = void 0;
var react_native_1 = require("react-native");
/**
 * Detects if the app is running in an environment where native modules are not available
 * (like Expo Go or Web) or if the required native modules are missing.
 *
 * @returns {boolean} True if the app is running in an environment where native modules are not available
 * (like Expo Go or Web) or if the required native modules are missing.
 */
function shouldUseBrowserMode() {
    if (isExpoGo()) {
        console.log('Expo Go app detected. Using RevenueCat in Browser Mode.');
        return true;
    }
    else if (isRorkSandbox()) {
        console.log('Rork app detected. Using RevenueCat in Preview API Mode.');
        return true;
    }
    else if (isWebPlatform()) {
        console.log('Web platform detected. Using RevenueCat in Browser Mode.');
        return true;
    }
    else {
        return false;
    }
}
exports.shouldUseBrowserMode = shouldUseBrowserMode;
/**
 * Detects if the app is running in Expo Go
 */
function isExpoGo() {
    var _a, _b;
    if (!!react_native_1.NativeModules.RNPurchases) {
        return false;
    }
    return !!((_b = (_a = globalThis.expo) === null || _a === void 0 ? void 0 : _a.modules) === null || _b === void 0 ? void 0 : _b.ExpoGo);
}
exports.isExpoGo = isExpoGo;
/**
 * Detects if the app is running in the Rork app
 */
function isRorkSandbox() {
    return !!react_native_1.NativeModules.RorkSandbox;
}
exports.isRorkSandbox = isRorkSandbox;
/**
 * Detects if the app is running on web platform
 */
function isWebPlatform() {
    return react_native_1.Platform.OS === 'web';
}
