"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const typescript_1 = require("typescript");
const util_1 = require("./util");
/**
 * @description Returns the text from any Literal* like nodes,
 * ie. nodes with a `text` property
 */
exports.getNodeText = (node) => {
    return node.text;
};
/**
 * @description Returns true when the node is a valid root for
 *  traversal, false otherwise
 */
exports.isTraversableEntryNode = (node) => {
    return (typescript_1.isStringLiteralLike(node) ||
        typescript_1.isTemplateExpression(node) ||
        typescript_1.isBinaryExpression(node));
};
exports.isLiteralLikeNode = (node) => {
    return (typescript_1.isTemplateLiteralToken(node) ||
        typescript_1.isStringLiteral(node) ||
        typescript_1.isNumericLiteral(node));
};
function* traverse(node, program) {
    let typeChecker = null;
    yield* (function* walk(node) {
        var _a;
        /**
         * Fast path! LiteralLike nodes are by far the most common
         * when traversing templates
         */
        if (exports.isLiteralLikeNode(node)) {
            yield exports.getNodeText(node);
        }
        else if (typescript_1.isBinaryExpression(node)) {
            util_1.invariant(node.operatorToken.kind === typescript_1.SyntaxKind.PlusToken, `Can only join template parts from BinaryExpressions ` +
                `using the "+" operator, saw: ${node.operatorToken.getText()}`);
            yield* walk(node.left);
            yield* walk(node.right);
        }
        else if (typescript_1.isTemplateExpression(node)) {
            yield* walk(node.head);
            for (const span of node.templateSpans) {
                yield* walk(span.expression);
                yield* walk(span.literal);
            }
        }
        else if (typescript_1.isIdentifier(node) || typescript_1.isPropertyAccessExpression(node)) {
            typeChecker = typeChecker !== null && typeChecker !== void 0 ? typeChecker : program.getTypeChecker();
            let identifier;
            if (typescript_1.isIdentifier(node)) {
                identifier = node;
            }
            else {
                identifier = node.name;
            }
            const symbol = typeChecker.getSymbolAtLocation(identifier);
            if (symbol) {
                const initializer = (_a = symbol.valueDeclaration) === null || _a === void 0 ? void 0 : _a.initializer;
                if (exports.isLiteralLikeNode(initializer)) {
                    return yield exports.getNodeText(initializer);
                }
            }
            util_1.invariant(false, `Could not get literal value of Identifier ` +
                `from Identifier or PropertyAccessExpression: ${node.getText()}`);
        }
        else if (typescript_1.isParenthesizedExpression(node)) {
            yield* walk(node.expression);
        }
        else {
            util_1.invariant(false, `Non-traversable node found: ${node.getText()}`);
        }
    })(node);
}
exports.traverse = traverse;
class Template {
    constructor(node, program) {
        this.node = node;
        this.program = program;
        this.result = null;
        this.transformResult = null;
    }
    static willEnterAtNode(node) {
        return exports.isTraversableEntryNode(node);
    }
    visit() {
        let entries;
        try {
            entries = Array.from(traverse(this.node, this.program));
        }
        catch ({ message }) {
            console.error('@failed to visit with error:', message);
        }
        if (util_1.isArray(entries) && entries.length) {
            const isAllStrings = entries.every(util_1.isString);
            if (isAllStrings) {
                return entries.join('');
            }
        }
        return null;
    }
    transform(min) {
        if (Template.willEnterAtNode(this.node)) {
            this.result = this.visit();
            if (util_1.isString(this.result)) {
                try {
                    this.transformResult = min(this.result);
                }
                catch ({ message }) {
                    console.error(`@failed to transform with error: ${message}`);
                }
            }
        }
        return this;
    }
    toAst() {
        return util_1.isString(this.transformResult)
            ? typescript_1.createStringLiteral(this.transformResult)
            : null;
    }
}
exports.Template = Template;
