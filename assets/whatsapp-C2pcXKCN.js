function d(e){return e.replace(/\D/g,"")}function g(e){const s=a=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(a),c=a=>new Date(a).toLocaleDateString("pt-BR",{day:"2-digit",month:"long",year:"numeric"}),i={pending:"⏳ Pendente","in-progress":"🔄 Em Produção",completed:"✅ Concluído",cancelled:"❌ Cancelado"};let t=`🎨 *Papelaria Personalizada*

`;if(t+=`Olá, ${e.customerName}! 👋

`,t+=`📋 *Detalhes do Pedido*
`,t+=`━━━━━━━━━━━━━━━━━━━━
`,t+=`🏷️ Produto: ${e.productName}
`,t+=`📦 Quantidade: ${e.quantity} unidades
`,t+=`💰 Valor: ${s(e.price)}
`,t+=`📅 Entrega prevista: ${c(e.deliveryDate)}
`,t+=`📊 Status: ${i[e.status]||e.status}
`,e.payment&&(t+=`
💳 *Pagamento*
`,t+=`━━━━━━━━━━━━━━━━━━━━
`,t+=`💵 Total: ${s(e.payment.totalAmount)}
`,t+=`✅ Pago: ${s(e.payment.paidAmount)}
`,e.payment.remainingAmount>0&&(t+=`⚠️ Restante: ${s(e.payment.remainingAmount)}
`),e.payment.method&&(t+=`💳 Forma: ${{pix:"📱 PIX",cash:"💵 Dinheiro",credit:"💳 Cartão de Crédito",debit:"💳 Cartão de Débito",transfer:"🏦 Transferência"}[e.payment.method]||e.payment.method}
`)),e.productionWorkflow){const a=e.productionWorkflow.steps,p=Object.values(a).filter(r=>r.completed).length,n=Object.keys(a).length;t+=`
🏭 *Progresso da Produção*
`,t+=`━━━━━━━━━━━━━━━━━━━━
`,t+=`📊 ${p}/${n} etapas concluídas
`;const o={design:"🎨 Design",approval:"✅ Aprovação",printing:"🖨️ Impressão",cutting:"✂️ Corte",assembly:"🔨 Montagem","quality-check":"🛡️ Controle de Qualidade",packaging:"📦 Embalagem"};Object.entries(a).forEach(([r,l])=>{const u=l.completed?"✅":"⏳";t+=`${u} ${o[r]||r}
`})}return e.notes&&(t+=`
📝 *Observações*
`,t+=`━━━━━━━━━━━━━━━━━━━━
`,t+=`${e.notes}
`),t+=`
━━━━━━━━━━━━━━━━━━━━
`,t+=`📞 Dúvidas? Responda esta mensagem!
`,t+=`
Obrigado pela preferência! 🙏`,t}function m(e,s){const c=d(e),i=encodeURIComponent(s),a=/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)?`whatsapp://send?phone=55${c}&text=${i}`:`https://web.whatsapp.com/send?phone=55${c}&text=${i}`;window.open(a,"_blank")}function $(e){const s=g(e);m(e.customerPhone,s)}function h(e,s="Papelaria Personalizada"){const c=p=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(p),i=p=>new Date(p+"T12:00:00").toLocaleDateString("pt-BR",{day:"2-digit",month:"long",year:"numeric"}),t={pending:"⏳ Pendente","in-progress":"🔄 Em Produção",completed:"✅ Concluído",cancelled:"❌ Cancelado"};let a=`🎨 *${s}*

`;return a+=`Olá, ${e.customerName}! 👋

`,a+=`🔄 *Detalhes da Permuta*
`,a+=`━━━━━━━━━━━━━━━━━━━━
`,a+=`🏷️ Produto: ${e.productName}
`,a+=`💰 Custo: ${c(e.price)}
`,a+=`📅 Data de entrega: ${i(e.deliveryDate)}
`,a+=`📊 Status: ${t[e.status]||e.status}
`,e.exchangeNotes&&(a+=`
📝 *Observações*
`,a+=`━━━━━━━━━━━━━━━━━━━━
`,a+=`${e.exchangeNotes}
`),a+=`
━━━━━━━━━━━━━━━━━━━━
`,a+=`📞 Dúvidas? Responda esta mensagem!
`,a+=`
Obrigado pela parceria! 🙏`,a}function f(e,s,c="Papelaria Personalizada"){const i=o=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(o),t=o=>new Date(o+"T12:00:00").toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit",year:"numeric"}),a={pending:"⏳ Pendente","in-progress":"🔄 Em Produção",completed:"✅ Concluído",cancelled:"❌ Cancelado"},p=s.reduce((o,r)=>o+(r.price||0),0);let n=`🎨 *${c}*

`;return n+=`Olá, ${e}! 👋

`,n+=`🔄 *Resumo das Permutas*
`,n+=`━━━━━━━━━━━━━━━━━━━━

`,s.forEach((o,r)=>{n+=`*${r+1}. ${o.productName}*
`,n+=`   📅 ${t(o.deliveryDate)}
`,n+=`   💰 Custo: ${i(o.price||0)}
`,n+=`   📊 ${a[o.status]||o.status}
`,o.exchangeNotes&&(n+=`   📝 ${o.exchangeNotes}
`),n+=`
`}),n+=`━━━━━━━━━━━━━━━━━━━━
`,n+=`📦 Total de permutas: *${s.length}*
`,n+=`💰 Custo total: *${i(p)}*

`,n+=`📞 Dúvidas? Responda esta mensagem!
`,n+=`
Obrigado pela parceria! 🙏`,n}function y(e,s){const c=h(e,s);m(e.customerPhone,c)}export{m as a,y as b,f as g,$ as o};
