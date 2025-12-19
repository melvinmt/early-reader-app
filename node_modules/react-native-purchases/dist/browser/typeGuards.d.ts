import { CustomerInfo, MakePurchaseResult, PurchasesOffering, PurchasesOfferings, PurchasesVirtualCurrencies } from '@revenuecat/purchases-typescript-internal';
/**
 * Type guard function type - returns true if value matches type T
 */
type TypeGuard<T> = (value: any) => value is T;
/**
 * Type-safe transformation function that validates purchases-js output matches expected type
 * @param value - The value from purchases-js
 * @param typeGuard - Runtime type guard function that validates the structure
 * @param typeName - String description of expected type for logging
 * @returns The value cast to expected type T
 * @throws {Error} If type validation fails
 */
export declare function validateAndTransform<T>(value: any, typeGuard: TypeGuard<T>, typeName: string): T;
export declare function isCustomerInfo(value: any): value is CustomerInfo;
export declare function isPurchasesOfferings(value: any): value is PurchasesOfferings;
export declare function isPurchasesOffering(value: any): value is PurchasesOffering;
export declare function isLogInResult(value: any): value is {
    customerInfo: CustomerInfo;
    created: boolean;
};
export declare function isMakePurchaseResult(value: any): value is MakePurchaseResult;
export declare function isPurchasesVirtualCurrencies(value: any): value is PurchasesVirtualCurrencies;
export {};
