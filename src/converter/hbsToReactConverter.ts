// src/converter/hbsToReactConverter.js

import { AST } from "@glimmer/syntax";
import * as Babel from "@babel/types";
import { createTemplate } from "./template.js";
import { extractPartials } from "./partialsExtractor.js";
import { extractHelpers } from "./helpersExtractor.js";

/**
 * Faz a conversão do AST do Handlebars para um Program Babel (que gera JSX).
 * @param hbsTemplate AST do template Handlebars.
 * @returns Babel.Program representando o componente React
 */
export const convertTemplateToReact = (hbsTemplate: AST.Template) => {
  const isComponent = false;
  const isModule = false;
  const includeImport = false;

  // Extrai partials e helpers
  const partials = extractPartials(hbsTemplate);
  const helpers = extractHelpers(hbsTemplate);

  // Cria o AST final em Babel
  const babelProgram: Babel.Program = createTemplate(
    hbsTemplate,
    isComponent,
    isModule,
    includeImport,
    partials,
    helpers,
  );

  return babelProgram;
};
