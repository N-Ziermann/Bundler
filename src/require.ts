type Module = { exports: unknown };

type ModuleFactory = (
  module: Module,
  exports: any,
  require: (path: string) => unknown
) => {};

type ModuleName = string;

const modules = new Map<ModuleName, ModuleFactory>();
const moduleCache = new Map<ModuleName, Module>();

function requireModule(name: string): unknown {
  if (moduleCache.has(name)) {
    return moduleCache.get(name)?.exports;
  }
  const module = { exports: {} } satisfies Module;
  moduleCache.set(name, module);
  const factory = modules.get(name);
  if (!factory) {
    throw new Error('Should never happen');
  }
  factory(module, module.exports, requireModule);
  return module.exports;
}

function define(name: string, moduleFactory: ModuleFactory) {
  modules.set(name, moduleFactory);
}
