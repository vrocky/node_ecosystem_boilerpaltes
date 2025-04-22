import path from 'path';
import fs from 'fs';
import { getRelativePath } from './utils.js';

/**
 * Helper function to check if a page is a root page
 * @param {string} pageName - Name of the page
 * @returns {boolean} True if it's a root page
 */
function isRootPage(pageName) {
  return pageName === 'index' || pageName === 'home';
}

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
      // Create template directory if needed
      if (!fs.existsSync('templates')) {
        fs.mkdirSync('templates', { recursive: true });
      }
      
      // Define the common base template for both dev and production
      const templatePath = 'templates/page.html';
      
      // Check if the template exists, if not create it
      if (!fs.existsSync(templatePath)) {
        const basicTemplate = createBaseHtmlTemplate();
        fs.writeFileSync(templatePath, basicTemplate);
        console.log(`Created base template at ${templatePath}`);
        
        // Also create this in public folder for backwards compatibility
        if (!fs.existsSync('public')) {
          fs.mkdirSync('public', { recursive: true });
        }
        
        if (!fs.existsSync('public/index.html')) {
          fs.writeFileSync('public/index.html', basicTemplate);
          console.log(`Created backup template at public/index.html`);
        }
      }

      // ALWAYS read from the same template file
      const templateHtml = fs.readFileSync(templatePath, 'utf8');
      console.log(`Using page template from ${templatePath}`);
      
      // Ensure dist directory exists
      if (!fs.existsSync('dist')) {
        fs.mkdirSync('dist', { recursive: true });
      }
      
      // Create HTML files for each page entry - regardless of isolation mode
      Object.keys(entries).forEach(pageName => {
        // Skip non-page entries (e.g., components in isolation mode)
        // But ALWAYS process 'index' or 'home' entries
        if (!isRootPage(pageName) && !entries[pageName].includes('src/pages/')) {
          return;
        }
        
        // Determine where this page's HTML file will be (root or subdir)
        const isRoot = isRootPage(pageName); // Changed variable name to avoid conflict
        const htmlFilePath = isRoot ? 'index.html' : `${pageName}/index.html`;
        const htmlDir = path.dirname(path.join('dist', htmlFilePath));
        
        // Create nested directories if needed
        if (!fs.existsSync(htmlDir)) {
          fs.mkdirSync(htmlDir, { recursive: true });
        }
        
        // CONSISTENT APPROACH: Always check for both home.js and index.js
        // and prioritize home.js if it exists or will exist
        let jsFileName = pageName;
        if (isRootPage(pageName)) {
          // Check both possible file paths
          const homeJsPath = path.join('dist', 'assets', 'js', 'home.js');
          const indexJsPath = path.join('dist', 'assets', 'js', 'index.js');
          
          // Prioritize home.js if it exists or will exist
          if (fs.existsSync(homeJsPath) || entries['home']) {
            jsFileName = 'home';
          }
        }
        
        // CONSISTENT PATHS: Always use absolute paths
        const jsPath = `/assets/js/${jsFileName}.js`;
        const cssPath = `/assets/css/index.css`;
        const faviconPath = `/favicon.png`;
        const isolationPath = `/isolation/`;
        
        // CONSISTENT MODIFICATIONS: Use the same logic for all builds
        let pageHtml = templateHtml
          // Update page title with capitalized page name
          .replace(/<title>.*?<\/title>/, `<title>${pageName.charAt(0).toUpperCase() + pageName.slice(1)} | React TypeScript App</title>`)
          // Update script src with CONSISTENT pattern
          .replace(/src=["'].*?["']/, `src="${jsPath}"`)
          // Update favicon path
          .replace(/href=["']favicon\.png["']/, `href="${faviconPath}"`)
          // Ensure CSS link is present
          .replace(/<\/head>/, `  <link rel="stylesheet" href="${cssPath}">\n</head>`);
        
        // ALWAYS add isolation link regardless of mode
        const isolationLinks = `<div style="position:fixed;bottom:10px;right:10px;z-index:1000;">
            <a href="${isolationPath}" style="background:#333;color:#fff;padding:5px 10px;text-decoration:none;border-radius:4px;font-size:12px;">
              View Components
            </a>
          </div>`;
        
        pageHtml = pageHtml.replace('</body>', `${isolationLinks}\n</body>`);
        
        // Write the HTML file - same for all modes
        fs.writeFileSync(path.join('dist', htmlFilePath), pageHtml);
        console.log(`Generated HTML file: ${htmlFilePath} (${env.isDevelopment ? 'development' : 'production'} mode)`);
      });
    }
  };
}

/**
 * Create base HTML template with all common elements
 * This ensures dev and production use the same starting template 
 * @returns {string} HTML template
 */
function createBaseHtmlTemplate() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>React TypeScript App</title>
  <link rel="icon" type="image/png" href="/favicon.png">
  <link rel="stylesheet" href="/assets/css/index.css">
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/assets/js/index.js"></script>
</body>
</html>`;
}
