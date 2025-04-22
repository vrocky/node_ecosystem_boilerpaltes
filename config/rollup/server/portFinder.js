import net from 'net';

/**
 * Check if a specific port is available
 * @param {number} port - Port to check
 * @returns {Promise<boolean>} True if available, false if in use
 */
export async function isPortAvailable(port) {
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
 * Find an available port using sequential search
 * @param {number} preferredPort - Preferred port to start with
 * @returns {Promise<number>} Available port
 */
export async function findAvailablePort(preferredPort) {
  console.log(`Looking for available port starting from ${preferredPort}...`);
  
  // Try preferred port first
  if (await isPortAvailable(preferredPort)) {
    console.log(`✓ Preferred port ${preferredPort} is available`);
    return preferredPort;
  }
  
  console.log(`✗ Preferred port ${preferredPort} is in use`);
  
  // Try sequential ports
  for (let i = 1; i <= 100; i++) {
    const port = preferredPort + i;
    
    if (await isPortAvailable(port)) {
      console.log(`✓ Found available port ${port}`);
      return port;
    }
  }
  
  // Last resort: choose a random high port
  const randomPort = Math.floor(10000 + Math.random() * 30000);
  console.log(`⚠ Could not find an available port in the preferred range. Using random port ${randomPort}`);
  return randomPort;
}
