# Diagnóstico e resiliência do fallback Beta → GCP

## Contexto

Eventos de fallback em `usersAdmin` e `orderTrackingAdmin` não contêm informação suficiente para separar falha da Vercel, falha no GCP e erro de transporte. Em 18/11/2026, o GCP registrou HTTP 500 em `createSuperfreteLabel` com `Unknown error code: payment-required`. A lista do painel também exibia somente dez itens, apesar de manter uma contagem maior.

## Objetivo

Melhorar a classificação de falhas do provedor SuperFrete e tornar a telemetria existente do fallback útil para diagnóstico sem registrar payloads, credenciais ou dados pessoais.

## Requisitos

- **RF-1:** erros HTTP da SuperFrete devem ser convertidos apenas para códigos válidos de Cloud Functions; códigos externos, como `payment-required`, nunca devem ser repassados como códigos Firebase.
- **RF-2:** erros de indisponibilidade, timeout, limite do provedor e rejeição de dados devem manter classificação compatível com seu tipo e status HTTP.
- **RF-3:** eventos do fallback devem identificar rota e operação, resumir separadamente o erro Beta e o erro GCP, e registrar a duração sem armazenar mensagens, payloads, tokens ou PII.
- **RF-4:** a tela deve exibir todos os eventos retidos (até o limite atual de 50), não apenas os dez mais recentes.
- **RF-5:** manter contratos de ações, autorização, idempotência e roteamento atuais.

## Restrições

- Não alterar nem publicar `api.dev.luisices.com.br`, `cloudflare/api-worker/` ou recursos de produção.
- Não realizar teste que emita/pague etiqueta SuperFrete; validar erros com testes isolados e cotação sem cobrança.
- Não adicionar logs com dados de clientes, corpos de requisição ou credenciais.
- O Copiloto (Gemini) e o MCP/ChatGPT não são afetados: não há mudança em prompts, ferramentas, schemas, scopes ou dados disponíveis.

## Plano por etapas

1. Normalizar status e códigos externos da SuperFrete para códigos suportados pelo Firebase e cobrir casos de 402, 429, 5xx e timeout.
2. Expandir telemetria de fallback com operação, resumos seguros dos erros Beta/GCP e duração; preservar leitura de eventos antigos.
3. Mostrar a lista inteira dos eventos retidos no painel, respeitando o padrão visual e acessibilidade existentes.
4. Executar typecheck, testes focados, lint de Functions e revisão documental; confirmar que não houve alteração em `api.dev`/produção.

## Critérios de aceite

- Um código externo `payment-required` não causa erro do construtor `HttpsError`.
- Falhas Beta e GCP aparecem separadamente, com identificadores de operação e sem mensagens arbitrárias/payloads.
- Eventos legados continuam visíveis e todos os eventos atuais retidos podem ser consultados na tela.
- Typecheck, testes focados e lint de Functions passam.
- Nenhuma alteração ou publicação no Worker `api.dev` ou produção.

## Status e evidências

- Implementada e validada localmente; não publicada.
- Typecheck aprovado; 66 testes focados em 7 arquivos aprovados; lint verificou 108 arquivos JavaScript das Functions; `git diff --check` aprovado.
- Nenhum teste de emissão/checkout de etiqueta foi executado. Nenhuma operação real foi enviada à SuperFrete.
- `api.dev`, Workers Cloudflare e produção não foram alterados nem publicados.
