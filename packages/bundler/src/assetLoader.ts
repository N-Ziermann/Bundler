import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { v4 } from 'uuid';
import type { LoaderContract } from './shared.js';

const assetMap = new Map<string, string>();

export function assetLoader({
  config,
  modulePath,
}: LoaderContract['props']): LoaderContract['response'] {
  let imageName: string;

  if (assetMap.has(modulePath)) {
    imageName = assetMap.get(modulePath) ?? '';
  } else {
    const extension = modulePath.split('.').at(-1);
    imageName = `${v4()}.${extension}`;
    const fileContent = readFileSync(modulePath);
    writeFileSync(join(config.outputDirectory, imageName), fileContent);
    assetMap.set(modulePath, imageName);
  }

  return {
    requireStatement: `"/${imageName}"`,
    moduleCode: '',
    dependencyMap: new Map(),
  };
}
