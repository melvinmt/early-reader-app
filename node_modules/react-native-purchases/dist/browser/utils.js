"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.methodNotSupportedOnWeb = exports.ensurePurchasesConfigured = void 0;
var purchases_js_hybrid_mappings_1 = require("@revenuecat/purchases-js-hybrid-mappings");
/**
 * Helper function to ensure PurchasesCommon is configured before making API calls
 * @throws {Error} If PurchasesCommon is not configured
 */
function ensurePurchasesConfigured() {
    if (!purchases_js_hybrid_mappings_1.PurchasesCommon.isConfigured()) {
        throw new Error('PurchasesCommon is not configured. Call setupPurchases first.');
    }
}
exports.ensurePurchasesConfigured = ensurePurchasesConfigured;
function methodNotSupportedOnWeb(methodName) {
    throw new Error("".concat(methodName, " is not supported on web platform."));
}
exports.methodNotSupportedOnWeb = methodNotSupportedOnWeb;
