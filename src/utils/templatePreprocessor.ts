export const preprocessTemplate = async (templateContent: string): Promise<string> => {
  const partialRegex = /{{>\s*([\w\/\-.]+)(\s+[^}]*)?}}/g;

  const processedContent = templateContent.replace(partialRegex, (match, partialName, params) => {
    const sanitizedParams = params?.trim() || "";
    return `{{${partialName} ${sanitizedParams}}}`;
  });

  return processedContent;
};

/**
 * Normaliza comentários do tipo:
 *
 * {{!--
 *    <div>bla bla</div>
 * --}}
 *
 * para:
 *
 * {{!-- <div>bla bla</div> --}}
 *
 * Ou seja, força a abertura "{{!--" e o fechamento "--}}" a aparecerem em uma só linha,
 * evitando problemas do Glimmer ao parsear se houver quebras de linha entre.
 */
export function fixMultilineDashComments(hbsContent: string): string {
  let i = 0;
  let resultado = "";
  let insideComment = false;
  let commentStartIndex = -1;

  while (i < hbsContent.length) {
    // Verifica se estamos entrando num {{!--
    if (!insideComment && hbsContent.slice(i, i + 5) === "{{!--") {
      insideComment = true;
      commentStartIndex = i;
      i += 5; // avança além de "{{!--"
      continue;
    }

    // Se estamos em um comentário, busca pelo "--}}"
    if (insideComment) {
      const maybeClose = hbsContent.slice(i, i + 4);
      if (maybeClose === "--}}") {
        // Fecha o comentário
        insideComment = false;

        // substring do início do comentário até aqui
        const fullComment = hbsContent.slice(commentStartIndex, i + 4);

        // Extrai o conteúdo entre '{{!--' e '--}}'
        // Ex.: '{{!-- conteudo --}}' => ' conteudo '
        const commentBody = fullComment
          .replace(/^{{!--/i, "")
          .replace(/--}}$/, "")
          .trim();

        // Reescreve em uma única linha
        resultado += `{{!-- ${commentBody} --}}`;
        i += 4; // pula "--}}"
        continue;
      }
    }

    // Se não estiver em comentário, copia caractere para a saída
    if (!insideComment) {
      resultado += hbsContent[i];
    }

    i++;
  }

  // Se chegou ao final e ainda está em comentário, não achamos "--}}".
  // Forçamos um fechamento para não quebrar o parse
  if (insideComment) {
    const fullComment = hbsContent.slice(commentStartIndex);
    const commentBody = fullComment.replace(/^{{!--/i, "").trim();
    resultado += `{{!-- ${commentBody} --}}`;
  }

  return resultado;
}
