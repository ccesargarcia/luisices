# Plano de implementação — cross-tab-session-idle-timeout

## Abordagem

Usar persistência padrão `browserLocalPersistence` do Firebase Auth para sincronizar sessões entre abas. Adicionar um serviço front-end que compartilha somente o timestamp de atividade no localStorage, consulta a configuração por conta, trata `0` como sem limite e encerra pelo logout Firebase quando expirado. Manter o cache Firestore em memória e nenhuma persistência nova em IndexedDB.

## Componentes existentes

| Área | Arquivos/módulos atuais | Alteração proposta |
|---|---|---|
| Firebase | `src/lib/firebase.ts` | Auth localStorage; fallback em memória se indisponível |
| Ciclo Auth | `src/contexts/AuthContext.tsx` | Instalar/limpar guarda de inatividade e propagar logout |
| Serviço de atividade | `src/services/sessionInactivityService.ts` | Sincronizar atividade entre abas, ler settings e controlar timeout 0/15/30/60 |
| Preferências | `src/services/firebaseSettingsService.ts`, `src/app/pages/Settings.tsx` | Persistir configuração própria da conta e apresentar seletor em Avançado |
| UI | `src/app/components/settings/SessionSecuritySection.tsx` | Exibir prazos e estado sem limite com primitives do Design System |
| Segurança/docs | skill de segurança, `browser-local-data-encryption`, guias de arquitetura/funcionalidades | Corrigir persistência descrita e registrar riscos/limites |

## Contratos, dados e compatibilidade

- Contratos/API/schema: nenhum contrato externo muda.
- Dados/migração: campo opcional em `users/{uid}/settings/profile`; contas existentes usam 30 min; `0` desativa o logout por inatividade.
- Integrações/ambientes: Firebase Auth sincroniza localmente por origem; Firestore Rules existentes limitam o documento ao próprio UID.

## Segurança e integridade

- Autorização e ownership: a preferência segue o documento de configurações já pertencente ao UID autenticado.
- Validação/redação/limites: aceitar só 0, 15, 30, 60; fallback 30; marcador guarda apenas timestamp e é auxiliar, nunca autorização.
- Transações/idempotência/valores: não aplicável.
- Ameaças/casos de abuso: localStorage do Auth não cifrado; sem limite aumenta duração da sessão em dispositivo compartilhado. Registrar claramente e manter logout/revogação ativos. Se localStorage de atividade indisponível, sincronização entre abas pode falhar.

## UX e documentação

- UI/acessibilidade/design system: opção clara “Desativado — sem limite”, descrição de escopo cross-tab, Select e Button reutilizados.
- Documentação/specs revisadas: spec de criptografia local e skill de segurança.
- Documentação viva: `docs/FUNCIONALIDADES.md`, `docs/DEPENDENCIAS_E_ARQUITETURA.md`, `README.md`.
- Índices/links: catálogo de specs e referências locais.
- Copiloto (Gemini): sem impacto em ferramentas/prompts/dados; Auth comum do app somente.
- MCP/ChatGPT: sem impacto em OAuth ou ferramentas/escopos.
- Compatibilidade/paridade IA: não aplicável; integrações permanecem inalteradas.

## Validação e riscos

- Typecheck obrigatório: `npm run typecheck`.
- Validações: `git diff --check`; revisão manual de expiração, alteração remota da configuração e fallback.
- Risco: persistência local prolongada; mitigado por timeout padrão de 30 minutos e explicação do modo sem limite.

## Reversão

Reverter o campo e o serviço restaura o comportamento anterior; contas podem manter o campo desconhecido sem efeito. Reverter Auth para session persistence volta à sessão isolada por aba.
