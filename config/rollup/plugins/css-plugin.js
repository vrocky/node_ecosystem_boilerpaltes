import path from 'path';
import fs from 'fs';
import * as sass from 'sass';
import { projectRoot } from '../../../rollup.config.js';

/**
 * Plugin for CSS file generation
 * @param {Object} entries - Entry points
 * @param {Object} env - Environment settings
 * @returns {Object} CSS file generator plugin
 */
export function createCssPlugin(entries, env) {
  return {
    name: 'css-file-generator',
    async generateBundle(outputOptions, bundle) {
      // Create output directory for CSS
      const cssOutputDir = path.join('dist', 'assets', 'css');
      if (!fs.existsSync(cssOutputDir)) {
        fs.mkdirSync(cssOutputDir, { recursive: true });
      }

      // Get all entry points and their associated styles
      for (const [entryName, entryInfo] of Object.entries(entries)) {
        try {
          const entryPath = entryInfo.toString();
          const entryDir = path.dirname(entryPath);
          
          // Find the main component name
          const filename = path.basename(entryPath);
          const componentName = filename.replace(/\.isolation\.tsx$/, '').replace(/\.tsx$/, '');
          
          // Find associated SCSS file
          let scssPath = path.join(entryDir, `${componentName}.scss`);
          
          if (fs.existsSync(scssPath)) {
            // Read SCSS content
            const scssContent = fs.readFileSync(scssPath, 'utf8');
            
            // Process SCSS with proper source map
            const result = sass.compileString(scssContent, {
              style: env.isDevelopment ? 'expanded' : 'compressed',
              sourceMap: env.isDevelopment, // Always generate in dev mode
              sourceMapIncludeSources: true,
              sourceMapRoot: path.relative(cssOutputDir, entryDir),
              url: new URL(`file://${scssPath}`),
              syntax: 'scss',
            });
            
            // Write CSS file
            const cssPath = path.join(cssOutputDir, `${entryName}.css`);
            
            // Add sourceMappingURL comment if in dev mode
            let cssContent = result.css;
            if (env.isDevelopment) {
              // Ensure the sourceMappingURL comment exists
              if (!cssContent.includes('sourceMappingURL')) {
                cssContent += `\n/*# sourceMappingURL=${entryName}.css.map */`;
              }
            }
            
            fs.writeFileSync(cssPath, cssContent);
            console.log(`Generated CSS: ${cssPath}`);
            
            // Write source map with proper content
            if (env.isDevelopment) {
              try {
                const sourceMapPath = path.join(cssOutputDir, `${entryName}.css.map`);
                
                // Create a more complete source map for better debugging
                const sourceMap = {
                  version: 3,
                  file: `${entryName}.css`,
                  sources: [`${componentName}.scss`],
                  sourcesContent: [scssContent],
                  names: [],
                  mappings: result.sourceMap ? result.sourceMap.mappings : '',
                  sourceRoot: ''
                };
                
                fs.writeFileSync(sourceMapPath, JSON.stringify(sourceMap, null, 2));
                console.log(`Generated source map: ${sourceMapPath}`);
              } catch (mapError) {
                console.error(`Error generating source map for ${entryName}.css:`, mapError);
              }
            }
          }
          
          // Also look for any page or component specific CSS in the same directory
          const entryBasename = path.basename(entryPath, path.extname(entryPath));
          const specificScssPath = path.join(entryDir, `${entryBasename}.scss`);
          
          if (fs.existsSync(specificScssPath) && specificScssPath !== scssPath) {
            // Process the specific SCSS file
            const scssContent = fs.readFileSync(specificScssPath, 'utf8');
            const result = sass.compileString(scssContent, {
              style: env.isDevelopment ? 'expanded' : 'compressed',
              sourceMap: env.isDevelopment,
              sourceMapIncludeSources: true,
              syntax: 'scss',
            });
            
            // Output CSS with the same name as the entry
            const specificCssPath = path.join(cssOutputDir, `${entryName}-specific.css`);
            let cssContent = result.css;
            
            if (env.isDevelopment) {
              if (!cssContent.includes('sourceMappingURL')) {
                cssContent += `\n/*# sourceMappingURL=${entryName}-specific.css.map */`;
              }
            }
            
            fs.writeFileSync(specificCssPath, cssContent);
            console.log(`Generated specific CSS: ${specificCssPath}`);
            
            // Write source map
            if (env.isDevelopment) {
              try {
                const sourceMapPath = path.join(cssOutputDir, `${entryName}-specific.css.map`);
                const sourceMap = {
                  version: 3,
                  file: `${entryName}-specific.css`,
                  sources: [`${entryBasename}.scss`],
                  sourcesContent: [scssContent],
                  names: [],
                  mappings: result.sourceMap ? result.sourceMap.mappings : '',
                  sourceRoot: ''
                };
                fs.writeFileSync(sourceMapPath, JSON.stringify(sourceMap, null, 2));
                console.log(`Generated specific source map: ${sourceMapPath}`);
              } catch (mapError) {
                console.error(`Error generating source map for ${entryName}-specific.css:`, mapError);
              }
            }
          }
        } catch (error) {
          console.error(`Error generating CSS for ${entryName}:`, error);
        }
      }
      
      // Also make sure we handle the index.css mapping
      const indexCssPath = path.join(cssOutputDir, 'index.css');
      if (fs.existsSync(indexCssPath) && env.isDevelopment) {
        try {
          // Read the content to check if it has sourcemap
          let indexCss = fs.readFileSync(indexCssPath, 'utf8');
          
          // Add sourcemap comment if missing
          if (!indexCss.includes('sourceMappingURL')) {
            indexCss += '\n/*# sourceMappingURL=index.css.map */';
            fs.writeFileSync(indexCssPath, indexCss);
            console.log('Added sourcemap reference to index.css');
          }
        } catch (err) {
          console.error('Error updating index.css sourcemap reference:', err);
        }
      }
    }
  };
}
