import path from 'path';
import react from '@vitejs/plugin-react';
import { projectRoot } from '../../vite.config.js';
import { createVitePagePlugin } from './plugins/page-plugin.js';
import { createViteIsolationPlugin } from './plugins/isolation-plugin.js';
import { createViteTestPlugin } from './plugins/test-plugin.js';
import { createViteCssPlugin } from './plugins/css-plugin.js';
import { createDevMiddlewarePlugin } from './plugins/dev-middleware-plugin.js';

/**
 * Create all Vite plugins based on entries and environment
 * @param {Object} entries - Entry points
 * @param {Object} env - Environment settings
 * @returns {Array} Array of plugins
 */
export function createVitePlugins(entries, env) {
  // Check if the babel plugin is available to avoid errors
  let babelPlugins = [];
  try {
    if (!env.isDevelopment) {
      // Only attempt to require this plugin in production mode
      try {
        // Use a safer approach to check for the plugin
        require.resolve('babel-plugin-transform-react-remove-prop-types');
        babelPlugins.push('transform-react-remove-prop-types');
      } catch (e) {
        console.warn('babel-plugin-transform-react-remove-prop-types not found, skipping optimization');
      }
    }
  } catch (e) {
    console.warn('Error checking for babel plugins:', e);
  }
  
  const plugins = [
    // Development middleware plugin (should come first for request handling)
    createDevMiddlewarePlugin(entries, env),

    // React plugin with optimizations
    react({
      // Apply fast refresh only in development mode
      fastRefresh: env.isDevelopment,
      // Better production builds
      babel: {
        plugins: babelPlugins
      }
    }),
    
    // Custom CSS plugin to ensure proper CSS extraction
    createViteCssPlugin(entries, env),
  ];
  
  // Mode-specific plugins
  if (env.isIsolationMode) {
    plugins.push(createViteIsolationPlugin(entries, env));
  } else if (!env.isTestMode && !env.isVisualTestMode) {
    plugins.push(createVitePagePlugin(entries, env));
  }
  
  // Test mode plugins
  if (env.isTestMode || env.isVisualTestMode) {
    plugins.push(createViteTestPlugin(entries, env));
  }
  
  return plugins;
}
