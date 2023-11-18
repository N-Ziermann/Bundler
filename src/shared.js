import { transformSync } from '@babel/core';

/**
 * @typedef {{
 *  entryPoint: String,
 *  sourceDirectory: String,
 *  extensions: String[],
 *  outputDirectory: String,
 *  babelConfig: Object,
 * }} Config
 */

/**
 * @typedef {{
 *  code: string,
 *  dependencyMap: Map<string, string>, // Map<dependencyName, dependencyPath>
 *  id: number,
 * }} ModuleMetadata
 */

/**
 *
 * @param { String } code
 * @param { @babel/core/TransformOptions } babelConfig
 * @returns { String }
 */
export function transformCode(code, babelConfig) {
  return transformSync(code, babelConfig)?.code ?? code;
}

/**
 * @type { Config }
 */
export const DEFAULT_CONFIG = {
  entryPoint: 'index.js',
  sourceDirectory: '/example',
  extensions: ['.js', '.ts'],
  outputDirectory: 'dist',
  babelConfig: {
    plugins: [
      '@babel/plugin-transform-modules-commonjs',
      '@babel/plugin-transform-typescript',
    ],
  },
};
