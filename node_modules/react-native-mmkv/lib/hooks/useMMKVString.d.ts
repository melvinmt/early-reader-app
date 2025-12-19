/**
 * Use the string value of the given `key` from the given MMKV storage instance.
 *
 * If no instance is provided, a shared default instance will be used.
 *
 * @example
 * ```ts
 * const [username, setUsername] = useMMKVString("user.name")
 * ```
 */
export declare const useMMKVString: (key: string, instance?: import("..").MMKV) => [value: string | undefined, setValue: (value: string | ((current: string | undefined) => string | undefined) | undefined) => void];
