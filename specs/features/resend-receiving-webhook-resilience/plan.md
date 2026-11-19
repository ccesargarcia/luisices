# Plano — Resiliência do recebimento de e-mails

1. **Segurança e entrega:** estender `functions/email/webhookSecurity.js` com HMAC interno de encaminhamento, validado com o segredo do endpoint Resend e o domínio ambiental de origem esperado. A assinatura Svix original continua obrigatória na entrada do Resend. Como o endpoint é único, `RESEND_WEBHOOK_SECRET` deve ser idêntico nos projetos de origem e destino; alinhar os secrets GitHub `DEV_RESEND_WEBHOOK_SECRET`/`PROD_RESEND_WEBHOOK_SECRET` antes do deploy.
2. **Idempotência do roteamento:** manter claim no projeto de entrada, mas removê-lo em qualquer falha de encaminhamento; encaminhamento inválido/não-2xx deve ser devolvido como falha e não cair no processamento local do ambiente errado.
3. **Persistência de corpos:** guardar HTML/texto acima do limite seguro em `emails/received/<hash-do-email>/body.html` e `body.txt` privados; gravar caminhos e tamanho no documento Firestore. Limitar volume para evitar payloads descontrolados e aceitar metadados sem corpo quando exceder o teto definido.
4. **Acesso e UX:** ajustar Storage Rules para leitura com `emails.view` e exclusão com `emails.delete`; o Admin SDK mantém escrita. A UI busca corpos externos sob demanda quando seleciona uma mensagem; pesquisas usam também uma prévia textual limitada.
5. **Limpeza:** exclusão definitiva de documentos consulta os caminhos e tenta remover objetos associados, sem afetar exclusão de e-mails antigos que não possuem corpo no Storage.
6. **Validação e documentos:** adicionar testes focados de assinatura, tamanho/persistência/claim e contrato; executar `npm run typecheck`, lint Functions e testes focados. Atualizar guias de arquitetura, funcionalidade, Functions e índice da spec. Registrar que Copiloto e MCP não são afetados.

## Publicação

O usuário autorizou o deploy em `develop`; a publicação é limitada ao ambiente DEV via workflow do repositório. A Function pertence ao domínio `email` e as Storage Rules são publicadas pelo workflow de DEV. Produção não deve ser alterada nesta etapa. O secret do endpoint Resend precisa estar alinhado nos dois projetos para validar o encaminhamento real.
