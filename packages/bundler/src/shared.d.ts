type dependencyName = string;
type dependencyPath = string;

export type Config = {
  entryPoint: string;
  sourceDirectory: string;
  publicDirectory: string;
  extensions: string[];
  assetExtensions: string[];
  outputDirectory: string;
  babelConfig: object;
};

export type ModuleMetadata = {
  code: string;
  dependencyMap: Map<dependencyName, dependencyPath>;
  id: number;
};
