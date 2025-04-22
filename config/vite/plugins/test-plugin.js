import path from 'path';
import fs from 'fs';

/**
 * Create test plugin for Vite
 * @param {Object} entries - Entry points
 * @param {Object} env - Environment settings
 * @returns {Object} Test plugin
 */
export function createViteTestPlugin(entries, env) {
  // Prepare the test template
  const ensureTestTemplate = () => {
    const templateDir = 'templates';
    const templatePath = path.join(templateDir, 'test.html');
    
    if (!fs.existsSync(templatePath)) {
      // Create template directory if needed
      if (!fs.existsSync(templateDir)) {
        fs.mkdirSync(templateDir, { recursive: true });
      }
      
      // Create a basic test template
      const basicTemplate = createBasicTestTemplate();
      fs.writeFileSync(templatePath, basicTemplate);
      console.log(`Created test template at ${templatePath}`);
    }
    
    return templatePath;
  };

  const templatePath = ensureTestTemplate();
  
  return {
    name: 'vite-plugin-test',
    
    configureServer(server) {
      return () => {
        server.middlewares.use((req, res, next) => {
          // Only process HTML requests
          if (req.url.endsWith('.html') || !req.url.includes('.')) {
            const urlPath = req.url.endsWith('/') ? req.url : `${req.url}/`;
            
            // Extract test name from URL
            const pathParts = urlPath.split('/').filter(Boolean);
            const testPart = pathParts[0] || 'index';
            
            if (entries[testPart] || testPart === 'test') {
              // Get the entry key from URL or use index if not found
              const entryKey = entries[testPart] ? testPart : Object.keys(entries)[0];
              
              // Check if we have a custom template for this test
              let templateContent = fs.readFileSync(templatePath, 'utf-8');
              
              // Inject the script for this test
              const testHtml = templateContent
                .replace('</body>', `<script type="module" src="/@vite/client"></script><script type="module" src="/${entryKey}"></script></body>`)
                .replace('Component Test</h1>', `${testPart} Test</h1>`);
              
              res.writeHead(200, { 'Content-Type': 'text/html' });
              res.end(testHtml);
              return;
            }
          }
          
          next();
        });
      };
    },
    
    // Generate HTML test files during build
    closeBundle() {
      if (env.isDevelopment) return;
      
      // Generate test HTML files for each entry
      const htmlFiles = [];
      
      Object.entries(entries).forEach(([entryName, filePath]) => {
        const absoluteFilePath = path.resolve(projectRoot, filePath.replace('./', ''));
        const componentDir = path.dirname(absoluteFilePath);
        const componentName = path.basename(componentDir);
        
        // Check if a custom HTML template exists
        const customTemplatePath = path.join(componentDir, `${componentName}.test.html`);
        const hasCustomTemplate = fs.existsSync(customTemplatePath);
        
        // Define output paths
        const htmlOutput = `dist/${entryName}.html`;
        const jsPath = `assets/js/${entryName}.js`;
        
        // Read template content
        let templateContent = fs.readFileSync(hasCustomTemplate ? customTemplatePath : templatePath, 'utf-8');
        
        // Inject the script for this test
        const testHtml = templateContent
          .replace('</body>', `<script type="module" src="${jsPath}"></script></body>`)
          .replace('Component Test</h1>', `${componentName} Test</h1>`)
          .replace(/<title>.*?<\/title>/, `<title>${componentName} Test</title>`);
        
        // Ensure dist directory exists
        if (!fs.existsSync('dist')) {
          fs.mkdirSync('dist', { recursive: true });
        }
        
        // Write the file
        fs.writeFileSync(htmlOutput, testHtml);
        console.log(`Generated test HTML file: ${htmlOutput}`);
      });
    }
  };
}

/**
 * Create basic test HTML template
 * @returns {string} HTML template
 */
function createBasicTestTemplate() {
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
      max-width: 800px;
      margin: 0 auto;
      line-height: 1.5;
    }
    h1 {
      border-bottom: 1px solid #eee;
      padding-bottom: 10px;
      margin-bottom: 20px;
    }
    .test-container {
      padding: 20px;
      border: 1px solid #eee;
      border-radius: 4px;
      margin-bottom: 20px;
    }
    .test-pass {
      color: #0a0;
      font-weight: bold;
    }
    .test-fail {
      color: #d00;
      font-weight: bold;
    }
    .test-summary {
      margin-top: 30px;
      padding: 15px;
      background-color: #f8f8f8;
      border-radius: 4px;
    }
    .bundler-badge {
      display: inline-block;
      padding: 3px 8px;
      background: #646cff;
      color: white;
      border-radius: 12px;
      font-size: 12px;
      margin-left: 8px;
      vertical-align: middle;
    }
  </style>
</head>
<body>
  <h1>
    Component Test
    <span class="bundler-badge">Vite</span>
  </h1>
  <div id="root"></div>
  <!-- Test scripts will be injected here -->
</body>
</html>`;
}
