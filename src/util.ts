export const { isArray } = Array;

export const isObject = (value: unknown): value is object => {
  return value != null && typeof value === 'object';
};

export const isString = (value: unknown): value is string => {
  return value != null && typeof value === 'string';
};

export const invariant = (condition: unknown, message: string): void => {
  if (!condition) {
    throw new Error(message);
  }
};
