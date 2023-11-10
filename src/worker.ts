import { transformSync } from '@babel/core';

export function transformCode(code: string, babelPlugins: string[]) {
  return transformSync(code, { plugins: babelPlugins })?.code ?? code;
}
