# Documentação do Luisices

Revisão: **10/10/2026**, base de código `develop` / `b2b6ef9`.

## Guias atuais

| Guia | Quando consultar |
|---|---|
| [Funcionalidades](FUNCIONALIDADES.md) | Módulos, jornadas, separação entre catálogo interno e loja, limites operacionais |
| [Arquitetura](DEPENDENCIAS_E_ARQUITETURA.md) | Entrypoints, domínios, dados, integrações e publicação |
| [Copiloto de IA](COPILOTO_IA.md) | Nove ferramentas existentes, proposta de system prompt, custo e evoluções priorizadas |
| [Backend](../functions/README.md) | Exportações de Functions, configuração e validação |
| [E-mail](RECUPERACAO_ENVIO_EMAIL.md) | Idempotência, recuperação de envio e janela de repetição |
| [Sessões](SEGURANCA_DESCONEXAO_DISPOSITIVOS.md) | Diferença entre desconexão individual e revogação global |
| [WhatsApp](ISOLAMENTO_WHATSAPP_PARCEIROS.md) | Modelo de propriedade das conversas e compatibilidade |
| [Resumos financeiros](INTEGRIDADE_ROLLUPS_FINANCEIROS.md) | Escopo e significado das métricas mensais |
| [Histórico dos clientes](METRICAS_CLIENTES_LEDGER.md) | Uso do ledger e limites da tela operacional |
| [Galeria do cliente](PAGINACAO_GALERIA_CLIENTE.md) | Paginação e tratamento de registros legados |

## Referências de implementação

[Arquitetura de sessões](ARQUITETURA_SINCRONIZACAO_SESSOES.md),
[presença RTDB](CORRECAO_PRESENCA_RTDB.md),
[sincronização e custo](ANALISE_CUSTOS_E_OBSERVABILIDADE_SINCRONIZACAO.md),
[especificação Alexa](ESPECIFICACAO_ALEXA_ANTIGRAVITY.md) e
[voz/APL](ANALISE_ALEXA_VOZ_E_APL.md) preservam decisões de implementação.
Planos e especificações não comprovam por si só que uma configuração esteja ativa. Para contratos executáveis, confira os arquivos de código citados nos guias atuais.

## Manutenção

- Atualize o guia do módulo ao alterar contratos, autorização, fonte dos dados ou semântica de valores.
- Registre separadamente **existente**, **proposto** e **validado no ambiente**.
- Versões exatas de dependências pertencem aos lockfiles; evite listas manuais que envelhecem.
- Use exemplos fictícios, links relativos e nomes de parâmetros. Mantenha credenciais, dados de clientes e evidências sensíveis fora da documentação pública.
- Uma nova instrução de IA não cria uma ferramenta, uma permissão ou uma garantia transacional.
