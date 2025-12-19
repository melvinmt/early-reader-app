/**
 * Use the buffer value (unsigned 8-bit (0-255)) of the given `key` from the given MMKV storage instance.
 *
 * If no instance is provided, a shared default instance will be used.
 *
 * @example
 * ```ts
 * const [privateKey, setPrivateKey] = useMMKVBuffer("user.privateKey")
 * ```
 */
export declare const useMMKVBuffer: (key: string, instance?: import("..").MMKV) => [value: ArrayBuffer | undefined, setValue: (value: ArrayBuffer | ((current: ArrayBuffer | undefined) => ArrayBuffer | undefined) | undefined) => void];
