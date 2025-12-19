"use strict";

import { TurboModuleRegistry } from 'react-native';
import { ModuleNotFoundError } from '../ModuleNotFoundError';
// 1. Get (and initialize) the TurboModule
let turboModule;
try {
  turboModule = TurboModuleRegistry.getEnforcing('NitroModules');
} catch (e) {
  throw new ModuleNotFoundError(e);
}

// 2. Install Dispatcher and install `NitroModulesProxy` into the Runtime's `global`
const errorMessage = turboModule.install();
if (errorMessage != null) {
  throw new Error(`Failed to install Nitro: ${errorMessage}`);
}

// 3. Find `NitroModulesProxy` in `global`
// @ts-expect-error
export const NitroModules = global.NitroModulesProxy;
if (NitroModules == null) {
  const cause = new Error('NitroModules was installed, but `global.NitroModulesProxy` was null!');
  throw new ModuleNotFoundError(cause);
}

// Double-check native version
if (__DEV__) {
  const jsVersion = require('react-native-nitro-modules/package.json').version;
  if (jsVersion !== NitroModules.version) {
    console.warn(`The native Nitro Modules core runtime version is ${NitroModules.version}, but the JS code is using version ${jsVersion}. ` + `This could lead to undefined behaviour! Make sure to keep your Nitro versions in sync.`);
  }
}
export function isRuntimeAlive() {
  const cache = globalThis.__nitroJsiCache;
  const dispatcher = globalThis.__nitroDispatcher;
  return cache != null && dispatcher != null;
}
//# sourceMappingURL=NativeNitroModules.js.map