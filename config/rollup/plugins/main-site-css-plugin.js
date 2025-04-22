import path from 'path';
import fs from 'fs';
import * as sass from 'sass';
import { projectRoot } from '../../../rollup.config.js';

/**
 * Plugin to ensure main site CSS is generated
 * @param {Object} env - Environment settings
 * @returns {Object} Main site CSS plugin or null if not applicable
 */
export function ensureMainSiteCssPlugin(env) {
  if (env.isTestMode || env.isVisualTestMode || env.isIsolationMode) return null;
  
  return {
    name: 'ensure-main-site-css',
    writeBundle() {
      try {
        // Only process in normal (non-isolation, non-test) mode
        const appScssPath = path.resolve(projectRoot, 'src/App.scss');
        if (fs.existsSync(appScssPath)) {
          // Create CSS directory if it doesn't exist
          const cssDir = path.join('dist', 'assets', 'css');
          if (!fs.existsSync(cssDir)) {
            fs.mkdirSync(cssDir, { recursive: true });
          }
          
          // Read SCSS content
          const scssContent = fs.readFileSync(appScssPath, 'utf8');
          
          // Process App.scss separately for main site
          console.log('Generating CSS for main site from App.scss');
          const result = sass.compileString(scssContent, {
            style: env.isDevelopment ? 'expanded' : 'compressed',
            sourceMap: env.isDevelopment,
            sourceMapIncludeSources: true,
            syntax: 'scss',
          });
          
          // Generate CSS content with sourcemap if needed
          let cssContent = result.css;
          if (env.isDevelopment) {
            cssContent += '\n/*# sourceMappingURL=index.css.map */';
          }
          
          // Write to index.css in assets/css directory
          const cssPath = path.join('dist', 'assets', 'css', 'index.css');
          fs.writeFileSync(cssPath, cssContent);
          console.log(`Generated main site CSS: ${cssPath}`);
          
          // Create symbolic link from bundle.css to index.css to maintain backwards compatibility
          // without duplicating the file (using fs.symlink is problematic on some systems)
          const bundleCssPath = path.join('dist', 'bundle.css');
          
          // Create a redirect file that imports the actual CSS
          const redirectContent = `@import "./assets/css/index.css";`;
          fs.writeFileSync(bundleCssPath, redirectContent);
          console.log(`Created bundle.css redirect to index.css for backwards compatibility`);
          
          // Write source map
          if (env.isDevelopment) {
            const mapContent = JSON.stringify({
              version: 3,
              file: 'index.css',
              sources: ['App.scss'],
              sourcesContent: [scssContent],
              names: [],
              mappings: result.sourceMap ? result.sourceMap.mappings : '',
              sourceRoot: ''
            });
            
            // Write source map
            fs.writeFileSync(path.join('dist', 'assets', 'css', 'index.css.map'), mapContent);
            console.log(`Generated main site CSS source map`);
          }
        }
      } catch (err) {
        console.error('Error generating main site CSS:', err);
      }
    }
  };
}
