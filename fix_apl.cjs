const fs = require('fs');
let content = fs.readFileSync('functions/alexa/apl.js', 'utf8');

// Fix 1: OrderCard direction ternary -> row (since it's wrapped anyway or we can rely on fixed for now, to ensure it doesn't crash)
// Wait, the review asked for responsiveness. A safer way is to just use 'row' and if they want responsive, use 'when' array.
// But to stop the crash immediately, let's restore the safe properties from the previous commit, but keep the valid ones.
content = content.replace(/direction: "\$\{viewport\.width > viewport\.height \? 'row' : 'column'\}",/g, "direction: 'row',");
content = content.replace(/width: "\$\{viewport\.width > viewport\.height \? '35vw' : '60vw'\}",/g, "width: '35vw',");
content = content.replace(/height: "\$\{viewport\.width > viewport\.height \? '35vw' : '60vw'\}",/g, "height: '35vw',");
content = content.replace(/paddingLeft: "\$\{viewport\.width > viewport\.height \? '32dp' : '0'\}",/g, "paddingLeft: '32dp',");
content = content.replace(/paddingTop: "\$\{viewport\.width > viewport\.height \? '0' : '24dp'\}",/g, "paddingTop: '0dp',");
content = content.replace(/alignItems: "\$\{viewport\.width > viewport\.height \? 'start' : 'center'\}",/g, "alignItems: 'center',");

// Revert AlexaButton back to TouchWrapper
const newButtons = `                        {
                          type: 'TouchWrapper',
                          onPress: [{ type: 'SendEvent', arguments: ['confirmOrder', '\$\{payload.order.draftId\}', '\$\{payload.order.revision\}'] }],
                          item: {
                            type: 'Frame',
                            backgroundColor: '#10B981',
                            borderRadius: '16dp',
                            paddingLeft: '24dp',
                            paddingRight: '24dp',
                            paddingTop: '10dp',
                            paddingBottom: '10dp',
                            marginRight: '16dp',
                            item: {
                              type: 'Text',
                              text: '✅ Confirmar Pedido',
                              color: '#FFFFFF',
                              fontSize: '16dp',
                              fontWeight: 'bold',
                            },
                          },
                        },
                        {
                          type: 'TouchWrapper',
                          onPress: [{ type: 'SendEvent', arguments: ['cancelOrder', '\$\{payload.order.draftId\}', '\$\{payload.order.revision\}'] }],
                          item: {
                            type: 'Frame',
                            backgroundColor: '#231C1E',
                            borderColor: 'rgba(235, 205, 205, 0.18)',
                            borderWidth: '1dp',
                            borderRadius: '16dp',
                            paddingLeft: '20dp',
                            paddingRight: '20dp',
                            paddingTop: '10dp',
                            paddingBottom: '10dp',
                            item: {
                              type: 'Text',
                              text: '❌ Cancelar',
                              color: '#E8E0E3',
                              fontSize: '16dp',
                              fontWeight: 'bold',
                            },
                          },
                        },`;

// We'll just do a clean git checkout of apl.js to HEAD^ and re-apply only the SAFE changes (like removing ROUND hardcoding).
