"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PERIOD_UNIT = exports.OFFER_PAYMENT_MODE = exports.RECURRENCE_MODE = exports.PRORATION_MODE = exports.PRODUCT_TYPE = exports.PRODUCT_CATEGORY = exports.INTRO_ELIGIBILITY_STATUS = exports.PACKAGE_TYPE = void 0;
/**
 * Enum indicating possible package types.
 * @public
 */
var PACKAGE_TYPE;
(function (PACKAGE_TYPE) {
    /**
     * A package that was defined with a custom identifier.
     */
    PACKAGE_TYPE["UNKNOWN"] = "UNKNOWN";
    /**
     * A package that was defined with a custom identifier.
     */
    PACKAGE_TYPE["CUSTOM"] = "CUSTOM";
    /**
     * A package configured with the predefined lifetime identifier.
     */
    PACKAGE_TYPE["LIFETIME"] = "LIFETIME";
    /**
     * A package configured with the predefined annual identifier.
     */
    PACKAGE_TYPE["ANNUAL"] = "ANNUAL";
    /**
     * A package configured with the predefined six month identifier.
     */
    PACKAGE_TYPE["SIX_MONTH"] = "SIX_MONTH";
    /**
     * A package configured with the predefined three month identifier.
     */
    PACKAGE_TYPE["THREE_MONTH"] = "THREE_MONTH";
    /**
     * A package configured with the predefined two month identifier.
     */
    PACKAGE_TYPE["TWO_MONTH"] = "TWO_MONTH";
    /**
     * A package configured with the predefined monthly identifier.
     */
    PACKAGE_TYPE["MONTHLY"] = "MONTHLY";
    /**
     * A package configured with the predefined weekly identifier.
     */
    PACKAGE_TYPE["WEEKLY"] = "WEEKLY";
})(PACKAGE_TYPE || (exports.PACKAGE_TYPE = PACKAGE_TYPE = {}));
/**
 * Enum indicating possible eligibility status for introductory pricing.
 * @public
 */
var INTRO_ELIGIBILITY_STATUS;
(function (INTRO_ELIGIBILITY_STATUS) {
    /**
     * RevenueCat doesn't have enough information to determine eligibility.
     */
    INTRO_ELIGIBILITY_STATUS[INTRO_ELIGIBILITY_STATUS["INTRO_ELIGIBILITY_STATUS_UNKNOWN"] = 0] = "INTRO_ELIGIBILITY_STATUS_UNKNOWN";
    /**
     * The user is not eligible for a free trial or intro pricing for this product.
     */
    INTRO_ELIGIBILITY_STATUS[INTRO_ELIGIBILITY_STATUS["INTRO_ELIGIBILITY_STATUS_INELIGIBLE"] = 1] = "INTRO_ELIGIBILITY_STATUS_INELIGIBLE";
    /**
     * The user is eligible for a free trial or intro pricing for this product.
     */
    INTRO_ELIGIBILITY_STATUS[INTRO_ELIGIBILITY_STATUS["INTRO_ELIGIBILITY_STATUS_ELIGIBLE"] = 2] = "INTRO_ELIGIBILITY_STATUS_ELIGIBLE";
    /**
     * There is no free trial or intro pricing for this product.
     */
    INTRO_ELIGIBILITY_STATUS[INTRO_ELIGIBILITY_STATUS["INTRO_ELIGIBILITY_STATUS_NO_INTRO_OFFER_EXISTS"] = 3] = "INTRO_ELIGIBILITY_STATUS_NO_INTRO_OFFER_EXISTS";
})(INTRO_ELIGIBILITY_STATUS || (exports.INTRO_ELIGIBILITY_STATUS = INTRO_ELIGIBILITY_STATUS = {}));
/**
 * Enum indicating possible product categories.
 * @public
 */
var PRODUCT_CATEGORY;
(function (PRODUCT_CATEGORY) {
    /**
     * A type of product for non-subscription.
     */
    PRODUCT_CATEGORY["NON_SUBSCRIPTION"] = "NON_SUBSCRIPTION";
    /**
     * A type of product for subscriptions.
     */
    PRODUCT_CATEGORY["SUBSCRIPTION"] = "SUBSCRIPTION";
    /**
     * A type of product for unknowns.
     */
    PRODUCT_CATEGORY["UNKNOWN"] = "UNKNOWN";
})(PRODUCT_CATEGORY || (exports.PRODUCT_CATEGORY = PRODUCT_CATEGORY = {}));
/**
 * Enum indicating possible product types.
 * @public
 */
var PRODUCT_TYPE;
(function (PRODUCT_TYPE) {
    /**
     * A consumable in-app purchase.
     */
    PRODUCT_TYPE["CONSUMABLE"] = "CONSUMABLE";
    /**
     * A non-consumable in-app purchase. Only applies to Apple Store products.
     */
    PRODUCT_TYPE["NON_CONSUMABLE"] = "NON_CONSUMABLE";
    /**
     * A non-renewing subscription. Only applies to Apple Store products.
     */
    PRODUCT_TYPE["NON_RENEWABLE_SUBSCRIPTION"] = "NON_RENEWABLE_SUBSCRIPTION";
    /**
     * An auto-renewable subscription.
     */
    PRODUCT_TYPE["AUTO_RENEWABLE_SUBSCRIPTION"] = "AUTO_RENEWABLE_SUBSCRIPTION";
    /**
     * A subscription that is pre-paid. Only applies to Google Play products.
     */
    PRODUCT_TYPE["PREPAID_SUBSCRIPTION"] = "PREPAID_SUBSCRIPTION";
    /**
     * Unable to determine product type.
     */
    PRODUCT_TYPE["UNKNOWN"] = "UNKNOWN";
})(PRODUCT_TYPE || (exports.PRODUCT_TYPE = PRODUCT_TYPE = {}));
/**
 * Enum with possible proration modes in a subscription upgrade or downgrade in the Play Store. Used only for Google.
 * @public
 */
var PRORATION_MODE;
(function (PRORATION_MODE) {
    PRORATION_MODE[PRORATION_MODE["UNKNOWN_SUBSCRIPTION_UPGRADE_DOWNGRADE_POLICY"] = 0] = "UNKNOWN_SUBSCRIPTION_UPGRADE_DOWNGRADE_POLICY";
    /**
     * Replacement takes effect immediately, and the remaining time will be
     * prorated and credited to the user. This is the current default behavior.
     */
    PRORATION_MODE[PRORATION_MODE["IMMEDIATE_WITH_TIME_PRORATION"] = 1] = "IMMEDIATE_WITH_TIME_PRORATION";
    /**
     * Replacement takes effect immediately, and the billing cycle remains the
     * same. The price for the remaining period will be charged. This option is
     * only available for subscription upgrade.
     */
    PRORATION_MODE[PRORATION_MODE["IMMEDIATE_AND_CHARGE_PRORATED_PRICE"] = 2] = "IMMEDIATE_AND_CHARGE_PRORATED_PRICE";
    /**
     * Replacement takes effect immediately, and the new price will be charged on
     * next recurrence time. The billing cycle stays the same.
     */
    PRORATION_MODE[PRORATION_MODE["IMMEDIATE_WITHOUT_PRORATION"] = 3] = "IMMEDIATE_WITHOUT_PRORATION";
    /**
     * Replacement takes effect when the old plan expires, and the new price will
     * be charged at the same time.
     */
    PRORATION_MODE[PRORATION_MODE["DEFERRED"] = 6] = "DEFERRED";
    /**
     * Replacement takes effect immediately, and the user is charged full price
     * of new plan and is given a full billing cycle of subscription,
     * plus remaining prorated time from the old plan.
     */
    PRORATION_MODE[PRORATION_MODE["IMMEDIATE_AND_CHARGE_FULL_PRICE"] = 5] = "IMMEDIATE_AND_CHARGE_FULL_PRICE";
})(PRORATION_MODE || (exports.PRORATION_MODE = PRORATION_MODE = {}));
/**
 * Recurrence mode for a pricing phase
 * @public
 */
var RECURRENCE_MODE;
(function (RECURRENCE_MODE) {
    /**
     * Pricing phase repeats infinitely until cancellation
     */
    RECURRENCE_MODE[RECURRENCE_MODE["INFINITE_RECURRING"] = 1] = "INFINITE_RECURRING";
    /**
     * Pricing phase repeats for a fixed number of billing periods
     */
    RECURRENCE_MODE[RECURRENCE_MODE["FINITE_RECURRING"] = 2] = "FINITE_RECURRING";
    /**
     * Pricing phase does not repeat
     */
    RECURRENCE_MODE[RECURRENCE_MODE["NON_RECURRING"] = 3] = "NON_RECURRING";
})(RECURRENCE_MODE || (exports.RECURRENCE_MODE = RECURRENCE_MODE = {}));
/**
 * Payment mode for offer pricing phases. Google Play only.
 * @public
 */
var OFFER_PAYMENT_MODE;
(function (OFFER_PAYMENT_MODE) {
    /**
     * Subscribers don't pay until the specified period ends
     */
    OFFER_PAYMENT_MODE["FREE_TRIAL"] = "FREE_TRIAL";
    /**
     * Subscribers pay up front for a specified period
     */
    OFFER_PAYMENT_MODE["SINGLE_PAYMENT"] = "SINGLE_PAYMENT";
    /**
     * Subscribers pay a discounted amount for a specified number of periods
     */
    OFFER_PAYMENT_MODE["DISCOUNTED_RECURRING_PAYMENT"] = "DISCOUNTED_RECURRING_PAYMENT";
})(OFFER_PAYMENT_MODE || (exports.OFFER_PAYMENT_MODE = OFFER_PAYMENT_MODE = {}));
/**
 * Time duration unit for Period.
 * @public
 */
var PERIOD_UNIT;
(function (PERIOD_UNIT) {
    PERIOD_UNIT["DAY"] = "DAY";
    PERIOD_UNIT["WEEK"] = "WEEK";
    PERIOD_UNIT["MONTH"] = "MONTH";
    PERIOD_UNIT["YEAR"] = "YEAR";
    PERIOD_UNIT["UNKNOWN"] = "UNKNOWN";
})(PERIOD_UNIT || (exports.PERIOD_UNIT = PERIOD_UNIT = {}));
