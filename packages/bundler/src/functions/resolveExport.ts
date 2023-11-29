import { PackageJsonContent } from '../shared.js';
import { convertMatchingStringToRegex } from './convertMatchingStringToRegex.js';

export function resolveExports(
  exports: PackageJsonContent['exports'],
  subPath: string,
): string | undefined {
  if (!exports) {
    return undefined;
  }
  if (typeof exports === 'string') {
    return exports;
  }
  const exportEntryKeyList = Object.keys(exports).reverse();

  const matchingEntryKey =
    exportEntryKeyList.find(
      (entryKey) =>
        entryKey === subPath ||
        (entryKey.includes('*') &&
          subPath.matchAll(convertMatchingStringToRegex(entryKey))),
    ) ?? '';
  const regexMatches = matchingEntryKey.includes('*') && [
    ...subPath.matchAll(convertMatchingStringToRegex(matchingEntryKey)),
  ];
  let exportEntry = exports[matchingEntryKey];
  if (!exportEntry) {
    return;
  }
  if (typeof exportEntry === 'string') {
    if (regexMatches) {
      exportEntry = replaceExportEntryPlaceholders(exportEntry, regexMatches);
    }
    return exportEntry ?? undefined;
  }
  const exportsByPriority = [
    exportEntry.browser,
    exportEntry.require,
    exportEntry.production,
    exportEntry.default,
  ];
  let highestPriorityExport = exportsByPriority.find(Boolean);
  if (!highestPriorityExport) {
    return;
  }
  if (regexMatches) {
    highestPriorityExport = replaceExportEntryPlaceholders(
      highestPriorityExport,
      regexMatches,
    );
  }
  return highestPriorityExport;
}

function replaceExportEntryPlaceholders(
  entry: string,
  regexMatches: RegExpMatchArray[],
): string {
  let entryCopy = entry;
  const regexMatchStrings: string[] = [];
  [...regexMatches].forEach((match) =>
    [...match].map((matchString) => regexMatchStrings.push(matchString)),
  );
  regexMatchStrings.forEach((str, index) => {
    if (index !== 0) {
      entryCopy = entryCopy.replace('*', str);
    }
  });
  return entryCopy;
}
