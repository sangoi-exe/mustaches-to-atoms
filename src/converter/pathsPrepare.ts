import { AST as Glimmer, traverse } from "@glimmer/syntax";
import { DEFAULT_NAMESPACE_NAME } from "./constants.js";

/**
 * Checks is each statement
 */
const isEachStatement = (node: Glimmer.Node): node is Glimmer.BlockStatement =>
  node.type === "BlockStatement" &&
  node.path.type === "PathExpression" &&
  node.path.original === "each";

/**
 * Creates stack of namespaces
 */
const createNamespaceStack = () => {
  const namespaces: { node: Glimmer.Node; name: string }[] = [];

  return {
    // Getter of length
    get length() {
      return namespaces.length;
    },

    /** Pushes sub namespaces */
    push: (item: { node: Glimmer.Node; name?: string }) =>
      namespaces.push({
        node: item.node,
        name: item.name || DEFAULT_NAMESPACE_NAME,
      }),

    /** Goes to namespace up */
    pop: () => namespaces.pop(),

    /** Returns head item of the stack */
    head: () => namespaces[namespaces.length - 1],
  };
};

/**
 * Prepares paths Glimmer AST for compatible with JS AST.
 */
export const prepareTemplatePaths = (Template: Glimmer.Template, isComponent: boolean) => {
  const namespaces = createNamespaceStack();

  // Global component namespace
  if (isComponent) {
    namespaces.push({ node: Template, name: "props" });
  }

  let eachStatementEntered = false;

  traverse(Template, {
    // Process block statements
    All: {
      enter(node: Glimmer.Node) {
        if (eachStatementEntered) {
          namespaces.push({ node });
          eachStatementEntered = false;
        }

        if (isEachStatement(node)) {
          eachStatementEntered = true;
        }
      },
      exit(node: Glimmer.Node) {
        // Exit from namespace
        if (namespaces.length > 0 && node === namespaces.head().node) {
          namespaces.pop();
        }
      },
    },

    // Process path expressions
    PathExpression(node: Glimmer.PathExpression) {
      // Add prefixes
      if (namespaces.length) {
        // Cria uma nova array com os itens anteriores e o novo namespace
        const newParts = [namespaces.head().name, ...node.parts];
        // Atribui a nova array ao node.parts (removendo o readonly)
        (node as any).parts = newParts;
      }
    },
  });
};
