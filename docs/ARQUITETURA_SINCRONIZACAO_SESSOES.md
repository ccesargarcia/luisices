# Arquitetura e Especificação de Sincronização e Segurança de Sessões

## 1. Visão Geral e Objetivos

Este documento especifica a arquitetura de sincronização resiliente de permissões, claims e sessões de usuários no sistema Luisices, substituindo marcadores legados insuficientes (`claimsSyncPending: true` ou `{ opId, needsRevocation }` sem versionamento monotônico).

### Objetivos Fundamentais:
1. **Convergência Monotônica**: Operações concorrentes ou fora de ordem jamais deixam permissões/claims antigas como estado final em nenhum provedor externo (Firebase Auth e Realtime Database).
2. **Preservação de Revogações**: Nenhuma revogação pendente é descartada por retries, atualizações concorrentes ou modificações cosméticas (ex: alteração de nome).
3. **Recuperabilidade de Falhas Parciais**: Se qualquer chamada externa falhar ou o processo sofrer interrupção inesperada, o estado pendente persiste e pode ser retomado deterministicamente.
4. **Custo Proporcional ao Uso**: Processamento reativo coordenado diretamente pelo Firestore, sem necessidade de filas pesadas (Cloud Tasks), sem polling e sem instâncias mínimas permanentes.
5. **Testabilidade Real**: Lógica desacoplada em serviço testável com injeção de dependências, permitindo testes unitários e de integração que executam o código real.

---

## 2. Schema de Sincronização Persistida e Versionada

### 2.1 Campos no Documento `userProfiles/{uid}`

| Campo | Tipo | Descrição |
| :--- | :--- | :--- |
| `syncVersion` | `number` | Revisão monotônica do perfil de segurança (inicia em 1, incrementada a cada mutação de autorização ou revogação). |
| `tokensValidAfterTime` | `number` | Barreira temporal estrita em **segundos inteiros**. Tokens com `auth_time <= tokensValidAfterTime` são rejeitados. Monotônico crescente. |
| `claimsSyncPending` | `SyncState \| null` | Objeto descritor do estado da sincronização pendente. Removido (`FieldValue.delete()`) apenas quando a versão desejada estiver 100% sincronizada. |

### 2.2 Estrutura de `claimsSyncPending` (`SyncState`)

```typescript
interface SyncState {
  /** Versão desejada da autorização correspondente ao syncVersion do perfil */
  version: number;

  /** Identificador único aleatório da operação (UUID / Firestore autoId) */
  opId: string;

  /** Estado atual do processamento */
  status: 'pending' | 'processing' | 'failed' | 'synced';

  /** Indica se há necessidade pendente de revogação de sessões (Auth/RTDB/devices) */
  needsRevocation: boolean;

  /** Indica se há necessidade pendente de sincronização de custom claims no Auth */
  needsClaims: boolean;

  /** Última versão que foi efetivamente confirmada e sincronizada nos serviços externos */
  syncedVersion: number;

  /** Resumo do último erro ocorrido, estritamente sanitizado (sem PII / segredos) */
  lastError: string | null;

  /** Contador de tentativas de processamento */
  attempts: number;

  /** Timestamp de registro ou última atualização do estado (milissegundos) */
  updatedAt: number;

  /** Lease transacional para evitar concorrência descontrolada entre workers */
  lease: {
    workerId: string;
    expiresAt: number; // Timestamp em milissegundos (now + LEASE_TTL_MS)
  } | null;
}
```

---

## 3. Comparativo de Arquitetura de Serialização

### Opção A: Processamento Coordenado por Firestore (Adotada)
- **Como funciona**:
  - Cada operação obtém direito de processamento (lease transacional com TTL curto, ex: 15s) no Firestore.
  - O worker lê o estado desejado mais recente do Firestore, executa as chamadas externas necessárias e, após o término, executa uma transação de finalização.
  - **Reconciliação Pós-Escrita**: Na finalização, o worker verifica se `current.syncVersion === marker.version`. Se uma operação mais recente tiver sido confirmada no Firestore durante as chamadas externas (Cenário A), o worker detecta a divergência e reconcilia imediatamente com a versão mais recente em vez de dar a tarefa por encerrada.
- **Vantagens**:
  - Custo zero adicional (não requer fila dedicada).
  - Sem polling (execução síncrona no retorno da callable, com fallback para auto-reparo no login/AuthContext).
  - Tolerante a crashes de workers através da expiração de lease.
  - Simplicidade operacional e zero dependências externas.

### Opção B: Fila Externa com Cloud Tasks
- **Como funciona**: A callable enfileira uma tarefa no Cloud Tasks para execução assíncrona com retries automáticos.
- **Por que NÃO foi adotada agora**:
  - O Cloud Tasks adiciona custos de invocação, latência perceptível para o usuário final durante alteração de permissões e exige infraestrutura de roteamento e autenticação de serviço a serviço.
  - O Firebase Auth ainda não participaria da transação, portanto o problema de divergência e reconciliação continuaria existindo na fila.
  - A Opção A resolve o problema de concorrência e resiliência com custos estritamente sob demanda.

---

## 4. Política de Revogação de Sessões

### 4.1 Quando a Revogação é Obrigatória:
- **Desativação de conta**: `active === false` (quando era ativa ou indefinida).
- **Alteração de cargo**: Mudança em `role` (ex: `admin` → `user`, `funcionario` → `user`, `admin` → `funcionario`).
- **Revogação explícita**: Solicitada por administrador via `revokeAllSessions`.
- **Pendência prévia**: Se uma operação anterior deixou `needsRevocation === true` não concluída.

### 4.2 Alterações Cosméticas (NÃO revogam sessões):
- Alteração exclusiva de `displayName`.
- Alteração de `permissions` secundárias que não alterem o cargo ou status de ativação (a menos que a política futura exija).
- Repetição do mesmo cargo e status já vigentes (sem alteração efetiva).
- **Importante**: Se uma alteração cosmética for executada enquanto `needsRevocation === true` estiver pendente no perfil, a pendência **deve ser preservada**, mas a barreira `tokensValidAfterTime` não é avançada novamente.

### 4.3 Barreiras Temporais e Unidades
- `tokensValidAfterTime` no Firestore: **segundos inteiros** (UNIX epoch).
- `revocations/{uid}` no Realtime Database: **milissegundos** (`Date.now()`).
- Comparação com `auth_time` (segundos):
  - No Firestore e Functions: `auth_time <= tokensValidAfterTime` resulta em rejeição.
  - No Realtime Database: `auth.token.auth_time * 1000 <= root.child('revocations').child(auth.uid).val()` resulta em rejeição.
  - **Monotonicidade**: `tokensValidAfterTime` só pode ser incrementado: `Math.max(current.tokensValidAfterTime || 0, nowSeconds)`.

---

## 5. Tratamento dos Cenários Críticos

### Cenário A: Operações Fora de Ordem
1. Admin 1 atualiza usuário para `admin` (Versão 1).
2. Admin 2 atualiza usuário para `user` (Versão 2).
3. Worker 2 conclui e grava claims `user`.
4. Worker 1 acorda tardiamente e grava claims `admin` no Firebase Auth.
5. **Mitigação**: O Worker 1 entra na transação de finalização do Firestore e constata que `current.syncVersion (2) > myVersion (1)`. O Worker 1 **detecta a divergência** e executa a reconciliação imediata, regravando as claims da versão 2 (`user`) no Firebase Auth. O estado final é garantidamente `user`.

### Cenário B: Perda de Revogação
1. Mudança de cargo gera `needsRevocation = true`.
2. Chamada ao RTDB ou Auth falha; erro é capturado e `claimsSyncPending.lastError` é salvo, preservando `needsRevocation = true`.
3. Admin edita apenas o nome (`displayName`).
4. **Mitigação**: A transação de `updateUserProfile` calcula `effectiveNeedsRevocation = isRoleOrActiveChanged || current.claimsSyncPending?.needsRevocation`. A pendência é preservada intacta na nova versão.

### Cenário C: Migração de Marcador Legado
1. Um perfil possui `claimsSyncPending: true`.
2. O reparo lê o marcador legado.
3. Simultaneamente, uma nova transação grava um marcador estruturado versão 2.
4. **Mitigação**: O reparo converte o marcador legado **dentro de uma transação condicional**. Se o Firestore já contiver um marcador estruturado ou versão superior, a transação não remove o marcador novo.

### Cenário D: Falha Pós Efeito Externo
1. A gravação no Firebase Auth tem sucesso.
2. A atualização final no Firestore falha (timeout de rede).
3. **Mitigação**: `claimsSyncPending` continua registrado no Firestore. Ao executar retry ou auto-reparo (`repairUserClaims`), o worker lê o estado do Firestore, constata as claims vigentes, atualiza o Firestore e finaliza a sincronização de forma convergente e idempotente.
