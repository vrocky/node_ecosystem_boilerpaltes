import path from 'path';
import fs from 'fs';
import * as sass from 'sass';
import { projectRoot } from '../../../vite.config.js';

/**
 * Create CSS plugin for Vite
 * @param {Object} entries - Entry points
 * @param {Object} env - Environment settings
 * @returns {Object} CSS plugin
 */
export function createViteCssPlugin(entries, env) {
  // Create a plugin instance with proper this binding
  const plugin = {
    name: 'vite-plugin-css-extractor',
    enforce: 'post', // Run after Vite's CSS handling
    
    // Generate CSS files during build
    async closeBundle() {
      if (env.isDevelopment) return;
      
      console.log('Ensuring CSS files are correctly generated and referenced...');
      
      try {
        // Check if CSS files have been generated
        const cssDir = path.join('dist', 'assets', 'css');
        if (!fs.existsSync(cssDir)) {
          fs.mkdirSync(cssDir, { recursive: true });
        }
        
        // CSS file mapping
        const cssFileMapping = {};
        
        // Collect all CSS files in the dist/assets/css directory
        const cssFiles = fs.existsSync(cssDir) 
          ? fs.readdirSync(cssDir)
              .filter(file => file.endsWith('.css'))
              .map(file => path.join(cssDir, file))
          : [];
          
        console.log('Found CSS files:', cssFiles.map(f => path.basename(f)));
        
        // Process page CSS files
        Object.entries(entries).forEach(([entryName, entryPath]) => {
          if (typeof entryPath !== 'string') return;
          
          // Check if a CSS file exists for this entry
          const cssFileName = `${entryName}.css`;
          const cssFilePath = path.join(cssDir, cssFileName);
          
          // If CSS file doesn't exist for this entry, try to generate it from SCSS
          if (!fs.existsSync(cssFilePath)) {
            // Find related SCSS file 
            const entryDir = path.dirname(entryPath.replace('./', ''));
            const entryBaseName = path.basename(entryPath, path.extname(entryPath));
            
            // Look for component/page SCSS file
            const scssPath = path.join(entryDir, `${entryBaseName}.scss`);
            
            if (fs.existsSync(scssPath)) {
              try {
                console.log(`Generating missing CSS for ${entryName} from ${scssPath}`);
                const scssContent = fs.readFileSync(scssPath, 'utf-8');
                
                // Compile SCSS to CSS
                const result = sass.compileString(scssContent, {
                  style: env.isDevelopment ? 'expanded' : 'compressed',
                  loadPaths: [path.dirname(scssPath), 'node_modules']
                });
                
                // Write CSS file
                fs.writeFileSync(cssFilePath, result.css);
                console.log(`Generated missing CSS file: ${cssFilePath}`);
                
                // Add to mapping
                cssFileMapping[entryName] = cssFileName;
              } catch (error) {
                console.error(`Error processing SCSS file ${scssPath}:`, error);
              }
            } else {
              // No specific SCSS file found, use index.css as fallback
              cssFileMapping[entryName] = 'index.css';
            }
          } else {
            // CSS file exists for this entry
            cssFileMapping[entryName] = cssFileName;
          }
        });
        
        // If index.css doesn't exist but we have a home.css, create a copy as index.css
        const indexCssPath = path.join(cssDir, 'index.css');
        const homeCssPath = path.join(cssDir, 'home.css');
        
        if (!fs.existsSync(indexCssPath) && fs.existsSync(homeCssPath)) {
          // Copy home.css to index.css
          fs.copyFileSync(homeCssPath, indexCssPath);
          console.log('Created index.css from home.css for compatibility');
        } else if (!fs.existsSync(indexCssPath)) {
          // Try to generate from App.scss
          const appScssPath = 'src/App.scss';
          
          if (fs.existsSync(appScssPath)) {
            try {
              const scssContent = fs.readFileSync(appScssPath, 'utf-8');
              
              // Compile SCSS to CSS
              const result = sass.compileString(scssContent, {
                style: env.isDevelopment ? 'expanded' : 'compressed',
                loadPaths: ['src', 'node_modules']
              });
              
              // Write CSS file
              fs.writeFileSync(indexCssPath, result.css);
              console.log(`Generated index.css from App.scss`);
            } catch (error) {
              console.error(`Error processing App.scss:`, error);
            }
          } else {
            // Create an empty index.css if nothing else works
            fs.writeFileSync(indexCssPath, '/* Placeholder CSS */');
            console.log('Created empty index.css as fallback');
          }
        }
        
        // Update HTML files to reference the correct CSS files
        console.log('Updating HTML files to reference correct CSS files');
        updateHtmlFiles(cssFileMapping);
        
      } catch (error) {
        console.error('Error in CSS extraction plugin:', error);
      }
    }
  };
  
  return plugin;
}

/**
 * Update HTML files to reference the correct CSS files
 * @param {Object} cssFileMapping - Mapping of entry names to CSS file names
 */
function updateHtmlFiles(cssFileMapping) {
  // Process HTML files in dist directory
  processHtmlFilesInDir('dist', cssFileMapping);
}

/**
 * Process HTML files in a directory recursively
 * @param {string} dirPath - Directory path
 * @param {Object} cssFileMapping - Mapping of entry names to CSS file names
 */
function processHtmlFilesInDir(dirPath, cssFileMapping) {
  if (!fs.existsSync(dirPath)) return;
  
  const files = fs.readdirSync(dirPath);
  
  files.forEach(file => {
    const fullPath = path.join(dirPath, file);
    const stats = fs.statSync(fullPath);
    
    if (stats.isDirectory()) {
      // Recursively process directories
      processHtmlFilesInDir(fullPath, cssFileMapping);
    } else if (file.endsWith('.html')) {
      // Process HTML file
      updateCssInHtmlFile(fullPath, cssFileMapping);
    }
  });
}

/**
 * Update CSS references in an HTML file
 * @param {string} filePath - HTML file path
 * @param {Object} cssFileMapping - Mapping of entry names to CSS file names
 */
function updateCssInHtmlFile(filePath, cssFileMapping) {
  const html = fs.readFileSync(filePath, 'utf-8');
  let updatedHtml = html;
  
  // Get the page name from the HTML path or title
  const pageDir = path.dirname(filePath).replace(/^dist[\/\\]/, '');
  const pageName = pageDir === '.' ? 'home' : pageDir;
  
  // Match CSS link tags
  const cssLinkRegex = /<link [^>]*rel="stylesheet" href="([^"]+)"[^>]*>/g;
  const cssLinks = html.match(cssLinkRegex) || [];
  
  if (cssLinks.length > 0) {
    // Extract the current CSS path from the link
    const hrefRegex = /href="([^"]+)"/;
    const currentCssMatch = cssLinks[0].match(hrefRegex);
    
    if (currentCssMatch && currentCssMatch[1]) {
      const currentCssPath = currentCssMatch[1];
      const cssFileName = path.basename(currentCssPath);
      
      // Check if we have a specific CSS file for this page
      const mappedCssFile = cssFileMapping[pageName];
      const cssPathDir = path.dirname(currentCssPath);
      
      if (mappedCssFile && cssFileName !== mappedCssFile) {
        // Replace the CSS file reference with the mapped one
        const newCssPath = path.join(cssPathDir, mappedCssFile).replace(/\\/g, '/');
        updatedHtml = html.replace(currentCssPath, newCssPath);
        console.log(`Updated CSS reference in ${filePath} from ${cssFileName} to ${mappedCssFile}`);
      }
    }
  } else {
    // No CSS link found, maybe add one if needed
    const cssToUse = cssFileMapping[pageName] || 'index.css';
    const headCloseTag = '</head>';
    const cssLinkTag = `  <link rel="stylesheet" href="/assets/css/${cssToUse}">\n${headCloseTag}`;
    updatedHtml = html.replace(headCloseTag, cssLinkTag);
    console.log(`Added CSS reference to ${cssToUse} in ${filePath}`);
  }
  
  // Write the updated HTML back to the file
  if (updatedHtml !== html) {
    fs.writeFileSync(filePath, updatedHtml);
  }
}
