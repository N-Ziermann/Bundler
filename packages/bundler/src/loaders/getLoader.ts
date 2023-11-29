import { Config, LoaderContract } from '../shared.js';
import { assetLoader } from './assetLoader.js';
import { codeLoader } from './codeLoader.js';
import { cssLoader } from './cssLoader.js';

const LOADER_MAP = {
  asset: assetLoader,
  code: codeLoader,
  css: cssLoader,
} satisfies {
  [key in keyof Config['loaders'] & 'code']: (
    props: LoaderContract['props'],
  ) => LoaderContract['response'];
};

export function getLoader(
  modulePath: string,
  config: Config,
): (props: LoaderContract['props']) => LoaderContract['response'] {
  for (const [loader, loaderConfig] of Object.entries(config.loaders)) {
    if (loaderConfig.extensions.some((ex) => modulePath.endsWith(ex))) {
      return LOADER_MAP[loader as keyof Config['loaders']];
    }
  }
  return codeLoader;
}
