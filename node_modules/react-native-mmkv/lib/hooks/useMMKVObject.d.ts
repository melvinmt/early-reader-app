import type { MMKV } from '../specs/MMKV.nitro';
/**
 * Use an object value of the given `key` from the given MMKV storage instance.
 *
 * If no instance is provided, a shared default instance will be used.
 *
 * The object will be serialized using `JSON`.
 *
 * @example
 * ```ts
 * const [user, setUser] = useMMKVObject<User>("user")
 * ```
 */
export declare function useMMKVObject<T>(key: string, instance?: MMKV): [
    value: T | undefined,
    setValue: (value: T | undefined | ((prevValue: T | undefined) => T | undefined)) => void
];
