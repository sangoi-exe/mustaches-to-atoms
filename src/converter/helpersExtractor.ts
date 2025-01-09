import { AST, traverse } from "@glimmer/syntax";

export const extractHelpers = (hbsTemplate: AST.Template): Set<string> => {
  const helpers = new Set<string>();

  traverse(hbsTemplate, {
    SubExpression(node) {
      const helperName = (node.path as AST.PathExpression).original;
      if (isValidHelperName(helperName)) {
        helpers.add(helperName);
      }
    },
    MustacheStatement(node) {
      if (node.path.type === "PathExpression") {
        const helperName = node.path.original;
        if (
          (node.params.length > 0 || Object.keys(node.hash).length > 0) &&
          isValidHelperName(helperName)
        ) {
          helpers.add(helperName);
        }
      }
    },
  });

  return helpers;
};

function isValidHelperName(name: string) {
  // Exemplo: só aceita se NÃO tiver ponto, barra nem hífen.
  // Ajuste conforme sua convenção de nomes de helpers
  return /^[A-Za-z0-9_]+$/.test(name);
}
