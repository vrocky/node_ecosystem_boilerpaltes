/**
 * Environment detection utilities for both Vite and Rollup builds
 */

/**
 * Check if we're running in a browser environment
 */
export const isBrowser = typeof window !== 'undefined';

/**
 * Safely access import.meta.env with proper type checking
 */
const getEnvValue = (key: string): boolean => {
  if (typeof import.meta !== 'undefined' && 
      typeof import.meta.env !== 'undefined') {
    return (import.meta.env as any)[key] === true;
  }
  return false;
};

/**
 * Check if we're in Vite development mode
 */
export const isVite = isBrowser && getEnvValue('DEV');

/**
 * Check if we're in isolation mode
 */
export const isIsolation = isBrowser && (
  // Check window global set by Vite plugin
  (typeof window.__VITE_IS_ISOLATION !== 'undefined' && window.__VITE_IS_ISOLATION === true) ||
  // Check environment variable
  getEnvValue('VITE_IS_ISOLATION') ||
  // Check URL for isolation path
  window.location.pathname.includes('/isolation/')
);

/**
 * Check if we're in a module context (imported by another module rather than rendered directly)
 */
export const isModuleContext = isBrowser && (
  // Check window global set by Vite plugin
  (typeof window.__VITE_MODULE_MODE !== 'undefined' && window.__VITE_MODULE_MODE === true) ||
  // Check environment variable
  getEnvValue('VITE_MODULE_MODE')
);
