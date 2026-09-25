const fs = require('fs');
const file = 'src/app/pages/StoreProducts.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /const \[filterStatus, setFilterStatus\] = useState<'todos' \| 'ativos' \| 'pausados'>\('todos'\);/,
  'const [filterStatus, setFilterStatus] = useState<\'todos\' | \'ativos\' | \'pausados\' | \'ocultos\'>(\'todos\');'
);

const matchesStatusStr = `
      const matchesStatus =
        filterStatus === 'todos' ||
        (filterStatus === 'ativos' && (p.status === 'active' || (!p.status && p.active !== false))) ||
        (filterStatus === 'pausados' && p.status === 'paused') ||
        (filterStatus === 'ocultos' && (p.status === 'hidden' || (!p.status && p.active === false)));
`;

content = content.replace(
  /const matchesStatus =[\s\S]*?\(filterStatus === 'pausados' && p\.active === false\);/,
  matchesStatusStr
);

content = content.replace(
  /<SelectItem value="pausados">Pausados<\/SelectItem>/,
  '<SelectItem value="pausados">Pausados/Esgotados</SelectItem>\n              <SelectItem value="ocultos">Ocultos</SelectItem>'
);

fs.writeFileSync(file, content);
console.log('patched filters');
