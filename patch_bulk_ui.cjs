const fs = require('fs');
const file = 'src/app/pages/StoreProducts.tsx';
let content = fs.readFileSync(file, 'utf8');

const pausedBtn = `
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isBulkStatusUpdating}
                    onClick={() => handleBulkUpdateStatus('paused')}
                    className="flex-1 sm:flex-initial h-8.5 sm:h-8 px-2 sm:px-2.5 text-xs font-semibold gap-1.5 border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 cursor-pointer shadow-2xs"
                    title="Pausar vendas na vitrine"
                  >
                    {isBulkStatusUpdating ? (
                      <Loader2 size={13} className="animate-spin shrink-0" />
                    ) : (
                      <Pause size={13} className="shrink-0" />
                    )}
                    <span>Pausar</span>
                  </Button>
`;

content = content.replace(
  /onClick=\{\(\) => handleBulkUpdateStatus\("hidden"\)\}[\s\S]*?<span>Ocultar<\/span>\n\s*<\/Button>/,
  "onClick={() => handleBulkUpdateStatus('hidden')}\n                    className=\"flex-1 sm:flex-initial h-8.5 sm:h-8 px-2 sm:px-2.5 text-xs font-semibold gap-1.5 border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/10 cursor-pointer shadow-2xs\"\n                    title=\"Ocultar publicações da vitrine\"\n                  >\n                    {isBulkStatusUpdating ? (\n                      <Loader2 size={13} className=\"animate-spin shrink-0\" />\n                    ) : (\n                      <EyeOff size={13} className=\"shrink-0\" />\n                    )}\n                    <span>Ocultar</span>\n                  </Button>\n" + pausedBtn
);

fs.writeFileSync(file, content);
console.log('patched bulk ui');
