"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const typescript_1 = require("typescript");
const template_1 = require("./template");
/**
 * @description Property name we look for when processing templates
 * @constant
 */
const TEMPLATE_PROPERTY_NAME = 'template';
/**
 * @description Returns true if this node is a PropertyAssignment and its
 * name Identifier matches the expected templateIdentifier string
 */
const isTemplatePropertyAssignment = (node, templateIdentifier) => {
    return (typescript_1.isPropertyAssignment(node) &&
        typescript_1.isIdentifier(node.name) &&
        template_1.getNodeText(node.name) === templateIdentifier);
};
/**
 * @description A function that accepts and possibly transforms a node
 */
function visit(context, transform, program) {
    const visitor = (node) => {
        if (isTemplatePropertyAssignment(node, TEMPLATE_PROPERTY_NAME)) {
            const template = new template_1.Template(node.initializer, program);
            const newNode = template.transform(transform).toAst();
            if (newNode) {
                return typescript_1.createPropertyAssignment(typescript_1.createIdentifier(TEMPLATE_PROPERTY_NAME), newNode);
            }
        }
        return typescript_1.visitEachChild(node, visitor, context);
    };
    return visitor;
}
/**
 * @description A function that is used to initialize and return a Transformer
 *  callback, which in turn will be used to transform one or more nodes
 */
function transform(program, templateTransformFn) {
    return function transformerFactory(context) {
        return function transformer(sourceFile) {
            return typescript_1.visitNode(sourceFile, visit(context, templateTransformFn, program));
        };
    };
}
exports.transform = transform;
