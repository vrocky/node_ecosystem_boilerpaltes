export default {
  plugins: [
    // Resolve @import rules
    import('postcss-import').then(({ default: postcssImport }) => postcssImport()),
    
    // Process url() references
    import('postcss-url').then(({ default: postcssUrl }) => 
      postcssUrl({
        url: 'rebase', // Rebase URLs to match final CSS location
      })
    ),
    
    // Add vendor prefixes
    import('autoprefixer').then(({ default: autoprefixer }) => 
      autoprefixer({
        grid: true, // Enable Grid Layout prefixes
        flexbox: true // Enable Flexbox prefixes
      })
    ),
    
    // Minify CSS in production
    process.env.NODE_ENV !== 'development' && 
      import('cssnano').then(({ default: cssnano }) => 
        cssnano({
          preset: ['default', {
            discardComments: { removeAll: true },
            normalizeWhitespace: false // Keep formatting in development
          }]
        })
      )
  ].filter(Boolean) // Remove falsy plugins (like cssnano in development)
};
