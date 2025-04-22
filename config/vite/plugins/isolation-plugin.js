import path from 'path';
import fs from 'fs';
import { projectRoot } from '../../../vite.config.js';
import { getRelativePath } from './utils.js';

/**
 * Create isolation plugin for component isolation view in Vite
 * @param {Object} entries - Entry points
 * @param {Object} env - Environment settings
 * @returns {Object} Isolation plugin
 */
export function createViteIsolationPlugin(entries, env) {
  return {
    name: 'vite-plugin-component-isolation',
    
    configureServer(server) {
      return () => {
        server.middlewares.use((req, res, next) => {
          // Skip for asset requests and existing files
          if (req.url.includes('.') || req.url.startsWith('/node_modules') || req.url.startsWith('/@vite')) {
            return next();
          }
          
          // Improve log output for debugging
          console.log(`[Isolation] Processing: ${req.url}`);
          
          // Check if URL is in the isolation path pattern
          const urlPath = req.url.endsWith('/') ? req.url + 'index.html' : req.url;
          
          // Handle isolation index
          if (urlPath === '/isolation' || urlPath === '/isolation/' || urlPath === '/isolation/index.html') {
            // Generate isolation index HTML on the fly
            console.log('[Isolation] Serving isolation index');
            const indexHtml = createIsolationIndexHtml(entries);
            res.writeHead(200, { 'Content-Type': 'text/html' });
            return res.end(indexHtml);
          }
          
          // Handle component isolation request
          // Pattern: /components/Button/ or /features/Auth/
          const pathParts = urlPath.split('/').filter(Boolean);
          if (pathParts.length >= 2) {
            const componentCategory = pathParts[0];
            const componentName = pathParts[1];
            
            // Check if we have an entry for this component
            const entryKey = `isolation-${componentName.toLowerCase()}`;
            
            if (entries[entryKey]) {
              console.log(`[Isolation] Serving component: ${componentName}`);
              // Create isolation HTML on the fly
              const componentHtml = createComponentIsolationHtml(componentName, entryKey, componentCategory);
              res.writeHead(200, { 'Content-Type': 'text/html' });
              return res.end(componentHtml);
            }
          }
          
          next();
        });
      };
    },
    
    // Generate isolation pages during build
    closeBundle() {
      if (env.isDevelopment) return;
      
      console.log('Generating component isolation pages...');
      
      // Check if isolation template exists, if not create it
      const templatePath = 'templates/isolation.html';
      if (!fs.existsSync(templatePath)) {
        // Create templates directory if it doesn't exist
        if (!fs.existsSync('templates')) {
          fs.mkdirSync('templates', { recursive: true });
        }
        
        // Create basic isolation template
        const basicTemplate = createIsolationTemplate();
        fs.writeFileSync(templatePath, basicTemplate);
        console.log(`Created isolation template at ${templatePath}`);
      }
      
      const templateHtml = fs.readFileSync(templatePath, 'utf8');
      
      // Ensure dist directory exists
      if (!fs.existsSync('dist')) {
        fs.mkdirSync('dist', { recursive: true });
      }
      
      // Collection to store page metadata for navigation
      const pageMetadata = [];
      
      // Create HTML files for each component entry
      Object.entries(entries).forEach(([entryName, filePath]) => {
        if (!entryName.startsWith('isolation-')) return;
        
        const componentName = entryName.replace('isolation-', '');
        
        // Get the relative source path from src root
        let absoluteFilePath;
        if (typeof filePath === 'string') {
          absoluteFilePath = path.resolve(projectRoot, filePath.replace('./', ''));
        } else {
          console.warn(`Skipping entry with non-string path: ${entryName}`);
          return;
        }
        
        const relativeSourcePath = path.relative(
          path.join(projectRoot, 'src'), 
          path.dirname(absoluteFilePath)
        ).replace(/\\/g, '/');
        
        // Create output path that mirrors the source structure
        // If it's in src/components/Button, output to /components/Button/
        const outputPathDir = relativeSourcePath || componentName.toLowerCase();
        
        // Use ComponentName.isolation.html naming pattern
        const htmlFilePath = `${outputPathDir}/${componentName}.isolation.html`;
        const htmlDir = path.dirname(path.join('dist', htmlFilePath));
        
        // Create nested directories if needed
        if (!fs.existsSync(htmlDir)) {
          fs.mkdirSync(htmlDir, { recursive: true });
        }
        
        // Calculate relative paths from this HTML file to assets
        const htmlFileDir = path.dirname(`/${htmlFilePath}`); // Convert to URL path
        const jsPath = getRelativePath(htmlFileDir, `/assets/js/${entryName}.js`);
        
        // Check if component-specific CSS exists
        const cssFilePath = path.join('dist', 'assets', 'css', `${entryName}.css`);
        const cssPath = fs.existsSync(cssFilePath) 
          ? getRelativePath(htmlFileDir, `/assets/css/${entryName}.css`) 
          : getRelativePath(htmlFileDir, `/assets/css/index.css`);
          
        const faviconPath = getRelativePath(htmlFileDir, '/favicon.png');
        
        // Store page metadata for navigation with proper paths
        pageMetadata.push({
          name: componentName,
          title: componentName.charAt(0).toUpperCase() + componentName.slice(1),
          path: `/${outputPathDir}/`,
          htmlPath: `/${htmlFilePath}`
        });
        
        // Modify HTML template for this component
        let componentHtml = templateHtml
          // Update page title
          .replace(/<title>.*?<\/title>/, `<title>${componentName} | Component</title>`)
          // Update script src - Ensure script has type="module"
          .replace(/<script.*?src=".*?"><\/script>/, `<script type="module" src="${jsPath}"></script>`)
          // Update favicon path
          .replace(/href="favicon.png"/, `href="${faviconPath}"`)
          // Update header to include path info
          .replace(/<h1>Component Isolation<\/h1>/, `<h1>${componentName} Component</h1><div class="component-path">${outputPathDir}/</div>`);
        
        // Always add CSS reference
        componentHtml = componentHtml.replace('</head>', `  <link rel="stylesheet" href="${cssPath}">\n</head>`);
        
        // Write the HTML file
        fs.writeFileSync(path.join('dist', htmlFilePath), componentHtml);
        console.log(`Generated isolation page: ${htmlFilePath}`);
      });
      
      // Ensure isolation directory exists
      const isolationDir = path.join('dist', 'isolation');
      if (!fs.existsSync(isolationDir)) {
        fs.mkdirSync(isolationDir, { recursive: true });
      }
      
      // Create a simple index page that links to all component isolation pages
      const indexHtml = createIsolationIndexHtml(entries, pageMetadata);
      
      fs.writeFileSync(path.join('dist', 'isolation', 'index.html'), indexHtml);
      console.log(`Generated component isolation index page`);
    }
  };
}

/**
 * Create basic isolation HTML template
 * @returns {string} HTML template
 */
function createIsolationTemplate() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Component Isolation</title>
  <link rel="icon" type="image/png" href="favicon.png">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
      line-height: 1.5;
      color: #333;
    }
    
    .isolation-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid #eaeaea;
    }
    
    .isolation-header h1 {
      margin: 0;
      color: #333;
      font-size: 1.8rem;
    }
    
    .component-showcase {
      padding: 2rem;
      border: 1px dashed #ddd;
      border-radius: 4px;
      margin-bottom: 2rem;
    }
    
    .back-link {
      padding: 5px 10px;
      color: #0070f3;
      text-decoration: none;
      border-radius: 4px;
      margin-right: 10px;
      background-color: rgba(0, 112, 243, 0.05);
    }
    
    .back-link:hover {
      background-color: rgba(0, 112, 243, 0.1);
    }
    
    .component-path {
      font-size: 0.9rem;
      color: #666;
      margin-top: 0.3rem;
    }
  </style>
</head>
<body>
  <div class="isolation-header">
    <h1>Component Isolation</h1>
    <div>
      <a href="/isolation/" class="back-link">All Components</a>
      <a href="/" class="back-link">Main Site</a>
    </div>
  </div>
  <div id="root"></div>
  <script type="module" src="script-path-placeholder.js"></script>
</body>
</html>`;
}

/**
 * Create component isolation HTML on the fly
 * @param {string} componentName - Component name
 * @param {string} entryKey - Entry key name
 * @param {string} componentCategory - Component category (directory)
 * @returns {string} HTML content
 */
function createComponentIsolationHtml(componentName, entryKey, componentCategory) {
  const template = createIsolationTemplate();
  
  return template
    .replace(/<title>.*?<\/title>/, `<title>${componentName} | Component</title>`)
    .replace(/<script.*?src=".*?"><\/script>/, `<script type="module" src="/@vite/client"></script><script type="module" src="/${entryKey}"></script>`)
    .replace(/<h1>Component Isolation<\/h1>/, `<h1>${componentName} Component</h1><div class="component-path">${componentCategory}/${componentName}/</div>`);
}

/**
 * Create isolation index HTML on the fly or for build
 * @param {Object} entries - Entry points
 * @param {Array} pageMetadata - Optional metadata for build mode
 * @returns {string} HTML content
 */
function createIsolationIndexHtml(entries, pageMetadata) {
  // Start with the template HTML
  let indexHtml = createIsolationIndexTemplate();
  
  // Group components by directory path
  const componentGroups = {};
  
  // For dev mode, generate from entries
  if (!pageMetadata) {
    // Extract component info from entry keys
    Object.keys(entries).forEach(entryName => {
      if (!entryName.startsWith('isolation-')) return;
      
      const componentName = entryName.replace('isolation-', '');
      const filePath = entries[entryName];
      
      // Get directory structure if possible (components, features, etc)
      let dirPath = 'components';
      if (typeof filePath === 'string' && filePath.includes('/')) {
        const pathParts = filePath.split('/').filter(Boolean);
        if (pathParts.length > 1) {
          dirPath = pathParts[0] === 'src' ? pathParts[1] : pathParts[0];
        }
      }
      
      // Initialize group if it doesn't exist
      if (!componentGroups[dirPath]) {
        componentGroups[dirPath] = [];
      }
      
      // Add component to group
      componentGroups[dirPath].push({
        name: componentName,
        title: componentName.charAt(0).toUpperCase() + componentName.slice(1),
        path: `/${dirPath}/${componentName}/`,
        htmlPath: `/${dirPath}/${componentName}/${componentName}.isolation.html`
      });
    });
  } else {
    // For build mode, use the provided pageMetadata
    pageMetadata.forEach(component => {
      // Extract directory path from component path
      const pathParts = component.path.split('/').filter(Boolean);
      const dirPath = pathParts.length > 0 ? pathParts[0] : 'root';
      
      // Initialize group if it doesn't exist
      if (!componentGroups[dirPath]) {
        componentGroups[dirPath] = [];
      }
      
      // Add component to group
      componentGroups[dirPath].push(component);
    });
  }
  
  // Add each group to the HTML
  Object.entries(componentGroups).forEach(([groupName, components]) => {
    // Skip empty groups
    if (components.length === 0) return;
    
    indexHtml += `

      <div class="component-group">
        <h2>${groupName === 'root' ? 'Root Components' : groupName.charAt(0).toUpperCase() + groupName.slice(1)}</h2>
        <div class="components-grid">
    `;
    
    components.forEach(component => {
      indexHtml += `
        <a href="${component.htmlPath}" class="component-item">
          <h3 class="component-name">${component.title}</h3>
          <div class="component-path">${component.path}</div>
        </a>`;
    });
    
    indexHtml += `
        </div>
      </div>
    `;
  });
  
  indexHtml += `
    </div>
  </body>
  </html>`;
  
  return indexHtml;
}

/**
 * Create isolation index template
 * @returns {string} HTML template
 */
function createIsolationIndexTemplate() {
  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Component Isolation Index</title>
    <style>
      body { 
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
        max-width: 1000px; 
        margin: 0 auto; 
        padding: 2rem; 
        line-height: 1.5;
      }
      h1 { 
        border-bottom: 1px solid #eee; 
        padding-bottom: 0.5rem;
        color: #333;
      }
      .components-list { 
        padding: 0;
      }
      .component-group {
        margin-bottom: 2rem;
      }
      .component-group h2 {
        font-size: 1.3rem;
        margin-bottom: 0.5rem;
        padding-bottom: 0.3rem;
        border-bottom: 1px solid #f0f0f0;
      }
      .components-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 1rem;
      }
      .component-item {
        display: block;
        padding: 1rem;
        background: #f8f9fa;
        border-radius: 6px;
        text-decoration: none;
        color: #333;
        transition: transform 0.1s, box-shadow 0.1s;
        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
      }
      .component-item:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        background: #e9ecef;
      }
      .component-name {
        font-weight: 600;
        margin: 0;
        font-size: 1.1rem;
      }
      .component-path {
        font-size: 0.8rem;
        color: #666;
        margin-top: 0.3rem;
      }
      .back-link {
        display: inline-block;
        margin: 1rem 0;
        color: #0066cc;
        text-decoration: none;
      }
      .back-link:hover {
        text-decoration: underline;
      }
      .bundler-badge {
        display: inline-block;
        padding: 3px 8px;
        background: #4c1;
        color: white;
        border-radius: 12px;
        font-size: 12px;
        margin-left: 8px;
        vertical-align: middle;
      }
    </style>
  </head>
  <body>
    <a href="/" class="back-link">← Back to main site</a>
    <h1>
      Component Isolation Index
      <span class="bundler-badge">Vite</span>
    </h1>
    <div class="components-list">`;
}
