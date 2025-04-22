/**
 * Get environment settings based on process.env variables
 * @returns {Object} Environment settings object
 */
export function getEnvironmentSettings() {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isTestMode = process.env.TEST_MODE === 'true';
  const isVisualTestMode = process.env.VISUAL_TEST_MODE === 'true';
  const isIsolationMode = process.env.ISOLATION_MODE === 'true';
  
  // Explicit source map generation flag - enabled in development mode by default
  // but can be overridden with an environment variable
  const generateSourceMaps = process.env.GENERATE_SOURCEMAPS ? 
    process.env.GENERATE_SOURCEMAPS === 'true' : 
    isDevelopment;

  // Use provided port or calculate a port based on mode
  // Explicit PORT environment variable takes precedence
  let port;
  if (process.env.PORT) {
    port = parseInt(process.env.PORT);
  } else {
    // Each mode gets a different default port to avoid conflicts
    const basePort = 3000;
    port = isIsolationMode ? basePort + 23 : // 3023
           isVisualTestMode ? basePort + 24 : // 3024 
           isTestMode ? basePort + 25 : // 3025
           basePort; // 3000 for standard mode
  }

  return {
    isDevelopment,
    isTestMode,
    isVisualTestMode,
    isIsolationMode,
    generateSourceMaps,
    port
  };
}
