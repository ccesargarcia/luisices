# Cache local criptografado para corpos de e-mails

- **ID:** `email-body-local-cache`
- **Status:** Em andamento
- **Responsável:** Luisices
- **Atualizado em:** 2026-11-19
- **Referências:** `src/services/emailBodyCache.ts`, `src/services/emailService.ts`, `src/contexts/AuthContext.tsx`, `src/app/pages/Emails.tsx`, `docs/FUNCIONALIDADES.md`

## Problema e contexto

Corpos completos recebidos são baixados sob demanda do Firebase Storage. Reabrir a mensagem ou usar responder/copiar pode repetir o download, e o estado em memória se perde ao recarregar a página.

## Objetivos

- Persistir localmente corpos completos já lidos para acelerar leituras posteriores no mesmo navegador.
- Criptografar os corpos antes de gravá-los no IndexedDB e limitar retenção, quantidade e tamanho.
- Isolar os registros por UID Firebase e limpar registros/chaves quando a autenticação muda ou termina.

## Fora de escopo

- Compartilhar cache entre navegadores/dispositivos ou sincronizar por Redis/Vercel.
- Alterar Firebase Storage, backend, API, anexos, prévias, regras de acesso ou fluxo de login.

## Atores e permissões

| Ator | Ações permitidas | Restrições/negações |
|---|---|---|
| Usuário autenticado | Reutilizar localmente corpo que já leu no mesmo navegador | Cache pertence ao UID atual e só é usado quando email e caminhos correspondem |

## Requisitos funcionais

- **RF-1:** Leitura, resposta e cópia consultam o cache antes de baixar o corpo do Storage.
- **RF-2:** Somente corpos completos sem falha são persistidos; prévias e resultados parciais não entram no cache.
- **RF-3:** O cache usa IndexedDB e AES-GCM com chave não exportável mantida no próprio IndexedDB, separada por UID.
- **RF-4:** Registros expiram após 7 dias, limitados a 8 mensagens e 25 MiB totais; corpos acima de 15 MiB não são persistidos.
- **RF-5:** Indisponibilidade, falha de quota ou falha criptográfica não impedem o carregamento pelo Storage.
- **RF-6:** Ao encerrar sessão, as entradas e chaves locais são removidas; ao autenticar outra conta, dados de outras contas são removidos.

## Critérios de aceitação

- **CA-1 (RF-1):** Após a leitura completa, reabrir a mensagem na mesma conta reutiliza o conteúdo sem novo download do corpo.
- **CA-2 (RF-2/RF-3):** O IndexedDB não armazena HTML/texto em claro; a UI recebe o conteúdo descriptografado somente em memória.
- **CA-3 (RF-4):** A gravação respeita validade e limites definidos, removendo itens expirados/antigos quando necessário.
- **CA-4 (RF-5):** Se IndexedDB/WebCrypto não estiver disponível, o fluxo normal do Storage continua.
- **CA-5 (RF-6):** Troca de UID e logout removem dados de conta anterior sem misturar conteúdos.

## Requisitos não funcionais e integridade

- Segurança/privacidade: AES-GCM com IV aleatório por gravação; chave não exportável e separada por UID. Como chave e dados residem no mesmo perfil/origem, isto protege contra leitura direta do corpo no banco exportado, mas não contra script malicioso na origem, dispositivo comprometido ou usuário com controle da sessão.
- Integridade/idempotência: conteúdo cifrado autenticado pelo AES-GCM; corrupção causa descarte e novo carregamento remoto.
- Desempenho: cache é best effort e limitado; indisponibilidade/quota nunca bloqueia leitura remota.
- Compatibilidade de API/dados: nenhum contrato de servidor ou schema Firestore/Storage muda.

## Erros e casos-limite

- Navegador sem IndexedDB/WebCrypto, modo privado restritivo ou quota cheia: ignorar cache e carregar do Storage.
- Caminhos do Storage alterados: chave diferente invalida o registro anterior.
- Expiração, corrupção ou chave ausente: apagar item e buscar novamente.
- Logout durante operação: a leitura em andamento mantém o comportamento existente; remoção local é best effort.

## Dados e contratos afetados

- Banco IndexedDB local do navegador, sem mudança em dados remotos.

## Impacto na documentação

- Guias/specs revisados: documentação da Central de E-mails, arquitetura, spec do modal e código de leitura/autenticação.
- Documentação atualizada: `docs/FUNCIONALIDADES.md`, `docs/DEPENDENCIAS_E_ARQUITETURA.md` e este diretório/spec.
- Impacto no Copiloto (Gemini): não impactado; não lê nem usa este cache de interface.
- Impacto no MCP/ChatGPT: não impactado; não lê nem usa este cache de interface.
- Diferenças de comportamento Copiloto/MCP a preservar ou alterar: nenhuma alteração de contrato ou paridade.

## Decisões e dúvidas

- **Confirmado:** Cache exclusivo do navegador e conta; retenção limitada e corpo cifrado localmente.
- **Política global:** qualquer IndexedDB da aplicação exige criptografia antes da gravação; caches internos Firebase sem cifra configurável foram desativados na spec `browser-local-data-encryption`.
- **Limitação confirmada:** A chave não exportável impede exportação simples da chave, mas não protege contra código executado na origem enquanto a conta está autenticada.

## Validação

- `npm run typecheck` e revisão do fluxo/modal e limpeza por UID.

## Evidências de conclusão

- `npm run typecheck` passou e `git diff --check` passou.
- Commit `ba9fbb0` publicado em `develop`; Firebase DEV (`44457575451`) e Vercel DEV/Beta (`44457575322`) concluíram com sucesso.
- Validação funcional autenticada do cache no navegador segue pendente porque o Chromium não está instalado no navegador Playwright deste ambiente; nenhum teste E2E foi executado.
