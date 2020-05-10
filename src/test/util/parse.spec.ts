import * as ts from 'typescript';
import { parse } from './parse';

describe('test:parse', () => {
  it(`Doesn't flip out on "empty" files`, () => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    const { node } = parse(() => {});
    expect(node).toBeNull();
  });
  it(`Doesn't flip out on files without templates`, () => {
    const { node } = parse(() => {
      return {
        not: 'a template',
      };
    });

    expect(node).toBeDefined();
    expect(ts.isObjectLiteralExpression(node)).toBe(true);
  });
});
