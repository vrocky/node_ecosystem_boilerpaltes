import path from 'path';

/**
 * Calculate relative path between two URL paths
 * @param {string} from - Source path 
 * @param {string} to - Destination path
 * @returns {string} Relative path
 */
export function getRelativePath(from, to) {
  // For root path, no need for relative paths
  if (from === '/') return to;
  
  // Calculate relative path using path module
  let relativePath = path.relative(from, to);
  
  // Ensure the path starts with "./" if it's not going up directories
  if (!relativePath.startsWith('.') && !relativePath.startsWith('/')) {
    relativePath = `./${relativePath}`;
  }
  
  // Replace backslashes with forward slashes for URLs in HTML
  return relativePath.replace(/\\/g, '/');
}
