# Plano de implementação — browser-local-data-encryption

## Abordagem

Substituir persistência web nativa Firestore por `memoryLocalCache()`, alterar Auth para `browserSessionPersistence`, limpar armazenamento Firestore legado durante bootstrap antes de renderizar o React, e atualizar E2E para capturar/restaurar a sessão temporária sem editar IndexedDB. Manter o único IndexedDB próprio com criptografia AES-GCM, conforme `email-body-local-cache`.

## Componentes e documentação

| Área | Alteração |
|---|---|
| `src/lib/firebase.ts` | Cache em memória, Auth por sessão, limpeza best effort de cache Firestore legado |
| `src/main.tsx` | Esperar preparação de persistência/limpeza antes de montar a aplicação |
| `tests/e2e/auth.setup.ts`, `tests/e2e/utils/auth.util.ts` | Trocar exportação/restauração de IndexedDB por sessão da aba |
| `src/services/emailBodyCache.ts` | Único IndexedDB de produto; AES-GCM e escopo por UID |
| `.agents/skills/luisices-platform-security/SKILL.md`, `specs/constitution.md` | Tornar a regra universal e documentar limite dos SDKs |
| `docs/FUNCIONALIDADES.md`, `docs/DEPENDENCIAS_E_ARQUITETURA.md`, `README.md` | Explicar impactos offline e de login |

## Segurança, compatibilidade e reversão

- Firestore Rules e Storage Rules permanecem autoritativas. Requisições continuam online como antes.
- Cache offline de documentos deixa de existir. Reverter `memoryLocalCache` exigiria primeiro oferecer cifra suportada e migrar dados locais.
- Login mantém reload dentro da aba, mas não mantém sessão após fechar a aba.
- Limpeza legado pode falhar se outra aba antiga mantiver o banco aberto; esse limite deve ser reportado sem bloquear acesso.

## Copiloto e MCP

Sem alteração de contratos; ambos usam permissões remotas existentes. Nenhum dos dois consulta os caches locais.

## Validação e risco

- Executar `npm run typecheck` obrigatório.
- E2E autenticação foi adaptado no código; execução não solicitada.
- Verificar links, usos de IndexedDB e mudanças de comportamento nos documentos.
