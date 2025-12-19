import { PurchasesPackage } from "@revenuecat/purchases-typescript-internal";
/**
 * Shows a simulated purchase alert for platforms that don't support DOM manipulation.
 */
export declare function showSimulatedPurchaseAlert(packageIdentifier: string, offeringIdentifier: string, onPurchase: (packageInfo: PurchasesPackage) => Promise<void>, onFailedPurchase: () => void, onCancel: () => void): Promise<void>;
