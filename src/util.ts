export const { isArray } = Array;

export const isObject = (value: any): value is object => {
  return value != null && typeof value === 'object';
};

export const isString = (value: any): value is string => {
  return value != null && typeof value === 'string';
};

export const invariant = (condition: any, message: string) => {
  if (!condition) {
    throw new Error(message);
  }
}
