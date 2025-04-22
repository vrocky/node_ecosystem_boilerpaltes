import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import livereload from 'rollup-plugin-livereload';
import child_process from 'child_process';
import net from 'net';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// MIME types for common file extensions
const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain',
  '.md': 'text/markdown',
};

// Default to text/plain for unknown types
const DEFAULT_MIME = 'text/plain';

/**
 * Check if a port is available
 * @param {number} port - Port to check
 * @returns {Promise<boolean>} True if available, false if in use
 */
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(false);
      } else {
        // For other errors, assume the port is available
        resolve(true);
      }
    });
    
    server.once('listening', () => {
      // Port is available, close the server
      server.close(() => {
        resolve(true);
      });
    });
    
    server.listen(port, '127.0.0.1');
  });
}

/**
 * Find an available port starting from basePort
 * @param {number} basePort - Starting port number
 * @param {number} maxAttempts - Maximum number of attempts
 * @returns {Promise<number>} Available port number
 */
async function findAvailablePort(basePort, maxAttempts = 10) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const port = basePort + attempt;
    const available = await isPortAvailable(port);
    
    if (available) {
      return port;
    }
    
    console.log(`Port ${port} is in use, trying next port...`);
  }
  
  // If all attempts fail, return a fallback port
  const fallbackPort = basePort + maxAttempts + Math.floor(Math.random() * 1000);
  console.warn(`Could not find an available port after ${maxAttempts} attempts. Using port ${fallbackPort}`);
  return fallbackPort;
}

/**
 * Track active servers to ensure proper cleanup
 */
const activeServers = new Set();

/**
 * Creates a custom server plugin
 * @param {Object} options - Server options
 * @returns {Object} Rollup plugin
 */
function createCustomServer(options = {}) {
  const {
    contentBase = 'dist',
    port = 3000,
    host = 'localhost',
    openBrowser = true,
    historyApiFallback = true,
  } = options;

  let server = null;
  let actualPort = port;

  return {
    name: 'custom-serve',
    
    async buildStart() {
      if (server) {
        // Server is already running
        return;
      }
      
      try {
        // Find an available port
        actualPort = await findAvailablePort(port);
        
        // Create HTTP server
        server = http.createServer((req, res) => {
          // Server request handling logic
          // ...existing code...
          
          // Handle direct file path lookups first
          let url = req.url.split('?')[0];
          url = decodeURIComponent(url);
          
          // Handle root URL
          if (url === '/') {
            url = '/index.html';
          }
          
          // Add trailing slash to directory requests if missing
          if (!path.extname(url) && !url.endsWith('/')) {
            url = `${url}/`;
          }
          
          // Construct local file path
          let filePath = path.join(process.cwd(), contentBase, url);
          
          // Remove trailing slash for file system operations
          if (filePath.endsWith('/')) {
            filePath = filePath.slice(0, -1);
          }
          
          // Handle special asset cases to avoid incorrect fallbacks
          if (url.startsWith('/assets/')) {
            // Special handling for JavaScript files
            if (url.startsWith('/assets/js/') && !fs.existsSync(filePath)) {
              // Try some common alternatives for JS files
              if (url.endsWith('/index.js')) {
                // For requests to index.js, check for home.js which is a common alternative
                const homeJsPath = path.join(process.cwd(), contentBase, url.replace('index.js', 'home.js'));
                if (fs.existsSync(homeJsPath)) {
                  console.log(`JS file resolved: ${url} -> home.js`);
                  serveFile(homeJsPath, res);
                  return;
                }
              }
              
              // If JavaScript asset doesn't exist, return 404 for JS specifically
              res.writeHead(404, { 'Content-Type': 'application/javascript' });
              res.end(`console.error("Not found: ${url}");`);
              console.error(`Asset not found: ${url}`);
              return;
            }
          }
          
          // Regular file handling
          fs.stat(filePath, (err, stats) => {
            if (!err && stats.isFile()) {
              // Direct file exists, serve it
              serveFile(filePath, res);
              return;
            }
            
            // Additional file lookup logic
            // ...rest of the existing request handling logic...
          });
        });
        
        // Track this server for cleanup
        activeServers.add(server);
        
        // Function to serve a file
        function serveFile(filePath, res) {
          // Determine MIME type based on file extension
          const ext = path.extname(filePath).toLowerCase();
          const contentType = MIME_TYPES[ext] || DEFAULT_MIME;
          
          // Add CORS and cache control headers
          const headers = {
            'Content-Type': contentType,
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'X-Requested-With, Content-Type, Accept',
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          };
          
          // Handle .js files to ensure proper MIME type for ES modules
          if (ext === '.js' || ext === '.mjs') {
            headers['Content-Type'] = 'application/javascript';
          }
          
          // Read and serve the file
          fs.readFile(filePath, (err, data) => {
            if (err) {
              res.writeHead(500, { 'Content-Type': 'text/html' });
              res.end(`500 Server Error: ${err.message}`);
              return;
            }
            
            res.writeHead(200, headers);
            res.end(data);
          });
        }
        
        // Handle server errors
        server.on('error', (err) => {
          console.error('Server error:', err);
          if (err.code === 'EADDRINUSE') {
            console.error(`Port ${actualPort} is already in use. Please try another port.`);
          }
        });
        
        // Start the server with error handling
        server.listen(actualPort, host, () => {
          console.log(`Server running at http://${host}:${actualPort}`);
          
          // Open browser if required
          if (openBrowser && process.env.NODE_ENV !== 'test') {
            const openCommand = process.platform === 'win32' ? 'start' : 
                              process.platform === 'darwin' ? 'open' : 'xdg-open';
            const url = `http://${host}:${actualPort}`;
            try {
              const { exec } = child_process;
              exec(`${openCommand} ${url}`);
            } catch (err) {
              console.error('Failed to open browser:', err);
            }
          }
        });
        
        // Set up cleanup handlers
        process.on('SIGINT', () => closeServer());
        process.on('SIGTERM', () => closeServer());
        process.on('exit', () => closeServer());
        
      } catch (error) {
        console.error('Error starting server:', error);
      }
    },
    
    buildEnd() {
      // Keep server running for watch mode
    },
    
    closeWatcher() {
      closeServer();
    },
    
    closeBundle() {
      // Close server on rebuild in non-watch mode
      if (process.env.ROLLUP_WATCH !== 'true') {
        closeServer();
      }
    }
  };
  
  function closeServer() {
    if (server) {
      console.log(`Closing server on port ${actualPort}`);
      server.close();
      activeServers.delete(server);
      server = null;
    }
  }
}

/**
 * Ensure all servers are properly closed on process exit
 */
function setupCleanupHandlers() {
  const cleanup = () => {
    if (activeServers.size > 0) {
      console.log(`Closing ${activeServers.size} active servers...`);
      for (const server of activeServers) {
        try {
          server.close();
        } catch (e) {
          // Ignore errors during cleanup
        }
      }
      activeServers.clear();
    }
  };
  
  // Set up cleanup handlers
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  process.on('exit', cleanup);
}

// Set up cleanup handlers when this module is loaded
setupCleanupHandlers();

/**
 * Creates development server plugins
 * @param {Object} env - Environment settings
 * @returns {Array} Array of server plugins
 */
export function createDevServer(env) {
  if (!env.isDevelopment) return [];
  
  const plugins = [];
  
  // Add custom server plugin
  console.log(`Starting development server on port: ${env.port}`);
  plugins.push(
    createCustomServer({
      port: env.port,
      contentBase: 'dist',
      openBrowser: true,
      historyApiFallback: true
    })
  );
  
  // Add live reload if available
  if (typeof livereload === 'function') {
    plugins.push(
      livereload({
        watch: 'dist',
        verbose: false,
        delay: 300,
      })
    );
  } else {
    console.warn('Live reload plugin not available');
  }
  
  return plugins;
}
