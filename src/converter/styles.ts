import { AST as Glimmer, preprocess, print } from "@glimmer/syntax";
import * as Babel from "@babel/types";
import { createConcat, resolveStatement } from "./expressions.js";

/**
 * Transforms "prop-name" to "propName"
 * @param propName
 */
export const camelizePropName = (propName: string) =>
  propName.replace(/-([a-z])/g, (_, $1) => $1.toUpperCase());

/**
 * Create AST tree of style object
 */
export const createStyleObject = (
  hbsStatement: Glimmer.TextNode | Glimmer.ConcatStatement,
): Babel.ObjectExpression => {
  const rawHbsStatement: string =
    hbsStatement.type === "TextNode" ? hbsStatement.chars : print(hbsStatement).slice(1, -1);

  const objectProps = rawHbsStatement
    .split(";")
    .map((r) => r.trim())
    .filter((r) => r.length > 0)
    .map((cssRule) => {
      const [rawKey, rawValue]: (string | undefined)[] = cssRule
        .split(":")
        .map((str) => str.trim());

      if (!rawKey || !rawValue) {
        throw new Error(`Invalid CSS rule: "${cssRule}"`);
      }

      const [hbsKey, hbsValue] = [rawKey, rawValue].map(
        (item) =>
          preprocess(item).body.filter(
            (item) => item.type === "MustacheStatement" || item.type === "TextNode",
          ) as Array<Glimmer.TextNode | Glimmer.MustacheStatement>,
      );

      if (hbsKey.length === 0) {
        throw new Error(`Empty key in style attribute: "${cssRule}"`);
      }
      if (hbsValue.length === 0) {
        throw new Error(`Empty value in style attribute: "${cssRule}"`);
      }

      const key =
        hbsKey.length === 1 && hbsKey[0].type === "TextNode"
          ? Babel.stringLiteral(camelizePropName((hbsKey[0] as Glimmer.TextNode).chars))
          : createConcat(
              hbsKey as [
                Glimmer.MustacheStatement | Glimmer.TextNode,
                ...Array<Glimmer.MustacheStatement | Glimmer.TextNode>,
              ],
            );

      const value =
        hbsValue.length === 1
          ? resolveStatement(hbsValue[0])
          : createConcat(
              hbsValue as [
                Glimmer.MustacheStatement | Glimmer.TextNode,
                ...Array<Glimmer.MustacheStatement | Glimmer.TextNode>,
              ],
            );
      const isComputed = hbsKey.length > 1;

      return Babel.objectProperty(key, value, isComputed);
    });

  return Babel.objectExpression(objectProps);
};
