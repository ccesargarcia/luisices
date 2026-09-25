const fs = require('fs');
const file = 'src/app/pages/PublicCatalog.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. In cart mode, bypass preview for customizable products
content = content.replace(
  /if \(prod\.isCustomizable\) \{\s*handleOpenPreview\(prod\);\s*\}/g,
  'if (false) {\n                            handleOpenPreview(prod);\n                          }'
);

// 2. Make the product card click behavior contextual
content = content.replace(
  /onClick=\{\(\) => handleOpenPreview\(prod\)\}/g,
  `onClick={(e) => {
                      if (businessInfo.storeMode === 'cart' && featureFlags.enableOnlineOrders !== false) {
                        addToCart(prod);
                        setIsCartOpen(true);
                      } else {
                        handleOpenPreview(prod);
                      }
                    }}`
);

fs.writeFileSync(file, content);
console.log('Preview logic updated');
