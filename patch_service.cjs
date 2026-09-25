const fs = require('fs');
const file = 'src/services/firebaseStoreProductService.ts';
let content = fs.readFileSync(file, 'utf8');

const newMethod = `
  async bulkUpdateStatus(ids: string[], status: 'active' | 'paused' | 'hidden'): Promise<void> {
    if (!ids || ids.length === 0) return;
    const chunks: string[][] = [];
    for (let i = 0; i < ids.length; i += 400) {
      chunks.push(ids.slice(i, i + 400));
    }
    const promises = chunks.map(async (chunk) => {
      const b = writeBatch(db);
      chunk.forEach((id) => {
        b.update(doc(db, STORE_PRODUCTS_COLLECTION, id), {
          status,
          active: status !== 'hidden', // backward compatibility
          updatedAt: Timestamp.now(),
        });
      });
      await b.commit();
    });
    await Promise.all(promises);
  }
`;

content = content.replace(
  /async bulkToggleActive\(ids: string\[\], active: boolean\): Promise<void> \{/,
  newMethod + '\n  async bulkToggleActive(ids: string[], active: boolean): Promise<void> {'
);

fs.writeFileSync(file, content);
console.log('patched service');
