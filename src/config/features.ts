/**
 * Feature Flags
 * 
 * Controls which features are enabled in the app.
 * Can be extended to read from user preferences or settings screen.
 */

export const FEATURES = {
  /**
   * Speech Recognition Feature
   * When enabled, requires pronunciation validation before card completion.
   * When disabled, app works normally without pronunciation checks.
   * 
   * Default: true (enabled)
   * Can be toggled via settings screen in the future.
   */
  SPEECH_RECOGNITION_ENABLED: true,
};

