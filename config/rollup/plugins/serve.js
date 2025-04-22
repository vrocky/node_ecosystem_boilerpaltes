// This file now just re-exports the server implementation from the modular server code
import { createDevServer as createServer } from '../server/index.js';

/**
 * Creates development server plugins
 * @param {Object} env - Environment settings
 * @returns {Array} Array of server plugins
 */
export function createDevServer(env) {
  if (!env.isDevelopment) return [];
  
  const port = env.port || (process.env.PORT ? parseInt(process.env.PORT) : 3000);
  
  return createServer({
    isDevelopment: env.isDevelopment,
    port,
    contentBase: 'dist',
    openBrowser: false, // Disable automatic browser opening
    historyApiFallback: true
  });
}
