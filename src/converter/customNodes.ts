// src/converter/customNodes.js

import * as Babel from "@babel/types";
import { AST } from "@glimmer/syntax";
import { resolveExpression } from "./expressions.js";
import { createChildren } from "./expressions.js";

/**
 * Verifica se é um node que representa partial customizado (ex.: {{__partial__ "nome"}}).
 */
export const isPartialNode = (node: AST.MustacheStatement): boolean => {
  return (
    node.type === "MustacheStatement" &&
    node.path.type === "PathExpression" &&
    node.path.original === "__partial__"
  );
};

/**
 * Converte um MustacheStatement do tipo {{__partial__ "MeuPartial" param1 param2...}}
 * em JSX <MeuPartial param0={param1} param1={param2} ... />
 */
export const resolvePartialNode = (node: AST.MustacheStatement): Babel.JSXElement => {
  // Primeiro parâmetro deve ser o "nome" do partial
  const partialNameParam = node.params[0];
  if (!partialNameParam || partialNameParam.type !== "StringLiteral") {
    throw new Error("Nome do partial inválido ou não fornecido.");
  }

  const partialName = partialNameParam.value;

  // Demais parâmetros viram props param0, param1...
  const props = node.params.slice(1).map((param, index) => {
    const propName = `param${index}`;
    return Babel.jsxAttribute(
      Babel.jsxIdentifier(propName),
      Babel.jsxExpressionContainer(resolveExpression(param)),
    );
  });

  // Cria JSX do tipo <MeuPartial ... />
  const openingElement = Babel.jsxOpeningElement(Babel.jsxIdentifier(partialName), props, true);
  return Babel.jsxElement(openingElement, null, [], true);
};
