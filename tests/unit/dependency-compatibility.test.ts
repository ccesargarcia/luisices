import { createRequire } from 'node:module';
import { once } from 'node:events';
import http from 'node:http';
import { describe, it, expect } from 'vitest';

const requireFunctions = createRequire(new URL('../../functions/package.json', import.meta.url));
const Busboy = requireFunctions('@fastify/busboy');
const express = requireFunctions('express');

describe('Functions: parser compatibility', () => {
  it('preserves UTF-8 fields and uploaded file contents across streamed multipart chunks', async () => {
    const parser = new Busboy({ headers: { 'content-type': 'multipart/form-data; boundary=compat-boundary' } });
    const fields: Record<string, string> = {};
    const files: Array<{ name: string; filename: string; mime: string; text: string }> = [];
    parser.on('field', (name: string, value: string) => { fields[name] = value; });
    parser.on('file', (name: string, stream: any, filename: string, _encoding: string, mime: string) => {
      const chunks: Buffer[] = [];
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('end', () => files.push({ name, filename, mime, text: Buffer.concat(chunks).toString('utf8') }));
    });
    const finished = once(parser, 'finish');
    const body = Buffer.from('--compat-boundary\r\nContent-Disposition: form-data; name="notes"\r\n\r\nOlá, ateliê!\r\n--compat-boundary\r\nContent-Disposition: form-data; name="file"; filename="planilha.csv"\r\nContent-Type: text/csv\r\n\r\nCliente,Produto\nTeste,Convite\r\n--compat-boundary--\r\n');
    for (let offset = 0; offset < body.length; offset += 7) parser.write(body.subarray(offset, offset + 7));
    parser.end();await finished;
    expect(fields).toEqual({ notes: 'Olá, ateliê!' });
    expect(files).toEqual([{ name: 'file', filename: 'planilha.csv', mime: 'text/csv', text: 'Cliente,Produto\nTeste,Convite' }]);
  });

  it('rejects a truncated multipart body instead of treating it as a complete upload', async () => {
    const parser = new Busboy({ headers: { 'content-type': 'multipart/form-data; boundary=compat-boundary' } });
    parser.on('file', (_name: string, stream: any) => stream.resume());
    const finished = once(parser, 'finish');
    parser.end('--compat-boundary\r\nContent-Disposition: form-data; name="notes"\r\n\r\nincompleto');
    await expect(finished).rejects.toThrow();
  });

  it('supports explicit Express nested form/query parsing without accepting prototype fields', async () => {
    const app = express();
    app.set('query parser', 'extended');
    app.use(express.urlencoded({ extended: true }));
    app.post('/compat', (req: any, res: any) => res.json({ body: req.body, query: req.query }));
    const server = app.listen(0, '127.0.0.1');await once(server, 'listening');
    try {
      const data = 'customer[name]=Ana&items[0][quantity]=2&__proto__[isAdmin]=true';
      const address = server.address() as { port: number };
      const result = await new Promise<any>((resolve, reject) => {
        const req = http.request({ host: '127.0.0.1', port: address.port, path: '/compat?filter[status]=pending', method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', 'content-length': Buffer.byteLength(data) } }, res => {
          let body = '';res.on('data', chunk => { body += chunk; });res.on('end', () => resolve(JSON.parse(body)));
        });
        req.on('error', reject);req.end(data);
      });
      expect(result).toEqual({ body: { customer: { name: 'Ana' }, items: [{ quantity: '2' }] }, query: { filter: { status: 'pending' } } });
      expect(({} as any).isAdmin).toBeUndefined();
    } finally { await new Promise<void>(resolve => server.close(() => resolve())); }
  });
});


describe('Image tooling compatibility', () => {
  it('preserves migration sizing and the PNG, WebP and AVIF login image outputs', async () => {
    const sharp = requireFunctions('sharp');
    const source = await sharp({ create: { width: 32, height: 16, channels: 4, background: { r: 255, g: 0, b: 0, alpha: 1 } } }).png().toBuffer();
    const migrated = await sharp(source).resize({ width: 2560, height: 2560, fit: 'inside', withoutEnlargement: true }).webp({ quality: 86, effort: 4 }).toBuffer();
    expect(await sharp(migrated).metadata()).toMatchObject({ format: 'webp', width: 32, height: 16 });
    const image = sharp(source);
    const outputs = await Promise.all([
      image.resize({ width: 32 }).avif({ quality: 70 }).toBuffer(),
      image.resize({ width: 32 }).webp({ quality: 75 }).toBuffer(),
      image.resize({ width: 32 }).png({ quality: 80, compressionLevel: 9 }).toBuffer(),
    ]);
    const formats = ['heif', 'webp', 'png'];
    for (const [index, output] of outputs.entries()) expect(await sharp(output).metadata()).toMatchObject({ format: formats[index], width: 32, height: 16 });
  });
});
