import { join } from 'path';
import { Worker } from 'worker_threads';
import { fileURLToPath } from 'url';
import { Config, ModuleMetadata } from '../shared.js';

export async function runWorker(
  metadata: ModuleMetadata,
  modules: Map<string, ModuleMetadata>,
  config: Config,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      join(fileURLToPath(import.meta.url), '../../worker.js'),
    );
    worker.postMessage({ metadata, modules, config });
    worker.on('message', (returnValue) => {
      resolve(returnValue);
    });
    worker.on('error', (e) => {
      // eslint-disable-next-line no-console
      console.error(e);
      reject();
    });
  });
}
