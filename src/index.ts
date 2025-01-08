// src/index.ts

import path from "path";
import { Command } from "commander";
import { preprocess } from "@glimmer/syntax";
import { generateJsx } from "./generator/jsxGenerator.js";
import { logError, logInfo, logSuccess } from "./utils/logger.js";
import { readFilesFromDir, writeFile } from "./utils/fileUtils.js";
import { convertTemplateToReact } from "./converter/hbsToReactConverter.js";
import { preprocessTemplate } from "./utils/templatePreprocessor.js";

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
 * Converte um arquivo Handlebars em componente React.
 */
const convertFile = async (name: string, content: string): Promise<void> => {
  logInfo(`Convertendo: ${name}`);
  try {
    // Pré-processa (para tratar partials como __partial__)
    const processedContent = await preprocessTemplate(content);
    const ast = preprocess(processedContent);

    const babelProgram = convertTemplateToReact(ast);

    const componentName = `Converted${name.replace(".handlebars", "")}`;
    const jsxCode = await generateJsx(babelProgram, componentName);
    const outputPath = path.join(OUTPUT_DIR, name.replace(".handlebars", ".jsx"));

    await writeFile(outputPath, jsxCode);
    logSuccess(`Gerado: ${outputPath}`);
  } catch (error) {
    logError(`Erro ao converter o arquivo ${name}:`, error);
    throw error;
  }
};

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
