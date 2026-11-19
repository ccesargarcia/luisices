# Criptografia obrigatória para dados locais no navegador

- **ID:** `browser-local-data-encryption`
- **Status:** Em andamento
- **Responsável:** Luisices
- **Atualizado em:** 2026-11-19
- **Referências:** `specs/constitution.md`, `.agents/skills/luisices-platform-security/SKILL.md`, `src/lib/firebase.ts`, `src/services/emailBodyCache.ts`, `tests/e2e/auth.setup.ts`

## Problema e contexto

O frontend usava cache persistente nativo do Firestore e persistência local do Firebase Auth. Esses SDKs gerenciam bancos IndexedDB internos e não expõem uma opção de criptografia de conteúdo configurável pelo app. O cache persistente do Firestore contém documentos recebidos do backend; o Auth persistente armazena o estado de autenticação. Além disso, o cache local do corpo de e-mail precisa sobreviver a reloads.

## Objetivos

- Exigir criptografia antes da gravação de dados de aplicação em IndexedDB.
- Desativar persistências IndexedDB internas sem criptografia configurável.
- Usar persistência local do Firebase Auth em `localStorage`, que sincroniza a autenticação entre abas, e cache em memória no Firestore.
- Cifrar o cache explícito dos corpos de e-mail com AES-GCM antes de gravar.
- Remover cache Firestore legado quando possível e não copiar tokens de Firebase Auth via IndexedDB em E2E.

## Fora de escopo

- Criptografia ponta a ponta dos dados no Firebase/Storage ou tráfego TLS.
- Proteção contra XSS, malware, extensão maliciosa, dispositivo comprometido ou usuário com sessão ativa.
- Mudança de regras/contratos remotos.

## Requisitos funcionais

- **RF-1:** Todo novo dado da aplicação persistido em IndexedDB precisa ser cifrado antes da gravação.
- **RF-2:** Firestore web usa `memoryLocalCache()`; documentos não ficam persistidos localmente para uso offline.
- **RF-3:** Firebase Auth usa `browserLocalPersistence` (localStorage); a sessão é compartilhada entre abas e pode sobreviver ao fechamento do navegador, sujeita ao encerramento por inatividade da aplicação.
- **RF-4:** O cache próprio de e-mails usa AES-GCM, chave não exportável por UID, IV aleatório, expiração de 7 dias e limites definidos em sua spec dedicada.
- **RF-5:** Dados residuais de cache Firestore legado são limpos durante a inicialização, antes do primeiro uso Firestore, quando o navegador permite.
- **RF-6:** E2E não extrai nem injeta os bancos IndexedDB internos do Firebase; configura sessão transitória de teste fora do IndexedDB.
- **RF-7:** A skill de segurança e a constituição das specs tornam a regra obrigatória para novas funcionalidades e auditorias.

## Critérios de aceitação

- **CA-1 (RF-1/RF-4):** Valores HTML/texto do cache de e-mail não aparecem em claro nos registros IndexedDB; somente conteúdo descriptografado em memória chega à UI.
- **CA-2 (RF-2):** A inicialização Firestore não habilita `persistentLocalCache` e não promete leitura/escrita offline após reload.
- **CA-3 (RF-3):** A autenticação se sincroniza entre abas; o prazo de inatividade encerra a sessão em todas elas. Sem limite configurado, não há logout automático por inatividade.
- **CA-4 (RF-5):** A limpeza do cache antigo ocorre antes da renderização principal; falha por outra aba/navegador é registrada e não impede o app.
- **CA-5 (RF-6):** Arquivos E2E de sessão não são banco IndexedDB; `.auth` permanece fora do Git.
- **CA-6 (RF-7):** Skill, constituição, arquitetura e funcionalidades documentam a regra e as exceções técnicas.

## Segurança e dados

- Cache próprio: Web Crypto AES-GCM, IV de 96 bits aleatório por entrada e chave não exportável no mesmo IndexedDB, segregada por UID. Essa chave protege leitura direta/exportação dos dados; por estar disponível à origem autenticada, não protege contra XSS.
- SDKs sem criptografia configurável: desativar IndexedDB em vez de alegar criptografia nativa. Firestore fica em memória; Auth usa a persistência local padrão Firebase em localStorage, não IndexedDB.
- O cache local nunca altera a autorização autoritativa do backend/Rules.

## Impactos funcionais

- Sem documentos Firestore offline após recarregar ou fechar a aba; a aplicação precisa de conectividade para buscar dados ausentes da memória.
- A autenticação é compartilhada entre abas. `browserLocalPersistence` persiste em localStorage e pode sobreviver ao fechamento do navegador; a checagem de inatividade ocorre ao iniciar/retomar o app.
- Cada aba pode manter sua própria sessão Firebase Auth; coordenação multi-aba da persistência local deixa de ser fornecida pelo Auth.

## Impacto nas integrações de IA

- Copiloto (Gemini): não impactado; não usa cache local ou persistência Auth/Firestore diferente do SDK compartilhado para o app.
- MCP/ChatGPT: não impactado; nenhum contrato, escopo ou persistência do servidor MCP muda.
- Paridade Copiloto/MCP: nenhum contrato alterado.

## Validação

- `npm run typecheck` obrigatório; verificar diff/configuração, usos IndexedDB e especificações cruzadas. Testes E2E não foram solicitados nesta etapa.

## Evidências de conclusão

- `npm run typecheck` passou localmente; `git diff --check` passou.
- Commit `ba9fbb0` publicado na branch `develop`.
- Firebase DEV concluiu Hosting (`44457575451`); Vercel DEV/Beta concluiu (`44457575322`); CodeQL concluiu (`44457575318`). Functions, Rules, Indexes e Cloudflare Worker foram ignorados pelo filtro de alterações.
- Verificações HTTP responderam 200 para `dev.luisices.com.br`, `beta.luisices.com.br` e `api.dev.luisices.com.br/health` após o deploy.
- Validação autenticada da persistência no navegador segue pendente: o navegador Playwright do ambiente não tem Chromium instalado. Nenhum teste E2E foi executado.
