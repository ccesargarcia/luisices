# 💾 Como Fazer Backup do Firestore (OBRIGATÓRIO)

## ⚠️ IMPORTANTE

**SEMPRE** faça backup antes de qualquer deploy em produção!

---

## 🎯 Método Recomendado: Export via Console

### Passo a Passo

1. **Acesse o Firebase Console**
   ```
   https://console.firebase.google.com
   ```

2. **Selecione o projeto de produção**
   - Clique em: `papelaria-dashboard`

3. **Vá para Firestore Database**
   - No menu lateral: `Firestore Database`

4. **Abra o menu de Import/Export**
   - Clique na aba: `Dados` (ou `Data`)
   - No topo, clique em: `Importar/Exportar` (ou `Import/Export`)

5. **Exportar dados**
   - Clique em: `Exportar`
   - Escolha destino:
     - **Cloud Storage bucket**: Selecione um bucket existente ou crie um novo
     - Sugestão de nome: `firestore-backups/backup-YYYY-MM-DD-HHmm`
   - Selecione: `Todas as coleções` (All collections)
   - Clique em: `Exportar` (Export)

6. **Aguarde a conclusão**
   - O processo pode levar alguns minutos
   - Você receberá uma notificação quando concluir
   - Verificar em: Cloud Storage > Buckets

---

## 📊 Método Alternativo: gcloud CLI

Se você tem o `gcloud` instalado:

```bash
# 1. Fazer login
gcloud auth login

# 2. Definir projeto
gcloud config set project papelaria-dashboard

# 3. Criar bucket (se não existir)
gsutil mb -l us-central1 gs://papelaria-dashboard-backups

# 4. Exportar Firestore
gcloud firestore export gs://papelaria-dashboard-backups/backup-$(date +%Y%m%d-%H%M%S)
```

---

## 🔍 Verificar o Backup

### Via Console
1. Acesse: Cloud Storage > Buckets
2. Navegue até a pasta do backup
3. Deve haver arquivos: `all_namespaces/`, `export_metadata`, etc.

### Via CLI
```bash
gsutil ls -r gs://papelaria-dashboard-backups/
```

---

## 📥 Restaurar Backup (Se necessário)

### Via Console
1. Firestore Database > Import/Export
2. Clique em: `Importar`
3. Selecione o caminho do backup no Cloud Storage
4. Confirme

⚠️ **ATENÇÃO**: A restauração **SOBRESCREVE** os dados atuais!

### Via CLI
```bash
gcloud firestore import gs://papelaria-dashboard-backups/backup-NOME-DO-BACKUP/
```

---

## 📅 Política de Backups Recomendada

### Backups Manuais
- ✅ Antes de cada deploy em produção
- ✅ Antes de mudanças significativas

### Backups Automáticos (Opcional)
Configure backups automáticos agendados via Cloud Scheduler:

```bash
# Criar schedule (diário às 3h da manhã)
gcloud scheduler jobs create http daily-firestore-backup \
  --schedule="0 3 * * *" \
  --uri="https://firestore.googleapis.com/v1/projects/papelaria-dashboard/databases/(default):exportDocuments" \
  --location=us-central1 \
  --message-body='{"outputUriPrefix":"gs://papelaria-dashboard-backups/scheduled-backup"}' \
  --oauth-service-account-email=PROJECT_ID@appspot.gserviceaccount.com
```

---

## 💰 Custos

### Armazenamento
- Cloud Storage: ~$0.02/GB/mês (região us-central1)
- Firestore pequeno (< 1GB): Centavos por mês

### Operações
- Export: Grátis (sem cobrança por operações de export)
- Import: Grátis (sem cobrança por operações de import)

**Estimativa para este projeto**: < $1/mês para backups diários

---

## 🗑️ Limpeza de Backups Antigos

Para economizar espaço:

```bash
# Listar backups
gsutil ls gs://papelaria-dashboard-backups/

# Deletar backup específico
gsutil -m rm -r gs://papelaria-dashboard-backups/backup-20240301-1234/

# Deletar backups com mais de 30 dias (Linux/Mac)
gsutil ls -l gs://papelaria-dashboard-backups/ | \
  awk '{if ($2 && NR > 1) print $3}' | \
  xargs -I {} gsutil -m rm -r {}
```

---

## ✅ Checklist de Backup

Antes de cada deploy:

- [ ] Acesso ao Firebase Console confirmado
- [ ] Projeto correto selecionado (`papelaria-dashboard`)
- [ ] Export iniciado via Firestore Database > Import/Export
- [ ] Bucket de destino definido
- [ ] Export concluído com sucesso (✓)
- [ ] Arquivos verificados no Cloud Storage
- [ ] Nome do backup anotado: `______________________________`
- [ ] Data/hora do backup: `____/____/______ __:__`

---

## 📝 Registro de Backups

Mantenha um log dos backups importantes:

| Data | Horário | Bucket/Path | Motivo | Tamanho |
|------|---------|-------------|---------|---------|
| 03/03/26 | 14:30 | gs://.../backup-20260303-1430 | Deploy permissões | 450MB |
|  |  |  |  |  |
|  |  |  |  |  |

---

## 🆘 Recuperação de Desastre

Se perder todos os dados do Firestore:

1. **NÃO ENTRE EM PÂNICO**
2. Verifique se tem backup recente
3. Execute restore do backup mais recente:
   ```bash
   gcloud firestore import gs://papelaria-dashboard-backups/backup-MAIS-RECENTE/
   ```
4. Aguarde conclusão (pode levar minutos)
5. Verifique os dados no Console

---

## 📞 Suporte

Se tiver problemas:
- Documentação oficial: https://cloud.google.com/firestore/docs/manage-data/export-import
- Suporte Firebase: https://firebase.google.com/support

---

**LEMBRE-SE**: Backup é como seguro - você espera nunca precisar, mas fica feliz de ter quando precisa! 🛡️
