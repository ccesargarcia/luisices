# Plano de implementação — backend-fallback-diagnostics

| Etapa | Área | Mudança | Estado |
|---|---|---|---|
| 1 | `functions/orders/superfrete.js` | Mapear status HTTP do provedor para erros Firebase válidos; cobrir falhas do provedor e timeout sem executar checkout | Concluída localmente |
| 2 | `src/services/backendRoutingService.ts`, `src/services/firebaseUserService.ts`, `src/services/superfreteService.ts` | Guardar rota/operação, duração e resumos separados das falhas Beta/GCP; manter compatibilidade com eventos legados | Concluída localmente |
| 3 | `src/app/components/settings/BackendRoutingSettingsSection.tsx` | Remover o limite visual de dez eventos, mantendo a área rolável e o limite persistido de 50 | Concluída localmente |
| 4 | `docs/VERCEL_BETA_ROUTING.md`, spec e testes | Atualizar documentação e executar validações locais | Concluída localmente |

## Limites operacionais

- O Worker `functions-dev` (`api.dev`) e seus arquivos/configurações não serão alterados nem publicados. A ausência de logs do Worker continua uma limitação para falhas que nunca chegam ao GCP.
- Nenhuma publicação/deploy será feita nesta etapa; a validação é local. Uma futura publicação precisará seguir o fluxo seletivo do domínio afetado.
- Nenhuma etiqueta será comprada; os testes do SuperFrete devem mockar a resposta externa.
- Quando o chamador não informa uma ação específica, o campo `operation` recebe a própria chave da rota. Ações de usuários e SuperFrete registram nomes estáticos específicos.

## Segurança e efeitos

- A telemetria registra apenas nomes/códigos normalizados de erro, status, rota/operação, horário, host e duração. Mensagens arbitrárias, payloads, tokens e identificadores pessoais ficam fora do evento.
- O fallback de `createSuperfreteLabel` mantém as reservas/idempotência já existentes. Erros retornados pelo provedor não devem ser reclassificados como input inválido quando forem indisponibilidade ou falha de pagamento/configuração.
- Copiloto e MCP/ChatGPT: sem impacto; não são alterados seus handlers, contratos, permissões ou dados.
