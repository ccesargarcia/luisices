# Recuperação de envio de e-mail

Esta mudança usa a coleção técnica `emailSendRequests` existente; não exige novos serviços, índices ou regras. A coleção continua inacessível ao SDK cliente.

## Garantias e limites

- A chave é associada ao usuário e ao hash do conteúdo. Uma chave com conteúdo diferente é rejeitada.
- O callback transacional retorna sua decisão, sem mutar estado externo entre retentativas do Firestore.
- A posse dura dois minutos. Uma nova execução renova o prazo e recebe outro identificador; execuções antigas não podem finalizar ou liberar sua posse.
- O payload efetivamente enviado ao provedor também é conferido, incluindo conteúdo dos anexos.
- O mesmo envio utiliza a opção de idempotência do Resend. Sua retenção é limitada: a aplicação aceita recuperação automática somente nas primeiras 23 horas desde a criação da operação.
- Histórico e conclusão são persistidos no mesmo commit, com ID de histórico determinístico.
- Uma falha após registrar a tentativa externa deixa o resultado `uncertain`, em vez de afirmar que nada foi enviado. A repetição dentro da janela utiliza a mesma chave do provedor.
- Registros legados sem hash são bloqueados para repetição automática. Devem ser conferidos no histórico/provedor antes de iniciar uma nova operação.
- Chamadas antigas sem chave continuam compatíveis, mas não recebem essas garantias. O formulário atual envia chave.
- Não há garantia de execução exatamente uma vez fora da janela do provedor ou por clientes que enviem novas chaves para cada repetição.

## Operação

Ao receber erro de janela expirada, resultado legado ou alteração de anexos, não gere outra chave automaticamente. Confira destinatários, histórico e situação no provedor. Registre o resultado dessa conferência antes de repetir intencionalmente o envio.

Anexos temporários são removidos somente depois do commit de conclusão. Anexos de pedidos definitivos permanecem intactos.

## Validação e entrega

Executar `npm run test:unit` e `npm run lint:functions`. Os testes desta etapa simulam atomicidade, conflito de posse, recuperação, expiração e falha de commit. Não fazem chamadas reais ao Resend nem substituem uma validação integrada em DEV com provedor simulado.

Publicar somente após revisão em DEV/QA, incluindo erros de rede e falha de persistência após aceitação externa. Nenhum deploy é executado por esta alteração local.

## Custo e rollback

Há transações de aquisição, marcação da tentativa e conclusão por envio com chave. Isso adiciona leituras/escritas pequenas, sem assinatura em tempo real e sem nova infraestrutura. O objetivo é evitar envios externos duplicados.

Evitar rollback para a implementação anterior em operações pendentes: ela não respeita a posse nem a janela segura. Em caso de incidente, suspender novos envios e conferir operações `processing`/`uncertain` antes de restaurar o serviço. Não apagar a coleção técnica para desbloquear retentativas.
