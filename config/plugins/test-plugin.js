import path from 'path';
import fs from 'fs';
import copy from 'rollup-plugin-copy';

/**
 * Create plugin for test mode
 * @param {Object} entries - Entry points
 * @param {Object} env - Environment settings 
 * @returns {Array} Test plugins
 */
export function createTestPlugin(entries, env) {
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
  
  // Generate test HTML files for each entry
  const htmlFiles = [];
  
  Object.entries(entries).forEach(([entryName, filePath]) => {
    const componentDir = path.dirname(filePath.toString());
    const componentName = path.basename(componentDir);
    
    // Check if a custom HTML template exists
    const customTemplatePath = path.join(componentDir, `${componentName}.test.html`);
    const hasCustomTemplate = fs.existsSync(customTemplatePath);
    
    // Define output paths
    const htmlOutput = `dist/${entryName}.html`;
    const jsPath = `assets/js/${entryName}.js`;
    
    htmlFiles.push({
      source: hasCustomTemplate ? customTemplatePath : templatePath,
      output: htmlOutput,
      componentName,
      jsPath
    });
  });
  
  // Return array with all plugins needed for test mode
  return [
    // Copy the template HTML file to dist (for reference)
    copy({
      targets: [
        { 
          src: templatePath, 
          dest: 'dist',
          transform: (contents) => {
            return contents.toString()
              .replace('Component Test', env.isVisualTestMode ? 'Visual Component Test' : 'Component Test');
          }
        }
      ]
    }),
    
    // Custom HTML generator for each test
    {
      name: 'generate-test-html',
      writeBundle() {
        // Ensure dist directory exists
        if (!fs.existsSync('dist')) {
          fs.mkdirSync('dist', { recursive: true });
        }
        
        htmlFiles.forEach(({ source, output, componentName, jsPath }) => {
          let html = fs.readFileSync(source, 'utf8');
          
          // Inject the script tag (ensure it's a module)
          html = html.replace('</body>', `  <script type="module" src="${jsPath}"></script>\n</body>`);
          
          // Replace title and component name placeholders
          html = html.replace(/<title>.*?<\/title>/g, `<title>${componentName} Test</title>`);
          html = html.replace(/Component Test<\/h1>/g, `${componentName} Test</h1>`);
          
          fs.writeFileSync(output, html);
          console.log(`Generated HTML file: ${output}`);
        });
      }
    }
  ];
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
  </style>
</head>
<body>
  <h1>Component Test</h1>
  <div id="root"></div>
  <!-- Test scripts will be injected here -->
</body>
</html>`;
}
