import fs from 'fs';
import path from 'path';

/**
 * Create middleware for Vite development server
 * @param {import('vite').ViteDevServer} server - Vite server 
 */
export function configureServer(server) {
  // Path to HTML templates
  const publicDir = path.resolve('public');
  const templatesDir = path.resolve('templates');
  
  // Default HTML template - first try public/index.html, then create one
  let defaultTemplate = '';
  if (fs.existsSync(path.join(publicDir, 'index.html'))) {
    defaultTemplate = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf-8');
  } else {
    defaultTemplate = createDefaultTemplate();
  }

  // Read isolation template if available
  let isolationTemplate = '';
  if (fs.existsSync(path.join(templatesDir, 'isolation.html'))) {
    isolationTemplate = fs.readFileSync(path.join(templatesDir, 'isolation.html'), 'utf-8');
  } else {
    isolationTemplate = createIsolationTemplate();
  }

  // Read test template if available
  let testTemplate = '';
  if (fs.existsSync(path.join(templatesDir, 'test.html'))) {
    testTemplate = fs.readFileSync(path.join(templatesDir, 'test.html'), 'utf-8');
  } else {
    testTemplate = createTestTemplate();
  }

  // Return middleware function
  return () => {
    server.middlewares.use((req, res, next) => {
      const url = req.url;
      
      // Skip for asset requests
      if (url.includes('.') && !url.endsWith('.html')) {
        return next();
      }
      
      // Skip Vite internal requests
      if (url.startsWith('/@') || url.includes('__vite')) {
        return next();
      }
      
      // Get path parts
      const pathParts = url.replace(/^\//, '').split('/').filter(Boolean);
      const firstPart = pathParts[0] || '';
      
      console.log(`[Server] Processing ${url}, path parts:`, pathParts);
      
      // Serve appropriate content based on mode and path
      const isIsolationMode = process.env.ISOLATION_MODE === 'true';
      const isTestMode = process.env.TEST_MODE === 'true' || process.env.VISUAL_TEST_MODE === 'true';
      
      // Handle isolation mode requests
      if (isIsolationMode || firstPart === 'isolation') {
        const componentName = pathParts[1] || '';
        
        if (componentName) {
          // Specific component isolation page
          const htmlContent = isolationTemplate
            .replace('<title>Component Isolation</title>', `<title>${componentName} | Component</title>`)
            .replace('Component Isolation</h1>', `${componentName} Component</h1>`)
            .replace('<script type="module" src="script-path-placeholder.js"></script>', 
              `<script type="module" src="/@vite/client"></script>
               <script type="module" src="/isolation-${componentName.toLowerCase()}.js"></script>`);
          
          res.writeHead(200, { 'Content-Type': 'text/html' });
          return res.end(htmlContent);
        } else {
          // Isolation index page
          const isolationFiles = fs.readdirSync('src/components', { recursive: true })
            .filter(file => file.endsWith('.isolation.tsx'));
            
          let componentLinks = '';
          isolationFiles.forEach(file => {
            const name = path.basename(file, '.isolation.tsx');
            componentLinks += `<a href="/isolation/${name}" class="component-item">
              <h3>${name}</h3>
              <div class="component-path">components/${name}/</div>
            </a>`;
          });
          
          const htmlContent = isolationTemplate
            .replace('<div id="root"></div>', `<div id="isolation-index">
              <h2>Available Components</h2>
              <div class="components-grid">
                ${componentLinks || '<p>No isolation components found.</p>'}
              </div>
            </div>`);
          
          res.writeHead(200, { 'Content-Type': 'text/html' });
          return res.end(htmlContent);
        }
      }
      
      // Handle test mode requests
      if (isTestMode) {
        const testName = firstPart || '';
        
        const htmlContent = testTemplate
          .replace('<title>Component Test</title>', `<title>${testName || 'Component'} Test</title>`)
          .replace('Component Test</h1>', `${testName || 'Component'} Test</h1>`)
          .replace('<!-- Script will be injected here -->', 
            `<script type="module" src="/@vite/client"></script>
             <script type="module" src="/test-${testName}.js"></script>`);
        
        res.writeHead(200, { 'Content-Type': 'text/html' });
        return res.end(htmlContent);
      }
      
      // Regular page mode - serve requested page or home
      const pageName = firstPart || 'home';
      
      const htmlContent = defaultTemplate
        .replace('<title>React TypeScript App</title>', `<title>${pageName.charAt(0).toUpperCase() + pageName.slice(1)} | App</title>`)
        .replace('<script type="module" src="assets/js/index.js"></script>', 
          `<script type="module" src="/@vite/client"></script>
           <script type="module" src="/${pageName}.js"></script>`);
      
      res.writeHead(200, { 'Content-Type': 'text/html' });
      return res.end(htmlContent);
    });
  };
}

// Create default HTML template
function createDefaultTemplate() {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>React TypeScript App</title>
  <link rel="icon" type="image/png" href="/favicon.png">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }
    .dev-banner {
      position: fixed;
      bottom: 10px;
      right: 10px;
      background: rgba(0,0,0,0.6);
      color: white;
      padding: 5px 8px;
      border-radius: 4px;
      font-size: 12px;
      z-index: 9999;
    }
  </style>
</head>
<body>
  <div id="root"></div>
  <div class="dev-banner">Vite Dev</div>
  <script type="module" src="assets/js/index.js"></script>
</body>
</html>
  `;
}

// Create isolation template
function createIsolationTemplate() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Component Isolation</title>
  <link rel="icon" type="image/png" href="/favicon.png">
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
    
    .components-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 15px;
      margin-top: 20px;
    }
    
    .component-item {
      padding: 15px;
      border: 1px solid #eaeaea;
      border-radius: 5px;
      text-decoration: none;
      color: #333;
      display: block;
      transition: all 0.2s ease;
    }
    
    .component-item:hover {
      border-color: #0070f3;
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0,0,0,0.05);
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

// Create test template
function createTestTemplate() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Component Test</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      padding: 20px;
      max-width: 900px;
      margin: 0 auto;
      line-height: 1.5;
    }
    h1 {
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 1px solid #eaeaea;
    }
    #root {
      border: 1px dashed #ddd;
      padding: 20px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .test-controls {
      margin: 20px 0;
      padding: 10px;
      background: #f5f5f5;
      border-radius: 4px;
    }
    .back-link {
      display: inline-block;
      padding: 5px 10px;
      background: #f0f0f0;
      color: #333;
      text-decoration: none;
      border-radius: 4px;
      margin-right: 10px;
    }
    .back-link:hover {
      background: #e0e0e0;
    }
  </style>
</head>
<body>
  <div>
    <a href="/" class="back-link">Back to Home</a>
  </div>
  <h1>Component Test</h1>
  <div id="root"></div>
  <!-- Script will be injected here -->
</body>
</html>`;
}
