#!/usr/bin/env node
import { join } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { transformCode } from './worker.js';

const DEFAULT_CONFIG = {
  entryPoint: 'index.js',
  sourceDirectory: '/example',
  extensions: ['.js', '.ts'],
  outputFile: 'out.js',
  babelConfig: {
    plugins: [
      '@babel/plugin-transform-modules-commonjs',
      '@babel/plugin-transform-typescript',
    ],
  },
};

type Config = typeof DEFAULT_CONFIG;
// todo: try to optimize fileReading and compilation with mutliThreading
// todo outputFile currently doesnt automatically create a dir if set to something like /build/out.js
// todo: general code cleanup
// todo: asset loading (css, png, svg) [configurable in config file]
// todo: support for imports object in package.json
// todo: eslint

type ModuleMetadata = {
  code: string;
  dependencyMap: Map<string, string>; // Map<dependencyName, dependencyPath>
  id: number;
};

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

function main() {
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
    const compiledCode = transformCode(code, config.babelConfig);
    const dependencyMap = getDependencies(module, compiledCode);
    const metadata: ModuleMetadata = {
      dependencyMap,
      code: compiledCode,
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

  function wrapModule(id: number, code: string) {
    return `define(${id}, function(module, exports, require) {\n${code}});`;
  }

  const output: string[] = [];
  for (const [module, metadata] of Array.from(modules).reverse()) {
    let { code, id, dependencyMap } = metadata;
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
    output.push(wrapModule(id, code));
  }
  output.unshift(
    transformCode(
      readFileSync(
        // todo: use require.ts in dev and .js in build
        join(fileURLToPath(import.meta.url), '../require.js'),
        'utf8'
      ),
      config.babelConfig
    )
  );
  output.unshift(
    "const exports = {};\nconst process = { env: { NODE_ENV: 'PRODUCTION' } };"
  );
  output.push('requireModule(0);');
  writeFileSync(config.outputFile, output.join('\n'));

  function getDependencies(path: string, code: string): Map<string, string> {
    const currentPath = join(path, '../');
    const dependencyMap = new Map<string, string>();
    const regex = /require\(["']([^"']*)["']\)/g;
    const matchLists = [...code.matchAll(regex)].map((matches) =>
      matches?.filter((match) => !match.includes('require('))
    );
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
}

main();
