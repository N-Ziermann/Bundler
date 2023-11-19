import { parentPort } from 'worker_threads';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { transformSync } from '@babel/core';

/**
 * @typedef { {
 *  metadata: import("./shared.d.ts").ModuleMetadata
 *  modules: Map<string, import("./shared.d.ts").ModuleMetadata>
 *  config: import("./shared.d.ts").Config
 * } } MessagePayload
 */

/**
 * @param { MessagePayload } payload
 */
function onmessage(payload) {
  const { metadata, modules, config } = payload;
  const { dependencyMap, id } = metadata;
  let { code } = metadata;

  code = transformCode(code, config.babelConfig);

  for (const [dependencyName, dependencyPath] of dependencyMap) {
    const dependency = modules.get(dependencyPath);
    if (config.assetExtensions.some((ex) => dependencyPath.endsWith(ex))) {
      const extension = config.assetExtensions.find((ex) =>
        dependencyPath.endsWith(ex),
      );
      // todo use uuid instead of random number
      const newFileName = `${Math.random() * 10000}${extension}`;
      const fileContent = readFileSync(dependencyPath);
      writeFileSync(join(config.outputDirectory, newFileName), fileContent);
      code = code.replaceAll(
        new RegExp(
          `require\\(('|")${dependencyName.replace(/[/.]/g, '\\$&')}\\1\\)`,
          'g',
        ),
        `"/${newFileName}"`,
      );
      continue;
    }
    if (!dependency) {
      throw new Error(`No dependency found for path "${dependencyPath}"`);
    }
    // replace all dependecies of the current module with their dependency-id
    code = code.replaceAll(
      new RegExp(
        `require\\(('|")${dependencyName.replace(/[/.]/g, '\\$&')}\\1\\)`,
        'g',
      ),
      `require(${dependency.id})`,
    );
  }
  code = wrapModule(id, code);
  parentPort?.postMessage(code);
  parentPort?.close();
}

parentPort?.on('message', onmessage);

/**
 *
 * @param { Number } id
 * @param { String } code
 * @returns { String }
 */
function wrapModule(id, code) {
  return `define(${id}, function(module, exports, require) {\n${code}});`;
}

/**
 *
 * @param { String } code
 * @param { import("@babel/core/").TransformOptions } babelConfig
 * @returns { String }
 */
export function transformCode(code, babelConfig) {
  return transformSync(code, babelConfig)?.code ?? code;
}
