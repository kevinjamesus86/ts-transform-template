/**
 * @description
 * see http://www.cse.yorku.ca/~oz/hash.html
 */
export const hash = (value: string): string => {
  let hash = 5381;
  let index = value.length;

  while (index--) {
    hash = (hash << 5) + hash + value.charCodeAt(index);
  }

  return hash.toString(32);
};
