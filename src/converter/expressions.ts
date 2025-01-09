import * as Babel from "@babel/types";
import { AST as Glimmer } from "@glimmer/syntax";
import { createFragment, convertElement } from "./elements.js";
import { isPartialNode, resolvePartialNode } from "./customNodes.js";
import { resolveBlockStatement } from "./blockStatements.js";
import { createComment } from "./comments.js";

export const resolveStatement = (statement: Glimmer.Statement) => {
  switch (statement.type) {
    case "ElementNode": {
      return convertElement(statement);
    }

    case "TextNode": {
      return Babel.stringLiteral(statement.chars);
    }

    case "MustacheStatement": {
      return resolveExpression(statement.path);
    }

    case "BlockStatement": {
      return resolveBlockStatement(statement);
    }

    case "MustacheCommentStatement":
    case "CommentStatement": {
      throw new Error("Top level comments currently is not supported");
    }

    default: {
      throw new Error(`Unexpected expression "${(statement as any).type}"`);
    }
  }
};

export const resolveElementChild = (
  statement: Glimmer.Statement,
):
  | Babel.JSXText
  | Babel.JSXElement
  | Babel.JSXExpressionContainer
  | Array<Babel.JSXText | Babel.JSXExpressionContainer>
  | null => {
  switch (statement.type) {
    case "ElementNode": {
      return convertElement(statement);
    }

    case "TextNode": {
      if (!statement.chars.trim()) {
        // Retorna null indicando que esse text node não deve virar JSX
        return null;
      }
      // Caso queira manter text normal, chame a prepareJsxText
      return prepareJsxText(statement.chars);
    }

    case "MustacheStatement": {
      if (isPartialNode(statement)) {
        return resolvePartialNode(statement);
      } else {
        return Babel.jsxExpressionContainer(resolveStatement(statement));
      }
    }

    case "MustacheCommentStatement":

    case "CommentStatement": {
      return createComment(statement);
    }

    default: {
      return Babel.jsxExpressionContainer(resolveStatement(statement));
    }
  }
};

export const resolveExpression = (
  expression: Glimmer.Expression,
): Babel.Literal | Babel.Identifier | Babel.MemberExpression => {
  switch (expression.type) {
    case "PathExpression": {
      return createPath(expression);
    }

    case "BooleanLiteral": {
      return Babel.booleanLiteral(expression.value);
    }

    case "NullLiteral": {
      return Babel.nullLiteral();
    }

    case "NumberLiteral": {
      return Babel.numericLiteral(expression.value);
    }

    case "StringLiteral": {
      return Babel.stringLiteral(expression.value);
    }

    case "UndefinedLiteral": {
      return Babel.identifier("undefined");
    }

    default: {
      throw new Error("Unexpected mustache statement");
    }
  }
};

export const createPath = (
  pathExpression: Glimmer.PathExpression,
): Babel.Identifier | Babel.MemberExpression => {
  const parts = pathExpression.parts;

  if (parts.length === 0) {
    throw new Error("Unexpected empty expression parts");
  }

  // Start identifier
  let acc: Babel.Identifier | Babel.MemberExpression = Babel.identifier(parts[0]);

  for (let i = 1; i < parts.length; i++) {
    acc = appendToPath(acc, Babel.identifier(parts[i]));
  }

  return acc;
};

export const appendToPath = (
  path: Babel.MemberExpression | Babel.Identifier,
  append: Babel.Identifier,
) => Babel.memberExpression(path, append);

export const prepareJsxText = (
  text: string,
): Babel.JSXText | Array<Babel.JSXText | Babel.JSXExpressionContainer> => {
  const parts = text.split(/({|})/);
  const cleaned = text.replace(/\s+/g, " ").trim();

  if (parts.length === 1) {
    return Babel.jsxText(cleaned);
  }

  return parts.map((item) =>
    item === "{" || item === "}"
      ? Babel.jsxExpressionContainer(Babel.stringLiteral(item))
      : Babel.jsxText(item),
  );
};

export const createChildren = (
  body: Glimmer.Statement[],
  options?: {
    partials?: { [name: string]: string };
    partialResolver?: (name: string) => string;
  },
): Babel.JSXElement["children"] =>
  body.reduce(
    (acc, statement) => {
      const child = resolveElementChild(statement);
      if (!child) {
        return acc;
      }

      return Array.isArray(child) ? [...acc, ...child] : [...acc, child];
    },
    [] as Babel.JSXElement["children"],
  );

export const createRootChildren = (
  body: Glimmer.Statement[],
  options?: {
    partials?: { [name: string]: string };
    partialResolver?: (name: string) => string;
  },
): Babel.JSXElement | Babel.JSXFragment => {
  if (body.length === 1) {
    const resolved = resolveStatement(body[0]);

    // Garante que o resultado seja algo compatível com JSX
    if (Babel.isJSXElement(resolved) || Babel.isJSXFragment(resolved)) {
      return resolved;
    }

    // Encapsula valores não compatíveis em JSXExpressionContainer
    return Babel.jsxElement(
      Babel.jsxOpeningElement(Babel.jsxIdentifier("div"), [], false),
      Babel.jsxClosingElement(Babel.jsxIdentifier("div")),
      [Babel.jsxExpressionContainer(resolved)],
      false,
    );
  }

  // Retorna um fragmento para múltiplos elementos
  return createFragment(createChildren(body, options));
};

export const createConcat = (
  parts: Glimmer.ConcatStatement["parts"],
): Babel.BinaryExpression | Babel.Expression => {
  if (parts.length === 0) {
    throw new Error("Concat statement parts cannot be empty");
  }

  return parts.reduce(
    (acc, item) => {
      if (acc == null) {
        return resolveStatement(item);
      }

      return Babel.binaryExpression("+", acc, resolveStatement(item));
    },
    null as null | Babel.Expression | Babel.BinaryExpression,
  ) as Babel.BinaryExpression | Babel.Expression;
};
