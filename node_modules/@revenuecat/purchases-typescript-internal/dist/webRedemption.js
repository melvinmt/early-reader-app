"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebPurchaseRedemptionResultType = void 0;
/**
 * The result type of a Redemption Link redemption attempt.
 * @public
 */
var WebPurchaseRedemptionResultType;
(function (WebPurchaseRedemptionResultType) {
    /**
     * The redemption was successful.
     */
    WebPurchaseRedemptionResultType["SUCCESS"] = "SUCCESS";
    /**
     * The redemption failed.
     */
    WebPurchaseRedemptionResultType["ERROR"] = "ERROR";
    /**
     * The purchase associated to the link belongs to another user.
     */
    WebPurchaseRedemptionResultType["PURCHASE_BELONGS_TO_OTHER_USER"] = "PURCHASE_BELONGS_TO_OTHER_USER";
    /**
     * The token is invalid.
     */
    WebPurchaseRedemptionResultType["INVALID_TOKEN"] = "INVALID_TOKEN";
    /**
     * The token has expired. A new Redemption Link will be sent to the email used during purchase.
     */
    WebPurchaseRedemptionResultType["EXPIRED"] = "EXPIRED";
})(WebPurchaseRedemptionResultType || (exports.WebPurchaseRedemptionResultType = WebPurchaseRedemptionResultType = {}));
