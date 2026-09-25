const fs = require('fs');
const file = 'src/app/pages/StoreProducts.tsx';
let content = fs.readFileSync(file, 'utf8');

const newBulkFn = `
  async function handleBulkUpdateStatus(status: 'active' | 'paused' | 'hidden') {
    if (selectedProductIds.length === 0) return;
    if (!canEdit) {
      toast.error('Você não tem permissão para alterar produtos da vitrine.');
      return;
    }
    setIsBulkStatusUpdating(true);
    try {
      await firebaseStoreProductService.bulkUpdateStatus(selectedProductIds, status);
      toast.success(
        status === 'active'
          ? \`\${selectedProductIds.length} \${selectedProductIds.length === 1 ? 'publicação ativada' : 'publicações ativadas'} no catálogo.\`
          : status === 'paused'
          ? \`\${selectedProductIds.length} \${selectedProductIds.length === 1 ? 'publicação pausada' : 'publicações pausadas'} no catálogo.\`
          : \`\${selectedProductIds.length} \${selectedProductIds.length === 1 ? 'publicação oculta' : 'publicações ocultas'}.\`
      );
      setSelectedProductIds([]);
    } catch (err) {
      console.error('Erro na alteração em lote de status:', err);
      toast.error('Ocorreu um erro ao atualizar o status das publicações selecionadas.');
    } finally {
      setIsBulkStatusUpdating(false);
    }
  }
`;

content = content.replace(
  /async function handleBulkToggleActive\(active: boolean\) \{[\s\S]*?finally \{\n\s*setIsBulkStatusUpdating\(false\);\n\s*\}\n\s*\}/,
  newBulkFn
);

content = content.replace(
  /onClick=\{\(\) => handleBulkToggleActive\(false\)\}/,
  'onClick={() => handleBulkUpdateStatus("hidden")}'
);

content = content.replace(
  /<span>Pausar<\/span>/,
  '<span>Ocultar</span>'
);

content = content.replace(
  /onClick=\{\(\) => handleBulkToggleActive\(true\)\}/,
  'onClick={() => handleBulkUpdateStatus("active")}'
);

content = content.replace(
  /title="Pausar publicações na vitrine"/,
  'title="Ocultar publicações da vitrine"'
);

fs.writeFileSync(file, content);
console.log('patched bulk actions');
