# Instruções de Rollback e Operação - Branch `develop`

Este documento contém os procedimentos operacionais para reverter a integração da branch `feat/employee-roles-order-sharing` (incluindo o fix de rolagem mobile) na `develop`.

---

## 1. Dados de Referência da Integração Atual

* **Data da Integração:** 11/09/2026
* **Branch de Feature:** `feat/employee-roles-order-sharing`
* **Commit de Merge Atual (com fix de rolagem):** `644cbca0bf86e44889b7513588a40918b47e6619`
* **Commit Anterior Revertido e Estável:** `3ec4a74f90d5c6ea196066cebdf263e5f79436e9`
* **Commit Base Original Limpo:** `27eda555573aec50f079d283b3eabaac3e6d50e7`
* **Workflow de CI/CD:** `.github/workflows/deploy-dev.yml` (testes pulados via flag `[skip tests]`)

---

## 2. Gatilhos de Rollback Imediato

Se necessário desfazer imediatamente no ambiente de desenvolvimento, utilize uma das opções:

### Opção A — Reset para a Versão Estável Anterior (Mais Rápido e Limpo)
Retorna a `develop` ao commit `3ec4a74` (que comprovadamente está sem as alterações da feature branch e com a aplicação anterior funcionando):

```bash
# 1. Certifique-se de estar na develop
git checkout develop

# 2. Reseta para a versão anterior estável
git reset --hard 3ec4a74f90d5c6ea196066cebdf263e5f79436e9

# 3. Força o envio para o remoto da develop
git push origin develop --force
```

---

### Opção B — Reset para a Base Original da Develop
Caso queira voltar para a base absoluta antes de qualquer merge ou teste desta noite:

```bash
git checkout develop
git reset --hard 27eda555573aec50f079d283b3eabaac3e6d50e7
git push origin develop --force
```

---

## 3. Deploy das Regras de Segurança do Firestore

Caso as regras do Firestore precisem ser publicadas para permitir a leitura de `userProfiles` por funcionários:

```bash
firebase deploy --only firestore:rules
```
