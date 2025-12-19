"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.NitroModules = void 0;
exports.isRuntimeAlive = isRuntimeAlive;
var _reactNative = require("react-native");
var _ModuleNotFoundError = require("../ModuleNotFoundError");
// 1. Get (and initialize) the TurboModule
let turboModule;
try {
  turboModule = _reactNative.TurboModuleRegistry.getEnforcing('NitroModules');
} catch (e) {
  throw new _ModuleNotFoundError.ModuleNotFoundError(e);
}

// 2. Install Dispatcher and install `NitroModulesProxy` into the Runtime's `global`
const errorMessage = turboModule.install();
if (errorMessage != null) {
  throw new Error(`Failed to install Nitro: ${errorMessage}`);
}

// 3. Find `NitroModulesProxy` in `global`
// @ts-expect-error
const NitroModules = exports.NitroModules = global.NitroModulesProxy;
if (NitroModules == null) {
  const cause = new Error('NitroModules was installed, but `global.NitroModulesProxy` was null!');
  throw new _ModuleNotFoundError.ModuleNotFoundError(cause);
}

// Double-check native version
if (__DEV__) {
  const jsVersion = require('react-native-nitro-modules/package.json').version;
  if (jsVersion !== NitroModules.version) {
    console.warn(`The native Nitro Modules core runtime version is ${NitroModules.version}, but the JS code is using version ${jsVersion}. ` + `This could lead to undefined behaviour! Make sure to keep your Nitro versions in sync.`);
  }
}
function isRuntimeAlive() {
  const cache = globalThis.__nitroJsiCache;
  const dispatcher = globalThis.__nitroDispatcher;
  return cache != null && dispatcher != null;
}
//# sourceMappingURL=NativeNitroModules.js.map