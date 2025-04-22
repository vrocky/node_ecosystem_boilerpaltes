import serve from 'rollup-plugin-serve';
import livereload from 'rollup-plugin-livereload';

/**
 * Creates a properly configured development server
 * @param {Object} env - Environment settings
 * @returns {Array} Array of server plugins
 */
export function createDevServer(env) {
  if (!env.isDevelopment) return [];
  
  console.log(`Starting development server on port: ${env.port}`);
  
  return [
    serve({
      open: true,
      contentBase: ['dist'],
      port: env.port,
      headers: {
        'Access-Control-Allow-Origin': '*',
        // Set correct MIME types for JavaScript modules
        'Content-Type': (req, file) => {
          if (file.endsWith('.js')) return 'application/javascript';
          if (file.endsWith('.mjs')) return 'application/javascript';
          return null; // Let the server decide for other files
        },
      },
      historyApiFallback: true,
    }),
    livereload({
      watch: 'dist',
      verbose: false,
      delay: 300,
    })
  ];
}
