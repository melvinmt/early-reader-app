/**
 * Use the number value of the given `key` from the given MMKV storage instance.
 *
 * If no instance is provided, a shared default instance will be used.
 *
 * @example
 * ```ts
 * const [age, setAge] = useMMKVNumber("user.age")
 * ```
 */
export declare const useMMKVNumber: (key: string, instance?: import("..").MMKV) => [value: number | undefined, setValue: (value: number | ((current: number | undefined) => number | undefined) | undefined) => void];
