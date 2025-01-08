import { AST as Glimmer } from "@glimmer/syntax";

export const isPathExpression = (expr: Glimmer.Expression): expr is Glimmer.PathExpression => {
  return expr.type === "PathExpression";
};

export const isSubExpression = (expr: Glimmer.Expression): expr is Glimmer.SubExpression => {
  return expr.type === "SubExpression";
};
