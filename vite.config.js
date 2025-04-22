import { defineConfig } from 'vite';
import { fileURLToPath } from 'url';
import path from 'path';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import { glob } from 'glob';

// Handle paths in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple environment settings
const isDevelopment = process.env.NODE_ENV === 'development';
const isIsolationMode = process.env.ISOLATION_MODE === 'true';

// Extract component name from file path
function extractComponentName(filePath) {
  try {
    const parts = filePath.split('/');
    
    // For file paths like: src/components/Button/button.isolation.vite.html
    // We want to get "Button"
    if (parts.length >= 3) {
      // Get the component directory name (usually the parent directory of the file)
      const componentDirName = parts[parts.length - 2];
      
      if (componentDirName && typeof componentDirName === 'string') {
        // Convert first letter to uppercase to ensure proper casing
        return {
          name: componentDirName.toLowerCase(),
          displayName: componentDirName.charAt(0).toUpperCase() + componentDirName.slice(1).toLowerCase()
        };
      }
    }
    
    // Fallback: try to extract from the filename itself
    const filename = parts[parts.length - 1];
    if (filename) {
      const match = filename.match(/^([^.]+)/);
      if (match && match[1]) {
        const name = match[1].toLowerCase();
        return {
          name,
          displayName: name.charAt(0).toUpperCase() + name.slice(1)
        };
      }
    }
    
    // If all else fails, use a generic name with the full path for debugging
    console.warn(`Could not extract component name from path: ${filePath}`);
    return {
      name: `component-${parts.length}`,
      displayName: `Unknown Component (${filePath})`,
      invalidPath: true
    };
  } catch (error) {
    console.error(`Error extracting component name from ${filePath}:`, error);
    return {
      name: 'error-component',
      displayName: 'Error Component',
      invalidPath: true
    };
  }
}

// Function to generate component catalog JSON
function generateComponentCatalog() {
  try {
    console.log('Generating component catalog...');
    // Create an empty catalog with default structure
    const catalog = {
      components: [],
      generatedAt: new Date().toISOString(),
      totalCount: 0
    };
    
    // Find all isolation HTML files
    let isolationHtmlFiles = [];
    try {
      isolationHtmlFiles = glob.sync('src/components/**/*.isolation.vite.html', { cwd: __dirname });
      console.log(`Found ${isolationHtmlFiles.length} isolation HTML files`);
    } catch (error) {
      console.error('Error finding HTML files:', error);
    }
    
    // Find all isolation TSX files
    let isolationTsxFiles = [];
    try {
      isolationTsxFiles = glob.sync('src/components/**/*.isolation.tsx', { cwd: __dirname });
      console.log(`Found ${isolationTsxFiles.length} isolation TSX files`);
    } catch (error) {
      console.error('Error finding TSX files:', error);
    }
    
    // Process HTML files
    isolationHtmlFiles.forEach(file => {
      try {
        const { name, displayName } = extractComponentName(file);
        
        catalog.components.push({
          name,
          displayName,
          htmlPath: `/${file}`,
          type: 'html'
        });
      } catch (error) {
        console.error(`Error processing HTML file ${file}:`, error);
      }
    });
    
    // Process TSX files that don't have corresponding HTML
    isolationTsxFiles.forEach(file => {
      try {
        const { name, displayName } = extractComponentName(file);
        
        // Check if we already have this component from HTML
        const exists = catalog.components.some(c => 
          c.name.toLowerCase() === name.toLowerCase());
        
        if (!exists) {
          catalog.components.push({
            name,
            displayName,
            tsxPath: `/${file}`,
            type: 'tsx'
          });
        }
      } catch (error) {
        console.error(`Error processing TSX file ${file}:`, error);
      }
    });
    
    // Set the total count
    catalog.totalCount = catalog.components.length;
    
    // If no components were found, add a sample Button component
    if (catalog.components.length === 0) {
      catalog.components.push({
        name: 'button',
        displayName: 'Button',
        htmlPath: '/src/components/Button/button.isolation.vite.html',
        type: 'html'
      });
      catalog.totalCount = 1;
      catalog._note = "No components found, added sample button component as fallback";
    }
    
    console.log(`Generated catalog with ${catalog.totalCount} components`);
    
    // Write to a JSON file directly in the root directory for development
    const catalogPath = path.join(__dirname, 'component-catalog.json');
    fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2));
    
    // Also copy to public directory for production builds
    const publicDir = path.join(__dirname, 'public');
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }
    const publicCatalogPath = path.join(publicDir, 'component-catalog.json');
    fs.writeFileSync(publicCatalogPath, JSON.stringify(catalog, null, 2));
    
    return catalog;
  } catch (error) {
    console.error('Error generating component catalog:', error);
    // Return a minimal valid catalog with the error
    return { 
      components: [{
        name: 'button',
        displayName: 'Button',
        htmlPath: '/src/components/Button/button.isolation.vite.html',
        type: 'html'
      }],
      generatedAt: new Date().toISOString(),
      totalCount: 1,
      error: error.message
    };
  }
}

// Component isolation plugin with improved API support
const componentIsolationPlugin = {
  name: 'component-isolation-plugin',
  
  configureServer(server) {
    // Generate the catalog when the server starts
    generateComponentCatalog();
    console.log('Generated component catalog file');
    
    // Set up a file watcher to regenerate the catalog when component files change
    if (isDevelopment) {
      const watcher = server.watcher;
      watcher.add(path.join(__dirname, 'src', 'components', '**', '*.isolation.*'));
      
      watcher.on('add', (path) => {
        if (path.includes('.isolation.')) {
          console.log('Component file added, regenerating catalog...');
          generateComponentCatalog();
        }
      });
      
      watcher.on('unlink', (path) => {
        if (path.includes('.isolation.')) {
          console.log('Component file removed, regenerating catalog...');
          generateComponentCatalog();
        }
      });
    }
    
    server.middlewares.use((req, res, next) => {
      // Directly serve component-catalog.json from root for simplicity during development
      if (req.url === '/component-catalog.json') {
        const catalogPath = path.join(__dirname, 'component-catalog.json');
        
        if (fs.existsSync(catalogPath)) {
          const json = fs.readFileSync(catalogPath, 'utf-8');
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          return res.end(json);
        } else {
          // Generate on demand if not exists
          const catalog = generateComponentCatalog();
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          return res.end(JSON.stringify(catalog));
        }
      }
      
      // Serve isolation catalog for /isolation path
      if (req.url === '/isolation' || req.url === '/isolation/') {
        const catalogPath = path.join(__dirname, 'isolation-catalog.html');
        
        if (fs.existsSync(catalogPath)) {
          const html = fs.readFileSync(catalogPath, 'utf-8');
          res.setHeader('Content-Type', 'text/html');
          return res.end(html);
        }
      }
      
      // Serve button isolation page for backward compatibility
      if (req.url === '/button-isolation' || req.url === '/button-isolation/') {
        const templatePath = path.join(__dirname, 'templates', 'button.isolation.vite.html');
        
        if (fs.existsSync(templatePath)) {
          const html = fs.readFileSync(templatePath, 'utf-8');
          res.setHeader('Content-Type', 'text/html');
          return res.end(html);
        }
      }
      
      next();
    });
  },
  
  buildStart() {
    console.log('Generating component catalog for build...');
    generateComponentCatalog();
  }
};

// Generate the Vite configuration
export default defineConfig({
  root: __dirname,
  base: '/',
  
  // Configure plugins - keep it simple
  plugins: [
    // Component isolation plugin
    componentIsolationPlugin,
    
    // React plugin with automatic JSX runtime
    react()
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
  
  // Build configuration
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: isDevelopment
  },
  
  // Optimize dependencies for React
  optimizeDeps: {
    include: ['react', 'react-dom']
  }
});
