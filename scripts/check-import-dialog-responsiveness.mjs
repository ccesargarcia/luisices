// Valida o modal real com parsing e gravação simulados; não acessa contas nem importa pedidos reais.
import fs from 'node:fs';
import { createServer } from 'vite';
import { chromium } from 'playwright';
const mock = `const rows=Array.from({length:11},(_,i)=>({rowIndex:i+2,customerName:i===10?'':'Cliente Final '+(1138+i),customerPhone:'11999991138',productName:'30 Vinil Hotwheels + 1 Folha Vinil Impresso 2cm',quantity:31,price:123.45,deliveryDate:'2026-10-20',status:'pending',paymentStatus:'pending',paidAmount:0,remainingAmount:123.45,isValid:i!==10,errors:i===10?['Nome do cliente é obrigatório.']:[],warnings:[],rawData:{}}));
export const parseTagsValue=raw=>String(raw).split(',').map(name=>({name:name.trim(),color:'#6785a8'}));
export const downloadOrderImportTemplate=async()=>{};
export const parseOrdersExcelFile=async()=>{const delay=Number(new URLSearchParams(location.search).get('delay')||0);if(delay)await new Promise(resolve=>setTimeout(resolve,delay));return{totalRows:11,allRows:rows,validRows:rows.filter(r=>r.isValid),invalidRows:rows.filter(r=>!r.isValid),headersFound:[]}};
export const executeOrdersImport=async(rows,uid,options)=>{const failure=new URLSearchParams(location.search).get('failure');if(failure==='fatal')throw Error('Falha de conexão antes da gravação');document.body.dataset.imported=String(rows.length);document.body.dataset.payload=JSON.stringify(rows);options.onProgress({current:rows.length,total:rows.length,statusText:'Concluído'});return{total:rows.length,successCount:failure?1:rows.length,errorCount:failure?rows.length-1:0,createdOrderIds:[],createdCustomerIds:[],errors:failure?rows.slice(1).map(r=>({rowIndex:r.rowIndex,customerName:r.customerName,stage:'order',code:'permission-denied',error:'O servidor recusou a operação.'})):[]}};`;
const fixture = `import React from 'react';import {createRoot} from 'react-dom/client';import {ImportOrdersDialog} from '/src/app/components/orders/ImportOrdersDialog';function App(){const[open,setOpen]=React.useState(true);const[refresh,setRefresh]=React.useState(false);if(refresh)return <div>Dashboard atualizado</div>;return <><div style={{padding:32}}>Dashboard — Conteúdo atrás do modal</div><ImportOrdersDialog open={open} onOpenChange={setOpen} onImportSuccess={()=>setRefresh(true)}/></>}createRoot(document.getElementById('root')).render(<App/>);`;
const css = fs.readFileSync('dist/assets/'+fs.readdirSync('dist/assets').find(x=>/^main.*\.css$/.test(x)),'utf8');
const server = await createServer({server:{host:'127.0.0.1',port:3199},plugins:[{name:'import-dialog-fixture',enforce:'pre',resolveId(id){if(id==='/__import_fixture.tsx')return id},load(id){if(id==='/__import_fixture.tsx')return fixture;if(id.endsWith('/contexts/AuthContext.tsx'))return `export const useAuth=()=>({user:{uid:'fixture-user'}});`;if(id.endsWith('/utils/importOrdersExcel.ts'))return mock},configureServer(s){s.middlewares.use('/__import',async(req,res)=>{const theme=new URL(req.url,'http://localhost').searchParams.get('theme')||'deep-ocean';res.setHeader('Content-Type','text/html');res.end(await s.transformIndexHtml('/__import',`<html class="${theme}"><head><style>${css}</style></head><body><div id="root"></div><script type="module" src="/__import_fixture.tsx"></script></body></html>`));})}}]});
await server.listen();
const browser = await chromium.launch({...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{}),args:['--no-sandbox','--disable-dev-shm-usage']});
try {
  for(const [width,height] of [[320,640],[393,740],[640,700],[844,500],[1280,800]])for(const theme of ['light','dark','deep-ocean']){
    const page=await browser.newPage({viewport:{width,height},hasTouch:width<900});const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(`http://127.0.0.1:3199/__import?theme=${theme}`);const dialog=page.getByRole('dialog');await dialog.waitFor();await page.waitForTimeout(250);
    await page.locator('input[type=file]').setInputFiles({name:'pedidos_luisices_importacaogemini_com_nome_muito_longo.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:Buffer.from('fixture')});
    await page.getByRole('button',{name:'Importar 10 pedidos',exact:true}).waitFor();
    const geometry=await dialog.evaluate(e=>{const r=e.getBoundingClientRect(),body=e.querySelector('[data-slot=dialog-body]'),footer=e.querySelector('[data-slot=dialog-footer]').getBoundingClientRect(),close=e.querySelector('[data-slot=dialog-close]').getBoundingClientRect(),title=e.querySelector('[data-slot=dialog-title]').getBoundingClientRect();return{width:r.width,height:r.height,overflow:e.scrollWidth>e.clientWidth||body.scrollWidth>body.clientWidth,footerOutside:footer.bottom>innerHeight||footer.top<0,closeOverlapsTitle:close.left<title.right&&close.bottom>title.top&&close.top<title.bottom,background:getComputedStyle(e).backgroundColor,scrollable:body.scrollHeight>body.clientHeight}});
    if(errors.length||geometry.overflow||geometry.footerOutside||geometry.closeOverlapsTitle||geometry.background==='rgba(0, 0, 0, 0)')throw Error(JSON.stringify({width,height,theme,errors,geometry}));
    const mobile=width<768, visibleRows=()=>mobile?page.locator('article'):page.locator('tbody tr');
    if(await visibleRows().count()!==11)throw Error('Pedidos ausentes na prévia');
    await page.getByRole('button',{name:'Com Erros',exact:true}).click();if(await visibleRows().count()!==1)throw Error('Filtro de erros incorreto');await (mobile?page.locator('article'):page.locator('tbody')).getByText('Nome do cliente é obrigatório.',{exact:mobile}).first().waitFor();
    await page.getByRole('button',{name:'Apenas Válidos',exact:true}).click();if(await visibleRows().count()!==10)throw Error('Filtro de válidos incorreto');await page.getByRole('button',{name:'Todos',exact:true}).click();
    if(width===393&&theme==='deep-ocean'&&process.env.IMPORT_DIALOG_SCREENSHOT_PATH){await page.locator('[data-slot=dialog-body]').evaluate(e=>e.scrollTop=0);await page.screenshot({path:process.env.IMPORT_DIALOG_SCREENSHOT_PATH});}
    await page.getByRole('button',{name:'Limpar seleção',exact:true}).click();
    if(!await page.getByRole('button',{name:'Importar 0 pedidos',exact:true}).isDisabled())throw Error('Importação vazia permitida');
    await page.getByRole('checkbox',{name:'Selecionar linha 12',exact:true}).click();
    if(!await page.getByRole('button',{name:'Importar 1 pedido',exact:true}).isDisabled())throw Error('Linha inválida permitida');
    await page.getByRole('button',{name:'Editar linha 12',exact:true}).click();
    await page.getByLabel('Cliente',{exact:true}).fill('Cliente corrigido');
    await page.getByLabel('Quantidade',{exact:true}).fill('0');
    await page.getByRole('button',{name:'Salvar alterações',exact:true}).click();
    await page.getByText('Quantidade deve ser um número inteiro entre 1 e 10.000.',{exact:true}).waitFor();
    await page.getByLabel('Quantidade',{exact:true}).fill('12');
    await page.getByLabel('Valor total',{exact:true}).fill('200,50');
    await page.getByRole('combobox',{name:'Status do pagamento',exact:true}).click();
    await page.getByRole('option',{name:'Pago',exact:true}).click();
    await page.getByRole('button',{name:'Salvar alterações',exact:true}).click();
    if(await page.getByRole('button',{name:'Importar 1 pedido',exact:true}).isDisabled())throw Error('Linha corrigida não liberada');
    await page.getByRole('checkbox',{name:'Selecionar linha 2',exact:true}).click();
    await page.getByRole('button',{name:'Editar linha 2',exact:true}).click();
    if(!await page.getByRole('button',{name:'Importar 2 pedidos',exact:true}).isDisabled())throw Error('Edição não salva permitida');
    await page.getByLabel('Produto',{exact:true}).fill('Produto revisado');
    await page.getByLabel('Valor total',{exact:true}).fill('150,25');
    await page.getByRole('button',{name:'Salvar alterações',exact:true}).click();
    await page.getByRole('button',{name:'Editar linha 2',exact:true}).click();
    await page.getByLabel('Cliente',{exact:true}).fill('Alteração descartada');
    await page.getByRole('button',{name:'Descartar edição',exact:true}).click();
    await page.getByRole('button',{name:'Apenas Válidos',exact:true}).click();
    if(await page.getByRole('button',{name:'Importar 2 pedidos',exact:true}).isDisabled())throw Error('Filtro alterou seleção');
    await page.getByRole('checkbox',{name:'Selecionar pedidos visíveis',exact:true}).click();
    await page.getByRole('button',{name:'Importar 11 pedidos',exact:true}).waitFor();
    await page.getByRole('checkbox',{name:'Selecionar pedidos visíveis',exact:true}).click();
    await page.getByRole('button',{name:'Importar 0 pedidos',exact:true}).waitFor();
    await page.getByRole('checkbox',{name:'Selecionar linha 2',exact:true}).click();
    await page.getByRole('checkbox',{name:'Selecionar linha 12',exact:true}).click();
    await page.getByRole('button',{name:'Importar 2 pedidos',exact:true}).click();
    await page.getByText('Importação Concluída!',{exact:true}).waitFor();
    const payload=JSON.parse(await page.locator('body').getAttribute('data-payload'));
    if(payload.length!==2||payload[0].rowIndex!==2||payload[1].rowIndex!==12||payload[0].productName!=='Produto revisado'||payload[0].price!==150.25||payload[0].customerName==='Alteração descartada'||payload[1].customerName!=='Cliente corrigido'||payload[1].paidAmount!==200.5||payload[1].remainingAmount!==0)throw Error('Dados editados ou seleção não respeitados');await page.getByRole('button',{name:'Concluir',exact:true}).click();await dialog.waitFor({state:'hidden'});
    if(width===393&&theme==='deep-ocean'){await page.goto('http://127.0.0.1:3199/__import?theme=deep-ocean&delay=500');await page.getByRole('dialog').waitFor();await page.locator('input[type=file]').setInputFiles({name:'cancelado.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:Buffer.from('fixture')});await page.getByRole('button',{name:'Cancelar',exact:true}).click();await page.waitForTimeout(650);await page.getByRole('button',{name:'Importar Excel',exact:true}).click();if(await page.getByRole('button',{name:/^Importar [0-9]/}).count())throw Error('Leitura cancelada repopulou a prévia');}
    if(width===393&&theme==='deep-ocean')for(const failure of ['partial','fatal']){
      await page.goto(`http://127.0.0.1:3199/__import?theme=deep-ocean&failure=${failure}`);
      await page.locator('input[type=file]').setInputFiles({name:'falhas.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:Buffer.from('fixture')});
      await page.getByRole('button',{name:'Importar 10 pedidos',exact:true}).click();
      await page.getByText(failure==='partial'?'Importação concluída com falhas':'Não foi possível importar os pedidos',{exact:true}).waitFor();
      if(!await page.getByRole('dialog').isVisible())throw Error('Falhas desapareceram ao atualizar o dashboard');
      if(failure==='partial'){
        if(await page.getByText('Código: permission-denied',{exact:true}).count()!==9)throw Error('Diagnóstico por linha ausente');
        const body=page.locator('[data-slot=dialog-body]');if(await body.evaluate(e=>e.scrollWidth>e.clientWidth))throw Error('Resumo de falhas transborda no celular');
      }else await page.getByText('Falha de conexão antes da gravação',{exact:true}).waitFor();
      await page.getByRole('button',{name:'Concluir',exact:true}).click();
      await page.getByRole('dialog').waitFor({state:'hidden'});
      if(failure==='partial')await page.getByText('Dashboard atualizado',{exact:true}).waitFor();
    }
    console.log(JSON.stringify({viewportWidth:width,viewportHeight:height,theme,...geometry}));await page.close();
  }
} finally {await browser.close();await server.close();}
