import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import replace from '@rollup/plugin-replace';
import alias from '@rollup/plugin-alias';
import copy from 'rollup-plugin-copy';
import path from 'path';
import fs from 'fs';
import * as sass from 'sass';
import { projectRoot } from '../../rollup.config.js';
import { 
  createCssPlugin, 
  createIsolationPlugin, 
  createPagePlugin,
  createTestPlugin,
  ensureMainSiteCssPlugin,
  createDevServer
} from './plugins/index.js';

/**
 * Create all plugins based on entries and environment
 * @param {Object} entries - Entry points
 * @param {Object} env - Environment settings
 * @returns {Array} Array of plugins
 */
export function createPlugins(entries, env) {
  // Common plugins for all modes
  const commonPlugins = [
    // Environment variables
    replace({
      'process.env.NODE_ENV': JSON.stringify(env.isDevelopment ? 'development' : 'production'),
      preventAssignment: true
    }),
    
    // Path aliases
    alias({
      entries: [
        { find: '@', replacement: resolveRoot('src') },
        { find: '@components', replacement: resolveRoot('src/components') }
      ]
    }),
    
    // Module resolution
    resolve({
      extensions: ['.js', '.jsx', '.ts', '.tsx', '.scss', '.css', '.json'],
      browser: true,
    }),
    commonjs(),
    
    // TypeScript handling
    typescript({
      tsconfig: './tsconfig.json',
      sourceMap: env.isDevelopment,
      inlineSources: env.isDevelopment,
    }),
    
    // SCSS processing
    createScssProcessor(env),
    
    // CSS file generation (common for all modes)
    createCssPlugin(entries, env),
    
    // Copy public files to dist
    copy({
      targets: [{ src: 'public/**/*', dest: 'dist/' }],
      copyOnce: true
    }),
  ];
  
  // Mode-specific plugins
  const modePlugins = [];
  
  // Isolation mode
  if (env.isIsolationMode) {
    console.log('🔍 Running in ISOLATION mode');
    modePlugins.push(createIsolationPlugin(entries, env));
    modePlugins.push(createPagePlugin(entries, env)); // Page generation still needed in isolation mode
  } 
  // Test modes
  else if (env.isTestMode || env.isVisualTestMode) {
    console.log(`🧪 Running in ${env.isVisualTestMode ? 'VISUAL TEST' : 'TEST'} mode`);
    modePlugins.push(createTestPlugin(entries, env));
  } 
  // Regular mode
  else {
    console.log(`🚀 Running in ${env.isDevelopment ? 'DEVELOPMENT' : 'PRODUCTION'} mode`);
    modePlugins.push(createPagePlugin(entries, env));
    modePlugins.push(ensureMainSiteCssPlugin(env));
  }
  
  // Add development server with proper MIME type handling (for all dev modes)
  const serverPlugins = env.isDevelopment ? createDevServer(env) : [];
  
  // Combine all plugins in the right order
  return [...commonPlugins, ...modePlugins, ...serverPlugins];
}

/**
 * Create SCSS processor plugin
 * @param {Object} env - Environment settings
 * @returns {Object} SCSS processor plugin
 */
function createScssProcessor(env) {
  return {
    name: 'scss-processor',
    async transform(code, id) {
      if (!id.endsWith('.scss')) return null;

      try {
        // Process SCSS file
        const result = sass.compileString(code, {
          style: env.isDevelopment ? 'expanded' : 'compressed',
          sourceMap: env.isDevelopment,
          sourceMapIncludeSources: true,
          importers: [{
            findFileUrl(url) {
              if (!url.startsWith('~')) return null;
              const resolvedPath = path.resolve(projectRoot, 'node_modules', url.substring(1));
              return new URL(`file://${resolvedPath}`);
            }
          }],
          syntax: 'scss',
        });

        // Return transformed CSS
        return {
          code: `
            const style = document.createElement('style');
            style.textContent = ${JSON.stringify(result.css)};
            document.head.appendChild(style);
            export default style;
          `,
          map: env.isDevelopment ? result.sourceMap : null
        };
      } catch (e) {
        console.error(`Error processing SCSS file ${id}:`, e);
        return null;
      }
    }
  };
}

/**
 * Resolve paths relative to project root
 * @param {string} dir - Directory path
 * @returns {string} Absolute path
 */
function resolveRoot(dir) {
  return path.resolve(projectRoot, dir);
}
