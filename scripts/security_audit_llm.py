#!/usr/bin/env python3
"""
Auditoria de Segurança Automatizada com Modelo Local (Qwen 2.5 Coder 7B)
Analisa regras do Firestore, Storage, Cloud Functions e Cloudflare Workers.
"""
import argparse
import json
import os
import sys
import time
import urllib.request
import urllib.error
from pathlib import Path

API_URL = os.environ.get("LOCAL_LLM_URL", "http://127.0.0.1:8080/v1/chat/completions")
MODEL = os.environ.get("LOCAL_LLM_MODEL", "qwen2.5-coder-local")

SYSTEM_PROMPT = """Você é um Engenheiro Sênior Especialista em Cibersegurança e AppSec (Cloud & Web Security Auditor).
Sua missão é auditar o código fornecido com máximo rigor e identificar vulnerabilidades reais, baseando-se no OWASP Top 10 e nas melhores práticas do Google Cloud / Firebase / Cloudflare.

Analise atentamente procurando por:
1. Broken Access Control (BOLA / IDOR / autorização quebrada em leitura/escrita)
2. Privilege Escalation (como bypass de claims de admin, impersonação de usuário)
3. Falhas em Regras de Segurança (Firestore / Storage Rules):
   - Falta de validação estrita em `create` vs `update`
   - Falta de `hasOnly()` para impedir injeção de campos maliciosos (como `role: 'admin'`)
   - Leitura pública sem autenticação (`allow read: if true;`) em dados sensíveis
   - Inconsistência entre `resource.data` e `request.resource.data`
4. Vazamento de Credenciais / Segredos (Hardcoded API keys, tokens em logs)
5. Injection (NoSQL Injection, SSRF, Command Injection)
6. Falhas de validação de entrada e ausência de sanitização de dados.

Para cada vulnerabilidade encontrada, responda com:
- **Título da Vulnerabilidade**
- **Severidade:** [CRÍTICA | ALTA | MÉDIA | BAIXA | INFORMATIVA]
- **Arquivo e Trecho de Código Afetado**
- **Descrição do Impacto e Cenário de Ataque**
- **Correção Recomendada (com exemplo de código / diff)**

Se o trecho analisado estiver seguro e seguir as melhores práticas, declare explicitamente como [CONFORME] com justificativa técnica.
Responda em Português do Brasil com formatação GitHub Markdown limpa e profissional."""


def query_llm(content: str, context_label: str) -> str:
    """Envia o conteúdo para auditoria no llama-server local."""
    payload = {
        "model": MODEL,
        "temperature": 0.1,
        "max_tokens": 3000,
        "id_slot": 0,
        "cache_prompt": True,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": f"Por favor, realize a auditoria de segurança do seguinte componente: [{context_label}]\n\n```\n{content}\n```",
            },
        ],
    }
    req = urllib.request.Request(
        API_URL,
        data=json.dumps(payload, ensure_ascii=False).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    for attempt in range(1, 4):
        try:
            with urllib.request.urlopen(req, timeout=300) as response:
                res_data = json.loads(response.read().decode("utf-8"))
                return res_data["choices"][0]["message"]["content"].strip()
        except Exception as e:
            print(f"Tentativa {attempt}/3 falhou para {context_label}: {e}", file=sys.stderr)
            time.sleep(3)
    return f"⚠️ Falha ao obter análise para {context_label} após 3 tentativas."


def chunk_file_lines(filepath: Path, max_lines: int = 250) -> list[tuple[str, str]]:
    """Divide arquivos grandes em seções navegáveis."""
    lines = filepath.read_text(encoding="utf-8", errors="replace").splitlines()
    if len(lines) <= max_lines:
        return [("\n".join(lines), f"{filepath.name} (Completo)")]
    chunks = []
    total = len(lines)
    for i in range(0, total, max_lines):
        part_lines = lines[i : i + max_lines]
        label = f"{filepath.name} (Linhas {i+1} a {min(i+max_lines, total)})"
        chunks.append(("\n".join(part_lines), label))
    return chunks


def main():
    parser = argparse.ArgumentParser(description="Auditoria de Segurança Local com LLM")
    parser.add_argument(
        "--target",
        choices=["todos", "firestore_rules", "cloud_functions", "cloudflare_workers"],
        default="todos",
        help="Alvo da auditoria",
    )
    parser.add_argument("--output", default="SECURITY_AUDIT_REPORT.md", help="Arquivo de saída do relatório")
    args = parser.parse_args()

    root_dir = Path(__file__).resolve().parent.parent
    targets_to_scan = []

    # 1. Regras do Firestore e Storage
    if args.target in ["todos", "firestore_rules"]:
        fs_rules = root_dir / "firestore.rules"
        if fs_rules.is_file():
            targets_to_scan.append(fs_rules)
        st_rules = root_dir / "storage.rules"
        if st_rules.is_file():
            targets_to_scan.append(st_rules)
        db_rules = root_dir / "database.rules.json"
        if db_rules.is_file():
            targets_to_scan.append(db_rules)

    # 2. Cloud Functions sensíveis (Auth, Pagamentos, Webhooks, Admin, Secrets)
    if args.target in ["todos", "cloud_functions"]:
        fn_dir = root_dir / "functions"
        if fn_dir.is_dir():
            sec_keywords = [
                "auth", "secur", "secret", "pay", "order", "ratelimit",
                "endpoint", "webhook", "admin", "token", "role", "verif",
                "origin", "protect"
            ]
            for f in fn_dir.rglob("*"):
                if "node_modules" in f.parts:
                    continue
                if f.is_file() and f.suffix in [".js", ".ts", ".mjs"]:
                    name_lower = f.name.lower()
                    if any(k in name_lower for k in sec_keywords) or f.name in ["index.js", "index.ts"]:
                        targets_to_scan.append(f)

    # 3. Cloudflare Workers
    if args.target in ["todos", "cloudflare_workers"]:
        cf_dir = root_dir / "cloudflare"
        if cf_dir.is_dir():
            for f in cf_dir.rglob("*"):
                if "node_modules" in f.parts:
                    continue
                if f.is_file() and f.suffix in [".js", ".ts", ".mjs"]:
                    targets_to_scan.append(f)

    if not targets_to_scan:
        print("Nenhum arquivo encontrado para os alvos selecionados.")
        sys.exit(0)

    print(f"==> Iniciando auditoria de segurança com {MODEL} em {len(targets_to_scan)} arquivo(s)...")

    report_lines = [
        "# Relatório de Auditoria de Segurança de Aplicação (SAST)",
        f"**Data da Execução:** {time.strftime('%Y-%m-%d %H:%M:%S UTC', time.gmtime())}  ",
        f"**Motor de IA:** `{MODEL}` (Execução 100% Local / Zero Vazamento)  ",
        f"**Alvo Selecionado:** `{args.target}`  ",
        "",
        "---",
        "",
        "## Resumo dos Arquivos Auditados",
    ]

    for t in targets_to_scan:
        report_lines.append(f"- `{t.relative_to(root_dir)}` ({t.stat().st_size:,} bytes)")
    report_lines.extend(["", "---", "", "## Detalhamento das Análises de Segurança", ""])

    for idx, target_file in enumerate(targets_to_scan, 1):
        rel_path = target_file.relative_to(root_dir)
        print(f"\n[{idx}/{len(targets_to_scan)}] Auditando: {rel_path}...")
        chunks = chunk_file_lines(target_file, max_lines=250)

        for chunk_text, chunk_label in chunks:
            print(f"  -> Processando seção: {chunk_label}...")
            analysis = query_llm(chunk_text, f"{rel_path} - {chunk_label}")
            report_lines.append(f"### Arquivo: `{rel_path}` ({chunk_label})\n")
            report_lines.append(analysis)
            report_lines.append("\n---\n")

    report_content = "\n".join(report_lines)
    out_path = Path(args.output)
    out_path.write_text(report_content, encoding="utf-8")
    print(f"\n✅ Relatório de auditoria salvo com sucesso em: {out_path.resolve()}")

    # Se estiver rodando no GitHub Actions, escrever no Step Summary
    gh_summary = os.environ.get("GITHUB_STEP_SUMMARY")
    if gh_summary:
        try:
            with open(gh_summary, "a", encoding="utf-8") as f:
                f.write(report_content)
            print("✅ Relatório anexado ao GitHub Actions Step Summary!")
        except Exception as e:
            print(f"Aviso ao gravar no Step Summary: {e}", file=sys.stderr)


if __name__ == "__main__":
    main()
