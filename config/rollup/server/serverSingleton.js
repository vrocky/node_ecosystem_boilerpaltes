import http from 'http';
import { findAvailablePort } from './portFinder.js';
import { handleFileRequest } from './fileHandler.js';

/**
 * Global singleton to manage the dev server instance
 */
class ServerSingleton {
  constructor() {
    this.server = null;
    this.port = null;
    this.host = null;
    this.isServerStarting = false;
    this.serverOptions = null;
    this.serverStartTime = null;
    this.setupCleanupHandlers();
    
    // Generate a unique id for this server instance
    this.id = `server-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    // Track callbacks for when server is ready
    this.readyCallbacks = [];
  }
  
  /**
   * Set up cleanup handlers for process termination
   */
  setupCleanupHandlers() {
    // Clean up server on process termination
    process.on('SIGINT', () => this.closeServer('SIGINT'));
    process.on('SIGTERM', () => this.closeServer('SIGTERM'));
    process.on('exit', () => this.closeServer('exit'));
    
    // Handle uncaught exceptions to prevent orphaned servers
    process.on('uncaughtException', (err) => {
      console.error('Uncaught exception:', err);
      this.closeServer('uncaughtException');
    });
  }
  
  /**
   * Start the server
   * @param {Object} options - Server options
   * @returns {Promise<Object>} Server info
   */
  async startServer(options) {
    const {
      port = 3000,
      host = 'localhost',
      contentBase = 'dist',
      historyApiFallback = true,
    } = options;
    
    // If server is already running, return current server info
    if (this.server) {
      console.log(`Server already running at http://${this.host}:${this.port}`);
      return {
        port: this.port,
        host: this.host,
        url: `http://${this.host}:${this.port}`,
        server: this.server
      };
    }
    
    // If server is in process of starting, wait for it
    if (this.isServerStarting) {
      console.log('Server is already starting, waiting...');
      return new Promise((resolve) => {
        this.readyCallbacks.push(() => {
          resolve({
            port: this.port,
            host: this.host,
            url: `http://${this.host}:${this.port}`,
            server: this.server
          });
        });
      });
    }
    
    // Set flag to prevent duplicate starts
    this.isServerStarting = true;
    this.serverOptions = { ...options };
    
    try {
      // Find available port
      this.port = await findAvailablePort(port);
      this.host = host;
      this.serverStartTime = Date.now();
      
      // Create server instance
      this.server = http.createServer((req, res) => {
        // Extract URL from request
        let url = req.url.split('?')[0];
        url = decodeURIComponent(url);
        
        // Handle root URL
        if (url === '/') {
          url = '/index.html';
        }
        
        // Add trailing slash to directory requests if missing
        if (!url.includes('.') && !url.endsWith('/')) {
          url = `${url}/`;
        }
        
        // Handle the file request
        handleFileRequest(url, req, res, { contentBase, historyApiFallback });
      });
      
      // Start server
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error(`Server startup timed out after 5 seconds on port ${this.port}`));
        }, 5000);
        
        this.server.on('error', (err) => {
          clearTimeout(timeout);
          this.isServerStarting = false;
          reject(err);
        });
        
        this.server.listen(this.port, this.host, () => {
          clearTimeout(timeout);
          resolve();
        });
      });
      
      console.log(`✅ Server running at http://${this.host}:${this.port}`);
      console.log(`🌐 To view your app, manually open the URL in your browser`);
      
      // Server is now ready
      this.isServerStarting = false;
      
      // Notify all waiting callbacks
      this.readyCallbacks.forEach(callback => callback());
      this.readyCallbacks = [];
      
      return {
        port: this.port,
        host: this.host,
        url: `http://${this.host}:${this.port}`,
        server: this.server
      };
    } catch (err) {
      this.isServerStarting = false;
      console.error('Error starting dev server:', err);
      throw err;
    }
  }
  
  /**
   * Close the server
   * @param {string} reason - Reason for closing
   */
  closeServer(reason = 'manual') {
    if (this.server) {
      console.log(`Closing server on port ${this.port} (${reason})`);
      try {
        this.server.close();
      } catch (err) {
        console.error(`Error closing server: ${err.message}`);
      }
      
      this.server = null;
      this.port = null;
      this.host = null;
      this.isServerStarting = false;
      this.readyCallbacks = [];
    }
  }
  
  /**
   * Restart the server
   * @returns {Promise<Object>} Server info
   */
  async restartServer() {
    if (!this.serverOptions) {
      throw new Error('Cannot restart server: No server options available');
    }
    
    this.closeServer('restart');
    return this.startServer(this.serverOptions);
  }
  
  /**
   * Get current server info
   * @returns {Object|null} Server info
   */
  getServerInfo() {
    if (!this.server) return null;
    
    return {
      port: this.port,
      host: this.host,
      url: `http://${this.host}:${this.port}`,
      uptime: this.serverStartTime ? (Date.now() - this.serverStartTime) : 0,
      id: this.id
    };
  }
}

// Export a singleton instance
export const serverSingleton = new ServerSingleton();
