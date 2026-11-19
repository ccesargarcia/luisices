# Plano de implementação — business-address-district

## Abordagem

Adicionar `businessDistrict` ao modelo e estado do formulário, mapear `bairro` da resposta ViaCEP e exibir um campo manual. Usar o dado persistido na origem SuperFrete, tanto no cliente quanto na normalização server-side.

## Componentes existentes

| Área | Arquivos/módulos atuais | Alteração proposta |
|---|---|---|
| Formulário | `src/app/components/settings/BusinessInfoSection.tsx` | Campo Bairro e preenchimento pelo ViaCEP |
| Persistência/estado | `src/app/pages/Settings.tsx`, `src/services/firebaseSettingsService.ts` | Carregar, salvar e limpar o campo opcional |
| Origem do frete | `src/app/components/shipping/SuperfreteGenerateLabelDialog.tsx`, `functions/orders/superfrete.js` | Usar bairro configurado com fallback |
| Documentação | `docs/FUNCIONALIDADES.md`, catálogo e spec | Descrever o comportamento |

## Contratos, dados e compatibilidade

- Contratos/API/schema: campo aditivo no objeto de origem; sem mudança nos argumentos da callable.
- Dados/migração: sem backfill; configurações antigas seguem válidas e recebem fallback até serem atualizadas.
- Integrações/ambientes: Firebase Functions Dev e Vercel Dev/Beta; Worker Cloudflare, `api.dev` e produção fora de escopo.

## Segurança e integridade

- Autorização e ownership: sem mudança nas permissões atuais de configurações e emissão.
- Validação/redação/limites: bairro é texto de formulário existente; ViaCEP permanece fonte não autenticada.
- Transações/idempotência/valores: não aplicável.
- Ameaças/casos de abuso: não confiar em valor recebido no cliente para usuários não administradores; servidor prioriza a configuração do administrador.

## UX e documentação

- UI/acessibilidade/design system: reutilizar `Label` e `Input` sem novas cores ou componentes.
- Copiloto e MCP: nenhum impacto em prompts, ferramentas, dados ou permissões.
- Compatibilidade/paridade: nenhuma alteração de comportamento entre canais de IA.

## Validação e riscos

- Typecheck: `npm run typecheck`.
- Functions: `npm --prefix functions run lint`.
- Risco e mitigação: ViaCEP pode não devolver bairro; permitir edição manual e conservar fallback.

## Reversão

Reverter o campo e seus usos; registros contendo `businessDistrict` podem permanecer ignorados sem afetar campos anteriores.
