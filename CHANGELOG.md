# Changelog

Histórico das mudanças do Luisices, organizado por entrega e pelo efeito para quem usa o sistema. Datas no formato `AAAA-MM-DD`, considerando o horário de São Paulo.

O registro começou em 12/10/2026 com as entregas recentes verificadas em produção. A versão `1.0.4` corresponde ao valor atual de `package.json`; ainda não há uma tag associada a este registro.

## Não lançado

### Segurança

- Atualização de `proxy-addr` de 2.0.7 para 2.0.8 no backend, com testes de compatibilidade do processamento de endereços de rede.

### Removido

- Documentação operacional da Cloudflare, especificação Alexa e relatório interno de segurança da importação da documentação pública.

### Alterado

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
