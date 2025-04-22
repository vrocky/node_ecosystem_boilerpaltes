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
 * Get the correct JavaScript file name for a page, with consistent resolution
 * @param {string} pageName - The name of the page
 * @param {Object} entries - All entry points
 * @param {boolean} isDevelopment - Whether we're in development mode
 * @returns {string} The correct JS file name to reference
 */
function resolveJsFileName(pageName, entries, isDevelopment) {
  // For root pages, determine whether to use 'home.js' or 'index.js'
  if (isRootPage(pageName)) {
    // Priority for resolution:
    // 1. Check if 'home' is directly defined in entries 
    if (entries['home']) {
      return 'home';
    }
    
    // 2. Check for existing home.js file (useful for incremental builds)
    const homeJsPath = path.join('dist', 'assets', 'js', 'home.js');
    if (fs.existsSync(homeJsPath)) {
      return 'home';
    }
    
    // 3. Check if any entry has src/pages/home in its path
    if (Object.values(entries).some(e => 
        e.toString().includes('src/pages/home/'))) {
      return 'home';
    }
  }
  
  // Default: use the page name
  return pageName;
}

/**
 * Create HTML content for a page
 * @param {string} templateHtml - Base template HTML
 * @param {string} pageName - Name of the page
 * @param {string} jsPath - Path to JS file
 * @param {string} cssPath - Path to CSS file
 * @param {string} faviconPath - Path to favicon
 * @param {string} isolationPath - Path to isolation view
 * @returns {string} Complete HTML content
 */
function createPageHtml(templateHtml, pageName, jsPath, cssPath, faviconPath, isolationPath) {
  // Update title with capitalized page name
  let html = templateHtml.replace(
    /<title>.*?<\/title>/, 
    `<title>${pageName.charAt(0).toUpperCase() + pageName.slice(1)} | React TypeScript App</title>`
  );
  
  // Update script src with consistent pattern
  html = html.replace(/src=["'].*?["']/, `src="${jsPath}"`);
  
  // Update favicon path
  html = html.replace(/href=["']favicon\.png["']/, `href="${faviconPath}"`);
  
  // Ensure CSS link is present
  if (!html.includes(cssPath)) {
    html = html.replace(/<\/head>/, `  <link rel="stylesheet" href="${cssPath}">\n</head>`);
  }
  
  // Add isolation link
  const isolationLinks = `
    <div style="position:fixed;bottom:10px;right:10px;z-index:1000;">
      <a href="${isolationPath}" style="background:#333;color:#fff;padding:5px 10px;text-decoration:none;border-radius:4px;font-size:12px;">
        View Components
      </a>
    </div>`;
  
  return html.replace('</body>', `${isolationLinks}\n</body>`);
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
      // Setup templates directory and base template
      const templatePath = setupTemplates();
      const templateHtml = fs.readFileSync(templatePath, 'utf8');
      
      // Ensure dist directory exists
      if (!fs.existsSync('dist')) {
        fs.mkdirSync('dist', { recursive: true });
      }
      
      console.log(`Using page template from ${templatePath} (${env.isDevelopment ? 'development' : 'production'} mode)`);
      
      // Process each page entry
      Object.keys(entries).forEach(pageName => {
        // Skip non-page entries (e.g., components in isolation mode)
        // But always process root pages
        if (!isRootPage(pageName) && !entries[pageName].includes('src/pages/')) {
          return;
        }
        
        // Determine HTML file path (root or subdir)
        const isRoot = isRootPage(pageName);
        const htmlFilePath = isRoot ? 'index.html' : `${pageName}/index.html`;
        const htmlDir = path.dirname(path.join('dist', htmlFilePath));
        
        // Create necessary directories
        if (!fs.existsSync(htmlDir)) {
          fs.mkdirSync(htmlDir, { recursive: true });
        }
        
        // Get correctly resolved JavaScript file name (consistent across all modes)
        const jsFileName = resolveJsFileName(pageName, entries, env.isDevelopment);
        
        // Define asset paths
        const jsPath = `/assets/js/${jsFileName}.js`;
        const cssPath = `/assets/css/index.css`;
        const faviconPath = `/favicon.png`;
        const isolationPath = `/isolation/`;
        
        // Create HTML content for this page
        const pageHtml = createPageHtml(
          templateHtml, 
          pageName, 
          jsPath, 
          cssPath, 
          faviconPath, 
          isolationPath
        );
        
        // Write the HTML file
        fs.writeFileSync(path.join('dist', htmlFilePath), pageHtml);
        
        // Log with clear mode indication
        console.log(`Generated HTML file: ${htmlFilePath} → ${jsPath} (${env.isDevelopment ? 'development' : 'production'} mode)`);
      });
    }
  };
}

/**
 * Setup templates directory and base template
 * @returns {string} Path to the template file
 */
function setupTemplates() {
  // Create template directory if needed
  if (!fs.existsSync('templates')) {
    fs.mkdirSync('templates', { recursive: true });
  }
  
  // Define template path
  const templatePath = 'templates/page.html';
  
  // Create base template if it doesn't exist
  if (!fs.existsSync(templatePath)) {
    const basicTemplate = createBaseHtmlTemplate();
    fs.writeFileSync(templatePath, basicTemplate);
    console.log(`Created base template at ${templatePath}`);
    
    // Also create template in public folder for backwards compatibility
    if (!fs.existsSync('public')) {
      fs.mkdirSync('public', { recursive: true });
    }
    
    if (!fs.existsSync('public/index.html')) {
      fs.writeFileSync('public/index.html', basicTemplate);
      console.log(`Created backup template at public/index.html`);
    }
  }
  
  return templatePath;
}

/**
 * Create base HTML template
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
