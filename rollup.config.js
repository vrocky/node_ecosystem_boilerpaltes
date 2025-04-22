import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import replace from '@rollup/plugin-replace';
import serve from 'rollup-plugin-serve';
import livereload from 'rollup-plugin-livereload';

const isDevelopment = process.env.NODE_ENV === 'development';
const port = process.env.PORT || 3001; // Use PORT env variable or default to 3001

export default {
  input: 'src/index.tsx',
  output: {
    file: 'dist/bundle.js',
    format: 'iife',
    sourcemap: true
  },
  plugins: [
    replace({
      'process.env.NODE_ENV': JSON.stringify(isDevelopment ? 'development' : 'production'),
      preventAssignment: true
    }),
    resolve({
      extensions: ['.js', '.jsx', '.ts', '.tsx']
    }),
    commonjs(),
    typescript({
      tsconfig: './tsconfig.json',
      sourceMap: true
    }),
    isDevelopment && serve({
      open: true,
      contentBase: ['dist', 'public'],
      port: port
    }),
    isDevelopment && livereload('dist')
  ]
};