import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import replace from '@rollup/plugin-replace';
import alias from '@rollup/plugin-alias';
import copy from 'rollup-plugin-copy';
import postcss from 'rollup-plugin-postcss';
import path from 'path';
import fs from 'fs';
import autoprefixer from 'autoprefixer';
import { projectRoot, resolveRoot } from './paths.js';
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
    
    // Improved CSS/SCSS processing - use inline config only, no external file
    postcss({
      use: ['sass'],
      extract: false, // Keep inline (we'll extract main files separately)
      sourceMap: env.generateSourceMaps, // Use dedicated flag
      minimize: !env.isDevelopment,
      modules: {
        generateScopedName: env.isDevelopment
          ? '[name]__[local]___[hash:base64:5]'
          : '[hash:base64:5]',
      },
      autoModules: true,
      // Define PostCSS plugins inline to avoid config file issues
      plugins: [
        autoprefixer({ grid: true, flexbox: true }),
        !env.isDevelopment && (() => {
          // Using synchronous require for production only to avoid ESM issues
          const cssnano = require('cssnano');
          return cssnano({
            preset: ['default', { discardComments: { removeAll: true } }]
          });
        })()
      ].filter(Boolean),
      // Skip loading config file
      config: false,
      // Add source map options
      mapPath: (mapPath) => mapPath.replace(/\.map$/, '.map'),
    }),
    
    // External CSS file generation
    createCssPlugin(entries, env),
    
    // Copy public files to dist
    copy({
      targets: [{ src: 'public/**/*', dest: 'dist/' }],
      copyOnce: true
    }),
  ];
  
  // Mode-specific plugins
  const modePlugins = [];
  
  // Isolation mode - now also generate standard pages
  if (env.isIsolationMode) {
    console.log('🔍 Running in ISOLATION mode (with standard files)');
    // Generate isolation pages
    modePlugins.push(createIsolationPlugin(entries, env));
    // Generate standard pages
    modePlugins.push(createPagePlugin(entries, env));
    // Also generate main site CSS
    modePlugins.push(ensureMainSiteCssPlugin(env));
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
  
  // Add development server with proper MIME type handling
  const serverPlugins = env.isDevelopment ? createDevServer(env) : [];
  
  // Combine all plugins
  return [...commonPlugins, ...modePlugins, ...serverPlugins];
}
