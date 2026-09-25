const fs = require('fs');
const file = 'src/app/pages/StoreCustomization.tsx';
let content = fs.readFileSync(file, 'utf8');

const newBtn = `
            <button
              type="button"
              onClick={() => {
                setFeatureFlags(prev => ({ ...prev, enableOnlineOrders: prev.enableOnlineOrders === false }));
                handleSave(); // Triggers a save! Wait, handleSave takes no args and reads state.
              }}
              className={\`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer \${
                featureFlags.enableOnlineOrders !== false
                  ? "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30 hover:bg-blue-500/20"
                  : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20"
              }\`}
              title="Pausar ou ativar vendas de todo o catálogo de uma vez"
            >
              <span className={\`size-2 rounded-full \${featureFlags.enableOnlineOrders !== false ? "bg-blue-500 animate-pulse" : "bg-amber-500"}\`} />
              <span>\${featureFlags.enableOnlineOrders !== false ? "Vendas Ativas" : "Vendas Pausadas"}</span>
              <span className="text-[10px] opacity-75 underline ml-1">
                \${featureFlags.enableOnlineOrders !== false ? "Pausar Vendas" : "Retomar Vendas"}
              </span>
            </button>
`;

content = content.replace(
  /<\/button>\n          <\/div>\n        <\/div>/,
  '</button>\n' + newBtn + '\n          </div>\n        </div>'
);

fs.writeFileSync(file, content);
console.log('Top buttons updated');
