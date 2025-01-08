// src/utils/fileUtils.js

import fs from "fs/promises";
import * as path from "path";
import { logError, logInfo } from "./logger.js";

// Cache simples em memória para ASTs, caso queira
const astCache = new Map<string, string>();

export const readFilesFromDir = async (
  dir: string,
  extension: string,
): Promise<{ name: string; content: string }[]> => {
  try {
    const files = await fs.readdir(dir);
    const filteredFiles = files.filter((file) => file.endsWith(extension));

    if (filteredFiles.length === 0) {
      logInfo(`Nenhum arquivo com extensão ${extension} encontrado em ${dir}.`);
    }

    return Promise.all(
      filteredFiles.map(async (file) => {
        const filePath = path.join(dir, file);

        // Exemplo: se quiser cachear o conteúdo cru do arquivo
        if (astCache.has(filePath)) {
          logInfo(`(Cache) Reaproveitando conteúdo de: ${file}`);
          return { name: file, content: astCache.get(filePath)! };
        }

        const content = await fs.readFile(filePath, "utf-8");
        astCache.set(filePath, content);
        return { name: file, content };
      }),
    );
  } catch (error) {
    logError(`Erro ao ler arquivos do diretório ${dir}:`, error);
    return [];
  }
};

export const writeFile = async (filePath: string, content: string): Promise<void> => {
  try {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content, "utf-8");
  } catch (error) {
    logError(`Erro ao escrever o arquivo ${filePath}:`, error);
  }
};
