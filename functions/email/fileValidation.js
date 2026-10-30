const { inflateSync } = require('node:zlib');

const ALLOWED_ATTACHMENT_MIMES = Object.freeze([
  'application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'image/gif',
]);
const CANONICAL_EXTENSIONS = Object.freeze({
  'application/pdf': 'pdf', 'image/png': 'png', 'image/jpeg': 'jpg',
  'image/webp': 'webp', 'image/gif': 'gif',
});
const COMPATIBLE_EXTENSIONS = Object.freeze({
  'application/pdf': new Set(['pdf']), 'image/png': new Set(['png']),
  'image/jpeg': new Set(['jpg', 'jpeg', 'jpe']), 'image/webp': new Set(['webp']),
  'image/gif': new Set(['gif']),
});
const MAX_IMAGE_PIXELS = 40_000_000;
const MAX_DECODED_PNG_BYTES = 128 * 1024 * 1024;

function failure(error) { return { ok: false, error }; }
function success(mime) { return { ok: true, mime, extension: CANONICAL_EXTENSIONS[mime] }; }

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function validatePng(buffer) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (buffer.length < 8 || !buffer.subarray(0, 8).equals(signature)) return null;
  let offset = 8;
  let seenHeader = false;
  let seenData = false;
  let dataClosed = false;
  let seenEnd = false;
  let hasPalette = false;
  const dataChunks = [];
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = -1;
  let interlace = 0;
  let chunks = 0;

  while (offset < buffer.length) {
    if (buffer.length - offset < 12) return failure('PNG contém um chunk truncado.');
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    if (!/^[A-Za-z]{4}$/.test(type) || length > buffer.length - offset - 12) {
      return failure('PNG contém tamanho de chunk inválido.');
    }
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    const expectedCrc = buffer.readUInt32BE(dataEnd);
    if (crc32(buffer.subarray(offset + 4, dataEnd)) !== expectedCrc) {
      return failure('PNG contém checksum de chunk inválido.');
    }
    chunks++;

    if (!seenHeader) {
      if (type !== 'IHDR' || length !== 13) return failure('PNG não possui cabeçalho IHDR válido.');
      width = buffer.readUInt32BE(dataStart);
      height = buffer.readUInt32BE(dataStart + 4);
      bitDepth = buffer[dataStart + 8];
      colorType = buffer[dataStart + 9];
      const compression = buffer[dataStart + 10];
      const filter = buffer[dataStart + 11];
      interlace = buffer[dataStart + 12];
      const legalDepths = { 0: [1, 2, 4, 8, 16], 2: [8, 16], 3: [1, 2, 4, 8], 4: [8, 16], 6: [8, 16] };
      if (!width || !height || width * height > MAX_IMAGE_PIXELS || !legalDepths[colorType]?.includes(bitDepth)
        || compression !== 0 || filter !== 0 || ![0, 1].includes(interlace)) {
        return failure('PNG possui dimensões ou parâmetros de imagem inválidos.');
      }
      seenHeader = true;
    } else if (type === 'IHDR') {
      return failure('PNG contém mais de um cabeçalho IHDR.');
    }

    if (type === 'PLTE') {
      if (seenData || hasPalette || length === 0 || length > 768 || length % 3 !== 0
        || colorType === 0 || colorType === 4
        || (colorType === 3 && length / 3 > (2 ** bitDepth))) {
        return failure('PNG possui paleta PLTE inválida.');
      }
      hasPalette = true;
    } else if (!['IHDR', 'IDAT', 'IEND'].includes(type) && type.charCodeAt(0) >= 0x41 && type.charCodeAt(0) <= 0x5a) {
      return failure('PNG contém um chunk crítico não suportado.');
    }
    if (type === 'IDAT') {
      if (dataClosed || seenEnd) return failure('PNG possui chunks IDAT fora de ordem.');
      seenData = true;
      dataChunks.push(buffer.subarray(dataStart, dataEnd));
    } else if (type === 'IEND') {
      if (length !== 0 || !seenData) return failure('PNG não possui dados ou chunk IEND válido.');
      seenEnd = true;
      offset = dataEnd + 4;
      break;
    } else if (seenData) {
      // PNG exige que os chunks IDAT sejam contíguos.
      dataClosed = true;
    }
    offset = dataEnd + 4;
  }

  if (!seenHeader || !seenData || !seenEnd || offset !== buffer.length || chunks < 3) {
    return failure('PNG está incompleto ou possui dados após IEND.');
  }
  if (colorType === 3 && !hasPalette) return failure('PNG indexado não possui paleta PLTE.');

  try {
    const compressed = Buffer.concat(dataChunks);
    const channels = ({ 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 })[colorType];
    const passes = interlace === 0
      ? [[0, 0, 1, 1]]
      : [[0, 0, 8, 8], [4, 0, 8, 8], [0, 4, 4, 8], [2, 0, 4, 4], [0, 2, 2, 4], [1, 0, 2, 2], [0, 1, 1, 2]];
    const passRows = passes.map(([xStart, yStart, xStep, yStep]) => {
      const passWidth = Math.max(0, Math.ceil((width - xStart) / xStep));
      const rows = Math.max(0, Math.ceil((height - yStart) / yStep));
      const rowBytes = Math.ceil(passWidth * channels * bitDepth / 8);
      return { rows, rowBytes, bytes: rows * (rowBytes + 1) };
    }).filter(pass => pass.rows > 0);
    const expected = passRows.reduce((sum, pass) => sum + pass.bytes, 0);
    if (expected > MAX_DECODED_PNG_BYTES) return failure('PNG excede o limite de descompressão permitido.');
    const inflated = inflateSync(compressed, { maxOutputLength: MAX_DECODED_PNG_BYTES });
    if (inflated.length !== expected) return failure('PNG possui fluxo de pixels truncado ou inconsistente.');
    let cursor = 0;
    for (const pass of passRows) {
      for (let row = 0; row < pass.rows; row++) {
        if (inflated[cursor] > 4) return failure('PNG possui filtro de linha inválido.');
        cursor += pass.rowBytes + 1;
      }
    }
  } catch {
    return failure('PNG possui fluxo de pixels inválido.');
  }
  return success('image/png');
}

function validateJpeg(buffer) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;
  let offset = 2;
  let seenFrame = false;
  let seenScan = false;
  let scans = 0;
  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) return failure('JPEG possui marcador inválido.');
    while (offset < buffer.length && buffer[offset] === 0xff) offset++;
    if (offset >= buffer.length) return failure('JPEG termina em marcador truncado.');
    const marker = buffer[offset++];
    if (marker === 0xd9) {
      if (!seenFrame || !seenScan || offset !== buffer.length) return failure('JPEG está incompleto ou possui dados após EOI.');
      return success('image/jpeg');
    }
    if (marker === 0x00 || marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
      return failure('JPEG contém marcador fora de lugar.');
    }
    if (offset + 2 > buffer.length) return failure('JPEG possui segmento truncado.');
    const segmentLength = buffer.readUInt16BE(offset);
    if (segmentLength < 2 || offset + segmentLength > buffer.length) return failure('JPEG possui comprimento de segmento inválido.');
    const payloadStart = offset + 2;
    const payloadEnd = offset + segmentLength;

    if ((marker >= 0xc0 && marker <= 0xc3) || (marker >= 0xc5 && marker <= 0xc7)
      || (marker >= 0xc9 && marker <= 0xcb) || (marker >= 0xcd && marker <= 0xcf)) {
      if (payloadEnd - payloadStart < 6) return failure('JPEG possui quadro truncado.');
      const height = buffer.readUInt16BE(payloadStart + 1);
      const width = buffer.readUInt16BE(payloadStart + 3);
      const components = buffer[payloadStart + 5];
      if (!width || !height || width * height > MAX_IMAGE_PIXELS || !components
        || segmentLength !== 8 + 3 * components) return failure('JPEG possui quadro inválido.');
      seenFrame = true;
    }
    if (marker === 0xda) {
      const components = buffer[payloadStart];
      if (!seenFrame || !components || segmentLength !== 6 + 2 * components) return failure('JPEG possui scan inválido.');
      seenScan = true;
      scans++;
    }
    offset = payloadEnd;

    if (marker === 0xda) {
      // Percorre dados entropy-coded, respeitando byte stuffing e restart markers.
      let foundNextMarker = false;
      while (offset < buffer.length) {
        if (buffer[offset++] !== 0xff) continue;
        let markerStart = offset - 1;
        while (offset < buffer.length && buffer[offset] === 0xff) offset++;
        if (offset >= buffer.length) return failure('JPEG termina em scan truncado.');
        const scanMarker = buffer[offset];
        if (scanMarker === 0x00 || (scanMarker >= 0xd0 && scanMarker <= 0xd7)) {
          offset++;
          continue;
        }
        if (markerStart === payloadEnd) return failure('JPEG possui scan vazio.');
        offset = markerStart;
        foundNextMarker = true;
        break;
      }
      if (!foundNextMarker) return failure('JPEG não possui marcador EOI.');
    }
  }
  return failure('JPEG não possui estrutura completa.');
}

function skipGifSubBlocks(buffer, offset) {
  while (offset < buffer.length) {
    const size = buffer[offset++];
    if (size === 0) return offset;
    if (offset + size > buffer.length) return -1;
    offset += size;
  }
  return -1;
}

function validateGif(buffer) {
  if (buffer.length < 6 || !['GIF87a', 'GIF89a'].includes(buffer.toString('ascii', 0, 6))) return null;
  if (buffer.length < 14) return failure('GIF possui cabeçalho truncado.');
  const width = buffer.readUInt16LE(6);
  const height = buffer.readUInt16LE(8);
  const packed = buffer[10];
  if (!width || !height || width * height > MAX_IMAGE_PIXELS) return failure('GIF possui dimensões inválidas.');
  let offset = 13;
  if (packed & 0x80) offset += 3 * (2 ** ((packed & 0x07) + 1));
  if (offset > buffer.length) return failure('GIF possui paleta global truncada.');
  let frames = 0;
  let ended = false;
  while (offset < buffer.length) {
    const marker = buffer[offset++];
    if (marker === 0x3b) { ended = offset === buffer.length; break; }
    if (marker === 0x21) {
      if (offset >= buffer.length) return failure('GIF possui extensão truncada.');
      offset = skipGifSubBlocks(buffer, offset + 1);
      if (offset < 0) return failure('GIF possui extensão inválida.');
      continue;
    }
    if (marker !== 0x2c || offset + 9 > buffer.length) return failure('GIF possui bloco de imagem inválido.');
    const imageWidth = buffer.readUInt16LE(offset + 4);
    const imageHeight = buffer.readUInt16LE(offset + 6);
    const imagePacked = buffer[offset + 8];
    if (!imageWidth || !imageHeight || imageWidth * imageHeight > MAX_IMAGE_PIXELS) return failure('GIF possui quadro inválido.');
    offset += 9;
    if (imagePacked & 0x80) offset += 3 * (2 ** ((imagePacked & 0x07) + 1));
    if (offset >= buffer.length) return failure('GIF possui dados de imagem truncados.');
    const lzwMinimumCodeSize = buffer[offset++];
    if (lzwMinimumCodeSize < 2 || lzwMinimumCodeSize > 8) return failure('GIF possui código LZW inválido.');
    offset = skipGifSubBlocks(buffer, offset);
    if (offset < 0) return failure('GIF possui dados de imagem inválidos.');
    frames++;
  }
  if (!ended || !frames) return failure('GIF está incompleto ou não contém quadros.');
  return success('image/gif');
}

function validateWebp(buffer) {
  if (buffer.length < 12 || buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WEBP') return null;
  if (buffer.readUInt32LE(4) + 8 !== buffer.length) return failure('WebP possui tamanho RIFF inconsistente.');
  let offset = 12;
  let hasImage = false;
  let hasVp8x = false;
  while (offset < buffer.length) {
    if (buffer.length - offset < 8) return failure('WebP possui chunk truncado.');
    const type = buffer.toString('ascii', offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    const dataStart = offset + 8;
    const dataEnd = dataStart + size;
    const next = dataEnd + (size & 1);
    if (dataEnd > buffer.length || next > buffer.length) return failure('WebP possui comprimento de chunk inválido.');
    if (type === 'VP8X') {
      if (size !== 10 || buffer[dataStart + 1] || buffer[dataStart + 2] || buffer[dataStart + 3]) return failure('WebP possui cabeçalho VP8X inválido.');
      hasVp8x = true;
    } else if (type === 'VP8 ') {
      if (size < 10 || buffer[dataStart + 3] !== 0x9d || buffer[dataStart + 4] !== 0x01 || buffer[dataStart + 5] !== 0x2a) return failure('WebP possui quadro VP8 inválido.');
      const width = buffer.readUInt16LE(dataStart + 6) & 0x3fff;
      const height = buffer.readUInt16LE(dataStart + 8) & 0x3fff;
      if (!width || !height || width * height > MAX_IMAGE_PIXELS) return failure('WebP possui dimensões inválidas.');
      hasImage = true;
    } else if (type === 'VP8L') {
      if (size < 5 || buffer[dataStart] !== 0x2f) return failure('WebP possui quadro VP8L inválido.');
      const b1 = buffer[dataStart + 1]; const b2 = buffer[dataStart + 2];
      const b3 = buffer[dataStart + 3]; const b4 = buffer[dataStart + 4];
      const width = 1 + (((b2 & 0x3f) << 8) | b1);
      const height = 1 + (((b4 & 0x0f) << 10) | (b3 << 2) | ((b2 & 0xc0) >> 6));
      if (width * height > MAX_IMAGE_PIXELS || (b4 & 0xe0) !== 0) return failure('WebP possui dimensões ou versão inválidas.');
      hasImage = true;
    } else if (type === 'ALPH' || type === 'ANIM' || type === 'ANMF') {
      // Chunks de animação/alpha não contam como quadro independente.
    } else if (!['ICCP', 'EXIF', 'XMP '].includes(type) && (type.charCodeAt(0) & 0x20) === 0) {
      return failure('WebP possui chunk obrigatório desconhecido.');
    }
    offset = next;
  }
  if (offset !== buffer.length || !hasImage || (hasVp8x && buffer.length < 30)) return failure('WebP está incompleto ou sem quadro de imagem.');
  return success('image/webp');
}

function validatePdf(buffer) {
  if (!buffer.subarray(0, 5).equals(Buffer.from('%PDF-'))) return null;
  const header = buffer.subarray(0, 16).toString('ascii');
  if (!/^%PDF-(?:1\.[0-7]|2\.0)(?:\r?\n|\r)/.test(header)) return failure('PDF possui versão inválida.');
  const tailStart = Math.max(0, buffer.length - 4096);
  const tail = buffer.subarray(tailStart).toString('latin1');
  const eofMatch = /%%EOF[\x00\x09\x0a\x0c\x0d\x20]*$/.exec(tail);
  if (!eofMatch) return failure('PDF não possui marcador final %%EOF.');
  const beforeEof = tail.slice(0, eofMatch.index);
  const startXrefMatch = /startxref\s+(\d+)\s*$/.exec(beforeEof);
  if (!startXrefMatch) return failure('PDF não possui referência startxref válida.');
  const xrefOffset = Number(startXrefMatch[1]);
  if (!Number.isSafeInteger(xrefOffset) || xrefOffset < 0 || xrefOffset >= buffer.length) return failure('PDF possui offset xref inválido.');
  const xrefLead = buffer.subarray(xrefOffset, Math.min(buffer.length, xrefOffset + 8192)).toString('latin1');
  const isClassicXref = /^xref(?:\s|$)/.test(xrefLead);
  const isXrefStream = /^\d+\s+\d+\s+obj\b[\s\S]{0,2048}?\/Type\s*\/XRef\b/.test(xrefLead);
  if (!isClassicXref && !isXrefStream) return failure('PDF aponta para uma tabela xref inexistente ou inválida.');
  const prefix = buffer.subarray(0, xrefOffset).toString('latin1');
  if (!/\b\d+\s+\d+\s+obj\b/.test(prefix)) return failure('PDF não contém objetos indiretos.');
  if (isClassicXref) {
    const trailer = buffer.subarray(xrefOffset).toString('latin1');
    if (!/trailer\s*<<[\s\S]*?\/Root\s+\d+\s+\d+\s+R[\s\S]*?>>/.test(trailer)) return failure('PDF não possui trailer e catálogo raiz válidos.');
  } else {
    if (!/\/Root\s+\d+\s+\d+\s+R/.test(xrefLead)) return failure('PDF xref stream não referencia o catálogo raiz.');
  }
  return success('application/pdf');
}

function detectBufferMime(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 14) return failure('Arquivo vazio, truncado ou buffer corrompido.');
  if ((buffer[0] === 0x4d && buffer[1] === 0x5a)
    || buffer.subarray(0, 4).equals(Buffer.from([0x7f, 0x45, 0x4c, 0x46]))) {
    return failure('Executáveis e scripts binários são estritamente proibidos.');
  }
  for (const validator of [validatePdf, validatePng, validateJpeg, validateWebp, validateGif]) {
    const result = validator(buffer);
    if (result) return result;
  }
  return failure('Formato inválido ou não suportado. Permitido apenas PDF e imagens PNG, JPEG, WebP ou GIF.');
}

module.exports = {
  ALLOWED_ATTACHMENT_MIMES,
  CANONICAL_EXTENSIONS,
  COMPATIBLE_EXTENSIONS,
  detectBufferMime,
};
