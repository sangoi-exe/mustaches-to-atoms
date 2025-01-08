import { AST, traverse } from "@glimmer/syntax";
import { isPartialNode } from "./customNodes.js";

export const extractPartials = (hbsTemplate: AST.Template): Set<string> => {
  const partials = new Set<string>();

  traverse(hbsTemplate, {
    MustacheStatement(node) {
      if (isPartialNode(node)) {
        const partialNameParam = node.params[0];
        if (partialNameParam && partialNameParam.type === "StringLiteral") {
          partials.add(partialNameParam.value);
        }
      }
    },
  });

  return partials;
};
