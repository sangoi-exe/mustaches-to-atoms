import fs from "fs/promises";

// Liste aqui os helpers que quer converter quando aparecerem dentro de um atributo:
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
 * Regex para partials: {{> nome}} => {{nome}}
 */
const partialRegex = /{{>\s*([\w\/\-.]+)(\s+[^}]*)?}}/g;

/**
 * Expressões regulares para capturar blocos do tipo:
 *   {{#helperName params}}IF{{else}}ELSE{{/helperName}}
 * ou sem else:
 *   {{#helperName params}}IF{{/helperName}}
 * dentro de atributos (ou seja, seguido de espaço, aspas, ou fim do atributo).
 *
 * @param helperName ex.: "ifEqual"
 */
function createBlockWithElseRegex(helperName: string): RegExp {
  // JS não suporta 'x' (modo verbose). Então vamos de "gms" (global, multiline, dotAll).
  // O lookahead `(?=["'\s])` garante que só case se, depois do {{/helperName}}, vier aspas, espaço etc.
  return new RegExp(
    String.raw`{{#${helperName}\s+([^}]+)}}([\s\S]*?){{else}}([\s\S]*?){{/${helperName}}}(?=["'\s])`,
    "gms",
  );
}
function createBlockNoElseRegex(helperName: string): RegExp {
  return new RegExp(
    String.raw`{{#${helperName}\s+([^}]+)}}([\s\S]*?){{/${helperName}}}(?=["'\s])`,
    "gms",
  );
}

/**
 * Para evitar "Parse error on line XX got 'OPEN'", precisamos
 * escapar as duplas-chaves `{{` e `}}` que aparecem **dentro** do ifPart/elsePart.
 * Assim, o Handlebars não tenta parsear novamente esses trechos como submustaches.
 */
function escapeHandlebars(str: string): string {
  return str.replace(/\{\{/g, "\\{\\{").replace(/\}\}/g, "\\}\\}");
}

/**
 * Monta a forma inline para bloco *com else*:
 *   {{#helperName params}}IF{{else}}ELSE{{/helperName}}
 * => {{helperName params 'IF' 'ELSE'}}
 */
function buildInlineWithElse(
  helperName: string,
  rawParams: string,
  ifPart: string,
  elsePart: string,
) {
  // Dividindo "rawParams" em 2 tokens => depende do seu uso. Ajuste se tiver mais parâmetros.
  const [param1, param2] = rawParams.trim().split(/\s+/, 2);

  // "escapeHandlebars" para evitar parse de {{nomeUsuario}}
  const ifClean = escapeHandlebars(ifPart.trim());
  const elseClean = escapeHandlebars(elsePart.trim());

  return `{{${helperName} ${param1} ${param2} '${ifClean}' '${elseClean}'}}`;
}

/**
 * Para bloco *sem else*:
 *   {{#helperName params}}IF{{/helperName}}
 * => {{helperName params 'IF' ''}}
 */
function buildInlineNoElse(helperName: string, rawParams: string, ifPart: string) {
  const [param1, param2] = rawParams.trim().split(/\s+/, 2);
  const ifClean = escapeHandlebars(ifPart.trim());
  return `{{${helperName} ${param1} ${param2} '${ifClean}' ''}}`;
}

/**
 * Faz o replace para cada helper presente em BLOCK_HELPERS_TO_TRANSFORM,
 * convertendo blocos *em atributos* para forma inline.
 */
function replaceBlocksInAttributes(content: string): string {
  let result = content;

  for (const helperName of BLOCK_HELPERS_TO_TRANSFORM) {
    const withElseRegex = createBlockWithElseRegex(helperName);
    const noElseRegex = createBlockNoElseRegex(helperName);

    // 1) Com else
    result = result.replace(withElseRegex, (_, rawParams, ifPart, elsePart) =>
      buildInlineWithElse(helperName, rawParams, ifPart, elsePart),
    );

    // 2) Sem else
    result = result.replace(noElseRegex, (_, rawParams, ifPart) =>
      buildInlineNoElse(helperName, rawParams, ifPart),
    );
  }

  return result;
}

/**
 * Exemplo de função principal:
 *  - Substitui partials
 *  - Substitui blocos "problemáticos" dentro de atributos (transformando para inline + escapando {{}})
 */
export async function preprocessTemplate(templateContent: string): Promise<string> {
  let processedContent = templateContent;

  // 1) Substituir partials
  processedContent = processedContent.replace(partialRegex, (match, partialName, params) => {
    const sanitizedParams = params?.trim() || "";
    return `{{${partialName} ${sanitizedParams}}}`;
  });

  // 2) Substituir blocos se estiverem em atributos
  processedContent = replaceBlocksInAttributes(processedContent);

  return processedContent;
}
