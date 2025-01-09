// src/index.ts

import path from "path";
import { Command } from "commander";
import { preprocess as glimmerPreprocess, AST as GlimmerAST } from "@glimmer/syntax";
import { parse as handlebarsParse, AST as HbsAST } from "@handlebars/parser";
import { generateJsx } from "./generator/jsxGenerator.js";
import { logError, logInfo, logSuccess } from "./utils/logger.js";
import { readFilesFromDir, writeFile } from "./utils/fileUtils.js";
import { convertTemplateToReact } from "./converter/hbsToReactConverter.js";
import { fixMultilineDashComments, preprocessTemplate } from "./utils/templatePreprocessor.js";

// Helpers que podem ser transformados em bloco de atributo
// (ex.: se quiser re-escrever ou tratar de forma específica no rewriteBlockAttributes)
const BLOCK_HELPERS_TO_TRANSFORM = [
  "ifEqual",
  "ifNEqual",
  "ifCond",
  "if",
  "unless",
  "switch",
  "case",
  "default",
  "includes",
  "t",
  "isCriarEditarAmbientePefilAdmSistema",
];

/**
 * Faz parse do template usando Glimmer. Caso dê erro no caso de blocks em atributos,
 * faz fallback usando @handlebars/parser, reescreve e tenta novamente com Glimmer.
 */
function parseWithFallback(originalHbs: string): GlimmerAST.Template {
  const fixedCommentsHbs = fixMultilineDashComments(originalHbs);
  try {
    return glimmerPreprocess(originalHbs);
  } catch (err: any) {
    if (
      typeof err.message === "string" &&
      err.message.includes("A block may only be used inside an HTML element or another block.")
    ) {
      logInfo("[Glimmer] Block em atributo. Fallback para @handlebars/parser.");
      const hbsAst = handlebarsParse(originalHbs);
      const fixedHbs = rewriteBlockAttributes(hbsAst);
      logInfo("[Glimmer] Reparse após reescrita de blocks em atributo.");
      return glimmerPreprocess(fixedHbs);
    }
    throw err;
  }
}

// -- Funções auxiliares para reescrita do HBS no fallback --

function rewriteBlockAttributes(program: HbsAST.Program): string {
  let result = "";
  for (const node of program.body) {
    if (isContentStatement(node)) {
      result += node.value;
    } else if (isMustacheStatement(node)) {
      result += mustacheToString(node);
    } else if (isCommentStatement(node)) {
      result += `{{!${node.value}}}`;
    } else if (isBlockStatement(node)) {
      result += blockToString(node);
    }
  }
  return result;
}

function mustacheToString(node: HbsAST.MustacheStatement): string {
  const paramsStr = node.params?.length ? " " + node.params.map(paramToString).join(" ") : "";
  if (node.path.type === "PathExpression") {
    // @ts-ignore
    return `{{${node.path.original}${paramsStr}}}`;
  }
  throw new Error("MustacheStatement sem PathExpression.");
}

// -------------------------------------------------------------
// Trecho do seu fallback parse (NOVO bloco blockToString)
// -------------------------------------------------------------

function blockToString(block: HbsAST.BlockStatement): string {
  // Exemplo de array com nomes de helpers que deseja transformar automaticamente:
  // "ifEqual", "ifCond", etc. para inline, quando o bloco for simples.
  // Se já estiver declarado em outro lugar, não repita aqui.
  const BLOCK_HELPERS_TO_TRANSFORM = [
    "ifEqual",
    "ifNEqual",
    "ifCond",
    "if",
    "unless",
    "switch",
    "case",
    "default",
    "includes",
    "t",
    "isCriarEditarAmbientePefilAdmSistema",
  ];

  if (block.path.type !== "PathExpression") {
    throw new Error("BlockStatement sem PathExpression.");
  }
  const helperName = block.path.original;

  // Junta parâmetros (ex.: param1 param2)
  const paramsStr = block.params?.length ? " " + block.params.map(paramToString).join(" ") : "";

  // Body principal do bloco
  const programStr = block.program ? programNodesToString(block.program.body) : "";
  // Inverso (entre {{else}} e {{/helper}})
  const inverseStr = block.inverse ? programNodesToString(block.inverse.body) : "";

  // ---------------------------------------------------------------------
  // Lógica nova: se for um dos BLOCK_HELPERS_TO_TRANSFORM E
  // se o block tiver APENAS 1 nó de conteúdo (ex.: "selected") E
  // não tiver {{else}} (ou seja, block.inverse == null),
  // converte de {{#helper param}}conteudo{{/helper}}
  // para {{helper param "conteudo"}}
  // ---------------------------------------------------------------------
  const isTransformable = BLOCK_HELPERS_TO_TRANSFORM.includes(helperName);
  const isSingleContent =
    block.program?.body.length === 1 && block.program.body[0].type === "ContentStatement";
  const hasNoInverse = !block.inverse;

  if (isTransformable && isSingleContent && hasNoInverse) {
    const textInside = (block.program.body[0] as HbsAST.ContentStatement).value;
    // Monta os parâmetros originais + o texto do block
    const newParams = block.params.map(paramToString);
    // Se precisar de aspas, ex.: "selected"
    newParams.push(JSON.stringify(textInside));

    // Gera ex.: {{ifEqual a b "selected"}}
    return `{{${helperName} ${newParams.join(" ")}}}`;
  }

  // Se não for transformável ou tiver else, devolve como bloco mesmo
  let blockString = `{{#${helperName}${paramsStr}}}${programStr}`;
  if (inverseStr) {
    blockString += `{{else}}${inverseStr}`;
  }
  blockString += `{{/${helperName}}}`;
  return blockString;
}

function programNodesToString(nodes: HbsAST.Statement[]): string {
  let out = "";
  for (const n of nodes) {
    if (isContentStatement(n)) {
      out += n.value;
    } else if (isMustacheStatement(n)) {
      out += mustacheToString(n);
    } else if (isBlockStatement(n)) {
      out += blockToString(n);
    } else if (isCommentStatement(n)) {
      out += `{{!${n.value}}}`;
    }
  }
  return out;
}

function paramToString(param: any): string {
  if (param.type === "StringLiteral") {
    return `"${param.value}"`;
  }
  if (param.type === "PathExpression") {
    return param.original;
  }
  if (param.type === "BooleanLiteral") {
    return param.value ? "true" : "false";
  }
  if (param.type === "NumberLiteral") {
    return String(param.value);
  }
  return "";
}

function isContentStatement(node: HbsAST.Statement): node is HbsAST.ContentStatement {
  return node.type === "ContentStatement";
}
function isMustacheStatement(node: HbsAST.Statement): node is HbsAST.MustacheStatement {
  return node.type === "MustacheStatement";
}
function isBlockStatement(node: HbsAST.Statement): node is HbsAST.BlockStatement {
  return node.type === "BlockStatement";
}
function isCommentStatement(node: HbsAST.Statement): node is HbsAST.CommentStatement {
  return node.type === "CommentStatement";
}

// ---------------------------------------------------------

const program = new Command();
program
  .version("1.0.0")
  .option("-i, --input <path>", "Diretório de entrada", "templates")
  .option("-o, --output <path>", "Diretório de saída", "output")
  .parse(process.argv);

const options = program.opts();
const INPUT_DIR = path.resolve(options.input);
const OUTPUT_DIR = path.resolve(options.output);

/**
 * Converte um arquivo Handlebars em componente React,
 * agora utilizando parseWithFallback para tratar blocks em atributos.
 */
const convertFile = async (name: string, content: string): Promise<void> => {
  logInfo(`Convertendo: ${name}`);
  try {
    const processedContent = await preprocessTemplate(content);
    // Aqui substituímos a chamada antiga a "preprocess" pela nova "parseWithFallback"
    const ast = parseWithFallback(processedContent);
    const babelProgram = convertTemplateToReact(ast);
    const componentName = `Converted${name.replace(".handlebars", "")}`;
    const jsxCode = await generateJsx(babelProgram);
    const outputPath = path.join(OUTPUT_DIR, name.replace(".handlebars", ".jsx"));

    await writeFile(outputPath, jsxCode);
    logSuccess(`Gerado: ${outputPath}`);
  } catch (error) {
    logError(`Erro ao converter o arquivo ${name}:`, error);
    throw error;
  }
};

/**
 * Mantém a execução do 'main' do snapshot sem alterações
 */
const main = async (): Promise<void> => {
  try {
    logInfo(`Iniciando o processo de conversão.`);
    const files = await readFilesFromDir(INPUT_DIR, ".handlebars");

    if (files.length === 0) {
      logInfo("Nenhum arquivo .handlebars encontrado para processar.");
      return;
    }

    await Promise.all(files.map(({ name, content }) => convertFile(name, content)));
    logSuccess("Conversão concluída com sucesso!");
  } catch (error) {
    logError("Erro durante o processo:", error);
  }
};

main();
