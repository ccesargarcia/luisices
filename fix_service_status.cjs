const fs = require('fs');
const file = 'src/services/firebaseStoreProductService.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /active: data\.active !== undefined \? Boolean\(data\.active\) : true,/,
  `active: data.active !== undefined ? Boolean(data.active) : true,\n      status: (data.status as 'active' | 'paused' | 'hidden') || (data.active === false ? 'hidden' : 'active'),`
);

content = content.replace(
  /active: data\.active !== undefined \? data\.active : true,/,
  `active: data.status ? data.status !== 'hidden' : (data.active !== undefined ? data.active : true),\n      status: data.status || (data.active === false ? 'hidden' : 'active'),`
);

fs.writeFileSync(file, content);
console.log('Fixed status mapping in firebaseStoreProductService.ts');
