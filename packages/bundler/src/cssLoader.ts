import { readFileSync, writeFileSync } from 'fs';
import { v4 } from 'uuid';
import { join } from 'path';
import type { LoaderContract } from './shared.js';

const cssMap = new Map<string, string>();

export function cssLoader({
  modulePath,
  moduleId,
  config,
}: LoaderContract['props']): LoaderContract['response'] {
  let code = '';
  if (cssMap.has(modulePath)) {
    code = cssMap.get(modulePath) ?? '';
  } else {
    const extension = modulePath.split('.').at(-1);
    const fileName = `${v4()}.${extension}`;
    const fileContent = readFileSync(modulePath);
    writeFileSync(join(config.outputDirectory, fileName), fileContent);
    code = `
      const linkTag = document.createElement("link");
      linkTag.rel = "stylesheet";
      linkTag.type = "text/css";
      linkTag.href = "/${fileName}";
      document.body.append(linkTag)
    `;
    cssMap.set(modulePath, code);
  }

  return {
    requireStatement: `require(${moduleId})`,
    moduleCode: code,
    dependencyMap: new Map(),
  };
}
