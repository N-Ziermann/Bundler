import { join } from 'path';
import { fileURLToPath } from 'url';
import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  cpSync,
  rmSync,
} from 'fs';
import type { Config, ModuleMetadata } from './shared.js';
import { transformCode } from './worker.js';
import { runWorker } from './functions/runWorker.js';
import { addExtensionToImportIfMissing } from './functions/addExtensionToImportIfMissing.js';
import { getModulePath } from './functions/getModulePath.js';
import { getLoader } from './loaders/getLoader.js';
import { DEFAULT_CONFIG } from './defaultConfig.js';

export async function main() {
  const currentWorkingDirectory = process.cwd();
  const configPath = join(currentWorkingDirectory, 'bundler.json');
  const config: Config = existsSync(configPath)
    ? { ...DEFAULT_CONFIG, ...JSON.parse(readFileSync(configPath, 'utf-8')) }
    : DEFAULT_CONFIG;
  const projectRoot = join(currentWorkingDirectory, config.projectRoot);
  clearOutputDirectory(config);
  const modules = getModules(config, projectRoot);
  await createOutputFileFromModules(modules, config);
  copyPublicFilesToOutputDirectory(config, projectRoot);
}

async function createOutputFileFromModules(
  modules: Map<string, ModuleMetadata>,
  config: Config,
) {
  const output = await Promise.all(
    Array.from(modules)
      .reverse()
      .map(([_, metadata]) => runWorker(metadata, modules, config)),
  );
  let requireFilePath = join(fileURLToPath(import.meta.url), '../require.ts');
  if (!existsSync(requireFilePath)) {
    requireFilePath = join(fileURLToPath(import.meta.url), '../require.js');
  }
  output.unshift(
    transformCode(readFileSync(requireFilePath, 'utf8'), config.babelConfig),
  );
  output.unshift(
    "const exports = {};\nconst process = { env: { NODE_ENV: 'PRODUCTION' } };",
  );
  output.push('requireModule(0);');
  writeFileSync(join(config.outputDirectory, 'index.js'), output.join('\n'));
}

function getModules(config: Config, projectRoot: string) {
  let moduleCounter = 0;
  const seenModules = new Set<string>();
  const modules = new Map<string, ModuleMetadata>();
  const queue: { path: string; name: string }[] = [
    { path: projectRoot, name: `./${config.entryPoint}` },
  ];
  while (queue.length > 0) {
    const moduleEntry = queue.shift();
    if (!moduleEntry) {
      throw new Error(
        'Dependecies could not be processed. (If you are seing this error something went wrong inside the bundler)',
      );
    }
    const module = getModulePath(
      moduleEntry.name,
      moduleEntry.path,
      config,
      projectRoot,
    );
    if (!module || seenModules.has(module)) {
      continue;
    }
    seenModules.add(module);
    const id = moduleCounter++;
    let metadata: ModuleMetadata = {
      dependencyMap: new Map(),
      code: '',
      id,
      requireStatement: '',
    };
    const moduleLoader = getLoader(module, config);
    const loaderResponse = moduleLoader({
      modulePath: module,
      config,
      moduleId: id,
      projectRoot,
    });
    metadata = {
      dependencyMap: loaderResponse.dependencyMap,
      code: loaderResponse.moduleCode,
      id,
      requireStatement: loaderResponse.requireStatement,
    };
    modules.set(module, metadata);
    [...metadata.dependencyMap.keys()].forEach((dep) => {
      const currentPath = join(module, '../');
      return queue.push({
        path: currentPath,
        name: addExtensionToImportIfMissing(
          dep,
          config.extensions,
          currentPath,
          config,
        ),
      });
    });
  }
  return modules;
}

function clearOutputDirectory(config: Config) {
  if (existsSync(config.outputDirectory)) {
    rmSync(config.outputDirectory, { recursive: true });
  }
  mkdirSync(config.outputDirectory, { recursive: true });
}

function copyPublicFilesToOutputDirectory(config: Config, projectRoot: string) {
  const dir = join(projectRoot, config.publicDirectory);
  if (existsSync(dir)) {
    cpSync(dir, config.outputDirectory, { recursive: true });
  }
}
