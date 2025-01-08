// src/converter/elements.js

import * as Babel from "@babel/types";
import isSelfClosing from "is-self-closing";
import { AST as Glimmer } from "@glimmer/syntax";
import { createStyleObject } from "./styles.js";
import htmlToReactAttributes from "../utils/reactAttrConveter.js";
import { createConcat, resolveExpression, createChildren } from "./expressions.js";

/**
 * Creates JSX fragment
 */
export const createFragment = (
  children: Babel.JSXFragment["children"],
  attributes: (Babel.JSXAttribute | Babel.JSXSpreadAttribute)[] = [],
) => {
  const fragmentMemberExpression = Babel.jsxMemberExpression(
    Babel.jsxIdentifier("React"),
    Babel.jsxIdentifier("Fragment"),
  );

  const openingFragment = Babel.jsxOpeningElement(fragmentMemberExpression, attributes);
  const closingFragment = Babel.jsxClosingElement(fragmentMemberExpression);

  return Babel.jsxElement(openingFragment, closingFragment, children, false);
};

/**
 * Coverts AttrNode to JSXAttribute
 */
export const createAttribute = (attrNode: Glimmer.AttrNode): Babel.JSXAttribute | null => {
  // Unsupported attribute
  const reactAttrName = htmlToReactAttributes(attrNode.name);

  if (!/^[_\-A-z0-9]+$/.test(reactAttrName)) {
    return null;
  }

  const name = Babel.jsxIdentifier(reactAttrName);
  const value = attrNode.value;

  switch (value.type) {
    case "TextNode": {
      if (reactAttrName === "style") {
        const styleObjectExpression = createStyleObject(value);
        return Babel.jsxAttribute(name, Babel.jsxExpressionContainer(styleObjectExpression));
      }

      return Babel.jsxAttribute(name, Babel.stringLiteral(value.chars));
    }

    case "MustacheStatement": {
      return Babel.jsxAttribute(name, Babel.jsxExpressionContainer(resolveExpression(value.path)));
    }

    case "ConcatStatement": {
      const expression = createConcat(value.parts);
      if (reactAttrName === "style") {
        const styleObjectExpression = createStyleObject(value);
        return Babel.jsxAttribute(name, Babel.jsxExpressionContainer(styleObjectExpression));
      }

      return Babel.jsxAttribute(name, Babel.jsxExpressionContainer(expression));
    }

    default: {
      throw new Error("Unexpected attribute value");
    }
  }
};

/**
 * Converts ElementNode to JSXElement
 */
export const convertElement = (node: Glimmer.ElementNode): Babel.JSXElement => {
  const tagName = Babel.jsxIdentifier(node.tag);
  const attributes = node.attributes
    .map((item) => createAttribute(item))
    .filter(Boolean) as Babel.JSXAttribute[];
  const isElementSelfClosing = node.selfClosing || isSelfClosing(node.tag);
  const children = createChildren(node.children);

  return Babel.jsxElement(
    Babel.jsxOpeningElement(tagName, attributes, isElementSelfClosing),
    Babel.jsxClosingElement(tagName),
    isElementSelfClosing ? [] : children,
    isElementSelfClosing,
  );
};
