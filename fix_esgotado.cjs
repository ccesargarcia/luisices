const fs = require('fs');
const file = 'src/app/pages/PublicCatalog.tsx';
let content = fs.readFileSync(file, 'utf8');

const overlay = `                    {prod.active === false && (
                      <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px] flex items-center justify-center z-10">
                        <span className="bg-white text-stone-900 font-black px-4 py-1 text-xs uppercase tracking-widest rounded shadow-xl -rotate-12 border-2 border-stone-100">
                          Pausado
                        </span>
                      </div>
                    )}`;

content = content.replace(
  /<\/span>\n                    <\/div>\n\n                    \{\/\* Badge de Destaque \/ Categoria \(se habilitado\) \*\/\}/,
  '</span>\n                    </div>\n\n' + overlay + '\n\n                    {/* Badge de Destaque / Categoria (se habilitado) */}'
);

fs.writeFileSync(file, content);
console.log('Esgotado overlay added');
