# Bairro no endereço do negócio

- **ID:** `business-address-district`
- **Status:** Concluída em Dev
- **Responsável:** Não definido
- **Atualizado em:** 2026-11-18
- **Referências:** `src/app/components/settings/BusinessInfoSection.tsx`; `src/app/pages/Settings.tsx`; `src/services/firebaseSettingsService.ts`; `src/app/components/shipping/SuperfreteGenerateLabelDialog.tsx`; `functions/orders/superfrete.js`; `docs/FUNCIONALIDADES.md`

## Problema e contexto

O formulário Informações do Negócio não tinha campo para bairro. A consulta ViaCEP preenchia rua, cidade e UF, mas ignorava `bairro`; a origem usada na etiqueta SuperFrete tinha bairro fixo como “Centro”.

## Objetivos

- Permitir consultar, editar, salvar e usar o bairro do endereço comercial.

## Fora de escopo

- Alterar CEP ou endereço de clientes/destinatários.
- Alterar contratos MCP/Copiloto, produção ou Workers Cloudflare.

## Atores e permissões

| Ator | Ações permitidas | Restrições/negações |
|---|---|---|
| Usuário autorizado às configurações | Editar e salvar endereço do negócio | Regras de acesso existentes às configurações permanecem aplicáveis |

## Requisitos funcionais

- **RF-1:** O formulário de Informações do Negócio deve ter campo editável de bairro e persistir o valor em `businessDistrict`.
- **RF-2:** A busca por CEP deve preencher `businessDistrict` com `bairro` do ViaCEP quando informado, sem apagar valor já digitado se a API não retornar bairro.
- **RF-3:** O fluxo de emissão SuperFrete deve usar o bairro salvo como parte do endereço de origem, com fallback existente quando vazio.

## Critérios de aceitação

- **CA-1 (RF-1):** Bairro carregado das configurações é mostrado; alterações podem ser salvas e reaparecem ao reabrir.
- **CA-2 (RF-2):** CEP localizado preenche rua, bairro, cidade e UF; campos permanecem editáveis e bairro ausente na resposta não apaga o valor atual.
- **CA-3 (RF-3):** A origem da etiqueta usa `businessDistrict` salvo e usa “Centro” somente quando não houver bairro configurado.

## Requisitos não funcionais e integridade

- Segurança/privacidade: endereço segue o escopo de acesso já aplicado às configurações do usuário.
- Integridade/idempotência: sem efeito financeiro ou mudança de idempotência.
- Acessibilidade/desempenho/observabilidade: usar componentes Label/Input existentes; manter estados de carregamento e erro da busca CEP.
- Compatibilidade de API/dados: novo campo opcional `businessDistrict`; configurações antigas continuam válidas.

## Erros e casos-limite

- CEP indisponível ou sem bairro: manter preenchimento manual e preservar o valor atual.
- Configuração legada sem bairro: permitir edição e usar fallback “Centro” na emissão.

## Dados e contratos afetados

- Campo opcional `businessDistrict` no documento de configurações do usuário e no payload `from` da callable SuperFrete existente. Sem alteração de argumentos da callable.

## Impacto na documentação

- Guias/specs existentes revisados: `docs/FUNCIONALIDADES.md`, código de Informações do Negócio e emissão SuperFrete.
- Documentação atualizada: guia de funcionalidades, catálogo e esta spec.
- Índices, exemplos, comandos ou links afetados: catálogo `specs/features/README.md`.
- Impacto no Copiloto (Gemini): não impactado; não usa o formulário nem cria etiquetas por este fluxo.
- Impacto no MCP/ChatGPT: não impactado; nenhuma ferramenta ou schema alterado.
- Diferenças de comportamento Copiloto/MCP a preservar ou alterar: sem mudança.

## Decisões e dúvidas

- **Confirmado:** ViaCEP fornece o campo `bairro` para CEPs que o possuem; esse dado pode faltar, então o campo permanece editável.
- **Confirmado:** endereço comercial é mantido nas configurações já existentes; o novo campo é opcional e compatível com registros antigos.

## Validação

- `npm run typecheck`, `npm --prefix functions run lint`, `git diff --check`.
- Confirmar no CI deploy Firebase Dev e Vercel Dev/Beta; conferir que Cloudflare Worker e `api.dev` não foram alterados.

## Evidências de conclusão

- `npm run typecheck`, `npm --prefix functions run lint` (108 arquivos) e `git diff --check` passaram localmente.
- Commit `794bce219807fcc471a8dea892a70c9ed3bfcfa5` publicado em `develop`; Firebase Dev (`44427416678`), Vercel Dev/Beta (`44427416604`) e CodeQL (`44427416761`) concluíram com sucesso.
- Os jobs de Cloudflare Workers foram ignorados; sem mudança no Worker ou em `api.dev`. Produção não foi publicada.
