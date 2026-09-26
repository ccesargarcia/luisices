# Prompt para execução no Antigravity — correções da IA

Copie ou abra este arquivo no Antigravity e execute as instruções abaixo.

---

Trabalhe no repositório atual do Luisices e corrija os achados da revisão mais recente em `docs/REVISAO_IA_DEVELOP_3.md`. Use também `docs/AVALIACAO_IA.md`, `docs/PLANO_IA_ANTIGRAVITY.md` e `docs/RESULTADO_IMPLEMENTACAO_IA.md` para entender o histórico e os contratos. Revalide cada achado no código atual antes de alterá-lo; os documentos são evidência e contexto, não substituem a inspeção do estado atual.

## Objetivo

Entregar as correções locais, testadas e compatíveis, com foco nesta ordem: segurança e autorização dos dados, correção dos resultados, compatibilidade, latência e custo por tarefa correta. Não reduza custo à custa de respostas incompletas ou incorretas.

## Proteja o estado existente

- Antes de editar, registre branch, HEAD e `git status --short`.
- Preserve todas as mudanças existentes, inclusive arquivos não commitados. Não use reset, checkout para descartar alterações, limpeza indiscriminada ou sobrescrita dos documentos existentes.
- Inspecione as instruções locais (`AGENTS.md` e equivalentes) antes de trabalhar.
- Faça as correções diretamente na branch e no workspace atuais. Não crie commit, não faça push e não publique.
- Não faça deploy, migração ou backfill, benchmark pago, envio real de WhatsApp nem chamada paga deliberada ao Gemini. Se algum passo depender disso, deixe instruções reproduzíveis e registre a limitação; continue todo o trabalho local possível.

## Corrija estes achados

### 1. Orçamento e reservas distribuídas — prioridade crítica

Em `functions/ai/budget.js`, faça o teto diário global do projeto funcionar também no caminho normal com Firestore, não apenas no fallback em memória. A reserva por usuário e por projeto deve ser atômica, consistente sob concorrência e idempotente. Persista a identidade e o estado da reserva no Firestore para que instâncias diferentes ou reiniciadas possam reconciliar/liberar a mesma reserva sem dupla contagem. Não dependa de `Map` em memória como fonte de verdade em produção. Trate falhas após reserva, após chamada ao provedor e antes da reconciliação. Não assuma consumo zero quando o resultado da chamada falha sem informar uso.

Inclua testes com Firestore/emulador ou transações simuladas que cubram concorrência entre usuários, limite por usuário, teto global, reconciliação duplicada, liberação duplicada e reinício/troca de instância. Documente qualquer limite operacional que não possa ser estrito.

### 2. Download de imagens e SSRF — prioridade crítica

Em `functions/ai/handlers.js`, feche o acesso a IPv6 local/privado, IPv4 mapeado em IPv6, formas alternativas de IP e redirecionamentos. Prefira uma allowlist de origens realmente usadas pelo produto (Firebase Storage/CDN configurados) a uma denylist incompleta. Valide protocolo, hostname, porta e destino efetivo conforme necessário para impedir acesso a metadata e redes internas. Não confie apenas na validação textual do hostname.

Imponha o limite de bytes durante a leitura do stream, antes de acumular ou converter o corpo todo em memória. Trate Content-Length ausente/falso, timeout, MIME, resposta vazia e cancelamento do stream. Preserve as origens legítimas existentes.

Adicione testes para loopback e faixas IPv4/IPv6 privadas, IPv4 mapeado, hostname local/interno, URL inválida, redirecionamento, Content-Length ausente ou falso, corpo acima do limite, MIME proibido e URL legítima de Storage. Os testes não podem acessar rede externa.

### 3. Consultas operacionais sem truncamento silencioso

Revise `functions/ai/repositories.js`. Pedidos, clientes, insumos, produtos e galeria não podem ser tratados como conjunto completo depois de `limit()` sem paginação. Preserve rigorosamente o escopo e os vínculos de autorização existentes, deduplique registros consultados por vínculos múltiplos e não transforme falha do Firestore em lista vazia ou total aparentemente completo.

Implemente paginação/cursor no escopo autorizado. Para agregados, percorra todas as páginas ou use agregação confiável. Se houver limite operacional de custo/tempo, retorne e propague indicação explícita de parcialidade e não rotule a amostra como total. Evite varrer coleções inteiras desnecessariamente: filtre no Firestore e carregue só os campos necessários. Considere custo de leitura e latência.

Inclua testes com registros relevantes depois dos limites atuais e em cada vínculo permitido, dados duplicados, falha de consulta e paginação. Confirme que nenhum usuário obtém dados de outro usuário.

### 4. Painel e telemetria honestos

Em `functions/ai/usage.js`, remova status `ONLINE`/HTTP 200 fictícios e cotas fixas sem fonte configurada/confirmada. Diferencie consumo observado, limite configurado e estado desconhecido. Falha ao consultar Firestore deve ser exibida como indisponibilidade, não zero consumo. Agregue por modelo apenas quando os registros sustentarem esse dado; não mostre zero inventado para modelo sem métrica.

Passe `reasoningTokens` até `recordAiUsage` em todos os handlers. Registre tentativas, modelo efetivamente chamado, falhas, tokens disponíveis, duração e custo por tentativa sem duplicar contagens. Quando o provedor não fornecer uso após uma falha, marque consumo como desconhecido e aplique uma política conservadora documentada ao orçamento. Não invente precisão de custo.

Teste agregação diária/mensal, fuso e fronteiras, falha de leitura, modelo sem dados, fallback/retries, tokens de raciocínio e uso desconhecido.

### 5. Um único resultado de preço para item e lote

Revise `functions/ai/pricing/pricingCalculator.js` e o handler/frontend que consomem o resultado. Use a mesma regra de arredondamento para `unitPrice`, `totalPrice`, cards e resposta da IA. Elimine a divergência reproduzida de R$ 31,00 versus R$ 31,04 para setup 30 e quantidade 10. Não esconda diferença por arredondamento no texto: escolha e documente a regra comercial e faça todos os consumidores usarem o mesmo resultado do tier.

Preserve configurações de precificação já existentes. Não altere preços padrão ou adivinhe custos de material sem indicar que são estimativas. Adicione testes de centavos para quantidades 1, 10, 20, 30, 50 e 100, setup, materiais, taxas e arredondamentos de borda.

## Regras para implementação

- Antes de cada alteração, confirme o comportamento atual com código e um teste que reproduza o defeito, quando viável.
- Faça mudanças pequenas e alinhadas aos módulos atuais; não reescreva a arquitetura inteira para corrigir estes itens.
- Preserve nomes, envelopes e contratos dos callables e formatos de resposta usados pela interface, salvo se criar adaptação retrocompatível e testada.
- Mantenha aprovação humana para envio de mensagens e gravações de negócio. A IA não deve executar ações externas por conta própria.
- Nunca reduza autorização, escopo de dados, limites de segurança ou validação para fazer testes passarem.
- Evite novas dependências pagas ou serviços externos. Se forem tecnicamente indispensáveis, não os adote sem autorização; apresente custo, alternativa e motivo no relatório.
- Não altere cache de respostas dinâmicas para melhorar velocidade. Não use cache para contornar paginação ou autorização.
- Atualize documentação operacional e comentários para refletirem comportamento real. Corrija alegações anteriores de “resolvido” que não forem comprovadas.

## Validação obrigatória

Execute e registre, quando aplicável:

```bash
npm run typecheck
npm run test:unit
npm run test:integration
npm run build
node --check functions/index.js
node --check functions/ai/budget.js
node --check functions/ai/handlers.js
node --check functions/ai/repositories.js
node --check functions/ai/usage.js
git diff --check
```

Use os emuladores e comandos já configurados no projeto. Não faça testes que gastem dinheiro ou enviem mensagens. Se uma validação não puder rodar, informe comando, bloqueio e o que ficou sem cobertura. Faça uma revisão final dos diffs, da autorização, dos contratos e do `git status`; confirme que mudanças preexistentes foram preservadas.

## Entrega

Atualize `docs/RESULTADO_IMPLEMENTACAO_IA.md` sem apagar o histórico útil. Acrescente uma seção para esta rodada contendo:

1. Branch e HEAD de base, arquivos alterados e justificativa.
2. Para cada um dos cinco itens acima: corrigido, parcial ou pendente, com evidência concreta.
3. Testes executados, resultados, quantidade de testes e limitações.
4. Efeito esperado em segurança, completude, latência e custo; não alegue ganhos medidos sem benchmark real.
5. Riscos residuais, operações externas não realizadas e próximos passos.

Ao concluir, responda em português com resumo objetivo, arquivos principais e resultados dos testes. Não declare o trabalho concluído se algum item crítico estiver pendente; explique exatamente o que bloqueou e deixe o restante pronto para revisão.
