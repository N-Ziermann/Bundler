import { readFileSync } from 'fs';
import { join } from 'path';
import type { Config, LoaderContract } from '../shared.js';
import { isRelativePath } from '../functions/isRelativePath.js';
import { getModulePath } from '../functions/getModulePath.js';
import { addExtensionToImportIfMissing } from '../functions/addExtensionToImportIfMissing.js';

const codeMap = new Map<
  string,
  { code: string; dependencyMap: Map<string, string> }
>();

export function codeLoader({
  modulePath,
  moduleId,
  config,
  projectRoot,
}: LoaderContract['props']): LoaderContract['response'] {
  let code = '';
  let dependencyMap = new Map<string, string>();
  if (codeMap.has(modulePath)) {
    const data = codeMap.get(modulePath);
    code = data?.code ?? '';
    dependencyMap = data?.dependencyMap ?? new Map();
  } else {
    code = readFileSync(modulePath, 'utf-8');
    dependencyMap = getDependencies(modulePath, code, config, projectRoot);
    codeMap.set(modulePath, { code, dependencyMap });
  }

  return {
    requireStatement: `require(${moduleId})`,
    moduleCode: code,
    dependencyMap,
  };
}

function getDependencies(
  path: string,
  code: string,
  config: Config,
  root: string,
): Map<string, string> {
  const currentPath = join(path, '../');
  const dependencyMap = new Map<string, string>();
  const importRegex = /import [^"']*["']([^"']*)["']/g;
  const importMatchLists = [...code.matchAll(importRegex)].map(
    (matches) => matches?.filter((match) => !match.match(/["']/)),
  );
  const requireRegex = /require\(["']([^"']*)["']\)/g;
  const requireMatchLists = [...code.matchAll(requireRegex)].map(
    (matches) => matches?.filter((match) => !match.includes('require(')),
  );
  const matchLists = [...requireMatchLists, ...importMatchLists];
  matchLists.forEach((matchList) =>
    matchList.forEach((match) => {
      const isNodeModule = !isRelativePath(match);
      if (isNodeModule) {
        const modulePath = getModulePath(match, currentPath, config, root);
        return dependencyMap.set(match, modulePath);
      }
      return dependencyMap.set(
        match,
        join(
          currentPath,
          addExtensionToImportIfMissing(
            match,
            config.extensions,
            currentPath,
            config,
          ),
        ),
      );
    }),
  );
  return dependencyMap;
}
