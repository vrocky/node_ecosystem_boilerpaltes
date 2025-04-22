import path from 'path';
import fs from 'fs';
import { projectRoot } from '../../../vite.config.js';

/**
 * Create development middleware plugin
 * @param {Object} entries - Entry points
 * @param {Object} env - Environment settings
 * @returns {Object} Development middleware plugin
 */
export function createDevMiddlewarePlugin(entries, env) {
  // Only used in development mode
  if (!env.isDevelopment) {
    return {
      name: 'dev-middleware-plugin-noop'
    };
  }
  
  return {
    name: 'vite-dev-middleware-plugin',
    
    configureServer(server) {
      // Log all entries for debugging
      console.log('Available entries:', Object.keys(entries));
      
      // Generate HTML for entry pages
      return () => {
        server.middlewares.use((req, res, next) => {
          // Skip for existing files, assets, etc.
          if (req.url.match(/\.(js|jsx|ts|tsx|css|json|png|jpg|gif|svg|woff|woff2)$/) ||
              req.url.startsWith('/@') ||
              req.url.includes('__vite')) {
            return next();
          }
          
          console.log(`[DevMiddleware] Processing URL: ${req.url}`);
          
          // Handle root path or index page requests
          if (req.url === '/' || req.url === '/index.html') {
            // Use home entry
            if (entries.home) {
              const html = createHtmlForEntry('home', entries.home);
              res.setHeader('Content-Type', 'text/html');
              return res.end(html);
            }
          }

          // Get the requested page name from URL
          const pageName = req.url.replace(/^\//, '').split('/')[0] || 'home';
          
          // Direct entry match
          if (entries[pageName]) {
            // If this is a page request (not a resource/module request)
            if (!req.url.includes('.') || req.url.endsWith('.html')) {
              console.log(`[DevMiddleware] Serving HTML for entry: ${pageName}`);
              const html = createHtmlForEntry(pageName, entries[pageName]);
              res.setHeader('Content-Type', 'text/html');
              return res.end(html);
            }
          }
          
          // Default to home page if no match found
          console.log(`[DevMiddleware] No entry for ${pageName}, falling back to home`);
          const html = createHtmlForEntry('home', entries.home);
          res.setHeader('Content-Type', 'text/html');
          return res.end(html);
        });
      };
    }
  };
}

/**
 * Create HTML for an entry point
 * @param {string} entryName - Entry name
 * @param {string} entryPath - Path to entry file
 * @returns {string} HTML content
 */
function createHtmlForEntry(entryName, entryPath) {
  // Format the entry path correctly for Vite to resolve
  // Ensure the path has proper slashes and starts with /
  let entryModule = entryPath;
  
  // Remove './' prefix if present
  if (entryModule.startsWith('./')) {
    entryModule = entryModule.substring(2);
  }
  
  // Ensure the path starts with a slash for proper resolution
  if (!entryModule.startsWith('/')) {
    entryModule = '/' + entryModule;
  }
  
  // Log the resolved module path for debugging
  console.log(`[DevMiddleware] Using module path: ${entryModule} for entry: ${entryName}`);
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${entryName.charAt(0).toUpperCase() + entryName.slice(1)} | Dev Preview</title>
  <link rel="icon" type="image/png" href="/favicon.png">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }
    .dev-banner {
      position: fixed;
      bottom: 10px;
      right: 10px;
      background: rgba(0,0,0,0.6);
      color: white;
      padding: 5px 8px;
      border-radius: 4px;
      font-size: 12px;
      z-index: 9999;
    }
  </style>
</head>
<body>
  <div id="root"></div>
  <div class="dev-banner">Vite Dev</div>

  <script type="module">
    // Import the entry point module directly with proper path
    import '${entryModule}';
    
    // Import related SCSS if it exists (look for a matching SCSS file)
    const cssModule = '${entryModule.replace(/\.(tsx|ts|jsx|js)$/, '.scss')}';
    try {
      // Dynamic import is used to avoid errors if file doesn't exist
      import(cssModule).catch(e => {
        console.log('No SCSS file found for this entry');
      });
    } catch (e) {
      console.log('Error importing styles:', e);
    }
  </script>
</body>
</html>
  `;
}
