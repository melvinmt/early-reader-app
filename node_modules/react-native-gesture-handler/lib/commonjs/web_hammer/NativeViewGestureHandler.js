"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _DiscreteGestureHandler = _interopRequireDefault(require("./DiscreteGestureHandler"));
var NodeManager = _interopRequireWildcard(require("./NodeManager"));
var _PressGestureHandler = _interopRequireDefault(require("./PressGestureHandler"));
var _utils = require("./utils");
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
class NativeViewGestureHandler extends _PressGestureHandler.default {
  get isNative() {
    return true;
  }
  onRawEvent(ev) {
    super.onRawEvent(ev);
    if (!ev.isFinal) {
      // if (this.ref instanceof ScrollView) {
      if ((0, _utils.TEST_MIN_IF_NOT_NAN)((0, _utils.VEC_LEN_SQ)({
        x: ev.deltaX,
        y: ev.deltaY
      }), 10)) {
        // @ts-ignore FIXME(TS) config type
        if (this.config.disallowInterruption) {
          const gestures = Object.values(NodeManager.getNodes()).filter(gesture => {
            const {
              handlerTag,
              view,
              isGestureRunning
            } = gesture;
            return (
              // Check if this gesture isn't self
              handlerTag !== this.handlerTag &&
              // Ensure the gesture needs to be cancelled
              isGestureRunning &&
              // ScrollView can cancel discrete gestures like taps and presses
              gesture instanceof _DiscreteGestureHandler.default &&
              // Ensure a view exists and is a child of the current view
              view &&
              // @ts-ignore FIXME(TS) view type
              this.view.contains(view)
            );
          });
          // Cancel all of the gestures that passed the filter
          for (const gesture of gestures) {
            // TODO: Bacon: Send some cached event.
            gesture.forceInvalidate(ev);
          }
        }
      }
    }
  }
}
var _default = exports.default = NativeViewGestureHandler;
//# sourceMappingURL=NativeViewGestureHandler.js.map