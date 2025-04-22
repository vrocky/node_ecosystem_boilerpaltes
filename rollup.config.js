import path from 'path';
import { projectRoot } from './config/rollup/paths.js';
import { createPlugins } from './config/rollup/plugins.js';
import { findEntryPoints } from './config/rollup/entries.js';
import { getEnvironmentSettings } from './config/rollup/environment.js';

// Get environment settings
const env = getEnvironmentSettings();

// Configuration creator function
const createConfig = () => {
  // Find entry points
  let entries = findEntryPoints(env);
  
  // Get plugins
  const plugins = createPlugins(entries, env);
  
  return {
    input: entries,
    output: {
      dir: 'dist',
      format: 'es',
      sourcemap: env.isDevelopment,
      entryFileNames: 'assets/js/[name].js',
      chunkFileNames: 'assets/js/chunks/[name].js',
      assetFileNames: (assetInfo) => {
        const extType = path.extname(assetInfo.name).substring(1);
        if (extType === 'css') {
          return 'assets/css/[name][extname]';
        }
        return 'assets/[ext]/[name][extname]';
      },
      manualChunks: (!env.isTestMode && !env.isVisualTestMode && !env.isIsolationMode) ? {
        'react-vendor': ['react', 'react-dom'],
      } : undefined
    },
    plugins,
    external: [],
    treeshake: !env.isDevelopment,
    watch: env.isDevelopment ? {
      clearScreen: false,
      include: 'src/**'
    } : undefined
  };
};

export default createConfig();