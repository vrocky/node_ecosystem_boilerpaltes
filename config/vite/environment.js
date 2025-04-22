/**
 * Get environment settings based on process.env variables
 * @returns {Object} Environment settings object
 */
export function getEnvironmentSettings() {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isTestMode = process.env.TEST_MODE === 'true';
  const isVisualTestMode = process.env.VISUAL_TEST_MODE === 'true';
  const isIsolationMode = process.env.ISOLATION_MODE === 'true';

  // Set different default ports for each mode to avoid conflicts
  const basePort = process.env.PORT ? parseInt(process.env.PORT) : 5173;
  const testPort = basePort + 1; // 5174 by default
  const visualTestPort = basePort + 2; // 5175 by default
  const isolationPort = basePort + 3; // 5176 by default

  // Pick the appropriate port based on the mode
  const port = isIsolationMode ? isolationPort : 
              isVisualTestMode ? visualTestPort : 
              isTestMode ? testPort : basePort;

  return {
    isDevelopment,
    isTestMode,
    isVisualTestMode,
    isIsolationMode,
    port
  };
}
