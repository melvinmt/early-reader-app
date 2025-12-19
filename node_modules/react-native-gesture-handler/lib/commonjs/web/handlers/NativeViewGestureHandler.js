"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _reactNative = require("react-native");
var _State = require("../../State");
var _constants = require("../constants");
var _GestureHandler = _interopRequireDefault(require("./GestureHandler"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
class NativeViewGestureHandler extends _GestureHandler.default {
  // TODO: Implement logic for activation on start
  // @ts-ignore Logic yet to be implemented
  shouldActivateOnStart = false;
  disallowInterruption = false;
  startX = 0;
  startY = 0;
  minDistSq = _constants.DEFAULT_TOUCH_SLOP * _constants.DEFAULT_TOUCH_SLOP;
  init(ref, propsRef) {
    super.init(ref, propsRef);
    this.shouldCancelWhenOutside = true;
    if (_reactNative.Platform.OS !== 'web') {
      return;
    }
    const view = this.delegate.view;
    this.restoreViewStyles(view);
    this.buttonRole = view.getAttribute('role') === 'button';
  }
  updateGestureConfig({
    enabled = true,
    ...props
  }) {
    super.updateGestureConfig({
      enabled: enabled,
      ...props
    });
    if (this.config.shouldActivateOnStart !== undefined) {
      this.shouldActivateOnStart = this.config.shouldActivateOnStart;
    }
    if (this.config.disallowInterruption !== undefined) {
      this.disallowInterruption = this.config.disallowInterruption;
    }
    const view = this.delegate.view;
    this.restoreViewStyles(view);
  }
  restoreViewStyles(view) {
    if (!view) {
      return;
    }
    view.style['touchAction'] = 'auto';
    // @ts-ignore Turns on defualt touch behavior on Safari
    view.style['WebkitTouchCallout'] = 'auto';
  }
  onPointerDown(event) {
    this.tracker.addToTracker(event);
    super.onPointerDown(event);
    this.newPointerAction();
    this.tryToSendTouchEvent(event);
  }
  onPointerAdd(event) {
    this.tracker.addToTracker(event);
    super.onPointerAdd(event);
    this.newPointerAction();
  }
  newPointerAction() {
    const lastCoords = this.tracker.getAbsoluteCoordsAverage();
    this.startX = lastCoords.x;
    this.startY = lastCoords.y;
    if (this.state !== _State.State.UNDETERMINED) {
      return;
    }
    this.begin();
    const view = this.delegate.view;
    const isRNGHText = view.hasAttribute('rnghtext');
    if (this.buttonRole || isRNGHText) {
      this.activate();
    }
  }
  onPointerMove(event) {
    this.tracker.track(event);
    const lastCoords = this.tracker.getAbsoluteCoordsAverage();
    const dx = this.startX - lastCoords.x;
    const dy = this.startY - lastCoords.y;
    const distSq = dx * dx + dy * dy;
    if (distSq >= this.minDistSq) {
      if (this.buttonRole && this.state === _State.State.ACTIVE) {
        this.cancel();
      } else if (!this.buttonRole && this.state === _State.State.BEGAN) {
        this.activate();
      }
    }
  }
  onPointerLeave() {
    if (this.state === _State.State.BEGAN || this.state === _State.State.ACTIVE) {
      this.cancel();
    }
  }
  onPointerUp(event) {
    super.onPointerUp(event);
    this.onUp(event);
  }
  onPointerRemove(event) {
    super.onPointerRemove(event);
    this.onUp(event);
  }
  onUp(event) {
    this.tracker.removeFromTracker(event.pointerId);
    if (this.tracker.trackedPointersCount === 0) {
      if (this.state === _State.State.ACTIVE) {
        this.end();
      } else {
        this.fail();
      }
    }
  }
  shouldRecognizeSimultaneously(handler) {
    if (super.shouldRecognizeSimultaneously(handler)) {
      return true;
    }
    if (handler instanceof NativeViewGestureHandler && handler.state === _State.State.ACTIVE && handler.disallowsInterruption()) {
      return false;
    }
    const canBeInterrupted = !this.disallowInterruption;
    if (this.state === _State.State.ACTIVE && handler.state === _State.State.ACTIVE && canBeInterrupted) {
      return false;
    }
    return this.state === _State.State.ACTIVE && canBeInterrupted && handler.handlerTag > 0;
  }
  shouldBeCancelledByOther(_handler) {
    return !this.disallowInterruption;
  }
  disallowsInterruption() {
    return this.disallowInterruption;
  }
  isButton() {
    return this.buttonRole;
  }
}
exports.default = NativeViewGestureHandler;
//# sourceMappingURL=NativeViewGestureHandler.js.map