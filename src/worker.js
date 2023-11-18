import { parentPort } from 'worker_threads';
import { transformCode } from './shared.js';

/**
 * @typedef {{
 *  metadata: ./shared.js/ModuleMetadata,
 *  modules: Map<string, ModuleMetadata>,
 *  config: ./shared.js/Config
 * }} MessagePayload
 */

/**
 * @param { MessagePayload } payload
 */
function onmessage(payload) {
  const { metadata, modules, config } = payload;
  let { dependencyMap, code, id } = metadata;

  code = transformCode(code, config.babelConfig);

  for (const [dependencyName, dependencyPath] of dependencyMap) {
    const dependency = modules.get(dependencyPath);
    if (!dependency) {
      throw new Error(`No dependency found for path "${dependencyPath}"`);
    }
    // replace all dependecies of the current module with their dependency-id
    code = code.replaceAll(
      new RegExp(
        `require\\(('|")${dependencyName.replace(/[\/.]/g, '\\$&')}\\1\\)`,
        'g'
      ),
      `require(${dependency.id})`
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
