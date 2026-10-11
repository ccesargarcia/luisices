import fs from 'node:fs';
import { createServer } from 'vite';
import { chromium } from 'playwright';
// Execute após npm run build. Usa componentes reais e o CSS de produção, sem login.
const server=await createServer({server:{middlewareMode:true},appType:'custom'});
const React=(await import('react')).default;
const {renderToStaticMarkup}=await import('react-dom/server');
const {Button}=await server.ssrLoadModule('/src/app/components/ui/button.tsx');
const {ChatArea}=await server.ssrLoadModule('/src/app/components/whatsapp/ChatArea.tsx');
const {PaginationControls}=await server.ssrLoadModule('/src/app/components/common/PaginationControls.tsx');
const noop=()=>{};
const props={selectedPhone:'5511999999999',activeCustomer:{name:'Cliente com nome muito longo para validar responsividade',phone:'5511999999999'},activeCustomerOrders:[],displayedMessages:Array.from({length:123},(_,i)=>({id:String(i),phone:'5511999999999',sender:'customer',text:'Mensagem de teste',status:'received',timestamp:new Date('2026-10-11T10:00:00Z')})),syncingMessages:false,inputText:'Olá',sending:false,isSelectionMode:true,selectedMessageIds:new Set(Array.from({length:123},(_,i)=>String(i))),messagesEndRef:React.createRef(),textareaRef:React.createRef()};
for(const name of ['onClearSelectedPhone','onSyncMessages','onOpenWhatsAppWeb','onDeleteMessage','onRetryMessage','onSendMessage','onSetInputText','onNewChatOpen','onToggleSelectionMode','onToggleMessageSelection','onSelectAll','onClearSelection','onBulkDelete'])props[name]=noop;
const html=renderToStaticMarkup(React.createElement('main',{style:{padding:12}},React.createElement('section',{id:'chat',style:{height:650,display:'flex',flexDirection:'column',minWidth:0}},React.createElement(ChatArea,props)),React.createElement(PaginationControls,{currentPage:10,totalPages:20,totalItems:200,pageSize:10,onPageChange:noop,onPageSizeChange:noop}),React.createElement(Button,{id:'contrast'},'Novo')));
const css=fs.readFileSync('dist/assets/'+fs.readdirSync('dist/assets').find(x=>/^main.*\.css$/.test(x)),'utf8');
const browser=await chromium.launch({...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? {executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH} : {}),args:['--no-sandbox','--disable-dev-shm-usage'],headless:true});
let failed=false;
for(const [width,touch,panelWidth] of [[320,false],[360,false],[393,true],[640,false],[767,false],[844,true],[1280,false],[1280,false,360]]){
const context=await browser.newContext({viewport:{width,height:900},hasTouch:touch});const page=await context.newPage();await page.setContent(`<html class="dark"><head><style>${css}</style></head><body>${html}</body></html>`);
if(panelWidth)await page.locator('main').evaluate((e,w)=>e.style.width=`${w}px`,panelWidth);
const result=await page.evaluate(()=>{const buttons=[...document.querySelectorAll('[data-slot=button]')].filter(e=>e.getBoundingClientRect().width);return{overflow:document.documentElement.scrollWidth>innerWidth,panelRight:document.querySelector('#chat').getBoundingClientRect().right,small:buttons.filter(e=>{const r=e.getBoundingClientRect();return r.width<43.9||r.height<43.9}).map(e=>e.textContent),deleteRect:(()=>{const b=buttons.find(e=>e.textContent.includes('Apagar'));const r=b.getBoundingClientRect();return{left:r.left,right:r.right};})(),colors:[getComputedStyle(document.querySelector('#contrast')).color,getComputedStyle(document.querySelector('#contrast')).backgroundColor]}});
await page.getByRole('button',{name:'Enviar mensagem',exact:true}).count().then(n=>{if(n!==1)throw Error('Missing send accessible name')});
await page.getByRole('button',{name:'Desmarcar Todas',exact:true}).count().then(n=>{if(n!==1)throw Error('All-selection state missing')});
const luminance=color=>{const rgb=color.match(/[\d.]+/g).slice(0,3).map(n=>{const v=Number(n)/255;return v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4});return rgb[0]*0.2126+rgb[1]*0.7152+rgb[2]*0.0722};
const [a,b]=result.colors.map(luminance);const contrast=(Math.max(a,b)+0.05)/(Math.min(a,b)+0.05);
if(contrast<4.5)failed=true;
if(result.overflow||result.deleteRect.right>result.panelRight||((width<768||touch)&&result.small.length))failed=true;
console.log(JSON.stringify({width,touch,panelWidth,contrast,...result}));await context.close();
}
await browser.close();await server.close();if(failed)process.exitCode=1;
