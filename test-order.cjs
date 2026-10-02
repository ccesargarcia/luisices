const { buildOrderCardAplDirective } = require('./functions/alexa/apl.js');
const doc = buildOrderCardAplDirective({ 
  draftId: '123', revision: 1, customer: 'Caio', product: 'Bolo', 
  quantity: 1, deliveryDate: '10/10/2026', totalPrice: 'R$ 10,00', 
  statusLabel: 'Andamento', envLabel: 'Teste', showActions: true 
});
console.log(JSON.stringify(doc, null, 2));
