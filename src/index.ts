import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, writeFileSync } from 'fs';

const config = {
  entryPoint: 'index.js',
  sourceDirectory: '/example',
  extensions: ['.js'],
  outputFile: 'out.js',
}; // todo use readFileSync to read config file

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
    const dependencyMap = getDependencies(module, code);
    const metadata: ModuleMetadata = {
      dependencyMap,
      code,
      id: moduleCounter++,
    };
    modules.set(module, metadata);
    // todo: extensions are currently limited to .js
    [...dependencyMap.keys()].forEach((dep) =>
      queue.push({
        path: join(module, '../'),
        name: addExtensionIfMissing(dep, '.js'),
      })
    );
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
    // todo: currently .ts => compile step needed
    readFileSync(join(fileURLToPath(import.meta.url), '../require.ts'), 'utf8')
  );
  output.push('requireModule(0);');
  // todo outputFile currently doesnt automatically create a dir if set to something like /build/out.js
  writeFileSync(config.outputFile, output.join('\n'));
}
main();

function getDependencies(path: string, code: string): Map<string, string> {
  const dependencyMap = new Map<string, string>();
  const regex = /require\(["'](.*)["']\)/g;
  const matchLists = [...code.matchAll(regex)].map((matches) =>
    matches?.filter((match) => !match.includes('require('))
  );
  matchLists.forEach((matchList) =>
    matchList.forEach((match) =>
      dependencyMap.set(
        match,
        join(path, '../', addExtensionIfMissing(match, '.js'))
      )
    )
  );
  // todo: extensions are currently limited to .js
  return dependencyMap;
}

function addExtensionIfMissing(path: string, extension: string) {
  if (path.endsWith(extension)) {
    return path;
  }
  return path + extension;
}
