export const LOCAL_STORAGE_KEY_WILDCARD = '\\';
const canUseDOM = typeof window !== 'undefined' && window.document?.createElement != null;
const hasAccessToLocalStorage = () => {
    try {
        // throws ACCESS_DENIED error
        window.localStorage;
        return true;
    }
    catch {
        return false;
    }
};
const inMemoryStorage = new Map();
export function getLocalStorage() {
    if (!canUseDOM) {
        throw new Error('Tried to access storage on the server. Did you forget to call this in useEffect?');
    }
    if (!hasAccessToLocalStorage()) {
        return {
            getItem: (key) => inMemoryStorage.get(key) ?? null,
            setItem: (key, value) => inMemoryStorage.set(key, value),
            removeItem: (key) => inMemoryStorage.delete(key),
            clear: () => inMemoryStorage.clear(),
            length: inMemoryStorage.size,
            key: (index) => Object.keys(inMemoryStorage).at(index) ?? null,
        };
    }
    const domStorage = global?.localStorage ?? window?.localStorage ?? localStorage;
    if (domStorage == null) {
        throw new Error(`Could not find 'localStorage' instance!`);
    }
    return domStorage;
}
