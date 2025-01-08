import * as Babel from "@babel/types";
import { AST as Glimmer } from "@glimmer/syntax";
import { resolveExpression } from "../converter/expressions.js";

type HelperFunction = (...args: Babel.Expression[]) => Babel.Node;

interface AssinaturaHelpers {
  [key: string]: HelperFunction;
}

const assinaturaHelpers: AssinaturaHelpers = {
  ifEqual: function (arg1, arg2, options) {
    return Babel.conditionalExpression(
      Babel.binaryExpression("==", arg1, arg2),
      Babel.callExpression(options, []),
      Babel.callExpression(Babel.memberExpression(options, Babel.identifier("inverse")), []),
    );
  },

  ifNEqual: function (arg1, arg2, options) {
    return Babel.conditionalExpression(
      Babel.binaryExpression("!=", arg1, arg2),
      Babel.callExpression(options, []),
      Babel.nullLiteral(),
    );
  },

  switch: function (value, options) {
    if (!options || !(options as any).fn) {
      return Babel.nullLiteral();
    }
    const cases = (options as any).fn(this);

    if (Array.isArray((cases as any).elements)) {
      let finalExpression: Babel.Expression = (options as any).inverse
        ? Babel.callExpression(
            Babel.memberExpression(options as any, Babel.identifier("inverse")),
            [],
          )
        : Babel.nullLiteral();
      for (let i = cases.elements.length - 1; i >= 0; i--) {
        const caseNode = cases.elements[i];
        if (Babel.isConditionalExpression(caseNode)) {
          finalExpression = Babel.conditionalExpression(
            Babel.binaryExpression("===", value, (caseNode.test as Babel.BinaryExpression).right),
            caseNode.consequent,
            finalExpression,
          );
        }
      }
      return finalExpression;
    }
    return Babel.nullLiteral();
  },

  case: function (value, options) {
    // 'case' deve retornar um condicional que será usado pelo 'switch'
    return Babel.conditionalExpression(
      Babel.booleanLiteral(true), // Uma condição placeholder, o 'switch' fará a comparação
      Babel.callExpression(options, []),
      Babel.nullLiteral(),
    );
  },

  default: function (options) {
    return Babel.callExpression(options, []);
  },

  ifCond: function (...args: Babel.Expression[]) {
    const [v1, operator, v2, options] = args;
    if (!Babel.isStringLiteral(operator)) {
      throw new Error("Invalid operator for ifCond");
    }
    // Separe os operadores binários e lógicos que deseja aceitar
    const binaryOperators = {
      "==": "==",
      "===": "===",
      "!=": "!=",
      "!==": "!==",
      "<": "<",
      "<=": "<=",
      ">": ">",
      ">=": ">=",
    } as const;

    const logicalOperators = {
      "&&": "&&",
      "||": "||",
    } as const;

    let testExpression: Babel.Expression;

    if (operator.value in binaryOperators) {
      // Se for um operador binário, criamos uma BinaryExpression
      testExpression = Babel.binaryExpression(
        binaryOperators[operator.value as keyof typeof binaryOperators],
        v1,
        v2,
      );
    } else if (operator.value in logicalOperators) {
      // Se for um operador lógico, criamos uma LogicalExpression
      testExpression = Babel.logicalExpression(
        logicalOperators[operator.value as keyof typeof logicalOperators],
        v1,
        v2,
      );
    } else {
      throw new Error(`Operador inválido: ${operator.value}`);
    }

    // Retorna uma expressão condicional do Babel
    // test ? options() : options.inverse()
    return Babel.conditionalExpression(
      testExpression,
      Babel.callExpression(options, []),
      Babel.callExpression(Babel.memberExpression(options, Babel.identifier("inverse")), []),
    );
  },

  calculateCarouselMargin: function (size: Babel.Expression) {
    const condition1 = Babel.ifStatement(
      Babel.binaryExpression("<=", size, Babel.numericLiteral(5)),
      Babel.blockStatement([Babel.returnStatement(Babel.numericLiteral(405))]),
    );

    const condition2 = Babel.ifStatement(
      Babel.binaryExpression(">=", size, Babel.numericLiteral(10)),
      Babel.blockStatement([
        Babel.returnStatement(
          Babel.binaryExpression(
            "+",
            Babel.numericLiteral(405),
            Babel.binaryExpression(
              "*",
              Babel.callExpression(
                Babel.memberExpression(Babel.identifier("Math"), Babel.identifier("floor")),
                [Babel.binaryExpression("/", size, Babel.numericLiteral(3))],
              ),
              Babel.numericLiteral(200),
            ),
          ),
        ),
      ]),
    );

    const defaultReturn = Babel.returnStatement(
      Babel.binaryExpression(
        "+",
        Babel.numericLiteral(405),
        Babel.binaryExpression(
          "*",
          Babel.callExpression(
            Babel.memberExpression(Babel.identifier("Math"), Babel.identifier("floor")),
            [Babel.binaryExpression("/", size, Babel.numericLiteral(4))],
          ),
          Babel.numericLiteral(200),
        ),
      ),
    );

    return Babel.callExpression(
      Babel.arrowFunctionExpression(
        [],
        Babel.blockStatement([condition1, condition2, defaultReturn]),
      ),
      [],
    );
  },

  jsonStringify: function (valor: Babel.Expression) {
    return Babel.callExpression(
      Babel.memberExpression(Babel.identifier("JSON"), Babel.identifier("stringify")),
      [valor],
    );
  },

  numberToPhone: function (valor: Babel.Expression) {
    const valorLimpo = Babel.variableDeclaration("let", [
      Babel.variableDeclarator(
        Babel.identifier("valorLimpo"),
        Babel.callExpression(
          Babel.memberExpression(
            Babel.callExpression(
              Babel.memberExpression(Babel.stringLiteral(""), Babel.identifier("replace")),
              [Babel.regExpLiteral("\\\\D", "g"), valor],
            ),
            Babel.identifier("toString"),
          ),
          [],
        ),
      ),
    ]);

    const matchCelularNovo = Babel.variableDeclaration("let", [
      Babel.variableDeclarator(
        Babel.identifier("matchCelularNovo"),
        Babel.callExpression(
          Babel.memberExpression(Babel.identifier("valorLimpo"), Babel.identifier("match")),
          [Babel.regExpLiteral("^(\\d{2})(\\d{5})(\\d{4})$")],
        ),
      ),
    ]);

    const matchCelularAntigo = Babel.variableDeclaration("let", [
      Babel.variableDeclarator(
        Babel.identifier("matchCelularAntigo"),
        Babel.callExpression(
          Babel.memberExpression(Babel.identifier("valorLimpo"), Babel.identifier("match")),
          [Babel.regExpLiteral("^(\\d{2})(\\d{4})(\\d{4})$")],
        ),
      ),
    ]);

    const ifNovo = Babel.ifStatement(
      Babel.identifier("matchCelularNovo"),
      Babel.blockStatement([
        Babel.returnStatement(
          Babel.callExpression(
            Babel.memberExpression(
              Babel.arrayExpression([
                Babel.stringLiteral("("),
                Babel.memberExpression(
                  Babel.identifier("matchCelularNovo"),
                  Babel.numericLiteral(1),
                  true,
                ),
                Babel.stringLiteral(") "),
                Babel.memberExpression(
                  Babel.identifier("matchCelularNovo"),
                  Babel.numericLiteral(2),
                  true,
                ),
                Babel.stringLiteral("-"),
                Babel.memberExpression(
                  Babel.identifier("matchCelularNovo"),
                  Babel.numericLiteral(3),
                  true,
                ),
              ]),
              Babel.identifier("join"),
            ),
            [Babel.stringLiteral("")],
          ),
        ),
      ]),
      Babel.ifStatement(
        Babel.identifier("matchCelularAntigo"),
        Babel.blockStatement([
          Babel.returnStatement(
            Babel.callExpression(
              Babel.memberExpression(
                Babel.arrayExpression([
                  Babel.stringLiteral("("),
                  Babel.memberExpression(
                    Babel.identifier("matchCelularAntigo"),
                    Babel.numericLiteral(1),
                    true,
                  ),
                  Babel.stringLiteral(") "),
                  Babel.memberExpression(
                    Babel.identifier("matchCelularAntigo"),
                    Babel.numericLiteral(2),
                    true,
                  ),
                  Babel.stringLiteral("-"),
                  Babel.memberExpression(
                    Babel.identifier("matchCelularAntigo"),
                    Babel.numericLiteral(3),
                    true,
                  ),
                ]),
                Babel.identifier("join"),
              ),
              [Babel.stringLiteral("")],
            ),
          ),
        ]),
        Babel.blockStatement([Babel.returnStatement(Babel.nullLiteral())]),
      ),
    );
    return Babel.callExpression(
      Babel.arrowFunctionExpression(
        [],
        Babel.blockStatement([valorLimpo, matchCelularNovo, matchCelularAntigo, ifNovo]),
      ),
      [],
    );
  },

  limitaTexto: function (valor: Babel.Expression) {
    return Babel.conditionalExpression(
      Babel.binaryExpression(
        ">",
        Babel.memberExpression(valor, Babel.identifier("length")),
        Babel.numericLiteral(20),
      ),
      Babel.templateLiteral(
        [
          Babel.templateElement({ raw: "", cooked: "" }, false),
          Babel.templateElement({ raw: "...", cooked: "..." }, true),
        ],
        [
          Babel.callExpression(Babel.memberExpression(valor, Babel.identifier("substring")), [
            Babel.numericLiteral(0),
            Babel.numericLiteral(19),
          ]),
        ],
      ),
      valor,
    );
  },

  comparaValorAnterior: function (lista: Babel.Expression, indice: Babel.Expression) {
    const condicao = Babel.ifStatement(
      Babel.binaryExpression("==", indice, Babel.numericLiteral(0)),
      Babel.blockStatement([Babel.returnStatement(Babel.booleanLiteral(false))]),
      Babel.blockStatement([
        Babel.variableDeclaration("const", [
          Babel.variableDeclarator(
            Babel.identifier("elAtual"),
            Babel.unaryExpression("+", Babel.memberExpression(lista, indice, true)),
          ),
        ]),
        Babel.variableDeclaration("const", [
          Babel.variableDeclarator(
            Babel.identifier("elAnterior"),
            Babel.unaryExpression(
              "+",
              Babel.memberExpression(
                lista,
                Babel.binaryExpression("-", indice, Babel.numericLiteral(1)),
                true,
              ),
            ),
          ),
        ]),
        Babel.returnStatement(
          Babel.binaryExpression(">", Babel.identifier("elAtual"), Babel.identifier("elAnterior")),
        ),
      ]),
    );

    return Babel.callExpression(
      Babel.arrowFunctionExpression([], Babel.blockStatement([condicao])),
      [],
    );
  },

  comparaValorPosterior: function (lista: Babel.Expression, indice: Babel.Expression) {
    const condicao = Babel.ifStatement(
      Babel.binaryExpression(
        "==",
        indice,
        Babel.binaryExpression(
          "-",
          Babel.memberExpression(lista, Babel.identifier("length")),
          Babel.numericLiteral(1),
        ),
      ),
      Babel.blockStatement([Babel.returnStatement(Babel.booleanLiteral(false))]),
      Babel.blockStatement([
        Babel.variableDeclaration("const", [
          Babel.variableDeclarator(
            Babel.identifier("elAtual"),
            Babel.unaryExpression("+", Babel.memberExpression(lista, indice, true)),
          ),
        ]),
        Babel.variableDeclaration("const", [
          Babel.variableDeclarator(
            Babel.identifier("elPosterior"),
            Babel.unaryExpression(
              "+",
              Babel.memberExpression(
                lista,
                Babel.binaryExpression("+", indice, Babel.numericLiteral(1)),
                true,
              ),
            ),
          ),
        ]),
        Babel.returnStatement(
          Babel.logicalExpression(
            "||",
            Babel.binaryExpression(
              "<",
              Babel.identifier("elAtual"),
              Babel.identifier("elPosterior"),
            ),
            Babel.binaryExpression(
              "==",
              Babel.identifier("elAtual"),
              Babel.identifier("elPosterior"),
            ),
          ),
        ),
      ]),
    );

    return Babel.callExpression(
      Babel.arrowFunctionExpression([], Babel.blockStatement([condicao])),
      [],
    );
  },

  subtracao: function (valorAtual: Babel.Expression, valorSubtrair: Babel.Expression) {
    return Babel.binaryExpression("-", valorAtual, valorSubtrair);
  },

  adicao: function (valorAtual: Babel.Expression, valorAdicionar: Babel.Expression) {
    return Babel.binaryExpression("+", valorAtual, valorAdicionar);
  },

  includes: function (array: Babel.Expression, value: Babel.Expression, options) {
    return Babel.conditionalExpression(
      Babel.binaryExpression(
        ">",
        Babel.callExpression(Babel.memberExpression(array, Babel.identifier("indexOf")), [value]),
        Babel.unaryExpression("-", Babel.numericLiteral(1)),
      ),
      Babel.callExpression(options, []),
      Babel.callExpression(Babel.memberExpression(options, Babel.identifier("inverse")), []),
    );
  },

  calculateCampos: function (campos: Babel.Expression) {
    const len = Babel.memberExpression(campos, Babel.identifier("length"));

    const switchStatement = Babel.switchStatement(len, [
      Babel.switchCase(Babel.numericLiteral(1), [
        Babel.returnStatement(Babel.stringLiteral("input-field col s12 m12 l12")),
      ]),
      Babel.switchCase(Babel.numericLiteral(2), [
        Babel.returnStatement(Babel.stringLiteral("input-field col s12 m6 l6")),
      ]),
      Babel.switchCase(null, [
        Babel.returnStatement(Babel.stringLiteral("input-field col s12 m4 l4")),
      ]),
    ]);

    return Babel.callExpression(
      Babel.arrowFunctionExpression([], Babel.blockStatement([switchStatement])),
      [],
    );
  },

  t: function (valor: Babel.Expression, ...params: Babel.Expression[]) {
    const options = params.pop() as Babel.Expression;

    const idioma = Babel.memberExpression(
      Babel.memberExpression(
        Babel.memberExpression(options, Babel.identifier("data")),
        Babel.identifier("root"),
      ),
      Babel.identifier("idioma"),
    );

    const idiomadefault = Babel.stringLiteral("pt");

    const textoCompletoDecl = Babel.variableDeclaration("let", [
      Babel.variableDeclarator(Babel.identifier("textoCompleto"), Babel.stringLiteral("")),
    ]);

    const palavraDecl = Babel.variableDeclaration("let", [
      Babel.variableDeclarator(
        Babel.identifier("palavra"),
        Babel.callExpression(
          Babel.memberExpression(
            Babel.callExpression(Babel.memberExpression(valor, Babel.identifier("split")), [
              Babel.stringLiteral("."),
            ]),
            Babel.identifier("reduce"),
          ),
          [
            Babel.arrowFunctionExpression(
              [Babel.identifier("p"), Babel.identifier("n")],
              Babel.memberExpression(
                Babel.memberExpression(Babel.identifier("global"), Babel.identifier("idiomas")),
                idioma,
                true,
              ),
            ),
            Babel.memberExpression(
              Babel.memberExpression(Babel.identifier("global"), Babel.identifier("idiomas")),
              idioma,
              true,
            ),
          ],
        ),
      ),
    ]);

    const ifPalavra = Babel.ifStatement(
      Babel.identifier("palavra"),
      Babel.blockStatement([
        Babel.expressionStatement(
          Babel.assignmentExpression(
            "=",
            Babel.identifier("textoCompleto"),
            Babel.identifier("palavra"),
          ),
        ),
      ]),
      Babel.blockStatement([
        Babel.expressionStatement(
          Babel.assignmentExpression(
            "=",
            Babel.identifier("textoCompleto"),
            Babel.callExpression(
              Babel.memberExpression(
                Babel.callExpression(Babel.memberExpression(valor, Babel.identifier("split")), [
                  Babel.stringLiteral("."),
                ]),
                Babel.identifier("reduce"),
              ),
              [
                Babel.arrowFunctionExpression(
                  [Babel.identifier("p"), Babel.identifier("n")],
                  Babel.memberExpression(
                    Babel.memberExpression(Babel.identifier("global"), Babel.identifier("idiomas")),
                    idiomadefault,
                    true,
                  ),
                ),
                Babel.memberExpression(
                  Babel.memberExpression(Babel.identifier("global"), Babel.identifier("idiomas")),
                  idiomadefault,
                  true,
                ),
              ],
            ),
          ),
        ),
      ]),
    );

    const ifParams = Babel.ifStatement(
      Babel.memberExpression(Babel.identifier("params"), Babel.identifier("length")),
      Babel.blockStatement([
        Babel.forInStatement(
          Babel.variableDeclaration("const", [Babel.variableDeclarator(Babel.identifier("key"))]),
          Babel.identifier("params"),
          Babel.blockStatement([
            Babel.expressionStatement(
              Babel.assignmentExpression(
                "=",
                Babel.identifier("textoCompleto"),
                Babel.callExpression(
                  Babel.memberExpression(
                    Babel.identifier("textoCompleto"),
                    Babel.identifier("replace"),
                  ),
                  [
                    Babel.templateLiteral(
                      [
                        Babel.templateElement({ raw: "$", cooked: "$" }, false),
                        Babel.templateElement({ raw: "", cooked: "" }, true),
                      ],
                      [params[0]],
                    ),
                    params[1],
                  ],
                ),
              ),
            ),
          ]),
        ),
      ]),
    );

    const tryCatch = Babel.tryStatement(
      Babel.blockStatement([
        textoCompletoDecl,
        palavraDecl,
        ifPalavra,
        ifParams,
        Babel.returnStatement(Babel.identifier("textoCompleto")),
      ]),
      Babel.catchClause(
        Babel.identifier("error"),
        Babel.blockStatement([
          Babel.returnStatement(
            Babel.memberExpression(Babel.identifier("error"), Babel.identifier("message")),
          ),
        ]),
      ),
    );

    return Babel.callExpression(
      Babel.arrowFunctionExpression([], Babel.blockStatement([tryCatch])),
      [],
    );
  },

  randomId: function () {
    return Babel.callExpression(
      Babel.memberExpression(Babel.identifier("crypto"), Babel.identifier("randomBytes")),
      [Babel.numericLiteral(16)],
    );
  },

  localeDateTime: function (v: Babel.Expression) {
    return Babel.conditionalExpression(
      v,
      Babel.callExpression(
        Babel.memberExpression(
          Babel.newExpression(Babel.identifier("Date"), [v]),
          Babel.identifier("toLocaleString"),
        ),
        [],
      ),
      Babel.stringLiteral(""),
    );
  },

  isCriarEditarAmbientePefilAdmSistema: function (
    location: Babel.Expression,
    perfil: Babel.Expression,
    options,
  ) {
    return Babel.conditionalExpression(
      Babel.logicalExpression(
        "&&",
        Babel.logicalExpression(
          "||",
          Babel.binaryExpression("===", location, Babel.stringLiteral("criar-ambiente-perfil-3")),
          Babel.binaryExpression("===", location, Babel.stringLiteral("editar-ambiente-perfil-3")),
        ),
        Babel.binaryExpression("===", perfil, Babel.stringLiteral("3")),
      ),
      Babel.callExpression(options, []),
      Babel.callExpression(Babel.memberExpression(options, Babel.identifier("inverse")), []),
    );
  },

  production: function () {
    return Babel.binaryExpression(
      "===",
      Babel.memberExpression(
        Babel.memberExpression(Babel.identifier("process"), Babel.identifier("env")),
        Babel.identifier("ENVIRONMENT_TYPE"),
      ),
      Babel.stringLiteral("production"),
    );
  },
};

export const getAssinaturaHelper = (
  helperName: string,
  blockStatement: Glimmer.BlockStatement,
): Babel.Node | null => {
  const helper = assinaturaHelpers[helperName];
  if (helper) {
    const params = blockStatement.params.map((p) => resolveExpression(p));
    let options: Babel.Expression = Babel.identifier("undefined");

    if (blockStatement.program) {
      options = Babel.arrowFunctionExpression([], createRootChildren(blockStatement.program.body));
    }

    if (blockStatement.inverse) {
      options = Babel.objectExpression([
        Babel.objectProperty(
          Babel.identifier("fn"),
          Babel.arrowFunctionExpression([], createRootChildren(blockStatement.program.body)),
        ),
        Babel.objectProperty(
          Babel.identifier("inverse"),
          Babel.arrowFunctionExpression([], createRootChildren(blockStatement.inverse.body)),
        ),
      ]);
    }

    return helper(...params, options);
  }
  return null;
};

// Função auxiliar para criar os filhos da raiz
function createRootChildren(body: Glimmer.Statement[]): Babel.Expression {
  return Babel.arrayExpression(
    body.map((statement) => {
      if (statement.type === "TextNode") {
        return Babel.stringLiteral((statement as Glimmer.TextNode).chars);
      } else {
        // Adapte isso para outros tipos de nós que você possa ter
        console.warn(`Tipo de statement não tratado: ${statement.type}`);
        return Babel.nullLiteral();
      }
    }),
  );
}
