import type { MMKV } from '../specs/MMKV.nitro';
export declare function createMMKVHook<T extends (boolean | number | string | ArrayBufferLike) | undefined, TSet extends T | undefined, TSetAction extends TSet | ((current: T) => TSet)>(getter: (instance: MMKV, key: string) => T): (key: string, instance?: MMKV) => [value: T, setValue: (value: TSetAction) => void];
