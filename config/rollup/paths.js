import { fileURLToPath } from 'url';
import path from 'path';

// Handle paths in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const projectRoot = path.resolve(__dirname, '../..');

/**
 * Resolve paths relative to project root
 * @param {string} dir - Directory path
 * @returns {string} Absolute path
 */
export function resolveRoot(dir) {
  return path.resolve(projectRoot, dir);
}
