import { mkdtemp, readFile, writeFile, cp, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
if (Number(process.versions.node.split('.')[0]) !== 22) {
  throw new Error('Execute a verificação do backend com Node 22, o runtime das Functions.');
}
const project = 'demo-luisices-sdk';
const temporary = await mkdtemp(path.join(tmpdir(), 'luisices-sdk-'));
const source = path.join(temporary, 'functions');
const env = { ...process.env };
const wrapperMode = process.argv.includes('--http-wrapper');
const vitestArguments = process.argv.slice(2).filter((arg) => arg !== '--http-wrapper');
for (const key of ['GOOGLE_APPLICATION_CREDENTIALS', 'FIREBASE_TOKEN', 'FIREBASE_CONFIG',
  'FIREBASE_AUTH_EMULATOR_HOST', 'FIRESTORE_EMULATOR_HOST', 'FIREBASE_DATABASE_EMULATOR_HOST',
  'FIREBASE_STORAGE_EMULATOR_HOST', 'STORAGE_EMULATOR_HOST', 'GOOGLE_CLOUD_PROJECT', 'GCP_PROJECT']) {
  delete env[key];
}
env.GCLOUD_PROJECT = project;
env.FIREBASE_CONFIG = JSON.stringify({ projectId: project,
  databaseURL: `http://127.0.0.1:9000?ns=${project}-default-rtdb`,
  storageBucket: `${project}.appspot.com` });
env.SDK_TEST_PROJECT = project;
env.SDK_FUNCTIONS_ORIGIN = 'http://127.0.0.1:5001';
env.SDK_TEST_HTTP_MODE = wrapperMode ? 'wrapper' : 'emulator';
env.ORIGIN_SECRET = 'sdk-test-placeholder';
env.CI = 'true';
env.NO_PROXY = [env.NO_PROXY, 'localhost', '127.0.0.1', '::1'].filter(Boolean).join(',');
env.no_proxy = env.NO_PROXY;
// Firebase CLI's explicit ProxyAgent ignores NO_PROXY for local RTDB rule uploads.
// This child only uses local emulators; bootstrap their binaries before using a proxy.
for (const key of ['HTTP_PROXY', 'HTTPS_PROXY', 'http_proxy', 'https_proxy', 'ALL_PROXY', 'all_proxy']) {
  delete env[key];
}
// The emulator may spawn Node by name rather than process.execPath.
env.PATH = `${path.dirname(process.execPath)}${path.delimiter}${env.PATH || ''}`;
try {
  await cp(path.join(root, 'functions'), source, { recursive: true,
    filter: (file) => !path.relative(path.join(root, 'functions'), file).split(path.sep)
      .some((part) => part === 'node_modules' || part.startsWith('.env') || part.startsWith('.secret')) });
  await symlink(path.join(root, 'functions/node_modules'), path.join(source, 'node_modules'), 'dir');
  // Fake emulator-only values, never production secrets or provider credentials.
  const names = ['RESEND_API_KEY', 'EVOLUTION_API_KEY', 'RESEND_WEBHOOK_SECRET',
    'GEMINI_API_KEY', 'ORIGIN_SECRET', 'ALEXA_IDENTITY_HMAC_KEY'];
  await writeFile(path.join(source, '.secret.local'), names.map((name) => `${name}=sdk-test-placeholder`).join('\n') + '\n');
  const config = JSON.parse(await readFile(path.join(root, 'firebase.sdk.test.json'), 'utf8'));
  config.functions.source = 'functions';
  for (const service of ['firestore', 'storage', 'database']) {
    const rules = config[service].rules;
    await writeFile(path.join(temporary, rules), await readFile(path.join(root, rules)));
  }
  const configPath = path.join(temporary, 'firebase.json');
  await writeFile(configPath, JSON.stringify(config));
  const quote = (value) => `'${value.replaceAll("'", "'\\''")}'`;
  const command = [process.execPath, path.join(root, 'node_modules/vitest/vitest.mjs'),
    'run', '--config', 'vitest.backend.config.ts', ...vitestArguments].map(quote).join(' ');
  const child = spawn(process.execPath, [path.join(root, 'node_modules/firebase-tools/lib/bin/firebase.js'),
    'emulators:exec', '--config', configPath, '--project', project,
    '--only', wrapperMode ? 'auth,firestore,storage,database' : 'auth,firestore,storage,database,functions', command], { cwd: root, env, stdio: 'inherit' });
  process.exitCode = await new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('exit', (code) => resolve(code ?? 1));
  });
} finally {
  await rm(temporary, { recursive: true, force: true });
}
