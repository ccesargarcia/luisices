const fs = require('fs');
let content = fs.readFileSync('functions/alexa/apl.js', 'utf8');

content = content.replace(/direction: "\$\{viewport\.width > viewport\.height \? 'row' : 'column'\}",/g, "direction: 'row',");
content = content.replace(/width: "\$\{viewport\.width > viewport\.height \? '35vw' : '60vw'\}",/g, "");
content = content.replace(/height: "\$\{viewport\.width > viewport\.height \? '35vw' : '60vw'\}",/g, "");
content = content.replace(/paddingLeft: "\$\{viewport\.width > viewport\.height \? '32dp' : '0'\}",/g, "paddingLeft: '32dp',");
content = content.replace(/paddingTop: "\$\{viewport\.width > viewport\.height \? '0' : '24dp'\}",/g, "");
content = content.replace(/alignItems: "\$\{viewport\.width > viewport\.height \? 'start' : 'center'\}",/g, "");

content = content.replace(/type: 'AlexaButton',\s*buttonText: '✅ Confirmar',\s*primaryAction/g, "type: 'TouchWrapper', onPress");
content = content.replace(/type: 'AlexaButton',\s*buttonText: '❌ Cancelar',\s*buttonStyle: 'outlined',\s*primaryAction/g, "type: 'TouchWrapper', onPress");

// Re-add TouchWrapper structures
// It's easier to just git checkout HEAD^ functions/alexa/apl.js, and then manually append width: 80vw to the Success Frame.
