import shell from 'shelljs';

const dependencyLocationMap: Map<string, string> = new Map();
export function getDependencyLocation(
  name: string,
  rootPath: string,
): string | undefined {
  if (dependencyLocationMap.has(name)) {
    return dependencyLocationMap.get(name);
  }
  try {
    const result = shell
      .exec(`npm ls ${name} --parseable --prefix ${rootPath}`, {
        silent: true,
      })
      .toString();
    const path = result.split('\n')[0].trim();
    dependencyLocationMap.set(name, path);
    return path;
  } catch (e) {
    return undefined;
  }
}
