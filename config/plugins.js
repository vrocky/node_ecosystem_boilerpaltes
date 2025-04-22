import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import replace from '@rollup/plugin-replace';
import serve from 'rollup-plugin-serve';
import livereload from 'rollup-plugin-livereload';
import alias from '@rollup/plugin-alias';
import copy from 'rollup-plugin-copy';
import path from 'path';
import fs from 'fs';
import * as sass from 'sass';
import { projectRoot } from '../rollup.config.js';
import { 
  createCssPlugin, 
  createIsolationPlugin, 
  createPagePlugin,
  createTestPlugin,
  ensureMainSiteCssPlugin 
} from './plugins/index.js';

/**
 * Create all plugins based on entries and environment
 * @param {Object} entries - Entry points
 * @param {Object} env - Environment settings
 * @returns {Array} Array of plugins
 */
export function createPlugins(entries, env) {
  const plugins = [
    // Basic plugins
    replace({
      'process.env.NODE_ENV': JSON.stringify(env.isDevelopment ? 'development' : 'production'),
      preventAssignment: true
    }),
    alias({
      entries: [
        { find: '@', replacement: resolveRoot('src') },
        { find: '@components', replacement: resolveRoot('src/components') }
      ]
    }),
    resolve({
      extensions: ['.js', '.jsx', '.ts', '.tsx', '.scss', '.css', '.json'],
      browser: true,
    }),
    commonjs(),
    typescript({
      tsconfig: './tsconfig.json',
      sourceMap: env.isDevelopment,
      inlineSources: env.isDevelopment,
    }),
    
    // SCSS processing
    createScssProcessor(env),
    
    // CSS file generation
    createCssPlugin(entries, env),
    
    // Main site CSS generation
    ensureMainSiteCssPlugin(env),
  ];
  
  // Mode-specific plugins
  if (env.isIsolationMode) {
    plugins.push(createIsolationPlugin(entries, env));
  } else if (!env.isTestMode && !env.isVisualTestMode) {
    plugins.push(createPagePlugin(entries, env));
  }
  
  // Test mode plugins
  if (env.isTestMode || env.isVisualTestMode) {
    plugins.push(createTestPlugin(entries, env));
  }
  
  // Copy public directory to dist
  plugins.push(
    copy({
      targets: [
        { src: 'public/**/*', dest: 'dist/' }
      ],
      copyOnce: true
    })
  );
  
  // Development server and hot reload
  if (env.isDevelopment) {
    console.log(`Starting development server on port: ${env.port}`);
    plugins.push(
      serve({
        open: true,
        contentBase: ['dist'],
        port: env.port,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
        historyApiFallback: true,
      }),
      livereload({
        watch: 'dist',
        verbose: false,
        delay: 300,
      })
    );
  }
  
  return plugins;
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
