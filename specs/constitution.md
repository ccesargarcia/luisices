# Constituição das especificações Luisices

Estas regras orientam novas specs e planos. Complementam `AGENTS.md`; não substituem skills e guias técnicos existentes.

## Produto e stack

- Luisices é uma aplicação de gestão de ateliê e papelaria personalizada. Stack e domínios vigentes estão em `README.md` e `docs/DEPENDENCIAS_E_ARQUITETURA.md`.
- Preserve módulos e limites existentes. Propostas de reorganização arquitetural precisam justificar benefício e custo de migração.
- Mudanças de interface seguem `design.md`, tokens semânticos e a skill `luisices-design-system`.

## Segurança e dados

- Toda operação deve explicitar ator, tenant/ownership, papel e permissões aplicáveis. O frontend não substitui autorização no backend ou nas regras.
- Specs que envolvam dados pessoais, acesso, Rules, Functions, Storage, OAuth/MCP, endpoints públicos ou IA devem registrar fronteiras de confiança, validação, minimização/redação, falhas e testes de abuso pertinentes.
- Operações financeiras preservam cálculo em centavos, integridade transacional entre pedidos e ledger e idempotência conforme documentos e skills existentes. Não inferir caixa recebido a partir de volume emitido.
- Mudanças em contrato público identificam clientes, schemas, aliases, compatibilidade e estratégia de transição.
- Segredos, credenciais, dados reais de clientes e informações privadas de operação não pertencem a specs versionadas.

## Qualidade e entrega

- Critérios de aceitação descrevem resultados observáveis e verificáveis, incluindo negações e falhas importantes.
- Mudanças de UI, backend, regras e integrações indicam validações adequadas ao risco, consultando a skill do domínio.
- `npm run typecheck` é obrigatório conforme `AGENTS.md`. Não declarar testes ou validações que não foram executados.
- Deploy, publicação, commit, migração de dados e alterações em produção são ações separadas; uma spec não as autoriza por si só.
- Atualize documentação viva do módulo quando mudar comportamento, contratos, dados ou permissões.
