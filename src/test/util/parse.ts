import ts from 'typescript';
import { hash } from './hash';

export interface SourceProducer {
  (): unknown;
}

export interface TestNode<T> {
  program: ts.Program;
  node: T;
}

export const parse = <T = ts.Node>(
  sourceProducer: SourceProducer
): TestNode<T> => {
  const source = sourceProducer.toString();
  const file = hash(source) + `.gen.ts`;

  const compilerOptions = {};
  const host = ts.createCompilerHost(compilerOptions);
  host.getSourceFile = (filename, target): ts.SourceFile =>
    ts.createSourceFile(filename, source, target, true);

  const program = ts.createProgram([file], compilerOptions, host);
  const sourceFile = program.getSourceFile(file);

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  let node: T = null!;
  (function visit(_node: ts.Node): void {
    if (ts.isReturnStatement(_node)) {
      node = ((_node as ts.ReturnStatement).expression as unknown) as T;
    } else {
      ts.forEachChild(_node, visit);
    }
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  })(sourceFile!);

  return {
    program,
    node,
  };
};
