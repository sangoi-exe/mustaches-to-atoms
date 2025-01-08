import { AST as Glimmer } from "@glimmer/syntax";
import * as Babel from "@babel/types";
import { createRootChildren } from "./expressions.js";
import { prepareTemplatePaths } from "./pathsPrepare.js";
import { createComponent } from "./componentCreator.js";
import { extractLayout } from "./layoutExtractor.js";

/**
 * Cria o Program Babel a partir do AST do Glimmer + configurações.
 */
export const createTemplate = (
  hbsTemplate: Glimmer.Template,
  isComponent: boolean,
  isModule: boolean,
  includeImport: boolean,
  partials: Set<string>,
  helpers: Set<string>
): Babel.Program => {
  // Ajusta caminhos (ex.: adds "props" e "item" nos each)
  prepareTemplatePaths(hbsTemplate, isComponent);

  const directives: Babel.Statement[] = [];

  // Adiciona import de partials
  partials.forEach((partialName) => {
    // Ex.: import MeuPartial from "./MeuPartial.jsx"
    // Aqui você pode aplicar alguma sanitização (e.g. PascalCase)
    const sanitizedName = sanitizePartialName(partialName);
    directives.push(
      Babel.importDeclaration(
        [Babel.importDefaultSpecifier(Babel.identifier(sanitizedName))],
        Babel.stringLiteral(`./${sanitizedName}.jsx`)
      )
    );
  });

  // Adiciona import de helpers
  helpers.forEach((helperName) => {
    directives.push(
      Babel.importDeclaration(
        [Babel.importSpecifier(Babel.identifier(helperName), Babel.identifier(helperName))],
        Babel.stringLiteral(`../helpers/${helperName}.js`)
      )
    );
  });

  // Se houver layout
  const layoutName = extractLayout(hbsTemplate);
  if (layoutName) {
    const layoutIdentifier = Babel.jsxIdentifier(layoutName); // Correção: usar jsxIdentifier
    const layoutImport = Babel.importDeclaration(
      [Babel.importDefaultSpecifier(Babel.identifier(layoutName))], // Permanece Babel.identifier
      Babel.stringLiteral(`./layouts/${layoutName}.jsx`)
    );
    directives.unshift(layoutImport);
  }

  let componentBody = createRootChildren(hbsTemplate.body);

  // Verifica se componentBody precisa ser encapsulado em um fragmento JSX
  if (Array.isArray(componentBody)) {
    componentBody = Babel.jsxFragment(
      Babel.jsxOpeningFragment(),
      Babel.jsxClosingFragment(),
      componentBody
    );
  }

  // Envolve num layout, se existir
  if (layoutName) {
    const layoutIdentifier = Babel.jsxIdentifier(layoutName); // Correção: usar jsxIdentifier
    componentBody = Babel.jsxElement(
      Babel.jsxOpeningElement(layoutIdentifier, [], false), // Correção: usar jsxIdentifier
      Babel.jsxClosingElement(layoutIdentifier), // Correção: usar jsxIdentifier
      [componentBody],
      false
    );
  }

  // Se for componente, gera arrow function, senão é apenas a JSX expression
  const expression = isComponent ? createComponent(componentBody) : componentBody;

  const statement = isModule
    ? Babel.exportDefaultDeclaration(expression)
    : Babel.expressionStatement(expression);

  directives.push(statement);

  // Import do React, se solicitado
  if (includeImport) {
    directives.unshift(
      Babel.importDeclaration(
        [Babel.importDefaultSpecifier(Babel.identifier("React"))],
        Babel.stringLiteral("react")
      )
    );
  }

  return Babel.program(directives);
};

/**
 * Exemplos de sanitização de nomes de partial:
 * - "meu-partial" => "MeuPartial"
 * - "outro_partial" => "OutroPartial"
 */
function sanitizePartialName(rawName: string): string {
  const withoutExt = rawName.replace(/\.[^.]+$/, ""); // remove .hbs ou .handlebars, se existir
  const parts = withoutExt.split(/[^A-Za-z0-9]+/g).filter(Boolean);
  return parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join("");
}
