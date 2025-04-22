/**
 * Registry to track and manage server instances
 */
class ServerRegistry {
  constructor() {
    this.servers = new Map();
    this.setupCleanupHandlers();
  }
  
  /**
   * Set up cleanup handlers for process termination
   */
  setupCleanupHandlers() {
    // Clean up servers on process termination
    process.on('SIGINT', () => this.closeAll('SIGINT'));
    process.on('SIGTERM', () => this.closeAll('SIGTERM'));
    process.on('exit', () => this.closeAll('exit'));
    
    // Handle uncaught exceptions to prevent orphaned servers
    process.on('uncaughtException', (err) => {
      console.error('Uncaught exception:', err);
      this.closeAll('uncaughtException');
      process.exit(1);
    });
  }
  
  /**
   * Register a server instance
   * @param {string} id - Server ID
   * @param {Object} server - Server instance
   * @param {Object} metadata - Additional server metadata
   */
  register(id, server, metadata = {}) {
    this.servers.set(id, { server, metadata, startTime: Date.now() });
  }
  
  /**
   * Unregister a server instance
   * @param {string} id - Server ID
   * @returns {boolean} True if server was unregistered
   */
  unregister(id) {
    return this.servers.delete(id);
  }
  
  /**
   * Get a server instance
   * @param {string} id - Server ID
   * @returns {Object|undefined} Server instance or undefined if not found
   */
  get(id) {
    const entry = this.servers.get(id);
    return entry ? entry.server : undefined;
  }
  
  /**
   * Get all server instances
   * @returns {Array} Array of [id, server] pairs
   */
  getAll() {
    return Array.from(this.servers.entries());
  }
  
  /**
   * Close a specific server
   * @param {string} id - Server ID
   * @returns {Promise<void>}
   */
  async close(id) {
    const entry = this.servers.get(id);
    if (!entry) return;
    
    const { server, metadata } = entry;
    
    try {
      console.log(`Closing server: ${id} ${metadata.port ? `(port ${metadata.port})` : ''}`);
      
      // Use Promise to handle server closing
      await new Promise((resolve, reject) => {
        server.close((err) => {
          if (err) {
            console.error(`Error closing server ${id}:`, err.message);
            reject(err);
          } else {
            resolve();
          }
        });
        
        // Add timeout to force resolve if close hangs
        setTimeout(() => {
          console.warn(`Server ${id} close timed out, forcing cleanup`);
          resolve();
        }, 2000);
      });
    } catch (err) {
      console.error(`Error closing server ${id}:`, err.message);
    } finally {
      this.servers.delete(id);
    }
  }
  
  /**
   * Close all server instances
   * @param {string} signal - The signal that triggered the closure
   */
  async closeAll(signal) {
    if (this.servers.size === 0) return;
    
    console.log(`Cleaning up ${this.servers.size} active servers due to ${signal || 'manual cleanup'}`);
    
    // Close all servers in parallel
    const closePromises = Array.from(this.servers.keys()).map(id => this.close(id));
    
    try {
      await Promise.all(closePromises);
    } catch (err) {
      console.error('Error during server cleanup:', err);
    }
    
    this.servers.clear();
  }
}

// Export singleton instance
export const serverRegistry = new ServerRegistry();
