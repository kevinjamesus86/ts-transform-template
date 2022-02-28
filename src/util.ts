export const { isArray } = Array;

export const isString = (value: unknown): value is string => {
  return value != null && typeof value === 'string';
};

export const invariant = (condition: unknown, message: () => string): void => {
  if (!condition) {
    throw new Error(message());
  }
};
