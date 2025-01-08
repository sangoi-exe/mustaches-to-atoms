// blockStatement.ts

import * as Babel from "@babel/types";
import { AST as Glimmer } from "@glimmer/syntax";
import { createFragment } from "./elements.js";
import {
  resolveExpression,
  createRootChildren,
  createChildren,
  appendToPath,
  createPath,
} from "./expressions.js";
import { DEFAULT_NAMESPACE_NAME, DEFAULT_KEY_NAME } from "./constants.js";
import { getAssinaturaHelper } from "../assinatura/assinaturaHelpers.js";
import { isPathExpression } from "../utils/typeGuard.js";

export const resolveBlockStatement = (blockStatement: Glimmer.BlockStatement): Babel.Expression => {
  if (blockStatement.path.type === "PathExpression") {
    const helperName = blockStatement.path.original;

    // Verifica se o helper é um dos built-ins ou um helper customizado
    switch (helperName) {
      case "if":
      case "unless":
        return createConditionStatement(blockStatement, helperName === "unless");
      case "each":
        return createEachStatement(blockStatement);
      case "with":
        return createWithStatement(blockStatement);
      case "switch": // Adicione o caso para 'switch'
      case "case": // Adicione o caso para 'case'
      case "default":
        return getAssinaturaHelper(helperName, blockStatement)! as Babel.Expression;
      default:
        // Verifica se é um helper personalizado
        const customHelperExpression = getAssinaturaHelper(helperName, blockStatement);
        if (customHelperExpression) {
          return customHelperExpression as Babel.Expression;
        }
        // Fallback para qualquer outro helper de bloco
        return createCustomBlockStatement(blockStatement);
    }
  } else {
    throw new Error("Tipo de expressão do BlockStatement não suportado.");
  }
};

/**
 * Cria uma expressão condicional (if/unless)
 */
const createConditionStatement = (
  blockStatement: Glimmer.BlockStatement,
  invertCondition: boolean,
): Babel.Expression => {
  const { program, inverse, params } = blockStatement;
  const conditionParam = params[0];

  if (!conditionParam) {
    throw new Error("Condição não fornecida para o bloco if/unless");
  }

  let condition: Babel.Expression = invertCondition
    ? Babel.unaryExpression("!", resolveExpression(conditionParam))
    : resolveExpression(conditionParam);

  const consequent = createRootChildren(program.body);

  if (!inverse) {
    // se não tem {{else}}, vira um logicalExpression: condition && consequent
    return Babel.logicalExpression("&&", condition, consequent);
  } else {
    // se tem {{else}}, vira condition ? consequent : alternate
    const alternate = createRootChildren(inverse.body);
    return Babel.conditionalExpression(condition, consequent, alternate);
  }
};

/**
 * Cria o bloco each.
 */
const createEachStatement = (blockStatement: Glimmer.BlockStatement): Babel.Expression => {
  const pathExpression = blockStatement.params[0] as Glimmer.PathExpression;

  if (pathExpression.type !== "PathExpression") {
    throw new Error("Parâmetro inválido para o bloco each");
  }

  // array.map(...)
  const iterator = appendToPath(createPath(pathExpression), Babel.identifier("map"));

  // conteúdo do bloco each
  const mapCallbackChildren = createChildren(blockStatement.program.body);

  // function (item, i) { return <Fragment key={i}> ... </Fragment> }
  const mapCallback = Babel.arrowFunctionExpression(
    [Babel.identifier(DEFAULT_NAMESPACE_NAME), Babel.identifier(DEFAULT_KEY_NAME)],
    createFragment(mapCallbackChildren, [
      Babel.jsxAttribute(
        Babel.jsxIdentifier("key"),
        Babel.jsxExpressionContainer(Babel.identifier(DEFAULT_KEY_NAME)),
      ),
    ]),
  );

  // Condicional para verificar se o array existe; senão retorna null
  return Babel.conditionalExpression(
    Babel.logicalExpression("&&", createPath(pathExpression), createPath(pathExpression)),
    Babel.callExpression(iterator, [mapCallback]),
    Babel.nullLiteral(),
  );
};

/**
 * Cria um bloco with.
 * {(() => {
 *   const context = expr;
 *   return <Fragment>...</Fragment>
 * })()}
 */
const createWithStatement = (blockStatement: Glimmer.BlockStatement): Babel.Expression => {
  const contextParam = blockStatement.params[0];
  const expr = contextParam ? resolveExpression(contextParam) : Babel.objectExpression([]);
  const children = createRootChildren(blockStatement.program.body);

  return Babel.callExpression(
    Babel.arrowFunctionExpression(
      [],
      Babel.blockStatement([
        Babel.variableDeclaration("const", [
          Babel.variableDeclarator(Babel.identifier("context"), expr),
        ]),
        Babel.returnStatement(children),
      ]),
    ),
    [],
  );
};

/**
 * Cria um fallback para qualquer BlockStatement custom (ex.: {{#ifEqual}}, {{#xyz}}, etc.)
 *
 * Este método pode ser personalizado para tratar esses blocos
 * da forma que fizer mais sentido para o seu projeto.
 */
function createCustomBlockStatement(blockStatement: Glimmer.BlockStatement): Babel.Expression {
  let helperName: string;

  if (blockStatement.path.type === "PathExpression") {
    helperName = blockStatement.path.original; // Acessa 'original' com segurança
  } else {
    throw new Error("Unsupported CallableExpression type. Only PathExpression is supported.");
  }

  // Parâmetros passados no template ex.: {{#ifEqual a b}}...
  const params = blockStatement.params.map((p) => resolveExpression(p));

  // Children do bloco principal
  const mainBody = createRootChildren(blockStatement.program.body);

  // Caso haja um bloco inverso {{else}} ou {{^}}
  let elseBody: Babel.Expression | null = null;
  if (blockStatement.inverse) {
    elseBody = createRootChildren(blockStatement.inverse.body);
  }

  const args: Babel.Expression[] = [
    ...params,
    // callback para o bloco principal
    Babel.arrowFunctionExpression([], mainBody),
  ];

  // se existir bloco inverso, adicionamos como segundo callback
  if (elseBody) {
    args.push(Babel.arrowFunctionExpression([], elseBody));
  }

  return Babel.callExpression(Babel.identifier(helperName), args);
}
