"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.showSimulatedPurchaseAlert = void 0;
var react_native_1 = require("react-native");
var offeringsLoader_1 = require("./offeringsLoader");
/**
 * Shows a simulated purchase alert for platforms that don't support DOM manipulation.
 */
function showSimulatedPurchaseAlert(packageIdentifier, offeringIdentifier, onPurchase, onFailedPurchase, onCancel) {
    var _this = this;
    return new Promise(function (resolve, reject) {
        var handleCancel = function () {
            onCancel();
            resolve();
        };
        var handleFailedPurchase = function () {
            onFailedPurchase();
            resolve();
        };
        var handlePurchase = function (data) { return __awaiter(_this, void 0, void 0, function () {
            var error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, onPurchase(data.packageInfo)];
                    case 1:
                        _a.sent();
                        resolve();
                        return [3 /*break*/, 3];
                    case 2:
                        error_1 = _a.sent();
                        reject(error_1);
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        }); };
        (0, offeringsLoader_1.loadSimulatedPurchaseData)(packageIdentifier, offeringIdentifier)
            .then(function (data) {
            var packageInfo = data.packageInfo, offers = data.offers;
            var message = "\u26A0\uFE0F This is a test purchase and should only be used during development. In production, use an Apple/Google API key from RevenueCat.\n\n";
            message += "Package ID: ".concat(packageInfo.identifier, "\n");
            message += "Product ID: ".concat(packageInfo.product.identifier, "\n");
            message += "Title: ".concat(packageInfo.product.title, "\n");
            message += "Price: ".concat(packageInfo.product.priceString, "\n");
            if (packageInfo.product.subscriptionPeriod) {
                message += "Period: ".concat(packageInfo.product.subscriptionPeriod, "\n");
            }
            if (offers.length > 0) {
                message += "\nOffers:\n".concat(offers.map(function (offer) { return "\u2022 ".concat(offer); }).join('\n'));
            }
            react_native_1.Alert.alert('Test Purchase', message, [
                {
                    text: 'Cancel',
                    style: 'cancel',
                    onPress: handleCancel,
                },
                {
                    text: 'Test Failed Purchase',
                    style: 'destructive',
                    onPress: handleFailedPurchase,
                },
                {
                    text: 'Test Valid Purchase',
                    onPress: function () { return handlePurchase(data); },
                },
            ], { cancelable: true, onDismiss: handleCancel });
        })
            .catch(function (error) {
            console.error('Error loading package details:', error);
            var errorMessage = error instanceof Error ? error.message : 'Unknown error';
            react_native_1.Alert.alert('Test Purchase Error', "Error loading package details: ".concat(errorMessage), [
                {
                    text: 'Close',
                    onPress: function () { reject(error); },
                },
            ], { cancelable: true, onDismiss: function () { reject(error); } });
        });
    });
}
exports.showSimulatedPurchaseAlert = showSimulatedPurchaseAlert;
