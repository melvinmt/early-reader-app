import type { MMKV } from '../specs/MMKV.nitro';
import type { Configuration } from '../specs/MMKVFactory.nitro';
/**
 * Mock MMKV instance when used in a Jest/Test environment.
 */
export declare function createMockMMKV(config?: Configuration): MMKV;
