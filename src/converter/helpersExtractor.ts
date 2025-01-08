import { AST, traverse } from "@glimmer/syntax";

export const extractHelpers = (hbsTemplate: AST.Template): Set<string> => {
  const helpers = new Set<string>();

  traverse(hbsTemplate, {
    SubExpression(node) {
      const helperName = (node.path as AST.PathExpression).original;
      helpers.add(helperName);
    },
    MustacheStatement(node) {
      if (node.path.type === "PathExpression") {
        const helperName = node.path.original;
        if (node.params.length > 0 || Object.keys(node.hash).length > 0) {
          helpers.add(helperName);
        }
      }
    },
  });

  return helpers;
};
