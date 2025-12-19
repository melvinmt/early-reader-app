import { createMMKV } from './createMMKV';
let defaultInstance = null;
export function getDefaultMMKVInstance() {
    if (defaultInstance == null) {
        defaultInstance = createMMKV();
    }
    return defaultInstance;
}
