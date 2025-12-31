/**
 * Locale Configuration
 * 
 * Manages language/country settings for i18n support.
 * Assets are organized by locale (e.g., assets/en-US/...)
 */

export const DEFAULT_LOCALE = 'en-US';

/**
 * Get the current locale
 * Can be extended to read from user preferences or device settings
 */
export function getLocale(): string {
  // TODO: Read from user preferences or device settings
  // For now, default to en-US
  return DEFAULT_LOCALE;
}

/**
 * Get the locale-specific path for assets
 */
export function getAssetPath(relativePath: string, locale?: string): string {
  const currentLocale = locale || getLocale();
  return `assets/${currentLocale}/${relativePath}`;
}

/**
 * Supported locales
 */
export const SUPPORTED_LOCALES = ['en-US'] as const;

export type SupportedLocale = typeof SUPPORTED_LOCALES[number];














