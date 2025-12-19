"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnsupportedPlatformError = exports.UninitializedPurchasesError = exports.PURCHASES_ERROR_CODE = void 0;
/* tslint:disable:max-classes-per-file */
/**
 * Error codes indicating the reason for an error.
 * @public
 */
var PURCHASES_ERROR_CODE;
(function (PURCHASES_ERROR_CODE) {
    PURCHASES_ERROR_CODE["UNKNOWN_ERROR"] = "0";
    PURCHASES_ERROR_CODE["PURCHASE_CANCELLED_ERROR"] = "1";
    PURCHASES_ERROR_CODE["STORE_PROBLEM_ERROR"] = "2";
    PURCHASES_ERROR_CODE["PURCHASE_NOT_ALLOWED_ERROR"] = "3";
    PURCHASES_ERROR_CODE["PURCHASE_INVALID_ERROR"] = "4";
    PURCHASES_ERROR_CODE["PRODUCT_NOT_AVAILABLE_FOR_PURCHASE_ERROR"] = "5";
    PURCHASES_ERROR_CODE["PRODUCT_ALREADY_PURCHASED_ERROR"] = "6";
    PURCHASES_ERROR_CODE["RECEIPT_ALREADY_IN_USE_ERROR"] = "7";
    PURCHASES_ERROR_CODE["INVALID_RECEIPT_ERROR"] = "8";
    PURCHASES_ERROR_CODE["MISSING_RECEIPT_FILE_ERROR"] = "9";
    PURCHASES_ERROR_CODE["NETWORK_ERROR"] = "10";
    PURCHASES_ERROR_CODE["INVALID_CREDENTIALS_ERROR"] = "11";
    PURCHASES_ERROR_CODE["UNEXPECTED_BACKEND_RESPONSE_ERROR"] = "12";
    PURCHASES_ERROR_CODE["RECEIPT_IN_USE_BY_OTHER_SUBSCRIBER_ERROR"] = "13";
    PURCHASES_ERROR_CODE["INVALID_APP_USER_ID_ERROR"] = "14";
    PURCHASES_ERROR_CODE["OPERATION_ALREADY_IN_PROGRESS_ERROR"] = "15";
    PURCHASES_ERROR_CODE["UNKNOWN_BACKEND_ERROR"] = "16";
    PURCHASES_ERROR_CODE["INVALID_APPLE_SUBSCRIPTION_KEY_ERROR"] = "17";
    PURCHASES_ERROR_CODE["INELIGIBLE_ERROR"] = "18";
    PURCHASES_ERROR_CODE["INSUFFICIENT_PERMISSIONS_ERROR"] = "19";
    PURCHASES_ERROR_CODE["PAYMENT_PENDING_ERROR"] = "20";
    PURCHASES_ERROR_CODE["INVALID_SUBSCRIBER_ATTRIBUTES_ERROR"] = "21";
    PURCHASES_ERROR_CODE["LOG_OUT_ANONYMOUS_USER_ERROR"] = "22";
    PURCHASES_ERROR_CODE["CONFIGURATION_ERROR"] = "23";
    PURCHASES_ERROR_CODE["UNSUPPORTED_ERROR"] = "24";
    PURCHASES_ERROR_CODE["EMPTY_SUBSCRIBER_ATTRIBUTES_ERROR"] = "25";
    PURCHASES_ERROR_CODE["PRODUCT_DISCOUNT_MISSING_IDENTIFIER_ERROR"] = "26";
    PURCHASES_ERROR_CODE["PRODUCT_DISCOUNT_MISSING_SUBSCRIPTION_GROUP_IDENTIFIER_ERROR"] = "28";
    PURCHASES_ERROR_CODE["CUSTOMER_INFO_ERROR"] = "29";
    PURCHASES_ERROR_CODE["SYSTEM_INFO_ERROR"] = "30";
    PURCHASES_ERROR_CODE["BEGIN_REFUND_REQUEST_ERROR"] = "31";
    PURCHASES_ERROR_CODE["PRODUCT_REQUEST_TIMED_OUT_ERROR"] = "32";
    PURCHASES_ERROR_CODE["API_ENDPOINT_BLOCKED"] = "33";
    PURCHASES_ERROR_CODE["INVALID_PROMOTIONAL_OFFER_ERROR"] = "34";
    PURCHASES_ERROR_CODE["OFFLINE_CONNECTION_ERROR"] = "35";
    PURCHASES_ERROR_CODE["TEST_STORE_SIMULATED_PURCHASE_ERROR"] = "42";
})(PURCHASES_ERROR_CODE || (exports.PURCHASES_ERROR_CODE = PURCHASES_ERROR_CODE = {}));
/**
 * @internal
 */
var UninitializedPurchasesError = /** @class */ (function (_super) {
    __extends(UninitializedPurchasesError, _super);
    function UninitializedPurchasesError() {
        var _this = _super.call(this, "There is no singleton instance. " +
            "Make sure you configure Purchases before trying to get the default instance. " +
            "More info here: https://errors.rev.cat/configuring-sdk") || this;
        // Set the prototype explicitly.
        Object.setPrototypeOf(_this, UninitializedPurchasesError.prototype);
        return _this;
    }
    return UninitializedPurchasesError;
}(Error));
exports.UninitializedPurchasesError = UninitializedPurchasesError;
/**
 * @internal
 */
var UnsupportedPlatformError = /** @class */ (function (_super) {
    __extends(UnsupportedPlatformError, _super);
    function UnsupportedPlatformError() {
        var _this = _super.call(this, "This method is not available in the current platform.") || this;
        // Set the prototype explicitly.
        Object.setPrototypeOf(_this, UnsupportedPlatformError.prototype);
        return _this;
    }
    return UnsupportedPlatformError;
}(Error));
exports.UnsupportedPlatformError = UnsupportedPlatformError;
