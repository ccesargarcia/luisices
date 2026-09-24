/**
 * Robust JSON Parser & Lexical Normalizer for LLM outputs.
 * 
 * Solves common LLM JSON syntax failures:
 * 1. Unescaped literal newlines / control characters inside string values.
 * 2. Unescaped internal double quotes inside strings.
 * 3. Trailing commas (ECMA-404 invalid).
 * 4. Preamble/postamble markdown code fences (```json ... ```).
 * 5. Deterministic Key-Value Regex Recovery when AST structure is broken.
 */

/**
 * Normaliza um JSON cru gerado por LLM via máquina de estados léxica (FSM).
 * Converte quebras de linha literais dentro de strings em '\\n' e remove vírgulas residuais.
 */
export function sanitizeLlmJson(raw: string): string {
  if (!raw || typeof raw !== 'string') return '{}';

  let text = raw.trim();

  // 1. Isola entre o primeiro '{' e o último '}'
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');

  if (firstBrace !== -1 && lastBrace > firstBrace) {
    text = text.substring(firstBrace, lastBrace + 1);
  } else {
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  }

  // 2. FSM Léxica: percorre caractere por caractere
  const result: string[] = [];
  let inString = false;
  let isEscaped = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (inString) {
      if (isEscaped) {
        // Caractere escapado anteriormente
        result.push(char);
        isEscaped = false;
      } else if (char === '\\') {
        result.push(char);
        isEscaped = true;
      } else if (char === '"') {
        // Fechamento de string (ou aspa não escapada)
        inString = false;
        result.push(char);
      } else if (char === '\n') {
        // Quebra de linha literal dentro da string -> converte em \n escapado
        result.push('\\n');
      } else if (char === '\r') {
        // Ignora carriage return dentro da string
      } else if (char === '\t') {
        result.push('\\t');
      } else if (char.charCodeAt(0) < 32) {
        // Caracteres de controle ASCII inválidos em JSON
        result.push(' ');
      } else {
        result.push(char);
      }
    } else {
      // Fora de string
      if (char === '"') {
        inString = true;
        result.push(char);
      } else {
        result.push(char);
      }
    }
  }

  let sanitized = result.join('');

  // 3. Remove vírgulas residuais antes de fechamento de chaves ou colchetes (ex: { "a": 1, })
  sanitized = sanitized.replace(/,\s*([}\]])/g, '$1');

  return sanitized;
}

/**
 * Recuperador determinístico por Regex:
 * Se o JSON estiver irremediavelmente quebrado ou truncado, extrai diretamente
 * os valores de cada chave esperada do texto da IA.
 */
export function extractKeysFromLlmText(raw: string, expectedKeys: string[]): Record<string, string> {
  const recovered: Record<string, string> = {};

  for (const key of expectedKeys) {
    // Busca a chave seguida de dois pontos e valor string (mesmo com quebras de linha)
    // Padrão: "chave"\s*:\s*"conteúdo" delimitado pela próxima chave ou fechamento
    const regex = new RegExp(`"${key}"\\s*:\\s*"([\\s\\S]*?)(?="\\s*[,}]|"\\s*\\n\\s*"|$)`, 'i');
    const match = raw.match(regex);

    if (match && match[1] !== undefined) {
      let val = match[1].trim();
      // Remove aspas de fechamento se pegou
      val = val.replace(/"$/, '').trim();
      // Normaliza quebras de linha e caracteres escapados
      val = val.replace(/\\n/g, '\n').replace(/\\"/g, '"');
      recovered[key] = val;
    }
  }

  return recovered;
}

/**
 * Parser de altíssima resiliência para respostas de IA.
 * Executa em múltiplas etapas com fallback seguro.
 */
export function parseLlmJson<T extends Record<string, any>>(
  raw: string,
  defaults: T,
  expectedKeys?: string[]
): T {
  if (!raw || typeof raw !== 'string') return { ...defaults };

  // Etapa 1: Tentativa direta com JSON nativo
  try {
    const direct = JSON.parse(raw.trim());
    return { ...defaults, ...direct };
  } catch {
    // Continua para a etapa 2
  }

  // Etapa 2: Normalização FSM léxica
  try {
    const sanitized = sanitizeLlmJson(raw);
    const parsed = JSON.parse(sanitized);
    return { ...defaults, ...parsed };
  } catch {
    // Continua para a etapa 3
  }

  // Etapa 3: Extração determinística por chave (Regex AST Streamer)
  const keysToExtract = expectedKeys && expectedKeys.length > 0
    ? expectedKeys
    : Object.keys(defaults);

  const extracted = extractKeysFromLlmText(raw, keysToExtract);

  return {
    ...defaults,
    ...extracted,
  };
}
