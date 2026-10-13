# Análise de Custos, Otimizações e Observabilidade da Sincronização

## 1. Princípios de Eficiência Adotados
1. **Zero Polling e Zero Filas Pesadas**: O processamento é 100% sob demanda e reativo, disparado diretamente durante a mutação transacional do perfil ou no login via `AuthContext`, sem nenhum cron de polling e sem provisionamento de Cloud Tasks desnecessário.
2. **Reaproveitamento de Leituras**: Dentro da transação do Firestore, a verificação de permissões do perfil e a derivação da versão de sincronização ocorrem no mesmo documento, sem leituras duplicadas.
3. **Escrita Condicional**: `setCustomUserClaims` é chamado apenas quando há mutação efetiva de perfil (`needsClaims: true`) ou em reconciliação de divergência.
4. **Sem Instâncias Mínimas**: As Cloud Functions executam em modelo pay-per-use puro (`minInstances: 0`).

---

## 2. Comparativo Detalhado de Operações (Antes vs. Depois)

### Atualização Normal de Perfil (sem alteração de cargo/status)
- **Antes**:
  - Firestore (incompleto na análise anterior): 1 leitura de perfil, 1 leitura de admins, 1 update de perfil, 1 criação de auditoria, 1 leitura pós-transação, 1 update para limpar marker. (Total simplificado: ~3 a 4 leituras, 3 escritas).
  - Auth: 1 chamada a `setCustomUserClaims`.
  - RTDB: 0 chamadas.
  - **Problema**: Omitia leituras de autorização de admin, rate limit (`consumeAdminUserAction`), leitura da query de todos os admins (`where role == admin`), além de não garantir versionamento monotônico nem proteção contra concorrência tardia.
- **Depois (Contagem Completa e Auditada de Leituras e Escritas)**:
  - **Firestore**:
    1. Autorização/Rate Limit: 1 leitura de perfil do admin solicitante (se claims não em cache) + 1 leitura e 1 escrita de rate limit (`consumeAdminUserAction`).
    2. Transação de Perfil: 1 leitura do perfil alvo + N leituras de admins na query (`where('role', '==', 'admin')`, sendo N >= 1, tipicamente 1 a 3 docs) + 1 escrita no perfil (syncVersion + marker) + 1 escrita no log de auditoria.
    3. Fase 1 do Processador (`processUserSync`): 1 leitura transacional para aquisição de lease + 1 escrita de lease ativo (`status: 'processing'`).
    4. Fase 3 do Processador (Finalização): 1 leitura transacional de verificação de versão + 1 escrita de remoção do marker (`FieldValue.delete()`) e atualização de `syncedVersion`.
    - **Total Real no Caminho Feliz**: **(4 + N) leituras** (tipicamente 5 a 7 leituras) e **5 escritas**.
  - **Auth**: 1 chamada a `setCustomUserClaims`.
  - **RTDB**: 0 chamadas.
- **Conclusão**: O acréscimo operacional é mínimo (2 leituras e 2 escritas adicionadas pelo ciclo de lease/finalização transacional), proporcionando em contrapartida imunidade contra race conditions e reversão silenciosa de autorizações.

### Atualização com Mudança de Cargo ou Desativação (com revogação)
- **Antes**:
  - Firestore: Leituras e escritas sem contabilização de dispositivos ou rate limiting. Dispositivos cadastrados em `userProfiles/{uid}/devices` não eram limpos.
  - RTDB: 1 remoção em `status/`, 1 gravação em `revocations/`.
  - Auth: 1 `revokeRefreshTokens`, 1 `setCustomUserClaims`.
  - **Problemas**: Descrevia incorretamente chamadas concorrentes como atômicas, omitia a limpeza de dispositivos físicos no Firestore e não possuía recuperação de etapas parciais.
- **Depois (Contagem Completa e Semântica Distribuída Real)**:
  - **Firestore**:
    - As mesmas (4 + N) leituras e 5 escritas da atualização normal.
    - Mais: 1 consulta à subcoleção `devices` (retorna D documentos de dispositivos, onde D varia de 0 a 10) + D exclusões em batch (`batch.delete()`).
    - **Total Real**: **(5 + N + D) leituras** (tipicamente 6 a 9 leituras) e **(5 + D) escritas** (tipicamente 6 a 8 escritas).
  - **Realtime Database**:
    - 1 remoção em `status/{uid}` e 1 gravação em `revocations/{uid}` com o timestamp fixado do evento original de corte (`originalRevocationTimeMs`).
    - **Semântica Distribuída Real**: Essas chamadas são disparadas em paralelo via `Promise.all` para reduzir latência de rede, mas **NÃO constituem uma transação atômica distribuída (2PC)**. O Firebase RTDB e o Auth não compartilham transações. Portanto, a resiliência é garantida pelo rastreador `completedSteps` no `claimsSyncPending`: se o RTDB falhar após a remoção ou o Auth falhar posteriormente, o estado pendente persiste e um retry ou reparo retoma exclusivamente as etapas incompletas sem avançar o timestamp de revogação.
  - **Auth**: 1 `revokeRefreshTokens` + 1 `setCustomUserClaims`.
  - **Diferencial de Resiliência**: Em caso de falha externa em qualquer etapa, a pendência é preservada intacta (`needsRevocation: true`) com o timestamp original, e a reconciliação pós-escrita iterativa impede que workers concorrentes deixem claims obsoletas.

---

## 3. Estimativa de Volumes e Custos (Google Cloud / Firebase Pricing)

### Preços Oficiais de Referência (us-central1):
- **Firestore Reads**: $0.06 por 100.000 leituras
- **Firestore Writes**: $0.18 por 100.000 gravações
- **Firebase Auth**: Gratuito até 50.000 MAU (depois $0.0055/MAU). Operações de Admin SDK (`setCustomUserClaims`, `revokeRefreshTokens`) são gratuitas dentro das cotas de API.
- **Realtime Database**: Armazenamento $5.00/GB-mês, Tráfego de saída $1.00/GB. Um registro de revogação possui ~40 bytes.

### Cenário 1: 10 Usuários Ativos / Dia (~2 atualizações de cargo/mês)
- **Leituras Firestore**: ~15 leituras/mês (~$0.000009 USD)
- **Escritas Firestore**: ~18 escritas/mês (~$0.000032 USD)
- **Auth calls**: ~4 chamadas/mês ($0.00 USD)
- **RTDB Tráfego**: < 1 KB/mês ($0.00 USD)
- **Custo Total**: **<$0.0001 USD/mês** (100% coberto pelo Free Tier)

### Cenário 2: 100 Usuários Ativos / Dia (~20 atualizações de cargo/mês)
- **Leituras Firestore**: ~150 leituras/mês (~$0.00009 USD)
- **Escritas Firestore**: ~180 escritas/mês (~$0.00032 USD)
- **Auth calls**: ~40 chamadas/mês ($0.00 USD)
- **RTDB Tráfego**: < 10 KB/mês ($0.00 USD)
- **Custo Total**: **<$0.001 USD/mês** (100% coberto pelo Free Tier)

### Cenário 3: 1.000 Usuários Ativos / Dia (~200 atualizações de cargo/mês)
- **Leituras Firestore**: ~1.500 leituras/mês (~$0.0009 USD)
- **Escritas Firestore**: ~1.800 escritas/mês (~$0.0032 USD)
- **Auth calls**: ~400 chamadas/mês ($0.00 USD)
- **RTDB Tráfego**: < 100 KB/mês ($0.00 USD)
- **Custo Total**: **<$0.01 USD/mês** (100% coberto pelo Free Tier)

---

## 4. Métricas e Observabilidade Propostas

Para monitoramento de saúde do mecanismo sem overhead de infraestrutura:

1. **`sync.pending.count`**: Número de perfis com `claimsSyncPending != null`.
   - *Alerta saudável*: Próximo de zero. Picos temporários tolerados durante atualizações em lote.
2. **`sync.pending.oldest_age_seconds`**: Diferença entre `Date.now()` e `claimsSyncPending.updatedAt` para a pendência mais antiga.
   - *Limiar recomendado*: Alerta se superior a 15 minutos (indica falha persistente de rede ou bug externo).
3. **`sync.failures.by_step`**: Contagem de erros por etapa (`rtdb`, `auth_revocation`, `auth_claims`, `firestore_finalize`).
4. **`sync.reconciliation.divergences_detected`**: Contagem de vezes que a reconciliação pós-escrita detectou versão superior e corrigiu as claims.
   - Demonstra a efetividade do mecanismo de prevenção de race conditions.
5. **`sync.attempts_per_repair`**: Distribuição de tentativas até sucesso (esperado: 1 tentativa na grande maioria dos casos).
