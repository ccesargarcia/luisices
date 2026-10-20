# Changelog e releases

O [CHANGELOG.md](../CHANGELOG.md) é o histórico oficial de entregas do Luisices. Registre mudanças relevantes para usuários, operação e segurança; use uma frase que descreva o comportamento final, sem copiar a lista de commits.

## Durante o desenvolvimento

1. Atualize a seção **Não lançado** no mesmo commit ou PR da mudança na `develop`.
2. Use as categorias **Adicionado**, **Alterado**, **Corrigido**, **Removido**, **Segurança** ou **Obsoleto**, conforme necessário. Omita categorias vazias.
3. Não registre credenciais, dados reais de clientes, logs de depuração ou detalhes que ensinem a explorar vulnerabilidades.

Quando surgir a primeira mudança futura, substitua o texto “Ainda sem mudanças registradas para a próxima entrega” pelos itens correspondentes.

## Ao preparar uma entrega

1. Escolha a versão e mova os itens de **Não lançado** para uma seção `## vX.Y.Z — AAAA-MM-DD`, em ordem da mais recente para a mais antiga.
2. Mantenha **Não lançado** no topo para o próximo ciclo. A data deve corresponder à entrega, no horário de São Paulo.
3. Publique o changelog com a mudança na `main`, acompanhe o deploy e valide o resultado.
4. Crie uma tag anotada no commit efetivamente entregue, usando o mesmo nome da versão, e publique-a no GitHub.
5. Crie uma Release associada à tag e use os itens daquela versão como notas da entrega.

O projeto declara atualmente a versão `1.0.5` em `package.json`, e o changelog registra as entregas a partir de `v1.0.4`, sem reconstruir todo o histórico anterior. Antes de criar uma tag, confirme a versão no `package.json`, a seção correspondente no changelog e o commit efetivamente publicado. Nas entregas seguintes, mantenha os três alinhados e preserve as tags já publicadas.

## Convenção de versões

| Tipo de mudança | Incremento | Exemplo |
|---|---|---|
| Correção compatível | PATCH | `v1.0.0` → `v1.0.1` |
| Nova funcionalidade compatível | MINOR | `v1.0.1` → `v1.1.0` |
| Mudança incompatível de contrato, integração ou dados | MAJOR | `v1.1.0` → `v2.0.0` |

Uma tag identifica o commit de uma entrega. Preserve as tags publicadas: uma nova correção deve receber outra versão. Se o deploy falhar, não apresente a versão como entregue; corrija o pipeline e confirme a publicação antes de criar a tag e a Release.

## Relação com o deploy

- `develop` continua sendo a branch de desenvolvimento; `main`, a de produção.
- Tags e Releases não acionam o deploy atual. A publicação depende dos workflows de `main` e `develop`.
- Alterações apenas no changelog e na documentação não acionam o deploy automático pelos filtros atuais dos pipelines.
- Registrar uma versão não reverte produção. Uma reversão exige preparar e publicar uma mudança apropriada; banco e regras precisam ser considerados separadamente do frontend.
