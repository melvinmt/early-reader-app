/**
 * Use the boolean value of the given `key` from the given MMKV storage instance.
 *
 * If no instance is provided, a shared default instance will be used.
 *
 * @example
 * ```ts
 * const [isPremiumAccount, setIsPremiumAccount] = useMMKVBoolean("user.isPremium")
 * ```
 */
export declare const useMMKVBoolean: (key: string, instance?: import("..").MMKV) => [value: boolean | undefined, setValue: (value: boolean | ((current: boolean | undefined) => boolean | undefined) | undefined) => void];
