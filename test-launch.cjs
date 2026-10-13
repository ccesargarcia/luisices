const { buildWelcomeAplDirective } = require('./functions/alexa/apl.js');
const doc = buildWelcomeAplDirective({ userName: 'Caio', envLabel: 'Teste' });
console.log(JSON.stringify(doc, null, 2));
