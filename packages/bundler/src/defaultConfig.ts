import { Config } from './shared.js';

export const DEFAULT_CONFIG = {
  entryPoint: 'src/index.js',
  projectRoot: '.',
  extensions: ['.js', '.ts', '.jsx', '.tsx'],
  loaders: {
    asset: {
      extensions: ['.png', '.jpg', '.svg'],
    },
    css: {
      extensions: ['.css'],
    },
  },
  outputDirectory: 'dist',
  publicDirectory: 'public',
  babelConfig: {
    plugins: [
      '@babel/plugin-transform-modules-commonjs',
      '@babel/plugin-transform-typescript',
    ],
  },
} satisfies Config;
