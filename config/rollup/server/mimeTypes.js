/**
 * MIME type definitions for the server
 */

// MIME types for common file extensions
export const MIME_TYPES = {
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
  '.pdf': 'application/pdf',
  '.zip': 'application/zip',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
};

// Default to text/plain for unknown types
export const DEFAULT_MIME = 'text/plain';

/**
 * Get MIME type for a file based on extension
 * @param {string} filePath - Path to the file
 * @returns {string} MIME type
 */
export function getMimeType(filePath) {
  const ext = filePath.substring(filePath.lastIndexOf('.')).toLowerCase();
  return MIME_TYPES[ext] || DEFAULT_MIME;
}
