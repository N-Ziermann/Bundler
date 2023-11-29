// this excludes the * as it is escaped seperately
const regexCharsToEscape = [
  '.',
  '/',
  '+',
  '?',
  '[',
  '^',
  ']',
  '$',
  '(',
  ')',
  '{',
  '}',
  '=',
  '!',
  '<',
  '>',
  '|',
  ':',
  '-',
] as const;

/**
 * Converts a string like ./*.js into a regex that matches that * pattern
 */
export function convertMatchingStringToRegex(matchingString: string): RegExp {
  let regexString = matchingString;
  regexCharsToEscape.forEach((char) => {
    regexString = regexString.replaceAll(char, `\\${char}`);
  });
  regexString = regexString.replaceAll('*', '(.*)');
  regexString = `^${regexString}$`;
  return new RegExp(regexString, 'g');
}
