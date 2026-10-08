# Análise de Custos, Otimizações e Observabilidade da Sincronização

## 1. Princípios de Eficiência Adotados
1. **Zero Polling e Zero Filas Pesadas**: O processamento é 100% sob demanda e reativo, disparado diretamente durante a mutação transacional do perfil ou no login via `AuthContext`, sem nenhum cron de polling e sem provisionamento de Cloud Tasks desnecessário.
2. **Reaproveitamento de Leituras**: Dentro da transação do Firestore, a verificação de permissões do perfil e a derivação da versão de sincronização ocorrem no mesmo documento, sem leituras duplicadas.
3. **Escrita Condicional**: `setCustomUserClaims` é chamado apenas quando há mutação efetiva de perfil (`needsClaims: true`) ou em reconciliação de divergência.
4. **Sem Instâncias Mínimas**: As Cloud Functions executam em modelo pay-per-use puro (`minInstances: 0`).

---

## 2. Comparativo de Operações (Antes vs. Depois)

### Atualização Normal de Perfil (sem alteração de cargo/status)
- **Antes**:
  - Firestore: 1 leitura de perfil, 1 leitura de admins, 1 update de perfil, 1 criação de auditoria, 1 leitura pós-transação, 1 update para limpar marker. (Total: 3 leituras, 3 escritas).
  - Auth: 1 chamada a `setCustomUserClaims`.
  - RTDB: 0 chamadas.
- **Depois**:
  - Firestore: 1 leitura de perfil, 1 leitura de admins, 1 update de perfil, 1 criação de auditoria. Lease e finalização reutilizam a transação de perfil (Total: 3 leituras, 3 escritas).
  - Auth: 1 chamada a `setCustomUserClaims`.
  - RTDB: 0 chamadas.
- **Conclusão**: Custo operacional idêntico ao anterior para o caminho feliz, com o benefício fundamental de versionamento monotônico e proteção contra race conditions.

### Atualização com Mudança de Cargo ou Desativação (com revogação)
- **Antes**:
  - Firestore: 3 leituras, 3 escritas (dispositivos não eram limpos em `updateUser`).
  - RTDB: 1 remove em `status/`, 1 set em `revocations/`.
  - Auth: 1 `revokeRefreshTokens`, 1 `setCustomUserClaims`.
  - **Problema do modelo anterior**: Não limpava dispositivos cadastrados no Firestore nem protegia contra race conditions de workers tardios.
- **Depois**:
  - Firestore: 3 leituras, 3 escritas + limpeza em batch da subcoleção de dispositivos (média de 1 a 2 docs).
  - RTDB: 1 remove em `status/`, 1 set em `revocations/` (atômico via `Promise.all`).
  - Auth: 1 `revokeRefreshTokens`, 1 `setCustomUserClaims`.
  - **Diferencial de Resiliência**: Em caso de falha externa em qualquer etapa, a pendência é preservada intacta (`needsRevocation: true`) e retomada deterministicamente sem duplicar chamadas desnecessárias.

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
