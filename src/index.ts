import {
  isIdentifier,
  isPropertyAssignment,
  visitEachChild,
  visitNode,
} from 'typescript';

import type {
  Node,
  Program,
  PropertyAssignment,
  SourceFile,
  TransformationContext,
  TransformerFactory,
  VisitResult,
  Visitor,
} from 'typescript';

import { Template, getNodeText } from './template';
import type { TemplateTransformFn } from './types';

/**
 * @description Property name we look for when processing templates
 * @constant
 */
const TEMPLATE_PROPERTY_NAME = 'template';

/**
 * @description Returns true if this node is a PropertyAssignment and its
 * name Identifier matches the expected templateIdentifier string
 */
const isTemplatePropertyAssignment = (
  node: Node,
  templateIdentifier: string
): node is PropertyAssignment => {
  return (
    isPropertyAssignment(node) &&
    isIdentifier(node.name) &&
    getNodeText(node.name) === templateIdentifier
  );
};

/**
 * @description A function that accepts and possibly transforms a node
 */
function visit(
  context: TransformationContext,
  transform: TemplateTransformFn,
  program: Program
): Visitor {
  const { factory } = context;
  return function visitor(node: Node): VisitResult<Node> {
    if (isTemplatePropertyAssignment(node, TEMPLATE_PROPERTY_NAME)) {
      const template = new Template(node.initializer, program);
      const newNode = template.transform(transform).toAst(factory);
      if (newNode) {
        return factory.createPropertyAssignment(
          factory.createIdentifier(TEMPLATE_PROPERTY_NAME),
          newNode
        );
      }
    }
    return visitEachChild(node, visitor, context);
  };
}

/**
 * @description A function that is used to initialize and return a Transformer
 *  callback, which in turn will be used to transform one or more nodes
 */
export function transform(
  program: Program,
  templateTransformFn: TemplateTransformFn
): TransformerFactory<SourceFile> {
  return function transformerFactory(context: TransformationContext) {
    return function transformer(sourceFile: SourceFile): SourceFile {
      return visitNode(
        sourceFile,
        visit(context, templateTransformFn, program)
      );
    };
  };
}
