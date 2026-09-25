const fs = require('fs');
const file = 'src/app/pages/StoreProducts.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /active: boolean;/g,
  'active: boolean;\n  status: "active" | "paused" | "hidden";'
);

content = content.replace(
  /active: true,/g,
  'active: true,\n    status: "active",'
);

content = content.replace(
  /active: p\.active !== false,/g,
  'active: p.active !== false,\n    status: p.status || (p.active === false ? "hidden" : "active"),'
);

fs.writeFileSync(file, content);
console.log('patched form state');
