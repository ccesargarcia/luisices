---
name: git-commit-and-security
description: >-
  Use this skill before committing code, staging files, or writing commit messages.
  Enforces strict prevention of sensitive data leakage (API keys, service account JSONs,
  customer PII, secrets, internal financial briefs) and Conventional Commits standards.
---

# Git Commit Hygiene & Sensitive Data Guard

This skill defines the non-negotiable security protocols for staging files, committing code, and preventing data leakage across Luisices repositories.

---

## 🚫 1. Zero-Leak Policy: NEVER Commit These Files

Under no circumstances may any of the following be staged or committed to Git:

### A. Secrets, API Keys & Credentials
* **Environment Files:** `.env`, `.env.local`, `.env.production` (only committed as `.env.example`).
* **Firebase Functions Secrets:** `functions/.secret.local` (only `functions/.secret.local.example` is permitted).
* **Service Account Keys:** `credentials.json`, `*firebase-adminsdk*.json`, `serviceAccountKey.json`.
* **Private Keys & SSH:** `*.pem`, `*.key`, `id_ed25519`, `homeassist_oci`.
* **API Tokens in Code:** Cloudflare tokens, Evolution API WhatsApp keys, Resend keys, Sentry tokens, Mercado Pago tokens, SuperFrete credentials.

### B. Customer PII (Personally Identifiable Information)
* Real customer names, phone numbers, WhatsApp numbers (`5511...`), addresses, CPF/CNPJ, order delivery details.
* Uploaded files: customer artwork, personal photos, audio recordings (`*.wav`), transcription files (`*.srt`).

### C. Temporary Files & Database Dumps
* SQLite databases: `*.db`, `*.sqlite`, `*-shm`, `*-wal`.
* Debug logs: `firestore-debug.log`, `database-debug.log`, `firebase-debug.log`, `ui-debug.log`.
* Local sessions & index files: `history.jsonl`, `session_index.jsonl`.

---

## 🔍 2. Mandatory Pre-Commit Checklist

Before generating any commit, follow this strict sequence:

### Step 1: NEVER use blind `git add .` or `git add -A`
Always add specific, intentional files:
```bash
git add src/app/components/OrderCard.tsx
git add tests/unit/orders.test.ts
```

### Step 2: Inspect Staged Status & Diffs
```bash
git status
git diff --cached
```

### Step 3: Run the Secret Leak Scanner
Before finalizing the commit, verify that no secret strings were inadvertently staged:
```bash
git diff --cached | grep -iE "(api_key|token|secret|password|bearer|authorization)" || echo "✅ No obvious secrets found"
```

This grep is only a heuristic: it can flag harmless words and miss secrets whose names do not match the pattern. It is not evidence that a staged change is safe. Inspect every staged diff and newly added binary, image, or document for credentials, customer data, screenshots, or internal-only material. Do not move local reports or sensitive artifacts into the repository merely to tidy the working tree; keep them outside the checkout or use a local exclude rule.

---

## ✍️ 3. Conventional Commits Standard

All commit messages must follow the Conventional Commits specification:

```text
<type>(<scope>): <short description in present tense>

[optional body explaining 'why' and context]

[optional footer(s), e.g. Closes #123]
```

### Allowed Types:
* `feat`: A new user-facing feature or API capability.
* `fix`: A bug fix or regression correction.
* `refactor`: Code change that neither fixes a bug nor adds a feature.
* `test`: Adding or correcting tests; no production code change.
* `docs`: Documentation-only changes.
* `chore`: Build process, dependencies, tooling, or CI updates.
* `perf`: Performance improvements.

### Examples:
* `feat(orders): add batch validation for custom tags`
* `fix(email): prevent double delivery on webhook retry`
* `refactor(functions): isolate WhatsApp status callable`
* `test(firestore): cover 20-tag AST limit regression`

---

## 🚨 4. Emergency Runbook: "A Secret Was Committed!"

If a sensitive file or secret was accidentally committed:

### Scenario A: The commit has NOT been pushed to remote (`origin`):
```bash
# Undo the commit and unstage all files while keeping your changes in the working directory:
git reset HEAD~1

# Remove the sensitive file:
git rm --cached path/to/secret.json
echo "path/to/secret.json" >> .gitignore
```

### Scenario B: The commit HAS been pushed to remote:
1. **IMMEDIATELY REVOKE THE SECRET:**
   Assume the token is compromised. Go to the service provider console (GCP, Cloudflare, Resend, Evolution) and **revoke/rotate the token immediately**.
2. **Purge History:**
   Use `git-filter-repo` or BFG Repo-Cleaner to rewrite history and force-push.
