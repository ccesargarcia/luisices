# Guia Completo de Rollback e Recuperação — Branch `develop`

Este documento consolida os pontos de restauração (checkpoints), commits de referência e procedimentos operacionais imediatos para reverter qualquer alteração recente na branch `develop`.

---

## 1. Tabela de Checkpoints e Pontos de Restauração

| Checkpoint | Hash de Referência | Descrição / Estado da Plataforma |
|---|---|---|
| **Ponto Atual (Mais Recente)** | `b2c85d1` | Configurações organizadas em abas (Empresa, Operação, Aparência, Integrações, Avançado) com sincronização de URL (`?tab=...`), template interativo de WhatsApp com preview e tags, Arquivamento com Permissões Granulares e Dashboard Modular. |
| **Checkpoint 1 — Antes do Refactor de Settings & Dashboard** | `9454458` | Funcionalidade completa de Arquivamento de Pedidos e Permissões Granulares ativas; telas anteriores sem refatoração de abas. |
| **Checkpoint 2 — Antes da Área de Pedidos Arquivados** | `510026b` | Dashboard com paginação corrigida, sem o módulo de arquivamento separado. |
| **Checkpoint 3 — Base Estável de Testes Unitários** | `671dbad` | Suíte de testes unitários consolidada e alocações de CPU das cloud functions estabilizadas. |
| **Checkpoint 4 — Base Original Limpa** | `27eda55` | Base anterior às integrações do ciclo atual. |

---

## 2. Procedimentos Operacionais de Rollback Imediato

Se houver qualquer instabilidade em ambiente de desenvolvimento ou necessidade de regressão, execute um dos passos abaixo a partir da raiz do repositório:

### ⏪ Opção A: Reverter para o Checkpoint 1 (Antes das mudanças de Configurações)
```bash
# 1. Garantir que está na branch develop
git checkout develop

# 2. Resetar o histórico para o commit 9454458
git reset --hard 9454458

# 3. Forçar a sincronização com o repositório remoto
git push origin develop --force
```

---

### ⏪ Opção B: Reverter para o Checkpoint 2 (Antes do Módulo de Arquivamento)
```bash
git checkout develop
git reset --hard 510026b
git push origin develop --force
```

---

### ⏪ Opção C: Reverter para a Base Estável de Testes Unitários
```bash
git checkout develop
git reset --hard 671dbad
git push origin develop --force
```

---

### ⏪ Opção D: Reverter para a Base Absoluta Original
```bash
git checkout develop
git reset --hard 27eda555573aec50f079d283b3eabaac3e6d50e7
git push origin develop --force
```

---

## 3. Verificação de Integridade Pós-Rollback

Após aplicar qualquer rollback, execute a validação de sanidade da aplicação:

1. **Testes Unitários:**
   ```bash
   NODE_PATH=functions/node_modules npx vitest run
   ```

2. **Compilação do Frontend:**
   ```bash
   npm run build
   ```

3. **Deploy de Regras de Segurança (se aplicável):**
   ```bash
   firebase deploy --only firestore:rules
   ```

---

## 4. Notas de Arquitetura e Boas Práticas

- **Permissões Granulares:** Mantidas desacopladas na interface `Permission` em `src/app/types.ts`.
- **Configurações por Abas:** Estado persistido via query string (`?tab=empresa`, `?tab=operacao`, `?tab=aparencia`, `?tab=integracoes`, `?tab=avancado`).
- **Templates WhatsApp:** Tags suportadas: `{nome}`, `{numero}`.
- **Rollback Seguro:** Todos os comandos de reset acima foram validados contra o histórico remoto.
