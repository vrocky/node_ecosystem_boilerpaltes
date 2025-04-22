import fs from 'fs';
import path from 'path';

/**
 * Simple plugin to generate HTML files during build
 * Uses standard Vite APIs instead of complex custom plugins
 */
export function htmlBuildPlugin() {
  return {
    name: 'vite-html-build-plugin',
    apply: 'build',
    
    // Generate HTML files after the build is complete
    closeBundle() {
      console.log('Generating HTML files...');
      
      // Check for environment mode
      const isIsolationMode = process.env.ISOLATION_MODE === 'true';
      const isTestMode = process.env.TEST_MODE === 'true' || process.env.VISUAL_TEST_MODE === 'true';
      
      // Get HTML template
      const publicDir = path.resolve('public');
      const templatesDir = path.resolve('templates');
      
      let mainTemplate = '';
      if (fs.existsSync(path.join(publicDir, 'index.html'))) {
        mainTemplate = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf-8');
      } else {
        mainTemplate = createDefaultTemplate();
      }
      
      // Read isolation and test templates if needed
      let isolationTemplate = '';
      if (isIsolationMode) {
        if (fs.existsSync(path.join(templatesDir, 'isolation.html'))) {
          isolationTemplate = fs.readFileSync(path.join(templatesDir, 'isolation.html'), 'utf-8');
        } else {
          isolationTemplate = createIsolationTemplate();
        }
      }
      
      let testTemplate = '';
      if (isTestMode) {
        if (fs.existsSync(path.join(templatesDir, 'test.html'))) {
          testTemplate = fs.readFileSync(path.join(templatesDir, 'test.html'), 'utf-8');
        } else {
          testTemplate = createTestTemplate();
        }
      }
      
      // Ensure dist directory exists
      const distDir = path.resolve('dist');
      if (!fs.existsSync(distDir)) {
        fs.mkdirSync(distDir, { recursive: true });
      }
      
      // Find JS files in the dist directory to determine entries
      const jsFiles = findJsFiles(path.join(distDir, 'assets', 'js'));
      
      if (isIsolationMode) {
        generateIsolationPages(jsFiles, isolationTemplate, distDir);
      } else if (isTestMode) {
        generateTestPages(jsFiles, testTemplate, distDir);
      } else {
        generateRegularPages(jsFiles, mainTemplate, distDir);
      }
    }
  };
}

/**
 * Find JS files in the assets directory
 * @param {string} dir - Directory to search
 * @returns {Object} Mapping of entry names to file paths
 */
function findJsFiles(dir) {
  if (!fs.existsSync(dir)) return {};
  
  const files = fs.readdirSync(dir);
  const jsFiles = {};
  
  files.forEach(file => {
    if (file.endsWith('.js') && !file.includes('chunks')) {
      // Extract entry name (remove extension)
      const entryName = path.basename(file, '.js');
      jsFiles[entryName] = `/assets/js/${file}`;
    }
  });
  
  return jsFiles;
}

/**
 * Generate isolation HTML pages
 * @param {Object} jsFiles - JS file mapping
 * @param {string} template - HTML template
 * @param {string} distDir - Output directory
 */
function generateIsolationPages(jsFiles, template, distDir) {
  // Create isolation directory if needed
  const isolationDir = path.join(distDir, 'isolation');
  if (!fs.existsSync(isolationDir)) {
    fs.mkdirSync(isolationDir, { recursive: true });
  }
  
  // Get isolation entries
  const isolationEntries = {};
  Object.keys(jsFiles).forEach(name => {
    if (name.startsWith('isolation-')) {
      const componentName = name.replace('isolation-', '');
      isolationEntries[componentName] = jsFiles[name];
    }
  });
  
  // Generate index page
  let indexContent = '';
  Object.keys(isolationEntries).forEach(componentName => {
    indexContent += `<a href="/isolation/${componentName}.html" class="component-item">
      <h3 class="component-name">${componentName}</h3>
      <div class="component-path">components/${componentName}/</div>
    </a>`;
  });
  
  // Create index HTML
  const indexHtml = template
    .replace('<div id="root"></div>', `<div id="isolation-index">
      <h2>Available Components</h2>
      <div class="components-grid">
        ${indexContent || '<p>No isolation components found.</p>'}
      </div>
    </div>`)
    .replace('<script type="module" src="script-path-placeholder.js"></script>', '');
  
  fs.writeFileSync(path.join(isolationDir, 'index.html'), indexHtml);
  console.log('Generated isolation index page');
  
  // Generate individual component pages
  Object.entries(isolationEntries).forEach(([componentName, jsPath]) => {
    const htmlContent = template
      .replace('<title>Component Isolation</title>', `<title>${componentName} | Component</title>`)
      .replace('Component Isolation</h1>', `${componentName} Component</h1>`)
      .replace('<script type="module" src="script-path-placeholder.js"></script>', 
        `<script type="module" src="${jsPath}"></script>`);
    
    fs.writeFileSync(path.join(isolationDir, `${componentName}.html`), htmlContent);
    console.log(`Generated isolation page for ${componentName}`);
  });
}

/**
 * Generate test HTML pages
 * @param {Object} jsFiles - JS file mapping
 * @param {string} template - HTML template
 * @param {string} distDir - Output directory
 */
function generateTestPages(jsFiles, template, distDir) {
  // Get test entries
  const testEntries = {};
  Object.keys(jsFiles).forEach(name => {
    if (name.startsWith('test-')) {
      const testName = name.replace('test-', '');
      testEntries[testName] = jsFiles[name];
    }
  });
  
  // Generate test pages
  Object.entries(testEntries).forEach(([testName, jsPath]) => {
    const htmlContent = template
      .replace('<title>Component Test</title>', `<title>${testName} Test</title>`)
      .replace('Component Test</h1>', `${testName} Test</h1>`)
      .replace('<!-- Script will be injected here -->', `<script type="module" src="${jsPath}"></script>`);
    
    fs.writeFileSync(path.join(distDir, `${testName}.html`), htmlContent);
    console.log(`Generated test page for ${testName}`);
  });
}

/**
 * Generate regular HTML pages
 * @param {Object} jsFiles - JS file mapping
 * @param {string} template - HTML template
 * @param {string} distDir - Output directory
 */
function generateRegularPages(jsFiles, template, distDir) {
  Object.entries(jsFiles).forEach(([pageName, jsPath]) => {
    if (pageName.startsWith('isolation-') || pageName.startsWith('test-')) {
      return; // Skip special entries
    }
    
    // Create directory for page if needed
    let pageDir = distDir;
    let htmlFileName = 'index.html';
    
    if (pageName !== 'home' && pageName !== 'index') {
      pageDir = path.join(distDir, pageName);
      if (!fs.existsSync(pageDir)) {
        fs.mkdirSync(pageDir, { recursive: true });
      }
    }
    
    // Calculate relative path for assets
    const relativeBase = pageName !== 'home' && pageName !== 'index' ? '../' : '';
    
    // Generate HTML content
    const htmlContent = template
      .replace('<title>React TypeScript App</title>', `<title>${pageName.charAt(0).toUpperCase() + pageName.slice(1)} | App</title>`)
      .replace('assets/js/index.js', `${relativeBase}${jsPath.slice(1)}`)
      .replace('href="favicon.png"', `href="${relativeBase}favicon.png"`)
      // Add stylesheet if it exists
      .replace('</head>', `  <link rel="stylesheet" href="${relativeBase}assets/css/${pageName}.css">\n</head>`);
    
    fs.writeFileSync(path.join(pageDir, htmlFileName), htmlContent);
    console.log(`Generated page for ${pageName}: ${path.join(pageDir, htmlFileName)}`);
  });
}

/**
 * Create default HTML template
 * @returns {string} HTML template
 */
function createDefaultTemplate() {
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
  <script type="module" src="assets/js/index.js"></script>
</body>
</html>`;
}

/**
 * Create isolation template
 * @returns {string} HTML template
 */
function createIsolationTemplate() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Component Isolation</title>
  <link rel="icon" type="image/png" href="../favicon.png">
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

/**
 * Create test template
 * @returns {string} HTML template
 */
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
