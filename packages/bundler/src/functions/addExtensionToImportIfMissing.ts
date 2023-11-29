import { existsSync } from 'fs';
import { join } from 'path';
import { Config } from '../shared.js';
import { isRelativePath } from './isRelativePath.js';

export function addExtensionToImportIfMissing(
  importPath: string,
  extensions: string[],
  currentPath: string,
  config: Config,
) {
  const isNodeModule = !isRelativePath(importPath);
  if (
    isNodeModule ||
    extensions.some((extension) => importPath.endsWith(extension)) ||
    Object.values(config.loaders).some((loader) =>
      loader.extensions.some((extension) => importPath.endsWith(extension)),
    )
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
