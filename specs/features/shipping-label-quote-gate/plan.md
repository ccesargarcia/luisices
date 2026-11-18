# Plano de implementação — shipping-label-quote-gate

## Abordagem

Associar as opções cotadas a uma chave composta pelos CEPs de origem/destino e dimensões. Ao iniciar ou invalidar a cotação, limpar a chave e as opções para que dados antigos não habilitem a emissão. Considerar válida apenas a opção selecionada na resposta correspondente à chave atual, com preço finito e positivo. Repetir a validação no handler antes de qualquer chamada de criação de etiqueta.

## Componentes existentes

| Área | Arquivos/módulos atuais | Alteração proposta |
|---|---|---|
| Diálogo de emissão | `src/app/components/shipping/SuperfreteGenerateLabelDialog.tsx` | Estado da chave da cotação, invalidação, validação da emissão, texto de status e botão final desabilitado |
| Guia de funcionalidades | `docs/FUNCIONALIDADES.md` | Documentar a condição de habilitação |
| Catálogo de specs | `specs/features/README.md` | Listar a mudança |

## Contratos, dados e compatibilidade

- Contratos/API/schema: sem alterações.
- Dados/migração: estado exclusivamente local e efêmero; nenhuma migração.
- Integrações/ambientes: chamada de cotação existente; sem deploy ou mudança de ambiente autorizados nesta tarefa.

## Segurança e integridade

- Autorização e ownership: manter verificações já existentes no backend.
- Validação/redação/limites: nunca tratar o botão desabilitado como controle de autorização; validar novamente antes da chamada.
- Transações/idempotência/valores: sem alteração; exige preço numérico finito e maior que zero.
- Ameaças/casos de abuso: não permitir reaproveitamento acidental de cotação após mudança de endereço ou dimensões; backend continua responsável por acesso autorizado.

## UX e documentação

- UI/acessibilidade/design system: manter Button existente, tokens semânticos e informar por texto por que a emissão está bloqueada.
- Documentação/specs existentes revisadas: `docs/FUNCIONALIDADES.md`, `specs/features/orders-beta-gateway/spec.md`, `docs/VERCEL_BETA_ROUTING.md`.
- Documentação viva a atualizar: `docs/FUNCIONALIDADES.md` e catálogo de specs.
- Índices, exemplos, comandos e links a conferir: link da nova spec em `specs/features/README.md`.
- Copiloto (Gemini): sem impacto; a alteração é somente no diálogo administrativo de emissão.
- MCP/ChatGPT: sem impacto; não muda schema, ferramentas, autorização ou contrato.
- Compatibilidade/paridade entre Copiloto e MCP: manter os canais inalterados.

## Validação e riscos

- Typecheck: `npm run typecheck`.
- Testes/validações específicas: revisão do diff e `git diff --check`; não há alterações backend.
- Risco e mitigação: cotação antiga poderia ser usada por atraso de render; a chave corrente impede isso e o handler verifica novamente.

## Reversão

Reverter o estado e a condição no componente, e restaurar a descrição anterior no guia. Nenhuma alteração persistida ou de infraestrutura precisa de reversão.
