import { exec } from 'child_process';

/**
 * Open a URL in the browser
 * @param {string} url - URL to open
 * @param {Object} options - Browser options
 * @returns {Promise<void>}
 */
export function openBrowser(url, options = {}) {
  const { fallback = true } = options;
  
  return new Promise((resolve) => {
    // Determine the command based on platform
    const command = getOpenCommand();
    
    if (!command && !fallback) {
      console.log(`Could not determine browser open command for platform: ${process.platform}`);
      resolve();
      return;
    }
    
    // Execute the command
    console.log(`Opening browser: ${url}`);
    
    if (command) {
      exec(`${command} "${url}"`, (err) => {
        if (err) {
          console.warn(`Failed to open browser with command ${command}:`, err.message);
          if (fallback) {
            console.log('Trying alternative browser opening approach...');
            openWithFallback(url);
          }
        }
        resolve();
      });
    } else {
      openWithFallback(url);
      resolve();
    }
  });
}

/**
 * Get the open command based on the platform
 * @returns {string|null} Open command
 */
function getOpenCommand() {
  switch (process.platform) {
    case 'win32': return 'start';
    case 'darwin': return 'open';
    case 'linux': return detectLinuxOpenCommand();
    default: return null;
  }
}

/**
 * Detect the open command for Linux
 * @returns {string|null} Open command
 */
function detectLinuxOpenCommand() {
  // Common Linux browser openers in order of preference
  const commands = ['xdg-open', 'gnome-open', 'kde-open', 'exo-open'];
  
  for (const cmd of commands) {
    try {
      if (exec(`which ${cmd}`).toString().trim()) {
        return cmd;
      }
    } catch (e) {
      // Command not found, try next
    }
  }
  
  return 'xdg-open'; // Default to xdg-open even if not found
}

/**
 * Open URL using Node.js fallback method
 * @param {string} url - URL to open
 */
function openWithFallback(url) {
  console.log(`Please open this URL in your browser: ${url}`);
  // Could implement other fallbacks here if needed
}
