#!/usr/bin/env python3
"""Pinned model/server provisioning and workflow matrix helpers (stdlib only)."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import shutil
import sys
import time
import urllib.request

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'scripts'))
import security_audit_llm as audit

CACHE = ROOT / '.cache/security-audit'


def checksum(path):
    h = hashlib.sha256()
    with path.open('rb') as stream:
        for block in iter(lambda: stream.read(8 * 1024 * 1024), b''):
            h.update(block)
    return h.hexdigest()


def keys(config, model):
    item = config['models'][model]
    return (f'audit-server-ubuntu2404-x64-v1-{config["llama_revision"]}',
            f'audit-model-v1-{model}-{item["sha256"]}')


def emit(name, value):
    print(f'{name}={value}')
    if os.environ.get('GITHUB_OUTPUT'):
        with open(os.environ['GITHUB_OUTPUT'], 'a', encoding='utf-8') as f:
            f.write(f'{name}={value}\n')


def model_path(config, model):
    return CACHE / 'models' / config['models'][model]['file']


def provision_model(config, model):
    item = config['models'][model]
    path = model_path(config, model)
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists() and checksum(path) == item['sha256']:
        return
    url = f'https://huggingface.co/{item["repo"]}/resolve/{item["revision"]}/{item["file"]}'
    tmp = path.with_suffix('.download')
    for attempt in range(3):
        try:
            with urllib.request.urlopen(url, timeout=60) as response, tmp.open('wb') as out:
                while block := response.read(8 * 1024 * 1024):
                    out.write(block)
            if checksum(tmp) != item['sha256']:
                raise ValueError('Checksum do GGUF incorreto')
            tmp.replace(path)
            return
        except Exception:
            tmp.unlink(missing_ok=True)
            if attempt == 2:
                raise
            time.sleep(3)


def build(config):
    exe = CACHE / 'server/bin/llama-server'
    marker = CACHE / 'server/revision'
    if exe.is_file() and marker.exists() and marker.read_text().strip() == config['llama_revision']:
        return
    source = CACHE / 'source'
    source.mkdir(parents=True, exist_ok=True)
    subprocess.run(['git', 'init', str(source)], check=True)
    subprocess.run(['git', '-C', str(source), 'fetch', '--depth', '1',
        'https://github.com/ggml-org/llama.cpp.git', config['llama_revision']], check=True)
    subprocess.run(['git', '-C', str(source), 'checkout', '--detach', 'FETCH_HEAD'], check=True)
    subprocess.run(['cmake', '-S', str(source), '-B', str(source / 'build'),
        '-DCMAKE_BUILD_TYPE=Release', '-DGGML_NATIVE=OFF', '-DGGML_OPENMP=OFF',
        '-DGGML_BACKEND_DL=OFF', '-DLLAMA_CURL=OFF', '-DLLAMA_BUILD_TESTS=OFF',
        '-DLLAMA_BUILD_EXAMPLES=OFF', '-DLLAMA_BUILD_SERVER=ON'], check=True)
    subprocess.run(['cmake', '--build', str(source / 'build'), '--target', 'llama-server',
        '--parallel', str(os.cpu_count() or 2)], check=True)
    shutil.copytree(source / 'build/bin', CACHE / 'server/bin', dirs_exist_ok=True)
    marker.write_text(config['llama_revision'] + '\n')


def start(config, model, output):
    output.mkdir(parents=True, exist_ok=True)
    path = model_path(config, model)
    if checksum(path) != config['models'][model]['sha256']:
        raise ValueError('Modelo em cache inválido')
    exe = CACHE / 'server/bin/llama-server'
    if (CACHE / 'server/revision').read_text().strip() != config['llama_revision']:
        raise ValueError('Revisão do servidor incorreta')
    with (output / 'llama-server.log').open('wb') as log:
        process = subprocess.Popen([str(exe), '-m', str(path), '--alias', model,
            '--host', '127.0.0.1', '--port', '8080', '--ctx-size', '8192',
            '--threads', str(os.cpu_count() or 2), '--threads-batch', str(os.cpu_count() or 2),
            '--parallel', '1', '--jinja'], stdout=log, stderr=log, start_new_session=True)
    (output / 'server.pid').write_text(str(process.pid))
    try:
        for _ in range(90):
            if process.poll() is not None:
                raise RuntimeError('Servidor encerrou durante a inicialização; consulte llama-server.log')
            try:
                with urllib.request.urlopen('http://127.0.0.1:8080/health', timeout=2) as response:
                    if response.status == 200:
                        return
            except OSError:
                pass
            time.sleep(2)
        raise TimeoutError('Servidor não ficou pronto em 180s')
    except Exception:
        process.terminate()
        raise


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=('describe', 'keys', 'model', 'build', 'start', 'expand'))
    parser.add_argument('--model', choices=('qwen3-4b', 'qwen25-7b'), default='qwen3-4b')
    parser.add_argument('--mode', choices=('benchmark', 'auditoria'), default='benchmark')
    parser.add_argument('--max-runners', type=int, default=20)
    parser.add_argument('--output', type=Path, default=ROOT / 'output/security-audit')
    parser.add_argument('--manifests', type=Path)
    args = parser.parse_args()
    config = audit.read_json(audit.CONFIG)
    if args.command == 'describe':
        if not 1 <= args.max_runners <= 20:
            raise ValueError('max_runners deve estar entre 1 e 20')
        selected = config['selected_model']
        if args.mode == 'auditoria' and selected not in config['models']:
            raise ValueError('Execute o benchmark e versione o modelo aprovado antes da auditoria')
        if args.mode == 'auditoria':
            evidence = config.get('selection_evidence')
            if (not isinstance(evidence, dict) or not evidence.get('run_id')
                    or not evidence.get('revision') or evidence.get('selected_model') != selected
                    or audit.choose_model(evidence.get('scores', [])) != selected):
                raise ValueError('Seleção sem evidência válida do benchmark')
        models = list(config['models']) if args.mode == 'benchmark' else [selected]
        emit('models', json.dumps({'model': models}))
        emit('server_key', keys(config, models[0])[0])
        # Benchmark has two models. The final matrix still has max-parallel <=20.
        emit('shards', str(max(1, args.max_runners // len(models))))
    elif args.command == 'keys':
        server, model = keys(config, args.model)
        emit('server_key', server)
        emit('model_key', model)
        emit('model_path', str(model_path(config, args.model).relative_to(ROOT)))
    elif args.command == 'model':
        provision_model(config, args.model)
    elif args.command == 'build':
        build(config)
    elif args.command == 'start':
        start(config, args.model, args.output)
    elif args.command == 'expand':
        matrix = []
        for path in sorted(args.manifests.rglob('manifest.json')):
            manifest = audit.read_json(path)
            audit.verify_manifest(manifest)
            matrix.extend({'model': manifest['model'], 'shard': i} for i in range(len(manifest['shards'])))
        if not matrix:
            raise ValueError('Nenhum manifesto para executar')
        emit('matrix', json.dumps({'include': matrix}))


if __name__ == '__main__':
    main()
