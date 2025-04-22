import path from 'path';
import fs from 'fs';
import * as sass from 'sass';
import postcss from 'postcss';
import autoprefixer from 'autoprefixer';
import { projectRoot } from '../paths.js';

// Load PostCSS plugins directly to avoid CommonJS/ESM conflicts
async function loadPostcssPlugins() {
  const isDev = process.env.NODE_ENV === 'development';
  
  const plugins = [
    // Always include autoprefixer
    autoprefixer({ grid: true, flexbox: true })
  ];

  // Add cssnano in production mode
  if (!isDev) {
    const cssnano = (await import('cssnano')).default;
    plugins.push(cssnano({
      preset: ['default', {
        discardComments: { removeAll: true },
        normalizeWhitespace: false
      }]
    }));
  }

  return plugins;
}

/**
 * Process SCSS with PostCSS for better source maps
 * @param {string} cssContent - CSS content to process
 * @param {string} from - Source file path
 * @param {string} to - Output file path
 * @param {boolean} generateSourceMaps - Whether to generate source maps
 * @returns {Promise<Object>} Processed CSS and source map
 */
async function processWithPostcss(cssContent, from, to, generateSourceMaps) {
  const plugins = await loadPostcssPlugins();
  
  // Process with PostCSS - use the dedicated flag for source maps
  const result = await postcss(plugins).process(cssContent, {
    from,
    to,
    map: generateSourceMaps ? {
      inline: false,
      annotation: true, // Add annotation to link the map
      sourcesContent: true // Include original source in the map
    } : false
  });
  
  return {
    css: result.css,
    map: result.map ? result.map.toString() : null
  };
}

/**
 * Create a sourcemap comment to append to CSS files
 * @param {string} cssFilename - CSS filename for reference in the sourcemap
 * @returns {string} Sourcemap comment
 */
function createSourcemapComment(cssFilename) {
  return `\n/*# sourceMappingURL=${path.basename(cssFilename)}.map */`;
}

/**
 * Plugin for CSS file generation with PostCSS support
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

      // Track all CSS files for source map verification
      const generatedFiles = [];
      
      // Process each entry point
      for (const [entryName, entryInfo] of Object.entries(entries)) {
        try {
          const entryPath = entryInfo.toString();
          const entryDir = path.dirname(entryPath);
          
          // Find the main component name
          const filename = path.basename(entryPath);
          const componentName = filename.replace(/\.isolation\.tsx$/, '').replace(/\.tsx$/, '');
          
          // Find associated SCSS file
          const scssPath = path.join(entryDir, `${componentName}.scss`);
          
          if (fs.existsSync(scssPath)) {
            // Process SCSS with proper source map
            const sassResult = sass.compile(scssPath, {
              style: env.isDevelopment ? 'expanded' : 'compressed',
              sourceMap: env.generateSourceMaps, // Use dedicated flag
              sourceMapIncludeSources: true
            });
            
            // Define output paths
            const cssFileName = `${entryName}.css`;
            const cssPath = path.join(cssOutputDir, cssFileName);
            
            // Process with PostCSS for better browser compatibility
            const processedCss = await processWithPostcss(
              sassResult.css.toString(),
              scssPath,
              cssPath,
              env.generateSourceMaps
            );
            
            // Ensure sourcemap comment exists
            let cssContent = processedCss.css;
            if (env.generateSourceMaps && !cssContent.includes('sourceMappingURL')) {
              cssContent += createSourcemapComment(cssFileName);
            }
            
            // Write processed CSS
            fs.writeFileSync(cssPath, cssContent);
            generatedFiles.push({ path: cssPath, hasSourceMap: env.generateSourceMaps });
            console.log(`Generated CSS: ${cssPath}`);
            
            // Write source map if needed
            if (env.generateSourceMaps && processedCss.map) {
              const mapPath = `${cssPath}.map`;
              fs.writeFileSync(mapPath, processedCss.map);
              console.log(`Generated source map: ${mapPath}`);
            }
          }
          
          // Look for page/component specific CSS
          const entryBasename = path.basename(entryPath, path.extname(entryPath));
          const specificScssPath = path.join(entryDir, `${entryBasename}.scss`);
          
          if (fs.existsSync(specificScssPath) && specificScssPath !== scssPath) {
            // Process with Sass
            const sassResult = sass.compile(specificScssPath, {
              style: env.isDevelopment ? 'expanded' : 'compressed',
              sourceMap: env.generateSourceMaps,
              sourceMapIncludeSources: true
            });
            
            // Define output paths
            const specificCssFileName = `${entryName}-specific.css`;
            const specificCssPath = path.join(cssOutputDir, specificCssFileName);
            
            // Process with PostCSS
            const processedCss = await processWithPostcss(
              sassResult.css.toString(),
              specificScssPath,
              specificCssPath,
              env.generateSourceMaps
            );
            
            // Ensure sourcemap comment exists
            let cssContent = processedCss.css;
            if (env.generateSourceMaps && !cssContent.includes('sourceMappingURL')) {
              cssContent += createSourcemapComment(specificCssFileName);
            }
            
            // Write CSS
            fs.writeFileSync(specificCssPath, cssContent);
            generatedFiles.push({ path: specificCssPath, hasSourceMap: env.generateSourceMaps });
            console.log(`Generated specific CSS: ${specificCssPath}`);
            
            // Write source map
            if (env.generateSourceMaps && processedCss.map) {
              const mapPath = `${specificCssPath}.map`;
              fs.writeFileSync(mapPath, processedCss.map);
              console.log(`Generated specific source map: ${mapPath}`);
            }
          }
        } catch (error) {
          console.error(`Error generating CSS for ${entryName}:`, error);
        }
      }
      
      // Check for index.css if it exists but doesn't have a source map
      const indexCssPath = path.join(cssOutputDir, 'index.css');
      if (fs.existsSync(indexCssPath) && env.isDevelopment) {
        // Verify all generated files have sourcemap comments and files
        console.log('\n=== CSS Source Map Verification ===');
        for (const file of generatedFiles) {
          if (file.hasSourceMap) {
            const cssContent = fs.readFileSync(file.path, 'utf8');
            const mapPath = `${file.path}.map`;
            const hasComment = cssContent.includes('sourceMappingURL');
            const hasFile = fs.existsSync(mapPath);
            
            console.log(`${path.basename(file.path)}: ${hasComment ? '✓' : '✗'} Comment ${hasFile ? '✓' : '✗'} File`);
            
            // Fix if needed
            if (!hasComment && hasFile) {
              const updatedContent = cssContent + createSourcemapComment(path.basename(file.path));
              fs.writeFileSync(file.path, updatedContent);
              console.log(`  Fixed: Added missing sourcemap comment to ${path.basename(file.path)}`);
            } else if (hasComment && !hasFile) {
              console.warn(`  Warning: ${path.basename(file.path)} has sourcemap comment but no .map file`);
            }
          }
        }
      }
    }
  };
}
