import { defineConfig } from 'vite';
import { fileURLToPath } from 'url';
import path from 'path';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import { globSync } from 'glob';

// Handle paths in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const projectRoot = __dirname;

// Simple environment settings
const isDevelopment = process.env.NODE_ENV === 'development';
const isIsolationMode = process.env.ISOLATION_MODE === 'true';
const isTestMode = process.env.TEST_MODE === 'true';
const isVisualTestMode = process.env.VISUAL_TEST_MODE === 'true';

// Simple function to find entries
function findEntries() {
  // Default entry for standard mode
  const entries = {
    home: './src/index.tsx'
  };
  
  // Add isolation entries if needed
  if (isIsolationMode) {
    const isolationComponents = findIsolationComponents();
    isolationComponents.forEach(component => {
      entries[`isolation-${component.name.toLowerCase()}`] = component.path;
    });
  }
  
  console.log('Using entries:', Object.keys(entries));
  return entries;
}

// Find isolation components
function findIsolationComponents() {
  return globSync('src/**/*.isolation.tsx').map(file => {
    const componentName = path.basename(file, '.isolation.tsx');
    return { name: componentName, path: file };
  });
}

// Simple isolation API plugin
const isolationApiPlugin = {
  name: 'isolation-api',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      // API endpoint to get all isolation components
      if (req.url === '/api/isolation-components') {
        const components = findIsolationComponents();
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(components));
        return;
      }
      
      // Handle isolation routes with the custom template
      if (req.url === '/isolation/' || req.url === '/isolation' || req.url.startsWith('/isolation/')) {
        const templatePath = path.join(__dirname, 'templates', 'isolation.vite.html');
        
        // Check if the template exists
        if (fs.existsSync(templatePath)) {
          const html = fs.readFileSync(templatePath, 'utf-8');
          res.setHeader('Content-Type', 'text/html');
          return res.end(html);
        }
      }
      
      next();
    });
  }
};

// Generate the Vite configuration
export default defineConfig({
  root: __dirname,
  base: '/',
  
  // Configure plugins
  plugins: [
    // Add isolation API plugin first
    isolationApiPlugin,
    
    // React plugin
    react({
      fastRefresh: isDevelopment
    })
  ],
  
  // Development server
  server: {
    port: process.env.PORT || 5173,
    open: true
  },
  
  // Resolve aliases
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@components': path.resolve(__dirname, 'src/components')
    }
  },
  
  // Build configuration - keep compatibility with Rollup config
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: isDevelopment,
    rollupOptions: {
      input: findEntries(),
      output: {
        entryFileNames: 'assets/js/[name].js',
        chunkFileNames: 'assets/js/chunks/[name]-[hash].js',
        assetFileNames: ({ name }) => {
          if (/\.(css)$/.test(name ?? '')) {
            return 'assets/css/[name][extname]';
          }
          if (/\.(png|jpe?g|gif|svg|webp|ico)$/.test(name ?? '')) {
            return 'assets/images/[name][extname]';
          }
          if (/\.(woff2?|eot|ttf|otf)$/.test(name ?? '')) {
            return 'assets/fonts/[name][extname]';
          }
          return 'assets/[name][extname]';
        }
      }
    }
  }
});
