"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isPurchasesVirtualCurrencies = exports.isMakePurchaseResult = exports.isLogInResult = exports.isPurchasesOffering = exports.isPurchasesOfferings = exports.isCustomerInfo = exports.validateAndTransform = void 0;
/**
 * Type-safe transformation function that validates purchases-js output matches expected type
 * @param value - The value from purchases-js
 * @param typeGuard - Runtime type guard function that validates the structure
 * @param typeName - String description of expected type for logging
 * @returns The value cast to expected type T
 * @throws {Error} If type validation fails
 */
function validateAndTransform(value, typeGuard, typeName) {
    if (value === null || value === undefined) {
        if (typeName.includes('null')) {
            return value;
        }
        console.error("Type validation failed: Expected ".concat(typeName, ", got ").concat(value));
        throw new Error("Type validation failed: Expected ".concat(typeName, ", got ").concat(value));
    }
    if (typeGuard(value)) {
        return value;
    }
    console.error("Type validation failed: Expected ".concat(typeName, ", got:"), value);
    throw new Error("Type validation failed: Expected ".concat(typeName, ", received invalid structure"));
}
exports.validateAndTransform = validateAndTransform;
// Type guards for the interfaces we use
function isCustomerInfo(value) {
    return value && typeof value === 'object' &&
        typeof value.originalAppUserId === 'string' &&
        typeof value.entitlements === 'object';
}
exports.isCustomerInfo = isCustomerInfo;
function isPurchasesOfferings(value) {
    return value && typeof value === 'object' &&
        typeof value.all === 'object' &&
        (value.current === null || typeof value.current === 'object');
}
exports.isPurchasesOfferings = isPurchasesOfferings;
function isPurchasesOffering(value) {
    return value && typeof value === 'object' &&
        typeof value.identifier === 'string' &&
        typeof value.serverDescription === 'string' &&
        Array.isArray(value.availablePackages);
}
exports.isPurchasesOffering = isPurchasesOffering;
function isLogInResult(value) {
    return value && typeof value === 'object' &&
        typeof value.customerInfo === 'object' &&
        typeof value.created === 'boolean' &&
        isCustomerInfo(value.customerInfo);
}
exports.isLogInResult = isLogInResult;
function isMakePurchaseResult(value) {
    return value && typeof value === 'object' &&
        typeof value.productIdentifier === 'string' &&
        typeof value.customerInfo === 'object' &&
        isCustomerInfo(value.customerInfo) &&
        typeof value.transaction === 'object';
}
exports.isMakePurchaseResult = isMakePurchaseResult;
function isPurchasesVirtualCurrencies(value) {
    return value && typeof value === 'object' &&
        typeof value.all === 'object';
}
exports.isPurchasesVirtualCurrencies = isPurchasesVirtualCurrencies;
