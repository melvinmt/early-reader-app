import type { MMKV } from '../specs/MMKV.nitro';
import type { Configuration } from '../specs/MMKVFactory.nitro';
/**
 * Use the default, shared MMKV instance.
 */
export declare function useMMKV(): MMKV;
/**
 * Use a custom MMKV instance with the given configuration.
 * @param configuration The configuration to initialize the MMKV instance with. Does not have to be memoized.
 */
export declare function useMMKV(configuration: Configuration): MMKV;
