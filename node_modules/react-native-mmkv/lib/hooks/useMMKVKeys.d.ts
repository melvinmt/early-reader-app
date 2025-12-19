import type { MMKV } from '../specs/MMKV.nitro';
/**
 * Get a list of all keys that exist in the given MMKV {@linkcode instance}.
 * The keys update when new keys are added or removed.
 * @param instance The instance to listen to changes to (or the default instance)
 *
 * @example
 * ```ts
 * useMMKVKeys(instance)
 * ```
 */
export declare function useMMKVKeys(instance?: MMKV): string[];
