// Exercita o JSX da barra real de Emails.tsx sem conta, backend ou exclusões reais.
import fs from 'node:fs';
import ts from 'typescript';
import { createServer } from 'vite';
import { chromium } from 'playwright';
const source = fs.readFileSync('src/app/pages/Emails.tsx', 'utf8');
const tree = ts.createSourceFile('Emails.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const start = source.indexOf('/* Barra de Seleção em Massa e Select All */');
let toolbar;
function find(node) {
  if (!toolbar && ts.isJsxElement(node) && node.getStart(tree) > start && node.openingElement.tagName.getText(tree) === 'div' && node.getText(tree).includes('id="select-all-emails"')) toolbar = node.getText(tree);
  if (!toolbar) ts.forEachChild(node, find);
}
find(tree);
if (!toolbar) throw Error('Barra de seleção não encontrada');
const fixture = `import React from 'react';import {createRoot} from 'react-dom/client';import {Button} from '/src/app/components/ui/button';import {Checkbox} from '/src/app/components/ui/checkbox';import {ArchiveRestore,Archive,Trash2,MailCheck,ShieldAlert,X} from 'lucide-react';
const q=new URLSearchParams(location.search), activeFolder=q.get('folder')||'inbox', selectedEmailIds=new Set(Array.from({length:Number(q.get('count')||3)},(_,i)=>i)), displayedEmails=[1,2,3], isAllDisplayedSelected=true,isSomeDisplayedSelected=true,canDelete=true,canEdit=true,isBulkDeleting=false;
const action=name=>()=>document.body.dataset.action=name;
const handleToggleSelectAll=action('select'),setIsEmptyTrashDialogOpen=action('empty'),handleBulkRestore=action('restore'),setIsBulkDeleteDialogOpen=action('delete-dialog'),handleBulkMarkRead=action('read'),handleBulkArchive=action('archive'),handleBulkMarkSpam=action('spam'),handleClearSelection=action('clear');
createRoot(document.getElementById('root')).render(<section id="panel" style={{width:Number(q.get('panel')||320),maxWidth:'100%',overflow:'hidden',border:'1px solid',margin:12}}>${toolbar}<div style={{padding:16}}>Lista de e-mails</div></section>);`;
const css = fs.readFileSync('dist/assets/' + fs.readdirSync('dist/assets').find(x => /^main.*\.css$/.test(x)), 'utf8');
const server = await createServer({server:{host:'127.0.0.1',port:3199},plugins:[{name:'email-toolbar-fixture',enforce:'pre',resolveId(id){if(id==='/__email_fixture.tsx')return id},load(id){if(id==='/__email_fixture.tsx')return fixture},configureServer(s){s.middlewares.use('/__email',async(req,res)=>{res.setHeader('Content-Type','text/html');res.end(await s.transformIndexHtml('/__email',`<html class="dark"><head><style>${css}</style></head><body><div id="root"></div><script type="module" src="/__email_fixture.tsx"></script></body></html>`));})}}]});
await server.listen();
const browser = await chromium.launch({...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{}),args:['--no-sandbox','--disable-dev-shm-usage']});
try {
  for (const [viewport,panel,touch] of [[1280,220,false],[1280,280,false],[1280,320,false],[1280,420,false],[1280,640,false],[393,369,true],[844,280,true]]) {
    for (const folder of ['inbox','trash','spam','archived','sent']) {
      const page=await browser.newPage({viewport:{width:viewport,height:800},hasTouch:touch});
      const errors=[];page.on('pageerror',e=>errors.push(e.message));
      await page.goto(`http://127.0.0.1:3199/__email?panel=${panel}&folder=${folder}&count=${folder==='trash'?123:3}`);
      const deletion=page.getByRole('button',{name:/Excluir/});await deletion.waitFor();
      const result=await page.locator('#panel').evaluate(e=>{
        const p=e.getBoundingClientRect(),buttons=[...e.querySelectorAll('button')].map(b=>({text:b.textContent,rect:b.getBoundingClientRect()}));
        return {overflow:e.scrollWidth>e.clientWidth,outside:buttons.filter(b=>b.rect.left<p.left||b.rect.right>p.right||b.rect.bottom>p.bottom).map(b=>b.text),small:buttons.filter(b=>b.rect.width<44||b.rect.height<44).map(b=>b.text),overlap:buttons.some((a,i)=>buttons.slice(i+1).some(b=>Math.min(a.rect.right,b.rect.right)>Math.max(a.rect.left,b.rect.left)+1&&Math.min(a.rect.bottom,b.rect.bottom)>Math.max(a.rect.top,b.rect.top)+1))};
      });
      if(errors.length||result.overflow||result.outside.length||result.overlap||(touch&&result.small.length))throw Error(JSON.stringify({viewport,panel,folder,errors,result}));
      await deletion.click();if(await page.locator('body').getAttribute('data-action')!=='delete-dialog')throw Error('Confirmação de exclusão não acionada');
      await page.getByRole('button',{name:'Limpar seleção',exact:true}).click();if(await page.locator('body').getAttribute('data-action')!=='clear')throw Error('Limpar seleção não acionado');
      if(panel===320&&folder==='inbox'&&process.env.EMAIL_TOOLBAR_SCREENSHOT_PATH)await page.screenshot({path:process.env.EMAIL_TOOLBAR_SCREENSHOT_PATH});
      console.log(JSON.stringify({viewport,panel,touch,folder,overflow:result.overflow,overlap:result.overlap}));await page.close();
    }
  }
} finally { await browser.close();await server.close(); }
