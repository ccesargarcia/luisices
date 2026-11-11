# Auditoria de segurança local no GitHub Actions

O workflow `security_audit_local.yml` é manual. A inferência usa somente localhost
nos runners Ubuntu 24.04 padrão, sem GPU e sem API externa. O planejamento e os
relatórios usam Python 3.11+ sem dependências adicionais.

## Execução

1. Execute com `mode=benchmark`, `max_runners=20`. São 24 casos sintéticos
   (12 vulneráveis e 12 controles), repetidos duas vezes por modelo. Os nomes dos
   arquivos apresentados ao modelo não revelam o resultado esperado.
2. Consulte `benchmark-recommendation`: cada candidato deve detectar pelo menos
   10 vulnerabilidades em cada rodada, sem falso achado alto/crítico nos controles
   e sem falhas técnicas. Vence o menor tempo somado de inferência; dentro de 10%
   do mais rápido, vence o maior número de acertos. O benchmark é uma amostra
   pequena, não uma certificação de segurança nem uma comparação geral de modelos.
3. Revise a evidência, versione `selected_model` em `config.json` com uma das chaves
   aprovadas e copie o JSON de recomendação completo para `selection_evidence`. Essa mudança
   não é feita pelo workflow. Sem seleção, o modo auditoria falha antes de baixar pesos.
4. Execute `mode=auditoria`, primeiro com `target=cloudflare_workers`, depois `todos`.

Há até 20 jobs de inferência, limitados também às vagas da conta GitHub. No
benchmark, até dez lotes por modelo; na auditoria, até vinte lotes do modelo escolhido.
Os lotes são equilibrados por tokens de entrada mais a reserva de saída. Um lote
executa uma solicitação de cada vez. Outros workflows podem ocupar vagas: o teto
não é garantia de início simultâneo ou de duração total.

O script cria um manifesto com código, linhas, hashes e divisão dos lotes usando
`/apply-template` e `/tokenize` do servidor fixado. Cada solicitação reserva 1.200
tokens de saída e margem de 256 em um contexto de 8.192 tokens. Entradas grandes
possuem sobreposição de até vinte linhas e cabeçalhos/imports limitados a 2.500
caracteres. Não há execução do código auditado nem descoberta recursiva de dependências.
Essa limitação pode impedir a confirmação de falhas entre arquivos.

Cada lote dispõe de cinquenta minutos para inferência e sessenta minutos de job.
Timeout por chamada: 240 segundos. Há no máximo uma repetição para conexão ou
HTTP 429/503; timeouts, respostas inválidas e truncamento não são repetidos.
Três falhas consecutivas interrompem o lote com cobertura incompleta.

## Resultados e bloqueios

Cada trecho atualiza `result.json` e `result.md` atomicamente. O lote publica
manifesto, resultados, métricas e `llama-server.log`, com retenção de 14 dias.
JSON guarda a resposta validada e uso de tokens; os logs do servidor contêm tempos
de inferência. Cancelamento forçado pode impedir o upload, portanto a consolidação
sempre verifica os lotes esperados e trata artefatos ausentes como falha.

A consolidação deduplica por arquivo, categoria e evidência normalizada; a maior
severidade prevalece. Achados incluem evidência literal validada contra as linhas
analisadas. Essa validação não comprova o impacto atribuído pelo modelo.

Códigos do consolidado: `0` completo sem bloqueio; `2` falha técnica/cobertura
incompleta; `3` achado alto/crítico não excepcionado. No benchmark, os achados
sintéticos não são um bloqueio de produção; a seleção aplica os critérios próprios.
O job reprovado não altera configurações de branches, deploys ou permissões.

Exceções ficam em `exceptions.json`. Copie o fingerprint do relatório, adicione
justificativa e validade ISO (`YYYY-MM-DD`):

```json
{
  "version": 1,
  "exceptions": [{
    "fingerprint": "<sha256 mostrado no relatório>",
    "justification": "Evidência e motivo da revisão humana",
    "expires": "2027-01-01"
  }]
}
```

A validade inclui o dia indicado em UTC. Exceções expiradas são registradas mas
não suprimem o bloqueio. Arquivo malformado reprova a consolidação.
Não se deve criar exceções para fazer o benchmark passar.

Modelos e servidor têm revisão e checksum fixos em `config.json`. O job de
preparação baixa os pesos com verificação e prepara o cache antes da matriz.
Cada runner recebe uma cópia: memória e downloads não são compartilhados. O
servidor tem cache separado e é distribuído como artefato da execução, somente com
binários/bibliotecas e marcador de versão. Cache de pesos ausente ou inválido pode
ser reconstruído pelo download fixado, sem depender da permanência do cache.
A soma aproximada dos pesos de ambos os modelos é 7,2 GB, além do servidor.

Não há retomada automática entre execuções. Os resultados parciais servem para
investigação; nova execução cria um novo manifesto. Mudança de modelo, prompt,
quantização ou servidor exige repetir o benchmark antes de promover a configuração.

## Validação local

```sh
python3 -m unittest discover -s tests/security_audit -v
npm run typecheck
actionlint -shellcheck= -pyflakes= .github/workflows/security_audit_local.yml
```

Nenhum teste local exige carregar um modelo. O modo benchmark é a validação real
no hardware do GitHub; não substituir os resultados dele por respostas simuladas.

## Validação real em 11/11/2026

A [execução com vinte lotes](https://github.com/ccesargarcia/luisices/actions/runs/43110105271)
carregou ambos os modelos e preservou os relatórios. Nenhum candidato foi aprovado:

| Modelo | Acertos em cada rodada (categoria e severidade esperadas) | Falsos positivos altos/críticos em cada rodada | Execução das respostas |
| --- | --- | --- | --- |
| Qwen3 4B | 3/12 | 5/12 controles seguros | Houve evidências incompatíveis com as linhas citadas |
| Qwen2.5-Coder 7B | 7/12 | 2/12 controles seguros | Todas as 48 respostas passaram na validação estrutural |

As rodadas foram determinísticas, com temperatura zero e seed fixo. Estes números
medem somente esta amostra e seu verificador; não são uma estimativa de precisão
em qualquer repositório. Ambos também falharam no requisito independente de zero
falsos positivos graves, suficiente para impedir a promoção.

`selected_model` e `selection_evidence` permanecem nulos. O piloto com Workers e
a varredura completa dependem de um candidato aprovado; não foram executados.
Não relaxar os critérios ou adicionar exceções para promover um modelo reprovado.
Uma próxima calibração de instruções ou troca de candidato exige repetir o benchmark.

A primeira tentativa encontrou um problema de carregamento das bibliotecas do
executável copiado. A inicialização foi corrigida para definir `LD_LIBRARY_PATH`,
e um teste de regressão cobre a distribuição dos binários. Respostas inválidas
passam a ser preservadas em `invalid_response`, sem publicá-las no console.
