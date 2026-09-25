const fs = require('fs');
const file = 'src/app/pages/StoreProducts.tsx';
let content = fs.readFileSync(file, 'utf8');

const statsStr = `
  const activeCount = storeProducts.filter((p) => p.status === 'active' || (!p.status && p.active !== false)).length;
  const pausedCount = storeProducts.filter((p) => p.status === 'paused').length;
  const hiddenCount = storeProducts.filter((p) => p.status === 'hidden' || (!p.status && p.active === false)).length;
`;

content = content.replace(
  /const activeCount = storeProducts\.filter\(\(p\) => p\.active !== false\)\.length;\n\s*const pausedCount = storeProducts\.filter\(\(p\) => p\.active === false\)\.length;/,
  statsStr
);

fs.writeFileSync(file, content);
console.log('patched stats');
