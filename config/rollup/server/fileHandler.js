import fs from 'fs';
import path from 'path';

/**
 * MIME types for common file extensions
 */
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
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.otf': 'font/otf',
  '.webp': 'image/webp',
};

// Default to text/plain for unknown types
const DEFAULT_MIME = 'text/plain';

/**
 * Serve a file with proper headers
 * @param {string} filePath - Path to the file
 * @param {Object} res - HTTP response object
 */
export function serveFile(filePath, res) {
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

/**
 * Handle file request with fallback options
 * @param {string} url - Requested URL
 * @param {Object} req - HTTP request object
 * @param {Object} res - HTTP response object
 * @param {Object} options - Handler options
 */
export function handleFileRequest(url, req, res, options) {
  const {
    contentBase = 'dist',
    historyApiFallback = true,
  } = options;
  
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
}
