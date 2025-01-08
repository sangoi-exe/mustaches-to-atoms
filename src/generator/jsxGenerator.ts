import * as Babel from "@babel/types";
import { format } from "prettier";
import generate from "@babel/generator";

export const generateJsx = async (
  babelProgram: Babel.Program,
  componentName: string,
): Promise<string> => {
  let code = generate.default(babelProgram).code.trim();
  code = code.replace(/^\(|\);\s*$/g, "").replace(/;\s*$/g, "");

  const wrappedCode = `
  import React from 'react';

  const ${componentName} = (props) => (
    ${code}
  );

  export default ${componentName};
`;

  return format(wrappedCode, { parser: "babel" });
};
