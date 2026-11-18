# Plano de implementação — backend-fallback-diagnostics

| Etapa | Área | Mudança | Estado |
|---|---|---|---|
| 1 | `functions/orders/superfrete.js` | Mapear status HTTP do provedor para erros Firebase válidos; cobrir falhas do provedor e timeout sem executar checkout | Publicada em Firebase Dev |
| 2 | `src/services/backendRoutingService.ts`, `src/services/firebaseUserService.ts`, `src/services/superfreteService.ts` | Guardar rota/operação, duração e resumos separados das falhas Beta/GCP; manter compatibilidade com eventos legados | Publicada em Vercel Dev |
| 3 | `src/app/components/settings/BackendRoutingSettingsSection.tsx` | Remover o limite visual de dez eventos, mantendo a área rolável e o limite persistido de 50 | Publicada em Vercel Dev |
| 4 | `docs/VERCEL_BETA_ROUTING.md`, spec e testes | Atualizar documentação e executar validações locais | Concluída; rollout Dev registrado na spec |

## Limites operacionais

- O Worker `functions-dev` (`api.dev`) e seus arquivos/configurações não serão alterados nem publicados. A ausência de logs do Worker continua uma limitação para falhas que nunca chegam ao GCP.
- A publicação autorizada em `develop` atualizou apenas Vercel Dev, Firebase Hosting Dev e as duas Functions SuperFrete. O deploy de Cloudflare foi ignorado por não haver alterações nos arquivos do Worker; produção ficou intocada.
- O job Firebase executou a limpeza preexistente do Artifact Registry e removeu uma versão antiga da imagem de `calculate_superfrete_shipping`, mantendo as duas versões mais recentes. Nenhuma versão de secret foi removida.
- Nenhuma etiqueta será comprada; os testes do SuperFrete devem mockar a resposta externa.
- Quando o chamador não informa uma ação específica, o campo `operation` recebe a própria chave da rota. Ações de usuários e SuperFrete registram nomes estáticos específicos.

## Segurança e efeitos

- A telemetria registra apenas nomes/códigos normalizados de erro, status, rota/operação, horário, host e duração. Mensagens arbitrárias, payloads, tokens e identificadores pessoais ficam fora do evento.
- O fallback de `createSuperfreteLabel` mantém as reservas/idempotência já existentes. Erros retornados pelo provedor não devem ser reclassificados como input inválido quando forem indisponibilidade ou falha de pagamento/configuração.
- Copiloto e MCP/ChatGPT: sem impacto; não são alterados seus handlers, contratos, permissões ou dados.
