const fs = require('fs');
const file = 'functions/alexa/apl.js';
let content = fs.readFileSync(file, 'utf8');

// Replace direction binding with safe when blocks in buildOrderSuccessAplDirective
content = content.replace(/direction: "\$\{viewport\.width > viewport\.height \? 'row' : 'column'\}",/g, "direction: 'row', // REMOVED BINDING");
// Actually, let's just do a proper replace using regex or string replacement.
