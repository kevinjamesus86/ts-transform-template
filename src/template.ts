import {
  SyntaxKind,
  isBinaryExpression,
  isIdentifier,
  isNumericLiteral,
  isParenthesizedExpression,
  isPropertyAccessExpression,
  isStringLiteral,
  isStringLiteralLike,
  isTemplateExpression,
  isTemplateLiteralToken,
  createStringLiteral,
} from 'typescript';

import type {
  BinaryExpression,
  Expression,
  Identifier,
  LiteralLikeNode,
  Node,
  NumericLiteral,
  ParenthesizedExpression,
  PropertyAccessExpression,
  Program,
  StringLiteral,
  StringLiteralLike,
  TemplateExpression,
  TemplateLiteralToken,
  TypeChecker,
} from 'typescript';

import { isArray, isString, invariant } from './util';
import type { TemplateTransformFn } from './types';

export type YieldedTypes = string;

/**
 * Node types that are an acceptable entry point for the template hunt
 */
export type TraversableEntryNode =
  /**
   * StringLiteralLike =
   *  | StringLiteral
   *  | NoSubstitutionTemplateLiteral
   */
  | StringLiteralLike
  /**
   * Wide open bag of tricks.. requires type validation during traversal
   */
  | TemplateExpression
  | BinaryExpression;

/**
 * Extended set of node types that can be traversed
 * once a valid entry node has been found
 */
export type TraversableNode =
  | TraversableEntryNode
  /**
   * TemplateLiteralToken =
   *  | NoSubstitutionTemplateLiteral
   *  | TemplateHead
   *  | TemplateMiddle
   *  | TemplateTail
   */
  | TemplateLiteralToken
  | NumericLiteral
  /**
   * Types for things we can inline:
   *  - Enum
   *  - Const Enum
   *  - Const Declarations
   */
  | ParenthesizedExpression
  | PropertyAccessExpression
  | Identifier
  /**
   * THE bag of tricks.. this can be Identifiers, CallExpressions,
   * and a number of other nodes that we can't do much with.. This is a
   * catch-all type for nodes that are the result of traversing either
   * a BinaryExpression, TemplateExpression, or ParenthesizedExpression
   */
  | Expression;

/**
 * @description Returns the text from any Literal* like nodes,
 * ie. nodes with a `text` property
 */
export const getNodeText = (node: LiteralLikeNode): string => {
  return node.text;
};

/**
 * @description Returns true when the node is a valid root for
 *  traversal, false otherwise
 */
export const isTraversableEntryNode = (
  node: Node
): node is TraversableEntryNode => {
  return (
    isStringLiteralLike(node) ||
    isTemplateExpression(node) ||
    isBinaryExpression(node)
  );
};

export const isLiteralLikeNode = (node: Node): node is LiteralLikeNode => {
  return (
    isTemplateLiteralToken(node) ||
    isStringLiteral(node) ||
    isNumericLiteral(node)
  );
};

export function* traverse(
  node: TraversableNode,
  program: Program
): Generator<YieldedTypes> {
  let typeChecker: TypeChecker | null = null;

  yield* (function* walk(node: TraversableNode): Generator<YieldedTypes> {
    /**
     * Fast path! LiteralLike nodes are by far the most common
     * when traversing templates
     */
    if (isLiteralLikeNode(node)) {
      yield getNodeText(node);
    } else if (isBinaryExpression(node)) {
      invariant(
        node.operatorToken.kind === SyntaxKind.PlusToken,
        `Can only join template parts from BinaryExpressions ` +
          `using the "+" operator, saw: ${node.operatorToken.getText()}`
      );

      yield* walk(node.left);
      yield* walk(node.right);
    } else if (isTemplateExpression(node)) {
      yield* walk(node.head);
      for (const span of node.templateSpans) {
        yield* walk(span.expression);
        yield* walk(span.literal);
      }
    } else if (isIdentifier(node) || isPropertyAccessExpression(node)) {
      typeChecker = typeChecker ?? program.getTypeChecker();

      let identifier: Identifier;
      if (isIdentifier(node)) {
        identifier = <Identifier>node;
      } else {
        identifier = <Identifier>node.name;
      }

      const symbol = typeChecker.getSymbolAtLocation(identifier);
      if (symbol) {
        const initializer = (<any>symbol.valueDeclaration)?.initializer;
        if (isLiteralLikeNode(initializer)) {
          return yield getNodeText(initializer);
        }
      }

      invariant(
        false,
        `Could not get literal value of Identifier ` +
          `from Identifier or PropertyAccessExpression: ${node.getText()}`
      );
    } else if (isParenthesizedExpression(node)) {
      yield* walk(node.expression);
    } else {
      invariant(false, `Non-traversable node found: ${node.getText()}`);
    }
  })(node);
}

export class Template {
  static willEnterAtNode(node: Node) {
    return isTraversableEntryNode(node);
  }

  private node: TraversableNode;
  private program: Program;
  private result: string | null;
  private transformResult: string | null;

  constructor(node: TraversableNode, program: Program) {
    this.node = node;
    this.program = program;
    this.result = null;
    this.transformResult = null;
  }

  private visit(): string | null {
    let entries;

    try {
      entries = Array.from(traverse(this.node, this.program));
    } catch ({ message }) {
      console.error('@failed to visit with error:', message);
    }

    if (isArray(entries) && entries.length) {
      const isAllStrings = entries.every(isString);
      if (isAllStrings) {
        return entries.join('');
      }
    }

    return null;
  }

  public transform(min: TemplateTransformFn): Template {
    if (Template.willEnterAtNode(this.node)) {
      this.result = this.visit();
      if (isString(this.result)) {
        try {
          this.transformResult = min(this.result);
        } catch ({ message }) {
          console.error(`@failed to transform with error: ${message}`);
        }
      }
    }

    return this;
  }

  public toAst(): StringLiteral | null {
    return isString(this.transformResult)
      ? createStringLiteral(this.transformResult)
      : null;
  }
}
