"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isArray = Array.isArray;
exports.isObject = (value) => {
    return value != null && typeof value === 'object';
};
exports.isString = (value) => {
    return value != null && typeof value === 'string';
};
exports.invariant = (condition, message) => {
    if (!condition) {
        throw new Error(message);
    }
};
