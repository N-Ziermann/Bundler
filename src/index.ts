#!/usr/bin/env node
import { join } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { Worker } from 'worker_threads';
import {
  Config,
  DEFAULT_CONFIG,
  ModuleMetadata,
  transformCode,
} from './shared.js';

// todo outputFile currently doesnt automatically create a dir if set to something like /build/out.js
// todo: general code cleanup
// todo: asset loading (css, png, svg) [configurable in config file]
// todo: support for imports object in package.json
// todo: eslint
// todo: create sample project that uses react & typescript & that imports some css and pngs

type TypeSpecificExportImportEntry = {
  'node-addons'?: string | null;
  node?: string | null;
  deno?: string | null;
  worker?: string | null;
  browser?: string | null;
  import?: string | null;
  require?: string | null;
  development?: string | null;
  production?: string | null;
  default?: string | null;
};
type ExportEntry =
  | string
  | { [key: string]: null | string | TypeSpecificExportImportEntry };

type PackageJsonContent = {
  main?: string;
  exports?: ExportEntry;
};

async function main() {
  const currentWorkingDirectory = process.cwd();
  const configPath = join(currentWorkingDirectory, 'bundler.json');
  const config: Config = existsSync(configPath)
    ? JSON.parse(readFileSync(configPath, 'utf-8'))
    : DEFAULT_CONFIG;
  const root = join(currentWorkingDirectory, config.sourceDirectory);
  const nodeModulesPath = join(currentWorkingDirectory, 'node_modules');

  let moduleCounter = 0;
  const seenModules = new Set<string>();
  const modules = new Map<string, ModuleMetadata>();
  const queue: { path: string; name: string }[] = [
    { path: root, name: `./${config.entryPoint}` },
  ];
  while (queue.length > 0) {
    const moduleEntry = queue.shift();
    if (!moduleEntry) {
      throw new Error(
        'Dependecies could not be processed. (If you are seing this error something went wrong inside the bundler)'
      );
    }
    const module = getModulePath(moduleEntry.name, moduleEntry.path);
    if (!module || seenModules.has(module)) {
      continue;
    }
    seenModules.add(module);
    const code = readFileSync(module, 'utf-8');
    const dependencyMap = getDependencies(module, code);
    const metadata: ModuleMetadata = {
      dependencyMap,
      code: code,
      id: moduleCounter++,
    };
    modules.set(module, metadata);
    [...dependencyMap.keys()].forEach((dep) => {
      const currentPath = join(module, '../');
      return queue.push({
        path: currentPath,
        name: addExtensionToImportIfMissing(
          dep,
          config.extensions,
          currentPath
        ),
      });
    });
  }
  const output = await Promise.all(
    Array.from(modules)
      .reverse()
      .map(([module, metadata]) => runWorker(metadata, modules, config))
  );
  let requireFilePath = join(fileURLToPath(import.meta.url), '../require.ts');
  if (!existsSync(requireFilePath)) {
    requireFilePath = join(fileURLToPath(import.meta.url), '../require.js');
  }
  output.unshift(
    transformCode(readFileSync(requireFilePath, 'utf8'), config.babelConfig)
  );
  output.unshift(
    "const exports = {};\nconst process = { env: { NODE_ENV: 'PRODUCTION' } };"
  );
  output.push('requireModule(0);');
  writeFileSync(config.outputFile, output.join('\n'));

  function getDependencies(path: string, code: string): Map<string, string> {
    const currentPath = join(path, '../');
    const dependencyMap = new Map<string, string>();
    const importRegex = /import [^"']*["']([^"']*)["']/g;
    const importMatchLists = [...code.matchAll(importRegex)].map((matches) =>
      matches?.filter((match) => !match.match(/["']/))
    );
    const requireRegex = /require\(["']([^"']*)["']\)/g;
    const requireMatchLists = [...code.matchAll(requireRegex)].map((matches) =>
      matches?.filter((match) => !match.includes('require('))
    );
    const matchLists = [...requireMatchLists, ...importMatchLists];
    matchLists.forEach((matchList) =>
      matchList.forEach((match) => {
        const isNodeModule = !isRelativePath(match);
        if (isNodeModule) {
          const modulePath = getModulePath(match, currentPath);
          return dependencyMap.set(match, modulePath);
        }
        return dependencyMap.set(
          match,
          join(
            currentPath,
            addExtensionToImportIfMissing(match, config.extensions, currentPath)
          )
        );
      })
    );
    return dependencyMap;
  }

  function addExtensionToImportIfMissing(
    importPath: string,
    extensions: string[],
    currentPath: string
  ) {
    const isNodeModule = !isRelativePath(importPath);
    if (
      isNodeModule ||
      extensions.some((extension) => importPath.endsWith(extension))
    ) {
      return importPath;
    }
    for (const extension of extensions) {
      const completePath = join(currentPath, importPath) + extension;
      if (existsSync(completePath)) {
        return importPath + extension;
      }
    }
    throw new Error(`No module called '${importPath}' was found`);
  }

  function isRelativePath(path: string) {
    return path.startsWith('.');
  }

  function getModulePath(moduleName: string, currentPath: string): string {
    if (isRelativePath(moduleName)) {
      return join(
        currentPath,
        addExtensionToImportIfMissing(
          moduleName,
          config.extensions,
          currentPath
        )
      );
    }
    const moduleNameParts = moduleName.split('/');
    const moduleNameRelevantForPath = moduleNameParts[0].startsWith('@')
      ? moduleNameParts[0] + '/' + moduleNameParts[1]
      : moduleNameParts[0];
    const restOfModuleName = moduleName
      .replace(moduleNameRelevantForPath, '')
      .trim();
    const path = join(nodeModulesPath, moduleNameRelevantForPath);
    const packageFileContent = readFileSync(join(path, 'package.json'), 'utf8');
    const packageFileJSON = JSON.parse(
      packageFileContent
    ) as PackageJsonContent;
    let moduleEntryPoint: string | undefined;
    if (restOfModuleName) {
      const exportName = `.${restOfModuleName}`;
      moduleEntryPoint = resolveExports(packageFileJSON.exports, exportName);
    } else {
      let entryPoint = packageFileJSON.main;
      if (!entryPoint) {
        entryPoint = resolveExports(packageFileJSON.exports, '.');
      }
      moduleEntryPoint = entryPoint;
    }
    if (!moduleEntryPoint) {
      throw new Error('No entrypoint found for ' + moduleName);
    }
    return join(nodeModulesPath, moduleNameRelevantForPath, moduleEntryPoint);
  }

  function resolveExports(
    exports: PackageJsonContent['exports'],
    subPath: string
  ): string | undefined {
    if (!exports) {
      return undefined;
    }
    if (typeof exports === 'string') {
      return exports;
    }
    const exportEntryKeyList = Object.keys(exports).reverse();

    const matchingEntryKey =
      exportEntryKeyList.find(
        (entryKey) =>
          entryKey === subPath ||
          (entryKey.includes('*') &&
            subPath.matchAll(convertMatchingStringToRegex(entryKey)))
      ) ?? '';
    const regexMatches = matchingEntryKey.includes('*') && [
      ...subPath.matchAll(convertMatchingStringToRegex(matchingEntryKey)),
    ];
    let exportEntry = exports[matchingEntryKey];
    if (!exportEntry) {
      return;
    }
    if (typeof exportEntry === 'string') {
      if (regexMatches) {
        exportEntry = replaceExportEntryPlaceholders(exportEntry, regexMatches);
      }
      return exportEntry ?? undefined;
    }
    const exportsByPriority = [
      exportEntry.browser,
      exportEntry.require,
      exportEntry.production,
      exportEntry.default,
    ];
    let highestPriorityExport = exportsByPriority.find(Boolean);
    if (!highestPriorityExport) {
      return;
    }
    if (regexMatches) {
      highestPriorityExport = replaceExportEntryPlaceholders(
        highestPriorityExport,
        regexMatches
      );
    }
    return highestPriorityExport;
  }

  function replaceExportEntryPlaceholders(
    entry: string,
    regexMatches: RegExpMatchArray[]
  ): string {
    let entryCopy = entry;
    let regexMatchStrings: string[] = [];
    [...regexMatches].forEach((match) =>
      [...match].map((matchString) => regexMatchStrings.push(matchString))
    );
    regexMatchStrings.forEach((str, index) => {
      if (index !== 0) {
        entryCopy = entryCopy.replace('*', str);
      }
    });
    return entryCopy;
  }

  /**
   * Converts a string like ./*.js into a regex that matches that * pattern
   */
  function convertMatchingStringToRegex(matchingString: string): RegExp {
    // this excludes the * as it is escaped seperately
    const regexCharsToEscape = [
      '.',
      '/',
      '+',
      '?',
      '[',
      '^',
      ']',
      '$',
      '(',
      ')',
      '{',
      '}',
      '=',
      '!',
      '<',
      '>',
      '|',
      ':',
      '-',
    ] as const;
    let regexString = matchingString;
    regexCharsToEscape.forEach((char) => {
      regexString = regexString.replaceAll(char, `\\${char}`);
    });
    regexString = regexString.replaceAll('*', '(.*)');
    regexString = `^${regexString}$`;
    return new RegExp(regexString, 'g');
  }

  async function runWorker(
    metadata: ModuleMetadata,
    modules: Map<string, ModuleMetadata>,
    config: Config
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const worker = new Worker(
        join(fileURLToPath(import.meta.url), '../worker.js')
      );
      worker.postMessage({ metadata, modules, config });
      worker.on('message', (returnValue) => {
        resolve(returnValue);
      });
      worker.on('error', (e) => {
        console.error(e);
        reject();
      });
    });
  }
}

main();
