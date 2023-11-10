import { TransformOptions, transformSync } from '@babel/core';

export function transformCode(code: string, babelConfig: TransformOptions) {
  return transformSync(code, babelConfig)?.code ?? code;
}
