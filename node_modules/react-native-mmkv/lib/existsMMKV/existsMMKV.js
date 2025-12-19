import { getMMKVFactory } from '../getMMKVFactory';
import { isTest } from '../isTest';
export function existsMMKV(id) {
    if (isTest()) {
        return true;
    }
    const factory = getMMKVFactory();
    return factory.existsMMKV(id);
}
