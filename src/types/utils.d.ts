/**
 * Type definitions for utility functions and helpers
 */

declare module 'utils' {
  export interface EnvironmentSettings {
    isDevelopment: boolean;
    isProduction: boolean;
    isIsolationMode: boolean;
    isTestMode: boolean;
    isVisualTestMode: boolean;
  }
  
  export interface LoggerOptions {
    level?: 'debug' | 'info' | 'warn' | 'error';
    prefix?: string;
    includeTimestamp?: boolean;
  }
}
