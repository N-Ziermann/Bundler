type dependencyName = string;
type dependencyPath = string;

const LOADERS = {
  asset: 'asset',
} as const;

export type Config = {
  entryPoint: string;
  projectRoot: string;
  publicDirectory: string;
  extensions: string[];
  loaders: {
    asset: {
      extensions: string[];
    };
    css: {
      extensions: string[];
    };
  };
  outputDirectory: string;
  babelConfig: object;
};

export type ModuleMetadata = {
  code: string;
  dependencyMap: Map<dependencyName, dependencyPath>;
  id: number;
  requireStatement: string;
};

export type LoaderContract = {
  props: {
    modulePath: string;
    config: Config;
    moduleId: number;
  };
  response: {
    requireStatement: string;
    moduleCode: string;
    dependencyMap: Map<string, string>;
  };
};
