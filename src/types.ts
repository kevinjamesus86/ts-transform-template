export interface IdentityFn<T> {
  (value: T): T;
}

export type TemplateTransformFn = IdentityFn<string>;
