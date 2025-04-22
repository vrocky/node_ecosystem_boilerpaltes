import { serverSingleton } from './serverSingleton.js';
import livereload from 'rollup-plugin-livereload';

/**
 * Create a development server plugin
 * @param {Object} options - Server options
 * @returns {Array} Array of Rollup plugins
 */
export function createDevServer(options = {}) {
  // Skip if not in development mode
  if (!options.isDevelopment) return [];

  // Get server options
  const {
    port = process.env.PORT ? parseInt(process.env.PORT) : 3000,
    contentBase = 'dist',
    host = 'localhost',
    openBrowser = false, // Always disable browser opening
    historyApiFallback = true,
  } = options;
  
  // Create server plugin
  const serverPlugin = {
    name: 'dev-server',
    
    async buildStart() {
      try {
        // Use singleton to prevent duplicate server instances
        await serverSingleton.startServer({
          port,
          host,
          contentBase,
          historyApiFallback
        });
      } catch (err) {
        // Don't throw error as that would break the build
        console.error('Failed to start server:', err.message);
      }
    },
    
    buildEnd() {
      // Server stays running for watch mode
    },
    
    closeWatcher() {
      // Keep server running in watch mode
    },
    
    closeBundle() {
      // Close server on non-watch mode build completion
      if (process.env.ROLLUP_WATCH !== 'true') {
        serverSingleton.closeServer('build-complete');
      }
    }
  };
  
  const plugins = [serverPlugin];
  
  // Add live reload if available
  if (typeof livereload === 'function') {
    plugins.push(
      livereload({
        watch: contentBase,
        verbose: false,
        delay: 300,
      })
    );
  } else {
    console.log('Live reload not available');
  }
  
  return plugins;
}

/**
 * Get current server info
 * @returns {Object|null} Server information
 */
export function getServerInfo() {
  return serverSingleton.getServerInfo();
}

/**
 * Restart the server
 * @returns {Promise<Object>} Server information
 */
export async function restartServer() {
  return serverSingleton.restartServer();
}
