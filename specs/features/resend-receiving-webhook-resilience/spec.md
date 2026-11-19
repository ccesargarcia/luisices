# Resiliência do recebimento de e-mails Resend

Status: Em andamento

## Problema confirmado

Em 29/10/2026 e 05/11/2026, o endpoint `resendReceivingWebhook` respondeu com erro durante a gravação de mensagens grandes recebidas em `contato@dev.luisices.com.br`. Os logs do Firebase registram que `html` ultrapassou o limite de campo/documento do Firestore. O Resend repetiu as entregas e desativou o endpoint; a pessoa precisou reativá-lo manualmente. Também há tentativas de encaminhamento entre projetos rejeitadas por assinatura Svix inválida.

## Comportamento esperado

- O webhook externo continua exigindo segredo de origem, timestamp válido e assinatura Svix do Resend.
- O encaminhamento entre ambientes usa autenticação interna assinada, sem presumir que o segredo Svix de um endpoint seja válido no outro ambiente.
- Como há um único endpoint Resend encaminhando entre projetos, `RESEND_WEBHOOK_SECRET` precisa conter em ambos os projetos o segredo vigente desse endpoint; os workflows aceitam `DEV_RESEND_WEBHOOK_SECRET` e `PROD_RESEND_WEBHOOK_SECRET` separados, então a configuração deve ser alinhada antes do deploy.
- Uma falha de encaminhamento retorna erro ao Resend e libera a reserva de idempotência para que uma repetição possa tentar novamente.
- Corpos de e-mail cujo tamanho possa exceder o Firestore são armazenados em objetos privados no Firebase Storage; o documento mantém metadados e referências. O módulo de E-mails carrega o conteúdo completo quando abre a mensagem.
- O carregamento progressivo mostra o texto/prévia assim que disponível, não mantém o corpo oculto enquanto aguarda o HTML e aplica timeout a cada leitura. Se o Storage negar ou não responder, a interface mantém a prévia e exibe o código técnico para diagnóstico.
- O conteúdo recuperável tem limite operacional explícito. Se excedido, o evento é persistido com metadados e estado que explica a ausência do corpo; o webhook confirma o recebimento para evitar repetição infinita.
- Downloads diretos do Storage no navegador exigem CORS limitado aos domínios `https://dev.luisices.com.br` e `https://beta.luisices.com.br`, somente para GET; a configuração é aplicada no bucket DEV pelo workflow.
- Exclusão definitiva do e-mail também tenta remover objetos associados.

## Critérios de aceitação

1. HTML/texto grandes não são escritos em campos Firestore e podem ser carregados no painel com permissão `emails.view`.
2. Acesso ao corpo no Storage exige usuário ativo e permissão de leitura de e-mails; gravação permanece exclusiva do Admin SDK.
2a. Downloads no navegador respondem ao preflight CORS apenas para os domínios DEV/Beta configurados.
3. Webhook Resend inválido continua rejeitado. Encaminhamento interno assinado entre prod/dev é aceito; header de encaminhamento forjado é rejeitado.
4. Falha de entrega interna não deixa claim que faça uma repetição ser reconhecida falsamente como processada.
5. Mensagens pequenas conservam o formato atual dos documentos e continuam renderizadas sem chamada extra ao Storage.
6. Documentação registra operação, limites, recuperação de eventos e impacto nulo no Copiloto/MCP.

## Fora de escopo

- Reconfigurar ou desativar o endpoint no painel do Resend.
- Deploy ou alteração de dados em produção.
- Alterar o contrato de envio de e-mail ou as ferramentas Copiloto/MCP.

## Decisões

- Corpos grandes ficam no caminho já existente `emails/**`, cuja leitura já exige permissão do módulo; regras passam a autorizar exclusão definitiva sob `emails.delete`.
- Copiloto (Gemini) e MCP/ChatGPT não leem nem alteram `receivedEmails`; sem impacto de contrato ou autorização nessas integrações.
