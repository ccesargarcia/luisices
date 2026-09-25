const fs = require('fs');
const file = 'src/app/pages/StoreProducts.tsx';
let content = fs.readFileSync(file, 'utf8');

const statusHTML = `
                <div className="flex items-center gap-1.5 w-28 sm:w-32">
                  <Select value={prod.status || (prod.active === false ? 'hidden' : 'active')} onValueChange={(val) => handleStatusChange(prod, val as any)}>
                    <SelectTrigger className="h-8 text-xs px-2 bg-transparent border-border/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active"><span className="text-emerald-600 font-semibold">Ativo</span></SelectItem>
                      <SelectItem value="paused"><span className="text-amber-500 font-semibold">Pausado</span></SelectItem>
                      <SelectItem value="hidden"><span className="text-red-500 font-semibold">Oculto</span></SelectItem>
                    </SelectContent>
                  </Select>
                </div>
`;

content = content.replace(
  /<div className="flex items-center gap-1\.5">\n\s*<span className="text-xs text-muted-foreground">\n\s*\{prod\.active \? 'Publicado' : 'Pausado'\}\n\s*<\/span>\n\s*<Switch\n\s*checked=\{prod\.active\}\n\s*onCheckedChange=\{\(\) => handleToggleActive\(prod\)\}\n\s*\/>\n\s*<\/div>/,
  statusHTML
);

content = content.replace(
  /<div className="flex items-center gap-2 mb-2 sm:mb-0">\n\s*<Switch\n\s*checked=\{prod\.active\}\n\s*onCheckedChange=\{\(\) => handleToggleActive\(prod\)\}\n\s*className="hidden sm:inline-flex"\n\s*\/>/,
  '<div className="flex items-center gap-2 mb-2 sm:mb-0">'
);

const fn = `
  async function handleStatusChange(p: StoreProduct, status: 'active' | 'paused' | 'hidden') {
    if (!canEdit) {
      toast.error('Você não tem permissão para alterar produtos da vitrine');
      return;
    }
    try {
      await firebaseStoreProductService.bulkUpdateStatus([p.id], status);
      toast.success(\`"\${p.name}" \${status === 'active' ? 'ativado' : status === 'paused' ? 'pausado' : 'oculto'}!\`);
    } catch {
      toast.error('Erro ao alternar status da publicação');
    }
  }
`;

content = content.replace(
  /async function handleToggleActive\(p: StoreProduct\) \{[\s\S]*?toast\.error\('Erro ao alternar status da publicação'\);\n\s*\}\n\s*\}/,
  fn
);

fs.writeFileSync(file, content);
console.log('patched single status change');
