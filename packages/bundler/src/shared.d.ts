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
    projectRoot: string;
  };
  response: {
    requireStatement: string;
    moduleCode: string;
    dependencyMap: Map<string, string>;
  };
};

export type TypeSpecificExportImportEntry = {
  'node-addons'?: string | null;
  node?: string | null;
  deno?: string | null;
  worker?: string | null;
  browser?: string | null;
  import?: string | null;
  require?: string | null;
  development?: string | null;
  production?: string | null;
  default?: string | null;
};

export type ExportEntry =
  | string
  | { [key: string]: null | string | TypeSpecificExportImportEntry };

export type PackageJsonContent = {
  main?: string;
  exports?: ExportEntry;
};
