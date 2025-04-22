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
 * Create MPA page files
 * @param {string} pageName - Page name
 */
async function createPage(pageName) {
  // Convert page name to lowercase for directory name
  const pageNameLower = pageName.toLowerCase();
  const pageNameCapitalized = pageName.charAt(0).toUpperCase() + pageName.slice(1);
  
  const baseDir = path.join(projectRoot, 'src', 'pages', pageNameLower);
  const indexFile = path.join(baseDir, 'index.tsx');
  const pageFile = path.join(baseDir, `${pageNameLower}.tsx`);
  const styleFile = path.join(baseDir, `${pageNameLower}.scss`);
  
  // Create page directory
  createDirIfNotExist(baseDir);
  
  // Create index file with proper relative imports
  const indexContent = `import React from 'react';
import { createRoot } from 'react-dom/client';
import ${pageNameCapitalized}Page from './${pageNameLower}';
import './${pageNameLower}.scss';

const container = document.getElementById('root');
if (!container) throw new Error('Root element not found');

const root = createRoot(container);
root.render(
  <React.StrictMode>
    <${pageNameCapitalized}Page />
  </React.StrictMode>
);
`;

  fs.writeFileSync(indexFile, indexContent);
  console.log(`Created index file: ${indexFile}`);
  
  // Create page component file with alias imports
  const pageContent = `import React from 'react';
// You can use alias imports for components
// import SomeComponent from '@components/SomeComponent/SomeComponent';

const ${pageNameCapitalized}Page: React.FC = () => {
  return (
    <div className="${pageNameLower}-page">
      <header>
        <h1>${pageNameCapitalized} Page</h1>
      </header>
      <main>
        <p>This is the ${pageNameLower} page content.</p>
      </main>
      <footer>
        <nav>
          <ul>
            <li><a href="/">Home</a></li>
            {/* Add links to other pages */}
          </ul>
        </nav>
      </footer>
    </div>
  );
};

export default ${pageNameCapitalized}Page;
`;

  fs.writeFileSync(pageFile, pageContent);
  console.log(`Created page component file: ${pageFile}`);
  
  // Create style file
  const styleContent = `.${pageNameLower}-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  
  header {
    margin-bottom: 2rem;
    border-bottom: 1px solid #eaeaea;
    padding-bottom: 1rem;
    
    h1 {
      font-size: 2rem;
      color: #333;
    }
  }
  
  main {
    min-height: 60vh;
  }
  
  footer {
    margin-top: 2rem;
    padding-top: 1rem;
    border-top: 1px solid #eaeaea;
    
    nav ul {
      list-style: none;
      padding: 0;
      display: flex;
      gap: 1rem;
      
      a {
        color: #0070f3;
        text-decoration: none;
        
        &:hover {
          text-decoration: underline;
        }
      }
    }
  }
}
`;

  fs.writeFileSync(styleFile, styleContent);
  console.log(`Created style file: ${styleFile}`);
}

async function main() {
  try {
    console.log('MPA Page Creator');
    console.log('===============');
    
    const pageName = await askQuestion('Enter page name (e.g., "home", "about", "contact"): ');
    
    if (!pageName) {
      console.error('Page name is required.');
      process.exit(1);
    }
    
    await createPage(pageName);
    
    console.log('\nSuccess! Page created.');
    console.log(`Run 'npm run dev' to view the page at http://localhost:3000/${pageName === 'home' || pageName === 'index' ? '' : pageName}/`);
    
  } catch (error) {
    console.error('Error creating page:', error);
  } finally {
    rl.close();
  }
}

main();
