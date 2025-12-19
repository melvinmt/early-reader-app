import { useCallback, useMemo } from 'react';
import { useMMKVString } from './useMMKVString';
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
export function useMMKVObject(key, instance) {
    const [json, setJson] = useMMKVString(key, instance);
    const value = useMemo(() => {
        if (json == null)
            return undefined;
        return JSON.parse(json);
    }, [json]);
    const setValue = useCallback((v) => {
        if (v instanceof Function) {
            setJson((currentJson) => {
                const currentValue = currentJson != null ? JSON.parse(currentJson) : undefined;
                const newValue = v(currentValue);
                // Store the Object as a serialized Value or clear the value
                return newValue != null ? JSON.stringify(newValue) : undefined;
            });
        }
        else {
            // Store the Object as a serialized Value or clear the value
            const newValue = v != null ? JSON.stringify(v) : undefined;
            setJson(newValue);
        }
    }, [setJson]);
    return [value, setValue];
}
