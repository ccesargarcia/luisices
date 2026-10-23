# Changelog

Histórico das mudanças do Luisices, organizado por entrega e pelo efeito para quem usa o sistema. Datas no formato `AAAA-MM-DD`, considerando o horário de São Paulo.

O registro começou em 12/10/2026 com as entregas recentes verificadas em produção. A versão `1.0.5` corresponde ao valor atual de `package.json`.

## Não lançado

### Alterado

- Links públicos de acompanhamento agora têm ciclo de vida gerenciado por pedido, com listagem, cópia, revogação e exclusão; endpoints e limites de publicação estão documentados no backend.
- Fortalecidas as validações de pedidos, pagamentos, etiquetas e conversão de orçamentos, com ajustes correspondentes nas regras do Firestore e na integração com o emulador.
- Unificados cálculos de preços e pagamentos entre as telas, orçamento e backend, preservando centavos e registrando ajustes de pagamento no histórico.
- Melhoradas as respostas do Copiloto e a entrada de valores monetários locais pela integração MCP.
- Endurecida a proteção dos endpoints de acompanhamento público com secret de criptografia e regra de rate limit WAF.
- O checkout da loja valida o pedido mínimo e calcula valores em centavos no backend; a vitrine recebe apenas campos públicos e os limites de quantidade ficam consistentes entre tela e servidor.
- Atualizados os guias de CI e testes para refletir a execução atual com emuladores e a seleção de fluxos no GitHub Actions.
- O deploy de produção ignora alterações isoladas em arquivos Markdown e texto na raiz do repositório.

### Removido

- Guias operacionais obsoletos, uma cópia redundante do guia de design e um arquivo temporário de avaliação fora da documentação do produto.

## v1.0.5 — 2026-10-20

### Adicionado

- Suíte de compatibilidade do backend com o Admin SDK real em emuladores locais, incluindo operações entre serviços, contratos das Functions e respostas HTTP; execução manual disponível no GitHub Actions.
- Suporte a arquivo de segredos locais do emulador (`functions/.secret.local.example`) para inicialização limpa do Functions Emulator sem dependência externa do Google Cloud Secret Manager.

### Segurança

- Otimização das regras de validação do Firestore (`firestore.rules`) para suportar pedidos com até 20 etiquetas sem ultrapassar o limite estrito de 1.000 nós CEL da Google Cloud, com verificação de itens estruturados, imutabilidade de campos críticos e concorrência estrita via `version`.
- Isolamento do secret `SUPERFRETE_SANDBOX_TOKEN` exclusivamente ao ambiente de desenvolvimento (`luisices-dev`) e emuladores, blindando o pipeline de deploy de produção contra erros de chaves ausentes.
- Migração do backend para Firebase Admin 14.5.0 e Firebase Functions 7.4.0, mantendo Node 22 e os contratos de dados, autorização e triggers, com validação nos emuladores.
- Atualizações das dependências de processamento de requisições, transporte de dados e imagens, com testes de compatibilidade em Node 22.
- Atualização de `proxy-addr` de 2.0.7 para 2.0.8 no backend, com testes de compatibilidade do processamento de endereços de rede.

### Corrigido

- Fallback resiliente nos workflows de publicação de regras (`deploy-dev.yml` e `deploy.yml`) para publicação de Firestore e Storage mesmo caso as regras de Realtime Database encontrem indisponibilidade de instância.
- Correção de conformidade RFC 8259 em `database.rules.json`, eliminando comentários incompatíveis com o verificador de sintaxe da CLI do Firebase.
- Detecção e fallback seguro para ambientes sem DOM/Canvas no otimizador de imagens client-side (`src/app/utils/imageOptimizer.ts`), prevenindo falhas de `Image is not defined` durante a execução de testes em Node.js/Vitest.
- Mock de paridade para `getDocsFromServer` e `getDocFromServer` em testes unitários (`tests/unit/users-and-invites.test.ts`).

### Removido

- Dependências de desenvolvimento sem uso (`vite-plugin-html` e `firebase-functions-test`).
- Documentação operacional da Cloudflare, especificação Alexa e relatório interno de segurança da importação da documentação pública.

### Alterado

- Separação da validação de entradas, formatação de respostas e escolha da próxima pergunta do diálogo em módulos próprios, preservando sua interface pública.
- Índice e links dos guias atualizados após a limpeza da documentação.

## v1.0.4 — 2026-10-12

### Adicionado

- Importação de pedidos por planilhas Excel e CSV, com prévia, cadastro automático de clientes e acompanhamento da execução.
- Edição dos campos e seleção dos pedidos antes de confirmar a importação.
- Resultado da importação com detalhes de falha por linha, etapa e código do erro, acessíveis também pelo celular.

### Alterado

- Publicação do site de produção por arquivos enviados diretamente ao GitHub Pages pelo GitHub Actions, dispensando a branch `gh-pages`.
- Publicação das regras do Firestore junto com o pipeline de produção.

### Corrigido

- Cabeçalho no celular, com ações secundárias agrupadas para manter o layout compacto.
- Ações de seleção de e-mails em painéis estreitos, evitando que o botão de excluir seja cortado.
- Exibição de e-mails HTML isolada do layout da aplicação e ajuste de altura para melhorar a rolagem.
- Modal de importação com fundo opaco, prévia em cartões no celular e ações acessíveis em telas menores.
- Fechamento involuntário do modal após importação parcial, que escondia os motivos das falhas.
- Recusa de pedidos válidos por excesso de avaliação das regras do Firestore, mantendo suporte a até 20 etiquetas por pedido.

### Segurança

- Validação da importação também no backend: permissões, campos obrigatórios, limites de valores, datas, pagamentos, etiquetas e vínculo de clientes.
- Limites de tamanho e quantidade de linhas de planilhas, validação de formatos e atualização da dependência de leitura de Excel.

---

Para registrar novas mudanças e preparar versões, consulte o [guia de changelog e releases](docs/CHANGELOG_E_RELEASES.md).
