"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PURCHASES_ARE_COMPLETED_BY_TYPE = exports.STOREKIT_VERSION = exports.PAYWALL_RESULT = exports.VERIFICATION_RESULT = exports.ENTITLEMENT_VERIFICATION_MODE = exports.IN_APP_MESSAGE_TYPE = exports.LOG_LEVEL = exports.REFUND_REQUEST_STATUS = exports.BILLING_FEATURE = exports.PURCHASE_TYPE = void 0;
/**
 * @deprecated Use PRODUCT_CATEGORY
 * @public
 */
var PURCHASE_TYPE;
(function (PURCHASE_TYPE) {
    /**
     * A type of SKU for in-app products.
     */
    PURCHASE_TYPE["INAPP"] = "inapp";
    /**
     * A type of SKU for subscriptions.
     */
    PURCHASE_TYPE["SUBS"] = "subs";
})(PURCHASE_TYPE || (exports.PURCHASE_TYPE = PURCHASE_TYPE = {}));
/**
 * Enum for billing features.
 * Currently, these are only relevant for Google Play Android users:
 * https://developer.android.com/reference/com/android/billingclient/api/BillingClient.FeatureType
 * @public
 */
var BILLING_FEATURE;
(function (BILLING_FEATURE) {
    /**
     * Purchase/query for subscriptions.
     */
    BILLING_FEATURE[BILLING_FEATURE["SUBSCRIPTIONS"] = 0] = "SUBSCRIPTIONS";
    /**
     * Subscriptions update/replace.
     */
    BILLING_FEATURE[BILLING_FEATURE["SUBSCRIPTIONS_UPDATE"] = 1] = "SUBSCRIPTIONS_UPDATE";
    /**
     * Purchase/query for in-app items on VR.
     */
    BILLING_FEATURE[BILLING_FEATURE["IN_APP_ITEMS_ON_VR"] = 2] = "IN_APP_ITEMS_ON_VR";
    /**
     * Purchase/query for subscriptions on VR.
     */
    BILLING_FEATURE[BILLING_FEATURE["SUBSCRIPTIONS_ON_VR"] = 3] = "SUBSCRIPTIONS_ON_VR";
    /**
     * Launch a price change confirmation flow.
     */
    BILLING_FEATURE[BILLING_FEATURE["PRICE_CHANGE_CONFIRMATION"] = 4] = "PRICE_CHANGE_CONFIRMATION";
})(BILLING_FEATURE || (exports.BILLING_FEATURE = BILLING_FEATURE = {}));
/**
 * Enum for possible refund request results.
 * @public
 */
var REFUND_REQUEST_STATUS;
(function (REFUND_REQUEST_STATUS) {
    /**
     * Apple has received the refund request.
     */
    REFUND_REQUEST_STATUS[REFUND_REQUEST_STATUS["SUCCESS"] = 0] = "SUCCESS";
    /**
     * User canceled submission of the refund request.
     */
    REFUND_REQUEST_STATUS[REFUND_REQUEST_STATUS["USER_CANCELLED"] = 1] = "USER_CANCELLED";
    /**
     * There was an error with the request. See message for more details.
     */
    REFUND_REQUEST_STATUS[REFUND_REQUEST_STATUS["ERROR"] = 2] = "ERROR";
})(REFUND_REQUEST_STATUS || (exports.REFUND_REQUEST_STATUS = REFUND_REQUEST_STATUS = {}));
/**
 * Enum for possible log levels to print.
 * @public
 */
var LOG_LEVEL;
(function (LOG_LEVEL) {
    LOG_LEVEL["VERBOSE"] = "VERBOSE";
    LOG_LEVEL["DEBUG"] = "DEBUG";
    LOG_LEVEL["INFO"] = "INFO";
    LOG_LEVEL["WARN"] = "WARN";
    LOG_LEVEL["ERROR"] = "ERROR";
})(LOG_LEVEL || (exports.LOG_LEVEL = LOG_LEVEL = {}));
/**
 * Enum for in-app message types.
 * This can be used if you disable automatic in-app message from showing automatically.
 * Then, you can pass what type of messages you want to show in the `showInAppMessages`
 * method in Purchases.
 * @public
 */
var IN_APP_MESSAGE_TYPE;
(function (IN_APP_MESSAGE_TYPE) {
    // Make sure the enum values are in sync with those defined in iOS/Android
    /**
     * In-app messages to indicate there has been a billing issue charging the user.
     */
    IN_APP_MESSAGE_TYPE[IN_APP_MESSAGE_TYPE["BILLING_ISSUE"] = 0] = "BILLING_ISSUE";
    /**
     * iOS-only. This message will show if you increase the price of a subscription and
     * the user needs to opt-in to the increase.
     */
    IN_APP_MESSAGE_TYPE[IN_APP_MESSAGE_TYPE["PRICE_INCREASE_CONSENT"] = 1] = "PRICE_INCREASE_CONSENT";
    /**
     * iOS-only. StoreKit generic messages.
     */
    IN_APP_MESSAGE_TYPE[IN_APP_MESSAGE_TYPE["GENERIC"] = 2] = "GENERIC";
    /**
     * iOS-only. This message will show if the subscriber is eligible for an iOS win-back
     * offer and will allow the subscriber to redeem the offer.
     */
    IN_APP_MESSAGE_TYPE[IN_APP_MESSAGE_TYPE["WIN_BACK_OFFER"] = 3] = "WIN_BACK_OFFER";
})(IN_APP_MESSAGE_TYPE || (exports.IN_APP_MESSAGE_TYPE = IN_APP_MESSAGE_TYPE = {}));
/**
 * Enum of entitlement verification modes.
 * @public
 */
var ENTITLEMENT_VERIFICATION_MODE;
(function (ENTITLEMENT_VERIFICATION_MODE) {
    /**
     * The SDK will not perform any entitlement verification.
     */
    ENTITLEMENT_VERIFICATION_MODE["DISABLED"] = "DISABLED";
    /**
     * Enable entitlement verification.
     *
     * If verification fails, this will be indicated with [VerificationResult.FAILED] in
     * the [EntitlementInfos.verification] and [EntitlementInfo.verification] properties but parsing will not fail
     * (i.e. Entitlements will still be granted).
     *
     * This can be useful if you want to handle verification failures to display an error/warning to the user
     * or to track this situation but still grant access.
     */
    ENTITLEMENT_VERIFICATION_MODE["INFORMATIONAL"] = "INFORMATIONAL";
    // Add ENFORCED mode once we're ready to ship it.
    // ENFORCED = "ENFORCED"
})(ENTITLEMENT_VERIFICATION_MODE || (exports.ENTITLEMENT_VERIFICATION_MODE = ENTITLEMENT_VERIFICATION_MODE = {}));
/**
 * The result of the verification process. For more details check: http://rev.cat/trusted-entitlements
 *
 * This is accomplished by preventing MiTM attacks between the SDK and the RevenueCat server.
 * With verification enabled, the SDK ensures that the response created by the server was not
 * modified by a third-party, and the response received is exactly what was sent.
 *
 * - Note: Verification is only performed if enabled using PurchasesConfiguration's
 * entitlementVerificationMode property. This is disabled by default.
 *
 * @public
 */
var VERIFICATION_RESULT;
(function (VERIFICATION_RESULT) {
    /**
     * No verification was done.
     *
     * This value is returned when verification is not enabled in PurchasesConfiguration
     */
    VERIFICATION_RESULT["NOT_REQUESTED"] = "NOT_REQUESTED";
    /**
     * Verification with our server was performed successfully.
     */
    VERIFICATION_RESULT["VERIFIED"] = "VERIFIED";
    /**
     * Verification failed, possibly due to a MiTM attack.
     */
    VERIFICATION_RESULT["FAILED"] = "FAILED";
    /**
     * Verification was performed on device.
     */
    VERIFICATION_RESULT["VERIFIED_ON_DEVICE"] = "VERIFIED_ON_DEVICE";
})(VERIFICATION_RESULT || (exports.VERIFICATION_RESULT = VERIFICATION_RESULT = {}));
/**
 * The result of presenting a paywall. This will be the last situation the user experienced before the
 * paywall closed.
 *
 * @public
 */
var PAYWALL_RESULT;
(function (PAYWALL_RESULT) {
    /**
     * If the paywall wasn't presented. Only returned when using "presentPaywallIfNeeded"
     */
    PAYWALL_RESULT["NOT_PRESENTED"] = "NOT_PRESENTED";
    /**
     * If an error happened during purchase/restoration.
     */
    PAYWALL_RESULT["ERROR"] = "ERROR";
    /**
     * If the paywall was closed without performing an operation
     */
    PAYWALL_RESULT["CANCELLED"] = "CANCELLED";
    /**
     * If a successful purchase happened inside the paywall
     */
    PAYWALL_RESULT["PURCHASED"] = "PURCHASED";
    /**
     * If a successful restore happened inside the paywall
     */
    PAYWALL_RESULT["RESTORED"] = "RESTORED";
})(PAYWALL_RESULT || (exports.PAYWALL_RESULT = PAYWALL_RESULT = {}));
/**
 * Defines which version of StoreKit may be used
 * @public
 */
var STOREKIT_VERSION;
(function (STOREKIT_VERSION) {
    /**
     * Always use StoreKit 1.
     */
    STOREKIT_VERSION["STOREKIT_1"] = "STOREKIT_1";
    /**
     * Always use StoreKit 2 (StoreKit 1 will be used if StoreKit 2 is not available in the current device.)
     * - Warning: Make sure you have an In-App Purchase Key configured in your app.
     * Please see https://rev.cat/in-app-purchase-key-configuration for more info.
     */
    STOREKIT_VERSION["STOREKIT_2"] = "STOREKIT_2";
    /**
     * Let RevenueCat use the most appropriate version of StoreKit
     */
    STOREKIT_VERSION["DEFAULT"] = "DEFAULT";
})(STOREKIT_VERSION || (exports.STOREKIT_VERSION = STOREKIT_VERSION = {}));
/**
 * Modes for completing the purchase process.
 * @public
 */
var PURCHASES_ARE_COMPLETED_BY_TYPE;
(function (PURCHASES_ARE_COMPLETED_BY_TYPE) {
    /**
     * RevenueCat will **not** automatically acknowledge any purchases. You will have to do so manually.
     *
     * **Note:** failing to acknowledge a purchase within 3 days will lead to Google Play automatically issuing a
     * refund to the user.
     *
     * For more info, see [revenuecat.com](https://docs.revenuecat.com/docs/observer-mode#option-2-client-side).
     */
    PURCHASES_ARE_COMPLETED_BY_TYPE["MY_APP"] = "MY_APP";
    /**
     * RevenueCat will automatically acknowledge verified purchases. No action is required by you.
     */
    PURCHASES_ARE_COMPLETED_BY_TYPE["REVENUECAT"] = "REVENUECAT";
})(PURCHASES_ARE_COMPLETED_BY_TYPE || (exports.PURCHASES_ARE_COMPLETED_BY_TYPE = PURCHASES_ARE_COMPLETED_BY_TYPE = {}));
