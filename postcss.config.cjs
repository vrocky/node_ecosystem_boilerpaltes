module.exports = {
  plugins: [
    require('autoprefixer')({
      grid: true,
      flexbox: true
    }),
    process.env.NODE_ENV !== 'development' && require('cssnano')({
      preset: ['default', {
        discardComments: { removeAll: true },
        normalizeWhitespace: false
      }]
    })
  ].filter(Boolean)
};
