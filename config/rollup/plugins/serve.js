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
 * Improved port availability check using async/await
 * @param {number} port - Port to check
 * @returns {Promise<boolean>} True if available, false if in use
 */
async function isPortAvailable(port) {
  return new Promise((resolve) => {
    const tester = net.createServer()
      .once('error', err => {
        tester.removeAllListeners();
        resolve(false);
      })
      .once('listening', () => {
        tester.close(() => resolve(true));
      })
      .listen(port, '127.0.0.1');
      
    // Add timeout to prevent hanging
    setTimeout(() => {
      try {
        tester.removeAllListeners();
        tester.close(() => resolve(false));
      } catch (e) {
        // Ignore errors during cleanup
        resolve(false);
      }
    }, 1000);
  });
}

/**
 * Enhanced function to find an available port with better retry logic
 * @param {number} basePort - Starting port number
 * @param {number} maxAttempts - Maximum number of attempts
 * @returns {Promise<number>} Available port number
 */
async function findAvailablePort(basePort, maxAttempts = 20) {
  console.log(`Looking for available port starting from ${basePort}...`);
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const port = basePort + attempt;
    
    try {
      const available = await isPortAvailable(port);
      
      if (available) {
        if (attempt > 0) {
          console.log(`Port ${basePort} was in use, using port ${port} instead.`);
        } else {
          console.log(`Port ${port} is available.`);
        }
        return port;
      }
      
      if (attempt === 0) {
        console.log(`Port ${port} is already in use, trying alternative ports...`);
      }
    } catch (err) {
      console.error(`Error checking port ${port}:`, err.message);
      // Continue to next port on error
    }
  }
  
  // If all attempts fail, use a random port in a higher range
  const fallbackPort = basePort + 1000 + Math.floor(Math.random() * 1000);
  console.log(`Could not find an available port after ${maxAttempts} attempts. Using random port ${fallbackPort}`);
  return fallbackPort;
}

/**
 * Robust server tracking registry for proper cleanup
 */
const serverRegistry = {
  servers: new Map(),
  
  register(id, server) {
    this.servers.set(id, server);
  },
  
  unregister(id) {
    this.servers.delete(id);
  },
  
  closeAll() {
    console.log(`Cleaning up ${this.servers.size} active servers...`);
    for (const [id, server] of this.servers.entries()) {
      try {
        console.log(`Closing server: ${id}`);
        server.close();
      } catch (err) {
        console.error(`Error closing server ${id}:`, err.message);
      }
      this.servers.delete(id);
    }
  }
};

// Set up global cleanup
process.on('SIGINT', () => serverRegistry.closeAll());
process.on('SIGTERM', () => serverRegistry.closeAll());
process.on('exit', () => serverRegistry.closeAll());

/**
 * Creates a custom server plugin with enhanced port handling
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
  let serverStarted = false;
  const serverId = `server-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  
  // We'll need to store the plugin instance for proper retries
  let pluginInstance = null;

  // Create the rollup plugin
  const plugin = {
    name: 'custom-serve',
    
    async buildStart() {
      // Store plugin instance for retries
      pluginInstance = this;
      
      if (server) {
        // Server is already running
        return;
      }
      
      try {
        await startServer(this);
      } catch (error) {
        console.error('Error in buildStart server initialization:', error);
      }
    },
    
    buildEnd() {
      // Keep server running for watch mode
    },
    
    generateBundle() {
      // Verify server is still running as expected
      if (!serverStarted && !server) {
        console.log('Server not started yet. Attempting to start...');
        startServer(pluginInstance).catch(err => {
          console.error('Failed to start server during generateBundle:', err);
        });
      }
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
  
  /**
   * Start the development server
   * @param {Object} context - Plugin context
   * @returns {Promise<void>}
   */
  async function startServer(context) {
    if (serverStarted) {
      return;
    }
    
    try {
      // Find an available port with improved algorithm
      actualPort = await findAvailablePort(port);
      
      // Create HTTP server
      server = http.createServer((req, res) => {
        // Server request handling logic
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
          
          // Check for index.html in directories
          if (!err && stats.isDirectory()) {
            const indexPath = path.join(filePath, 'index.html');
            fs.stat(indexPath, (indexErr, indexStats) => {
              if (!indexErr && indexStats.isFile()) {
                serveFile(indexPath, res);
                return;
              }
              
              // Directory without index.html
              res.writeHead(404, { 'Content-Type': 'text/html' });
              res.end(`<h1>Directory listing not supported</h1><p>No index.html in ${url}</p>`);
            });
            return;
          }
          
          // Handle History API fallback for SPA
          if (historyApiFallback && req.method === 'GET') {
            const indexPath = path.join(process.cwd(), contentBase, 'index.html');
            fs.stat(indexPath, (indexErr, indexStats) => {
              if (!indexErr && indexStats.isFile()) {
                // Serve index.html for SPA routes
                serveFile(indexPath, res);
                return;
              }
              
              // No index.html exists
              res.writeHead(404, { 'Content-Type': 'text/html' });
              res.end(`<h1>404 Not Found</h1><p>The requested URL ${url} was not found.</p>`);
            });
            return;
          }
          
          // Not found
          res.writeHead(404, { 'Content-Type': 'text/html' });
          res.end(`<h1>404 Not Found</h1><p>The requested URL ${url} was not found.</p>`);
        });
      });
      
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
            res.end(`<h1>500 Server Error</h1><p>${err.message}</p>`);
            return;
          }
          
          res.writeHead(200, headers);
          res.end(data);
        });
      }
      
      // Register this server for clean shutdown
      serverRegistry.register(serverId, server);
      
      // Set up error handler for port conflicts - this happens before server starts
      server.on('error', async (err) => {
        console.error('Server error:', err);
        
        // Report port conflict clearly
        if (err.code === 'EADDRINUSE') {
          console.error(`Port ${actualPort} is already in use. Trying another port...`);
          
          // Cleanup this server attempt
          serverRegistry.unregister(serverId);
          server = null;
          serverStarted = false;
          
          // Find another port with a higher offset
          try {
            const nextPort = actualPort + 1;
            actualPort = await findAvailablePort(nextPort);
            
            // Create a new server instance with the new port
            // Re-invoke the startServer function with a small delay
            setTimeout(() => {
              startServer(context).catch(retryErr => {
                console.error('Error during server retry:', retryErr);
              });
            }, 100);
          } catch (portErr) {
            console.error('Failed to find an available port:', portErr);
          }
        }
      });
      
      // Start server with a proper promise and timeout
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error(`Server startup timed out after 5 seconds on port ${actualPort}`));
        }, 5000);
        
        try {
          server.listen(actualPort, host, () => {
            clearTimeout(timeout);
            serverStarted = true;
            console.log(`✅ Server running at http://${host}:${actualPort}`);
            
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
            
            resolve();
          });
        } catch (listenError) {
          clearTimeout(timeout);
          reject(listenError);
        }
      });
      
    } catch (error) {
      console.error('Error starting server:', error);
      
      // Clean up on error
      if (server) {
        serverRegistry.unregister(serverId);
        server = null;
        serverStarted = false;
      }
      
      // If we failed because of a port issue, try again with a random port
      if (error.code === 'EADDRINUSE') {
        const randomPort = Math.floor(3000 + Math.random() * 2000);
        console.log(`Attempting to restart with random port ${randomPort}`);
        actualPort = randomPort;
        setTimeout(() => {
          startServer(context).catch(err => {
            console.error('Failed final server restart attempt:', err);
          });
        }, 500);
      }
    }
  }
  
  function closeServer() {
    if (server) {
      console.log(`Closing server on port ${actualPort}`);
      try {
        server.close();
      } catch (err) {
        console.error(`Error closing server: ${err.message}`);
      }
      serverRegistry.unregister(serverId);
      server = null;
      serverStarted = false;
    }
  }

  return plugin;
}

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
