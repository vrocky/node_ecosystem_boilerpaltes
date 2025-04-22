import { globSync } from 'glob';
import path from 'path';
import fs from 'fs';
import { projectRoot } from './paths.js';

/**
 * Find entry points based on the environment
 * @param {Object} env - Environment settings
 * @returns {Object} Map of entry points
 */
export function findEntryPoints(env) {
  // Start with an empty entries object
  let entries = {};
  
  // Find all test files if in test mode
  const testFiles = (env.isTestMode || env.isVisualTestMode) ? globSync('src/**/*.test.{ts,tsx}') : [];
  
  // Find all page files (for MPA)
  const pageFiles = globSync('src/pages/**/index.{ts,tsx}');
  
  // Find all isolation files if in isolation mode
  const isolationFiles = env.isIsolationMode ? globSync('src/**/*.isolation.tsx') : [];
  
  // Find all component files for isolation mode (fallback for auto-generation)
  const componentFiles = env.isIsolationMode ? globSync('src/components/**/*.tsx') : [];
  
  // In isolation mode, always build both regular pages and isolation files
  if (env.isIsolationMode) {
    // First, add standard page files
    entries = findPageEntries(pageFiles);
    
    // Then add isolation entries
    const isolationEntries = findIsolationEntries(isolationFiles, componentFiles);
    entries = { ...entries, ...isolationEntries };
    
    console.log(`Building ${Object.keys(entries).length} entries (${Object.keys(isolationEntries).length} isolation files, ${Object.keys(entries).length - Object.keys(isolationEntries).length} standard pages)`);
  }
  // Test modes - only build test files
  else if (env.isTestMode || env.isVisualTestMode) {
    entries = findTestEntries(testFiles);
  }
  // Regular mode - only build standard pages
  else {
    entries = findPageEntries(pageFiles);
  }
  
  return entries;
}

/**
 * Find isolation entries
 * @param {Array} isolationFiles - List of isolation files
 * @param {Array} componentFiles - List of component files
 * @returns {Object} Map of isolation entries
 */
function findIsolationEntries(isolationFiles, componentFiles) {
  let entries = {};
  
  // First, use any existing isolation files that were found
  if (isolationFiles.length > 0) {
    isolationFiles.forEach(file => {
      const fileName = path.basename(file, '.isolation.tsx');
      const dirName = path.basename(path.dirname(file));
      
      // Use component name as the entry name
      // If filename matches dirname, it's likely the main component file
      const componentName = fileName === dirName ? fileName : `${dirName}-${fileName}`;
      
      entries[`isolation-${componentName.toLowerCase()}`] = file;
    });
    
    console.log(`Found ${isolationFiles.length} isolation files`);
  } else {
    // Fallback: Component isolation mode - create one entry per component
    componentFiles.forEach(file => {
      // Skip test files and index files
      if (file.includes('.test.') || file.includes('index.') || file.includes('.isolation.')) {
        return;
      }
      
      // Extract component name from path: src/components/Button/Button.tsx => Button
      const componentName = path.basename(file, path.extname(file));
      const componentDir = path.dirname(file);
      
      // Skip files with different name than parent directory (only process main component files)
      if (path.basename(componentDir) !== componentName) {
        return;
      }
      
      // Create isolation wrapper if it doesn't exist
      const isolationFile = path.join(componentDir, `${componentName}.isolation.tsx`);
      if (!fs.existsSync(isolationFile)) {
        // Generate a basic isolation wrapper
        const isolationWrapper = createIsolationWrapper(componentName);
        fs.writeFileSync(isolationFile, isolationWrapper);
        console.log(`Generated isolation wrapper for: ${componentName}`);
      }
      
      // Use the isolation file as entry point
      entries[`isolation-${componentName.toLowerCase()}`] = isolationFile;
    });
  }
  
  return entries;
}

/**
 * Create isolation wrapper template
 * @param {string} componentName - Component name
 * @returns {string} Isolation wrapper code
 */
function createIsolationWrapper(componentName) {
  return `import React from 'react';
import { createRoot } from 'react-dom/client';
import ${componentName} from './${componentName}';
import './${componentName}.scss';

// Simple wrapper to show the component in isolation
const ${componentName}Isolation = () => {
  return (
    <div className="${componentName.toLowerCase()}-isolation">
      <h1>${componentName} Component</h1>
      <div className="component-showcase">
        <${componentName} />
      </div>
    </div>
  );
};

// Render the component
const container = document.getElementById('root');
if (!container) throw new Error('Root element not found');

const root = createRoot(container);
root.render(
  <React.StrictMode>
    <${componentName}Isolation />
  </React.StrictMode>
);`;
}

/**
 * Find page entries
 * @param {Array} pageFiles - List of page files
 * @returns {Object} Map of page entries
 */
function findPageEntries(pageFiles) {
  let entries = {};
  
  if (pageFiles.length > 0) {
    // MPA mode - use pages/*/index.tsx files as entry points
    pageFiles.forEach(file => {
      // Extract page name from path: src/pages/home/index.tsx => home
      const pageName = path.basename(path.dirname(file));
      entries[pageName] = file;
    });
  } else {
    // Fallback to SPA mode if no pages found
    entries['index'] = 'src/index.tsx';
  }
  
  return entries;
}

/**
 * Find test entries
 * @param {Array} testFiles - List of test files
 * @returns {Object} Map of test entries
 */
function findTestEntries(testFiles) {
  let entries = {};
  
  testFiles.forEach(file => {
    // For test entries, use a flattened name format
    const componentDir = path.dirname(file);
    const componentName = path.basename(componentDir);
    const testName = path.basename(file, path.extname(file));
    entries[`${componentName}${testName.replace('.test', 'Test')}`] = file;
  });
  
  return entries;
}
