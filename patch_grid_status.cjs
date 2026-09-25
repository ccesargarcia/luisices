const fs = require('fs');
const file = 'src/app/pages/StoreProducts.tsx';
let content = fs.readFileSync(file, 'utf8');

const miniSelect = `
                <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-black/70 backdrop-blur-md px-1 py-1 rounded text-white shadow-xl">
                  <Select value={prod.status || (prod.active === false ? 'hidden' : 'active')} onValueChange={(val) => handleStatusChange(prod, val as any)}>
                    <SelectTrigger className="h-5 text-[10px] px-1.5 bg-transparent border-none text-white focus:ring-0 w-[80px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active"><span className="text-emerald-500 font-bold text-[10px]">Ativo</span></SelectItem>
                      <SelectItem value="paused"><span className="text-amber-500 font-bold text-[10px]">Pausado</span></SelectItem>
                      <SelectItem value="hidden"><span className="text-red-500 font-bold text-[10px]">Oculto</span></SelectItem>
                    </SelectContent>
                  </Select>
                </div>
`;

content = content.replace(
  /<div className="absolute top-2 right-2 flex items-center gap-1\.5 bg-black\/60 backdrop-blur-xs px-2 py-1 rounded-full text-white">[\s\S]*?<\/div>/,
  miniSelect
);

fs.writeFileSync(file, content);
console.log('patched grid status');
