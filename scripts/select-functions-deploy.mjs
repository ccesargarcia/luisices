// Static dependency selection: never imports backend code or reads credentials.
// A changed module selects ALL its exported endpoints. Shared dependencies may
// legitimately select every endpoint; this is safer than missing a consumer.
import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function endpoints(source) {
  // Lazy exports use fixed module paths and return the ORIGINAL trigger. Keep
  // support for the previous eager format: the deployed baseline may use it.
  const lazy = [...source.matchAll(/\bexpose\(\s*['"](\w+)['"]\s*,\s*\(\)\s*=>\s*require\(['"](\.[^'"]+)['"]\)\.(\w+)\s*\);/g)];
  if (lazy.length) {
    const remaining = lazy.reduce((text, match) => text.replace(match[0], ''), source);
    if (/\bexpose\s*\(/.test(remaining.replace(/function expose\(name, load\)/, ''))
      || /module\.exports\s*[.=\[]|exports\.\w+\s*=/.test(remaining)) {
      throw new Error('Export não suportado pelo seletor: revise o registro lazy.');
    }
    const result = new Map();
    for (const [, name, module] of lazy) {
      if (result.has(name)) throw new Error(`Export duplicado: ${name}`);
      result.set(name, module);
    }
    return result;
  }
  const aliases = new Map([...source.matchAll(/const\s+(\w+)\s*=\s*require\(['"](\.[^'"]+)['"]\)/g)]
    .map((match) => [match[1], match[2]]));
  const result = new Map();
  const object = source.match(/module\.exports\s*=\s*\{([\s\S]*?)\};/);
  if (!object) throw new Error('Formato de exports desconhecido; revise o seletor antes de publicar.');
  const members = object[1].replace(/\/\/[^\n]*/g, '').trim();
  for (const member of members.split(',').filter((part) => part.trim())) {
    const match = member.trim().match(/^(\w+)\s*:\s*(\w+)\.(\w+)$/);
    if (!match || !aliases.has(match[2])) throw new Error('Export não suportado pelo seletor.');
    result.set(match[1], aliases.get(match[2]));
  }
  // Current entrypoint only adds development-only endpoints this way. This
  // script is deliberately DEV-only; production requires its own policy.
  for (const match of source.matchAll(/module\.exports\.(\w+)\s*=\s*(\w+)\.(\w+)\s*;/g)) {
    if (!aliases.has(match[2])) throw new Error('Alias de export desconhecido.');
    result.set(match[1], aliases.get(match[2]));
  }
  if (!result.size) throw new Error('Nenhuma Function encontrada no entrypoint.');
  return result;
}

function resolveModule(files, from, specifier) {
  const base = path.posix.normalize(path.posix.join(path.posix.dirname(from), specifier));
  const resolved = [base, `${base}.js`, `${base}.json`, `${base}/index.js`]
    .find((name) => Object.hasOwn(files, name));
  if (!resolved) throw new Error(`Dependência local não resolvida: ${from} -> ${specifier}`);
  return resolved;
}

function dependencies(files, entry, seen = new Set()) {
  if (seen.has(entry)) return seen;
  seen.add(entry);
  if (!entry.endsWith('.js')) return seen;
  const source = files[entry];
  if (/require\(\s*[^'"\s]|\bimport\s*\(/.test(source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, ''))) {
    throw new Error(`Import dinâmico em ${entry}: declare a dependência antes de publicar.`);
  }
  for (const match of source.matchAll(/require\(\s*['"](\.[^'"]+)['"]\s*\)/g)) {
    dependencies(files, resolveModule(files, entry, match[1]), seen);
  }
  return seen;
}

function externalPackages(files, graph) {
  const packages = new Set();
  for (const file of graph) {
    if (!file.endsWith('.js')) continue;
    const source = files[file] || '';
    for (const match of source.matchAll(/\brequire\(\s*['"]([^'"]+)['"]\s*\)|\bfrom\s*['"]([^'"]+)['"]/g)) {
      const specifier = match[1] || match[2];
      if (specifier.startsWith('.') || specifier.startsWith('/')) continue;
      const parts = specifier.split('/');
      packages.add(specifier.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0]);
    }
  }
  return packages;
}

function sameJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

// Scope only pure dependency removals. Additions, upgrades, lockfile
// re-resolution, or other package metadata changes stay fail-closed/global.
function removedDependenciesOnly(before, after) {
  try {
    const oldManifest = JSON.parse(before['functions/package.json']);
    const newManifest = JSON.parse(after['functions/package.json']);
    const oldLock = JSON.parse(before['functions/package-lock.json']);
    const newLock = JSON.parse(after['functions/package-lock.json']);
    const oldRoot = oldLock.packages?.[''];
    const newRoot = newLock.packages?.[''];
    if (!oldRoot || !newRoot || !oldLock.packages || !newLock.packages) return null;

    const oldDeps = oldManifest.dependencies || {};
    const newDeps = newManifest.dependencies || {};
    if (Object.keys(newDeps).some((name) => !Object.hasOwn(oldDeps, name) || oldDeps[name] !== newDeps[name])) return null;
    const removed = new Set(Object.keys(oldDeps).filter((name) => !Object.hasOwn(newDeps, name)));
    if (!removed.size) return null;

    const stripDeps = (value) => {
      const copy = { ...value };
      delete copy.dependencies;
      return copy;
    };
    if (!sameJson(stripDeps(oldManifest), stripDeps(newManifest))) return null;

    const oldRootDeps = oldRoot.dependencies || {};
    const newRootDeps = newRoot.dependencies || {};
    const lockRemoved = new Set(Object.keys(oldRootDeps).filter((name) => !Object.hasOwn(newRootDeps, name)));
    if (!sameJson(stripDeps(oldRoot), stripDeps(newRoot))
      || !sameJson([...removed].sort(), [...lockRemoved].sort())
      || Object.keys(newRootDeps).some((name) => !Object.hasOwn(oldRootDeps, name) || !sameJson(oldRootDeps[name], newRootDeps[name]))) return null;

    const oldMetadata = { ...oldLock };
    const newMetadata = { ...newLock };
    delete oldMetadata.packages;
    delete newMetadata.packages;
    delete oldMetadata.dependencies;
    delete newMetadata.dependencies;
    if (!sameJson(oldMetadata, newMetadata)) return null;

    for (const [path, current] of Object.entries(newLock.packages)) {
      if (!Object.hasOwn(oldLock.packages, path)) return null;
      if (path === '') {
        if (!sameJson(stripDeps(oldLock.packages[path]), stripDeps(current))) return null;
      } else if (!sameJson(oldLock.packages[path], current)) return null;
    }
    const removedLockPackages = Object.keys(oldLock.packages).filter((path) => !Object.hasOwn(newLock.packages, path)
      && path !== '' && !path.includes('/node_modules/'));
    if (removedLockPackages.some((path) => !path.startsWith('node_modules/'))) return null;
    for (const path of removedLockPackages) {
      const parts = path.slice('node_modules/'.length).split('/');
      removed.add(parts[0].startsWith('@') ? parts.slice(0, 2).join('/') : parts[0]);
    }
    return removed;
  } catch {
    return null;
  }
}

const DEV_ONLY_FUNCTIONS = new Set([
  'calculateSuperfreteShipping',
  'createSuperfreteLabel',
]);

export function selectFunctions(before, after, { force = false, env = 'dev' } = {}) {
  const entry = 'functions/index.js';
  const current = endpoints(after[entry] || '');
  const previous = before[entry] ? endpoints(before[entry]) : new Map();
  const removed = [...previous.keys()].filter((name) => !current.has(name)).sort();
  const changed = new Set([...new Set([...Object.keys(before), ...Object.keys(after)])]
    .filter((name) => before[name] !== after[name]));
  const packageFilesChanged = changed.has('functions/package.json') || changed.has('functions/package-lock.json');
  const removedPackages = packageFilesChanged ? removedDependenciesOnly(before, after) : null;

  const entryChanged = changed.has(entry);
  let rootCodeChanged = false;
  if (entryChanged && before[entry] && after[entry]) {
    const isLazy = (src) => /\bexpose\s*\(/.test(src);
    if (isLazy(before[entry]) && isLazy(after[entry])) {
      const stripExpose = (src) => src
        .replace(/\bexpose\(\s*['"]\w+['"]\s*,\s*\(\)\s*=>\s*require\(['"]\.[^'"]+['"]\)\.\w+\s*\);/g, '')
        .replace(/\/\/[^\n]*/g, '')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .trim();
      if (stripExpose(before[entry]) !== stripExpose(after[entry])) {
        rootCodeChanged = true;
      }
    } else {
      rootCodeChanged = true;
    }
  }

  const mappingChanged = (name) => !previous.has(name) || previous.get(name) !== current.get(name);

  const firebaseConfig = (files) => JSON.stringify(JSON.parse(files['firebase.json'] || '{}').functions);
  const globalChange = !before[entry] || rootCodeChanged
    || (packageFilesChanged && !removedPackages)
    || changed.has('scripts/sync-secrets-safe.mjs') || firebaseConfig(before) !== firebaseConfig(after);
  // Root side effects (Sentry, initialization) run for every endpoint.
  const aliases = new Set(current.values());
  const bootstrap = new Set();
  for (const match of (after[entry] || '').matchAll(/require\(\s*['"](\.[^'"]+)['"]\s*\)/g)) {
    if (!aliases.has(match[1])) {
      for (const dependency of dependencies(after, resolveModule(after, entry, match[1]))) bootstrap.add(dependency);
    }
  }
  const graphs = new Map([...current].map(([name, module]) =>
    [name, dependencies(after, resolveModule(after, entry, module))]));
  const previousGraphs = new Map([...previous].map(([name, module]) =>
    [name, dependencies(before, resolveModule(before, entry, module))]));
  const packageConsumers = new Set();
  if (removedPackages) {
    for (const [name, graph] of graphs) {
      const currentPackages = externalPackages(after, graph);
      const previousPackages = externalPackages(before, previousGraphs.get(name) || new Set());
      if ([...removedPackages].some((pkg) => currentPackages.has(pkg))) {
        throw new Error(`Dependência removida ainda é usada pela Function ${name}.`);
      }
      if ([...removedPackages].some((pkg) => previousPackages.has(pkg))) packageConsumers.add(name);
    }
  }
  const tracked = new Set([entry, ...bootstrap, ...[...graphs.values()].flatMap((set) => [...set])]);
  const previouslyTracked = new Set([entry, ...[...previousGraphs.values()].flatMap((set) => [...set])]);
  // A file removed from the current graph is still understood when it was
  // reachable from the deployed graph. Changes to its consumers (including
  // entrypoint remapping) select the current endpoints above. Unreferenced
  // runtime files may be loaded through fs/templates, so keep those fail-closed.
  const unknownRuntimeChange = [...changed].some((name) => name.startsWith('functions/')
    && !['functions/package.json', 'functions/package-lock.json'].includes(name)
    && /\.(js|json|mjs|cjs|html|hbs|txt)$/.test(name)
    && !tracked.has(name) && !previouslyTracked.has(name));
  const targets = [...current].filter(([name]) => {
    if (env === 'prod' && DEV_ONLY_FUNCTIONS.has(name)) return false;
    return force || globalChange || unknownRuntimeChange || packageConsumers.has(name) || mappingChanged(name)
      || [...bootstrap, ...graphs.get(name)].some((dependency) => changed.has(dependency));
  }).map(([name]) => name).sort();
  return { targets, removed, reason: force ? 'forced' : globalChange || unknownRuntimeChange ? 'shared-runtime' : 'dependencies' };
}

function snapshot(ref) {
  if (!ref) return {};
  // Commit SHAs only: never accept user-controlled git revisions or flags.
  if (!/^[a-f0-9]{40}$/.test(ref)) throw new Error('Referência deve ser um SHA completo.');
  const names = execFileSync('git', ['ls-tree', '-r', '--name-only', ref, '--', 'functions', 'firebase.json', 'scripts/sync-secrets-safe.mjs'], { encoding: 'utf8' })
    .trim().split('\n').filter((name) => /\.(js|json|mjs|cjs|html|hbs|txt)$/.test(name));
  return Object.fromEntries(names.map((name) => [name,
    execFileSync('git', ['show', `${ref}:${name}`], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }),
  ]));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const envArg = process.argv.find((arg) => arg.startsWith('--env='))?.split('=')[1];
  const env = process.env.TARGET_ENV || envArg || (process.env.GCLOUD_PROJECT === 'papelaria-dashboard' ? 'prod' : 'dev');
  const base = process.env.FUNCTIONS_BASE_SHA || '';
  const head = process.env.GITHUB_SHA;
  const plan = selectFunctions(snapshot(base), snapshot(head), {
    force: process.env.FORCE_FUNCTIONS === 'true',
    env,
  });
  const chunks = [];
  for (let offset = 0; offset < plan.targets.length; offset += 6) {
    chunks.push(plan.targets.slice(offset, offset + 6).map((name) => `functions:${name}`).join(','));
  }
  console.log(JSON.stringify({ base: base || null, head, env, ...plan, chunks }, null, 2));
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT,
    `has_targets=${plan.targets.length > 0}\nchunks=${JSON.stringify(chunks)}\n`);
}

