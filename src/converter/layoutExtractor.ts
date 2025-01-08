import { AST, traverse } from "@glimmer/syntax";

export const extractLayout = (hbsTemplate: AST.Template): string | null => {
  let layoutName: string | null = null;

  traverse(hbsTemplate, {
    CommentStatement(node) {
      const match = node.value.match(/layout:\s*(\S+)/);
      if (match) {
        layoutName = match[1];
      }
    },
  });

  return layoutName;
};
