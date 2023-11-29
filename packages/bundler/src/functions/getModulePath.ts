import { join } from 'path';
import { readFileSync } from 'fs';
import { resolveExports } from './resolveExport.js';
import { isRelativePath } from './isRelativePath.js';
import { addExtensionToImportIfMissing } from './addExtensionToImportIfMissing.js';
import { Config, PackageJsonContent } from '../shared.js';
import { getDependencyLocation } from './getDependencyLocation.js';

export function getModulePath(
  moduleName: string,
  currentPath: string,
  config: Config,
  root: string,
): string {
  if (isRelativePath(moduleName)) {
    return join(
      currentPath,
      addExtensionToImportIfMissing(
        moduleName,
        config.extensions,
        currentPath,
        config,
      ),
    );
  }
  const moduleNameParts = moduleName.split('/');
  const moduleNameRelevantForPath = moduleNameParts[0].startsWith('@')
    ? `${moduleNameParts[0]}/${moduleNameParts[1]}`
    : moduleNameParts[0];
  const restOfModuleName = moduleName
    .replace(moduleNameRelevantForPath, '')
    .trim();
  const path = getDependencyLocation(moduleNameRelevantForPath, root) ?? '';
  const packageFileContent = readFileSync(join(path, 'package.json'), 'utf8');
  const packageFileJSON = JSON.parse(packageFileContent) as PackageJsonContent;
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
    throw new Error(`No entrypoint found for ${moduleName}`);
  }
  return join(path, moduleEntryPoint);
}
