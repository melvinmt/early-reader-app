import { getMMKVFactory } from '../getMMKVFactory';
import { isTest } from '../isTest';
export function deleteMMKV(id) {
    if (isTest()) {
        return true;
    }
    const factory = getMMKVFactory();
    return factory.deleteMMKV(id);
}
