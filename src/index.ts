import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { transformCode } from './worker.js';

const config = {
  entryPoint: 'index.js',
  sourceDirectory: '/example',
  extensions: ['.js', '.ts'],
  outputFile: 'out.js',
  babelPlugins: [
    '@babel/plugin-transform-modules-commonjs',
    '@babel/plugin-transform-typescript',
  ],
}; // todo use readFileSync to read config file

// todo: try to optimize fileReading and compilation with mutliThreading
// todo: allow importing node_modules
// todo: turn into module that you can actually run
// todo: improve error messages

type ModuleMetadata = {
  code: string;
  dependencyMap: Map<string, string>; // Map<dependencyName, dependencyPath>
  id: number;
};

function main() {
  const root = join(
    dirname(fileURLToPath(import.meta.url)),
    '../',
    config.sourceDirectory
  );

  let moduleCounter = 0;
  const seenModules = new Set<string>();
  const modules = new Map<string, ModuleMetadata>();
  const queue: { path: string; name: string }[] = [
    { path: root, name: config.entryPoint },
  ];
  while (queue.length > 0) {
    const moduleEntry = queue.shift();
    if (!moduleEntry) {
      throw new Error('Should never happen');
    }
    const module = join(moduleEntry.path, moduleEntry.name);
    if (!module || seenModules.has(module)) {
      continue;
    }
    seenModules.add(module);
    const code = readFileSync(module, 'utf-8');
    const compiledCode = transformCode(code, config.babelPlugins);
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
        throw new Error('should never happen');
      }
      // replace all dependecies of the current module with their dependency-id
      code = code.replace(
        new RegExp(
          `require\\(('|")${dependencyName.replace(/[\/.]/g, '\\$&')}\\1\\)`
        ),
        `require(${dependency.id})`
      );
    }
    output.push(wrapModule(id, code));
  }
  output.unshift(
    transformCode(
      readFileSync(
        join(fileURLToPath(import.meta.url), '../require.ts'),
        'utf8'
      ),
      config.babelPlugins
    )
  );
  output.push('requireModule(0);');
  // todo outputFile currently doesnt automatically create a dir if set to something like /build/out.js
  writeFileSync(config.outputFile, output.join('\n'));
}
main();

function getDependencies(path: string, code: string): Map<string, string> {
  const currentPath = join(path, '../');
  const dependencyMap = new Map<string, string>();
  const regex = /require\(["'](.*)["']\)/g;
  const matchLists = [...code.matchAll(regex)].map((matches) =>
    matches?.filter((match) => !match.includes('require('))
  );
  matchLists.forEach((matchList) =>
    matchList.forEach((match) =>
      dependencyMap.set(
        match,
        join(
          currentPath,
          addExtensionToImportIfMissing(match, config.extensions, currentPath)
        )
      )
    )
  );
  return dependencyMap;
}

function addExtensionToImportIfMissing(
  importPath: string,
  extensions: string[],
  currentPath: string
) {
  if (extensions.some((extension) => importPath.endsWith(extension))) {
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
