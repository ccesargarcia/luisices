const fs = require('fs');
const file = 'src/app/pages/StoreProducts.tsx';
let content = fs.readFileSync(file, 'utf8');

const statusHTML = `
            <div className="pt-3 border-t border-border/60">
              <Label className="text-xs font-semibold mb-2 flex items-center gap-1.5">
                <Globe size={13} className="text-emerald-600" />
                Status na Vitrine
              </Label>
              <Select value={form.status} onValueChange={(val) => setForm({ ...form, status: val })}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">
                    <span className="font-semibold text-emerald-600">🟢 Ativo (Vendas abertas)</span>
                  </SelectItem>
                  <SelectItem value="paused">
                    <span className="font-semibold text-amber-500">🟠 Pausado (Esgotado / Vitrine apenas)</span>
                  </SelectItem>
                  <SelectItem value="hidden">
                    <span className="font-semibold text-red-500">🔴 Oculto (Não aparece no catálogo)</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
`;

content = content.replace(
  /<div className="pt-2 border-t border-border\/60 flex items-center justify-between">[\s\S]*?<Switch\s*id="sp-active"[\s\S]*?\/>\n\s*<\/div>/,
  statusHTML
);

fs.writeFileSync(file, content);
console.log('patched UI in form');
