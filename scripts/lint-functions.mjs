#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const functionsDir = path.join(rootDir, 'functions');

function getJsFiles(dir) {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.git') {
        files.push(...getJsFiles(fullPath));
      }
    } else if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.cjs') || entry.name.endsWith('.mjs'))) {
      files.push(fullPath);
    }
  }
  return files;
}

const jsFiles = getJsFiles(functionsDir);
console.log(`[lint:functions] Verificando sintaxe de ${jsFiles.length} arquivos JavaScript em functions/...`);

let hasError = false;
let checkedCount = 0;

for (const file of jsFiles) {
  const relPath = path.relative(rootDir, file);
  const result = spawnSync(process.execPath, ['--check', file], {
    encoding: 'utf-8',
    stdio: 'pipe',
  });

  if (result.status !== 0) {
    hasError = true;
    console.error(`❌ Erro sintático em: ${relPath}`);
    if (result.stderr) console.error(result.stderr.trim());
    if (result.stdout) console.error(result.stdout.trim());
  } else {
    checkedCount++;
  }
}

if (hasError) {
  console.error(`\n❌ Falha no lint: erros sintáticos encontrados nos arquivos de functions.`);
  process.exit(1);
} else {
  console.log(`✅ Sucesso: ${checkedCount} arquivos verificados sem erros de sintaxe.`);
  process.exit(0);
}
