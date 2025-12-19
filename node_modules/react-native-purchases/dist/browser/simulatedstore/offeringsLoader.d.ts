import { PurchasesPackage } from "@revenuecat/purchases-typescript-internal";
export interface SimulatedPurchaseData {
    packageInfo: PurchasesPackage;
    offers: string[];
}
/**
 * Loads package data and formats offer information
 */
export declare function loadSimulatedPurchaseData(packageIdentifier: string, offeringIdentifier: string): Promise<SimulatedPurchaseData>;
