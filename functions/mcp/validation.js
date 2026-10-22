const { TOOLS_METADATA } = require('./openapi');

const MAX_TOOL_ARGUMENT_BYTES = 32 * 1024;

function invalid(message) {
  const error = new Error(message);
  error.code = 'invalid-argument';
  throw error;
}

function parseLocalizedMoney(value, path) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') invalid(`${path} deve ser um valor monetário válido.`);
  let text = value.trim().replace(/^R\$\s*/i, '').replace(/\s/g, '');
  let normalized;
  if (/^\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?$/.test(text)) {
    normalized = text.replace(/\./g, '').replace(',', '.');
  } else if (/^\d{1,3}(?:,\d{3})+\.\d{1,2}$/.test(text)) {
    normalized = text.replace(/,/g, '');
  } else if (/^\d+(?:[,.]\d{1,2})?$/.test(text)) {
    normalized = text.replace(',', '.');
  } else if (/^[,.]\d{1,2}$/.test(text)) {
    normalized = `0.${text.slice(1)}`;
  } else {
    invalid(`${path} deve ser um valor válido, como 25,50 ou 1.234,56.`);
  }
  const amount = Number(normalized);
  if (!Number.isFinite(amount)) invalid(`${path} deve ser um valor monetário válido.`);
  return amount;
}

function validateValue(value, schema, path) {
  if (value === null) {
    if (schema.nullable) return;
    invalid(`${path} não pode ser nulo.`);
  }
  if (schema['x-accept-localized-money']) {
    if (typeof value !== 'number' || !Number.isFinite(value)) invalid(`${path} deve ser um valor monetário válido.`);
  } else if (schema.type === 'string') {
    if (typeof value !== 'string') invalid(`${path} deve ser texto.`);
    if (value.length > (schema.maxLength ?? 4096)) invalid(`${path} excede o limite de caracteres.`);
    if (schema.minLength !== undefined && value.length < schema.minLength) invalid(`${path} é muito curto.`);
    if (schema.maxLength !== undefined && value.length > schema.maxLength) invalid(`${path} excede o limite de caracteres.`);
    if (schema.pattern && !(new RegExp(schema.pattern).test(value))) invalid(`${path} possui formato inválido.`);
  } else if (schema.type === 'integer') {
    if (!Number.isSafeInteger(value)) invalid(`${path} deve ser um número inteiro válido.`);
  } else if (schema.type === 'number') {
    if (typeof value !== 'number' || !Number.isFinite(value)) invalid(`${path} deve ser um número finito.`);
  } else if (schema.type === 'boolean') {
    if (typeof value !== 'boolean') invalid(`${path} deve ser verdadeiro ou falso.`);
  } else if (schema.type === 'array') {
    if (!Array.isArray(value)) invalid(`${path} deve ser uma lista.`);
    if (value.length > (schema.maxItems ?? 100)) invalid(`${path} excede o limite de itens.`);
    if (schema.items) value.forEach((item, index) => validateValue(item, schema.items, `${path}[${index}]`));
  } else if (schema.type === 'object') {
    if (!value || typeof value !== 'object' || Array.isArray(value)) invalid(`${path} deve ser um objeto.`);
    validateObject(value, schema, path);
  }
  if (schema.enum && !schema.enum.includes(value)) invalid(`${path} contém um valor não permitido.`);
  if (typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) invalid(`${path} está abaixo do mínimo permitido.`);
    if (schema.maximum !== undefined && value > schema.maximum) invalid(`${path} excede o máximo permitido.`);
    if (schema.exclusiveMinimum === true && schema.minimum !== undefined && value <= schema.minimum) invalid(`${path} deve ser maior que o mínimo permitido.`);
    if (typeof schema.exclusiveMinimum === 'number' && value <= schema.exclusiveMinimum) invalid(`${path} deve ser maior que o mínimo permitido.`);
  }
}

function validateObject(value, schema, path = 'arguments') {
  const properties = schema.properties || {};
  for (const required of schema.required || []) {
    if (!Object.prototype.hasOwnProperty.call(value, required)) invalid(`Campo obrigatório ausente: ${path}.${required}.`);
  }
  for (const [key, entry] of Object.entries(value)) {
    if (!Object.prototype.hasOwnProperty.call(properties, key)) invalid(`Campo não permitido: ${path}.${key}.`);
    const propSchema = properties[key];
    if (propSchema?.['x-accept-localized-money']) {
      value[key] = parseLocalizedMoney(entry, `${path}.${key}`);
    }
    // MCP clients in the legacy create_order flow send confirmation flags as strings.
    // Keep this narrow compatibility while numeric fields remain strictly typed.
    if (propSchema?.type === 'boolean' && typeof entry === 'string') {
      if (entry.toLowerCase() === 'true') value[key] = true;
      else if (entry.toLowerCase() === 'false') value[key] = false;
    }
    validateValue(value[key], propSchema, `${path}.${key}`);
  }
}

function validateToolArguments(toolName, args) {
  const tool = TOOLS_METADATA.find((entry) => entry.name === toolName);
  if (!tool) invalid('Ferramenta não reconhecida.');
  if (!args || typeof args !== 'object' || Array.isArray(args)) invalid('Os argumentos devem ser um objeto JSON.');
  validateObject(args, tool.requestBody || { type: 'object', properties: {} });
  let encoded;
  try {
    encoded = JSON.stringify(args);
  } catch (_err) {
    invalid('Os argumentos não são JSON válidos.');
  }
  if (Buffer.byteLength(encoded, 'utf8') > MAX_TOOL_ARGUMENT_BYTES) invalid('Os argumentos excedem o tamanho máximo permitido.');
  return args;
}

module.exports = { MAX_TOOL_ARGUMENT_BYTES, validateToolArguments };
