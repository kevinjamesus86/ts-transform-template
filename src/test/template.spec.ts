import * as ts from 'typescript';
import { parse } from './util/parse';
import { traverse, TraversableNode } from '../template';

describe('Template.traverse', () => {
  /**
   * Test setup sanity check
   */

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

  /**
   * Actual tests
   */

  it('NoSubStitutionTemplateLiteral', () => {
    const { node, program } = parse<TraversableNode>(() => {
      return `<no-sub-template />`;
    });

    const gen = traverse(node, program);
    expect(gen.next().value).toBe(`<no-sub-template />`);
    expect(gen.next().done).toBe(true);
  });

  it('StringLiteral', () => {
    const { node, program } = parse<TraversableNode>(() => {
      return '<string-literal-template />';
    });

    const gen = traverse(node, program);
    expect(gen.next().value).toBe(`<string-literal-template />`);
    expect(gen.next().done).toBe(true);
  });

  it('BinaryExpressions', () => {
    const { node, program } = parse<ts.BinaryExpression>(() => {
      return '<bin-exp>' + '<br>' + '</bin-exp>';
    });

    const gen = traverse(node, program);
    expect(gen.next().value).toBe(`<bin-exp>`);
    expect(gen.next().value).toBe(`<br>`);
    expect(gen.next().value).toBe(`</bin-exp>`);
    expect(gen.next().done).toBe(true);
  });

  it('BinaryExpressions with number literal', () => {
    const { node, program } = parse<ts.BinaryExpression>(() => {
      return '<bin-exp>' + 1e3 + '</bin-exp>';
    });

    const gen = traverse(node, program);
    expect(gen.next().value).toBe(`<bin-exp>`);
    expect(gen.next().value).toBe(`1000`);
    expect(gen.next().value).toBe(`</bin-exp>`);
    expect(gen.next().done).toBe(true);
  });

  it('BinaryExpressions with enums', () => {
    const { node, program } = parse<ts.BinaryExpression>(() => {
      const enum Stylee {
        TheClass = 'RacecaR-1',
      }
      return '<bin-exp class="' + Stylee.TheClass + '" />';
    });

    const gen = traverse(node, program);
    expect(gen.next().value).toBe(`<bin-exp class="`);
    expect(gen.next().value).toBe(`RacecaR-1`);
    expect(gen.next().value).toBe(`" />`);
    expect(gen.next().done).toBe(true);
  });

  it('BinaryExpressions with const', () => {
    const { node, program } = parse<ts.BinaryExpression>(() => {
      const TheClass = 'RacecaR-2';
      return '<bin-exp class="' + TheClass + '" />';
    });

    const gen = traverse(node, program);
    expect(gen.next().value).toBe(`<bin-exp class="`);
    expect(gen.next().value).toBe(`RacecaR-2`);
    expect(gen.next().value).toBe(`" />`);
    expect(gen.next().done).toBe(true);
  });

  it('TemplateExpression with string literal', () => {
    const { node, program } = parse<ts.TemplateExpression>(() => {
      return `<div class=${'clazz'} />`;
    });

    const gen = traverse(node, program);
    expect(gen.next().value).toBe(`<div class=`);
    expect(gen.next().value).toBe(`clazz`);
    expect(gen.next().value).toBe(` />`);
    expect(gen.next().done).toBe(true);
  });

  it('TemplateExpression with number literal', () => {
    const { node, program } = parse<ts.TemplateExpression>(() => {
      return `<div class=${1e3} />`;
    });

    const gen = traverse(node, program);
    expect(gen.next().value).toBe(`<div class=`);
    expect(gen.next().value).toBe(`1000`);
    expect(gen.next().value).toBe(` />`);
    expect(gen.next().done).toBe(true);
  });

  it('TemplateExpression with enums', () => {
    const { node, program } = parse<ts.TemplateExpression>(() => {
      const enum Stylee {
        TheClass = 'tree-1',
      }

      return `<div class=${Stylee.TheClass} />`;
    });

    const gen = traverse(node, program);
    expect(gen.next().value).toBe(`<div class=`);
    expect(gen.next().value).toBe(`tree-1`);
    expect(gen.next().value).toBe(` />`);
    expect(gen.next().done).toBe(true);
  });

  it('TemplateExpression with const', () => {
    const { node, program } = parse<ts.TemplateExpression>(() => {
      const TheClass = 'tree-2';
      return `<div class=${TheClass} />`;
    });

    const gen = traverse(node, program);
    expect(gen.next().value).toBe(`<div class=`);
    expect(gen.next().value).toBe(`tree-2`);
    expect(gen.next().value).toBe(` />`);
    expect(gen.next().done).toBe(true);
  });

  it('THE BIG TEMPLATE', () => {
    const { node, program } = parse<ts.BinaryExpression>(() => {
      const Str = 'nope';
      const Num = 1e6;

      return (
        `
        <div class="${Str}">
          #text: ${Str + Num}
        </div>
      ` +
        ('<div>' + '#text: ' + 'please ' + Str + '</div>')
      );
    });

    const gen = traverse(node, program);
    expect(gen.next().value).toMatch(`<div class="`);
    expect(gen.next().value).toBe(`nope`);
    expect(gen.next().value).toMatch(/">\n\s+#text: /);
    expect(gen.next().value).toBe('nope');
    expect(gen.next().value).toBe('1000000');
    expect(gen.next().value).toMatch('</div>');
    expect(gen.next().value).toBe('<div>');
    expect(gen.next().value).toBe('#text: ');
    expect(gen.next().value).toBe('please ');
    expect(gen.next().value).toBe('nope');
    expect(gen.next().value).toBe('</div>');
    expect(gen.next().done).toBe(true);
  });
});
