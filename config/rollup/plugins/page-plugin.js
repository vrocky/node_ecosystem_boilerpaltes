import path from 'path';
import fs from 'fs';
import { getRelativePath } from './utils.js';

/**
 * Create page plugin for MPA mode
 * @param {Object} entries - Entry points
 * @param {Object} env - Environment settings
 * @returns {Object} Page generator plugin
 */
export function createPagePlugin(entries, env) {
  return {
    name: 'generate-html-pages',
    writeBundle(outputOptions) {
      // Check if public/index.html exists
      if (!fs.existsSync('public/index.html')) {
        // Create public directory if it doesn't exist
        if (!fs.existsSync('public')) {
          fs.mkdirSync('public', { recursive: true });
        }
        
        // Create a basic index.html template
        const basicTemplate = createBasicHtmlTemplate();
        fs.writeFileSync('public/index.html', basicTemplate);
        console.log(`Created basic template at public/index.html`);
      }

      const templateHtml = fs.readFileSync('public/index.html', 'utf8');
      
      // Ensure dist directory exists
      if (!fs.existsSync('dist')) {
        fs.mkdirSync('dist', { recursive: true });
      }
      
      // Create HTML files for each page entry
      Object.keys(entries).forEach(pageName => {
        // Skip non-page entries
        if (pageName === 'index' && !entries[pageName].includes('src/pages/')) {
          return;
        }
        
        // Determine where this page's HTML file will be (root or subdir)
        const isRootPage = pageName === 'index' || pageName === 'home';
        const htmlFilePath = isRootPage ? 'index.html' : `${pageName}/index.html`;
        const htmlDir = path.dirname(path.join('dist', htmlFilePath));
        
        // Create nested directories if needed
        if (!fs.existsSync(htmlDir)) {
          fs.mkdirSync(htmlDir, { recursive: true });
        }
        
        // Calculate relative paths from this HTML file to assets
        const htmlFileDir = path.dirname(`/${htmlFilePath}`); // Convert to URL path
        const jsPath = getRelativePath(htmlFileDir, `/assets/js/${pageName}.js`);
        // Always use index.css for main CSS reference - bundle.css is just a redirect
        const cssPath = getRelativePath(htmlFileDir, `/assets/css/index.css`);
        const faviconPath = getRelativePath(htmlFileDir, '/favicon.png');
        const isolationPath = getRelativePath(htmlFileDir, '/isolation/');
        
        // Modify HTML template for this page
        let pageHtml = templateHtml
          // Update page title with capitalized page name
          .replace(/<title>.*?<\/title>/, `<title>${pageName.charAt(0).toUpperCase() + pageName.slice(1)} | React TypeScript App</title>`)
          // Update script src to point to this page's bundle with correct relative path - add type="module"
          .replace(/<script.*?src=".*?"><\/script>/, `<script type="module" src="${jsPath}"></script>`)
          // Update favicon path
          .replace(/href="favicon.png"/, `href="${faviconPath}"`);
        
        // Always add the CSS reference
        pageHtml = pageHtml.replace('</head>', `  <link rel="stylesheet" href="${cssPath}">\n</head>`);
        
        // Add component isolation link if components exist
        const isolationLinks = fs.existsSync('dist/isolation') ? 
          `<div style="position:fixed;bottom:10px;right:10px;z-index:1000;">
            <a href="${isolationPath}" style="background:#333;color:#fff;padding:5px 10px;text-decoration:none;border-radius:4px;font-size:12px;">
              View Components
            </a>
          </div>` : '';
        
        pageHtml = pageHtml.replace('</body>', `${isolationLinks}\n</body>`);
        
        // Write the HTML file
        fs.writeFileSync(path.join('dist', htmlFilePath), pageHtml);
        console.log(`Generated HTML file: ${htmlFilePath}`);
      });
    }
  };
}

/**
 * Create basic HTML template
 * @returns {string} HTML template
 */
function createBasicHtmlTemplate() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>React TypeScript App</title>
  <link rel="icon" type="image/png" href="favicon.png">
</head>
<body>
  <div id="root"></div>
  <script type="module" src="bundle.js"></script>
</body>
</html>`;
}
