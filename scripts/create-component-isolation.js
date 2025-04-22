import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * Ask a question and get user input
 * @param {string} question - The question to ask
 * @returns {Promise<string>} - User input
 */
function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

/**
 * Create directory recursively if it doesn't exist
 * @param {string} dirPath - Directory path
 */
function createDirIfNotExist(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`Created directory: ${dirPath}`);
  }
}

/**
 * Create component isolation files
 * @param {string} componentPath - Component path (relative to src)
 * @param {string} componentName - Component name
 * @param {boolean} createDemoComponent - Whether to create a demo component
 */
async function createComponentIsolation(componentPath, componentName, createDemoComponent) {
  const basePath = componentPath.startsWith('src/') ? componentPath : `src/${componentPath}`;
  const baseDir = path.join(projectRoot, basePath);
  const componentFile = path.join(baseDir, `${componentName}.tsx`);
  const styleFile = path.join(baseDir, `${componentName}.scss`);
  const isolationFile = path.join(baseDir, `${componentName}.isolation.tsx`);
  
  // Create component directory
  createDirIfNotExist(baseDir);
  
  // Create component file if requested or doesn't exist
  if (createDemoComponent || !fs.existsSync(componentFile)) {
    const componentProps = await askQuestion('Enter component props (comma-separated, e.g., "text:string, onClick:() => void"): ');
    
    const propsArray = componentProps ? componentProps.split(',').map(prop => prop.trim()) : [];
    const propsInterface = propsArray.length > 0 
      ? `interface ${componentName}Props {\n  ${propsArray.join(';\n  ')};\n}` 
      : `interface ${componentName}Props {}\n`;
    
    const componentContent = `import React from 'react';
import './${componentName}.scss';

${propsInterface}

const ${componentName}: React.FC<${componentName}Props> = (${propsArray.length > 0 ? 'props' : ''}) => {
  return (
    <div className="${componentName.toLowerCase()}-container">
      <h2>${componentName} Component</h2>
      {/* Implement your component here */}
    </div>
  );
};

export default ${componentName};
`;
    
    fs.writeFileSync(componentFile, componentContent);
    console.log(`Created component file: ${componentFile}`);
  }
  
  // Create style file if it doesn't exist
  if (!fs.existsSync(styleFile)) {
    const styleContent = `.${componentName.toLowerCase()}-container {
  /* Add your styles here */
  padding: 16px;
  border: 1px solid #ccc;
  border-radius: 4px;
  margin-bottom: 16px;
}
`;
    
    fs.writeFileSync(styleFile, styleContent);
    console.log(`Created style file: ${styleFile}`);
  }
  
  // Create isolation file
  const isolationContent = `import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import ${componentName} from './${componentName}';
import './${componentName}.scss';

// Isolation wrapper to demonstrate the component with different props
const ${componentName}Isolation: React.FC = () => {
  const [state, setState] = useState({
    // Add state properties to control your component
  });

  return (
    <div className="${componentName.toLowerCase()}-isolation">
      <h1>${componentName} Component</h1>
      <div className="component-path">Path: ${componentPath}/</div>
      
      <div className="component-showcase">
        <h3>Default State</h3>
        <${componentName} />
      </div>
      
      <div className="component-showcase">
        <h3>With Props</h3>
        <${componentName} />
      </div>
      
      <div className="component-showcase">
        <h3>Interactive Example</h3>
        <div className="controls">
          {/* Add controls to manipulate component props */}
        </div>
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
);
`;
  
  fs.writeFileSync(isolationFile, isolationContent);
  console.log(`Created isolation file: ${isolationFile}`);
}

async function main() {
  try {
    console.log('Component Isolation Creator');
    console.log('==========================');
    
    const componentPath = await askQuestion('Enter component path (e.g., "components/Button" or "features/Auth"): ');
    
    if (!componentPath) {
      console.error('Component path is required.');
      process.exit(1);
    }
    
    const componentName = await askQuestion('Enter component name (PascalCase): ');
    
    if (!componentName) {
      console.error('Component name is required.');
      process.exit(1);
    }
    
    // Ensure component name starts with capital letter (PascalCase)
    if (componentName[0] !== componentName[0].toUpperCase()) {
      console.error('Component name should be in PascalCase (start with uppercase letter).');
      process.exit(1);
    }
    
    const createDemoComponent = (await askQuestion('Create new component file? (y/n): ')).toLowerCase() === 'y';
    
    await createComponentIsolation(componentPath, componentName, createDemoComponent);
    
    console.log('\nSuccess! Component isolation created.');
    console.log(`Run 'npm run dev:isolation' to view the component at its path.`);
    
  } catch (error) {
    console.error('Error creating component isolation:', error);
  } finally {
    rl.close();
  }
}

main();
