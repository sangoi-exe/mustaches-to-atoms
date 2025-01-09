import * as Babel from "@babel/types";
import { format } from "prettier";
import generate from "@babel/generator";

export const generateJsx = async (babelProgram: Babel.Program): Promise<string> => {
  // Gera o código a partir do AST Babel
  let code = generate.default(babelProgram).code;

  // Aplica Prettier para formatar
  const formatted = format(code, { parser: "babel" });
  return formatted;
};
