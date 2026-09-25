const fs = require('fs');
const file = 'src/app/pages/PublicCatalog.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace "Adicionar à Sacola" button in preview
content = content.replace(
  /className="w-full py-3.5 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 bg-\[var\(--store-primary,#613d3e\)\] dark:bg-\[#f4b7b9\] text-white dark:text-\[#4c2527\] hover:opacity-95 active:scale-\[0.98\] transition-all shadow-md cursor-pointer"/g,
  'className="w-full py-3.5 px-4 rounded-[var(--btn-radius)] font-bold text-xs sm:text-sm flex items-center justify-center gap-2 bg-[var(--btn-bg)] text-[var(--btn-text)] border border-[var(--btn-border)] hover:opacity-95 active:scale-[0.98] transition-all shadow-md cursor-pointer"'
);

// Replace "Carregar Mais" button
content = content.replace(
  /className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-\[var\(--store-primary,#613d3e\)\] dark:bg-\[#f4b7b9\] text-white dark:text-\[#4c2527\] text-xs md:text-sm font-bold shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer"/g,
  'className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-[var(--btn-radius)] bg-[var(--btn-bg)] text-[var(--btn-text)] border border-[var(--btn-border)] text-xs md:text-sm font-bold shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer"'
);

// Replace generic WhatsApp buttons to respect radius
content = content.replace(/rounded-xl bg-\[#10B981\]/g, 'rounded-[var(--btn-radius)] bg-[#10B981]');
content = content.replace(/rounded-2xl bg-\[var\(--store-primary/g, 'rounded-[var(--btn-radius)] bg-[var(--store-primary');

// Write back
fs.writeFileSync(file, content);
console.log('Button classes updated');
