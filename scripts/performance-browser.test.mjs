import assert from 'node:assert/strict';
const {chromium}=await import(process.env.JUANELOS_PLAYWRIGHT_MODULE || 'playwright');
const browser=await chromium.launch({executablePath:process.env.JUANELOS_CHROME||undefined,headless:true});
const errors=[],metrics={};
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const product={id:'fast-product',name:'Carta actualizada',category:'Fresas',price:12000,image_url:'./images/juanelos-original.png',description:'Delicioso',featured:true,available:true,modifiers:[]};
const catalog={products:[product],toppings:[],payment_methods:[{id:'pay1',name:'Nequi',account_value:'123',available:true}],neighborhoods:[]};
const user={id:'boss',role:'jefe',displayName:'Equipo',permissions:{}};
const orders=[{id:'JUA-test-1',sequence:1,createdAt:new Date().toISOString(),customerName:'Cliente',phone:'3001234567',fulfillment:'pickup',subtotal:12000,total:12000,status:'nueva',items:[],history:[]}];let revision=1;
const shim=`window.__subscriptions=[];window.__events=[];window.supabase={createClient(){return {channel(name){const c={on(type,filter,handler){window.__events.push({name,type,filter,handler});return c},subscribe(){window.__subscriptions.push(name);return c},send:async()=>{}};return c},removeChannel(){},from(table){const q={select(){return q},order(){return q},then(resolve){return fetch('/__perf/catalog/'+table).then(r=>r.json()).then(data=>resolve({data,error:null}))}};return q},rpc:async(name,body)=>({data:await fetch('/__perf/rpc/'+name,{method:'POST',body:JSON.stringify(body)}).then(r=>r.json()),error:null})}}};`;
async function setup(context){
 const counts={},active={},max={};let delay=0,valid=true;
 await context.route('**/vendor/supabase/supabase.js*',r=>r.fulfill({contentType:'application/javascript',body:shim}));
 await context.route('**/__perf/**',async r=>{
  const key=r.request().url().split('/__perf/')[1];counts[key]=(counts[key]||0)+1;active[key]=(active[key]||0)+1;max[key]=Math.max(max[key]||0,active[key]);
  try{if(key!=='rpc/validate_admin_session')await wait(delay);let result=catalog[key.split('/')[1]]||{};
   if(key==='rpc/validate_admin_session')result={valid,user};
   if(key==='rpc/bootstrap_status')result={hasBoss:true};
   if(key==='rpc/admin_snapshot')result={products:catalog.products,toppings:[],payments:catalog.payment_methods,neighborhoods:[],users:[]};
   await r.fulfill({contentType:'application/json',body:JSON.stringify(result)});
  }finally{active[key]--}
 });
 await context.route('https://script.google.com/**',async r=>{
  const data=r.request().method()==='GET'?{}:JSON.parse(r.request().postData()||'{}'),key=data.action||'capabilities';counts[key]=(counts[key]||0)+1;active[key]=(active[key]||0)+1;max[key]=Math.max(max[key]||0,active[key]);
  try{const startRevision=revision,startOrders=JSON.parse(JSON.stringify(orders));await wait(delay);let result={ok:true};
   if(key==='getPublicLinks')result.links=[{id:'ig',title:'Instagram oficial',subtitle:'Síguenos',kind:'instagram',url:'https://instagram.com/juanelos',active:true}];
   if(key==='getOrders')result=Number(data.sinceRevision)===startRevision?{ok:true,changed:false,revision:startRevision}:{ok:true,changed:true,revision:startRevision,orders:startOrders};
   await r.fulfill({headers:{'access-control-allow-origin':'*'},contentType:'application/json',body:JSON.stringify(result)});
  }finally{active[key]--}
 });
 context.on('page',page=>page.on('pageerror',error=>errors.push(error.message)));
 return {counts,max,setDelay(ms){delay=ms},deny(){valid=false}};
}
try{
 const ctx=await browser.newContext({serviceWorkers:'block'}),fixture=await setup(ctx),page=await ctx.newPage();fixture.setDelay(1600);
 const first=Date.now();await page.goto('http://localhost:3000/',{waitUntil:'domcontentloaded'});await page.locator('#products .product-card').first().waitFor();metrics.coldCardsMs=Date.now()-first;
 assert.ok(metrics.coldCardsMs<1200,'Cards must appear before delayed backend responds');
 await page.locator('[data-product=fast-product]').waitFor();assert.equal(await page.locator('[data-product=fast-product] img').evaluate(e=>e.src.includes('/optimized/')),true);
 const reload=Date.now();await page.reload({waitUntil:'domcontentloaded'});await page.locator('[data-product=fast-product]').waitFor();metrics.cachedCardsMs=Date.now()-reload;assert.ok(metrics.cachedCardsMs<1200);
 await page.locator('#welcome-close').click();const click=Date.now();await page.locator('[data-add=fast-product]').click();await page.locator('#add-product').click();await page.locator('#nav-cart').click();await page.locator('#go-checkout').click();metrics.cartClicksMs=Date.now()-click;
 await page.locator('[name=name]').fill('Cliente');await page.locator('[name=phone]').fill('3001234567');await page.locator('#confirm-order').click();assert.equal(fixture.counts.createOrder||0,0,'Cached catalog must be validated before confirming');
 await page.waitForTimeout(1800);
 await page.evaluate(()=>{for(let i=0;i<8;i++)window.__events.filter(e=>e.name==='juanelos-storefront').forEach(e=>e.handler({}))});await page.waitForTimeout(1800);
 assert.equal(fixture.max['catalog/products'],1,'Catalog fetches must not overlap');
 await page.goto('http://localhost:3000/enlaces.html');await page.locator('a[href*=instagram]').waitFor();const links=Date.now();await page.reload({waitUntil:'domcontentloaded'});await page.locator('a[href*=instagram]').waitFor();metrics.cachedLinksMs=Date.now()-links;assert.ok(metrics.cachedLinksMs<1200);
 assert.equal(await page.evaluate(()=>performance.getEntriesByType('resource').some(e=>new URL(e.name).pathname.endsWith('/app.js'))),false,'Links must not download storefront JS');
 const admin=await browser.newContext({serviceWorkers:'block'}),af=await setup(admin);af.setDelay(1600);await admin.addInitScript(()=>{if(location.origin==='http://localhost:3000')localStorage.setItem('juanelos-admin-token','boss-token')});
 const ap=await admin.newPage();await ap.goto('http://localhost:3000/admin.html',{waitUntil:'domcontentloaded'});await ap.waitForFunction(()=>window.__subscriptions?.includes('juanelos-orders-live'));
 assert.equal(await ap.locator('.order-card').count(),0,'Realtime must subscribe before initial data arrives');await ap.locator('.order-card').waitFor();
 assert.equal(await ap.locator('#products-admin .admin-card').count(),0,'Hidden catalog panels must not build image cards');
 const start=Date.now();await ap.reload({waitUntil:'domcontentloaded'});await ap.locator('.order-card').waitFor();metrics.cachedOrdersMs=Date.now()-start;assert.ok(metrics.cachedOrdersMs<1200);
 await ap.locator('[data-section=products]').click();assert.equal(await ap.locator('#products-admin .admin-card').count(),1);
 await ap.locator('[data-section=orders]').click();
 orders.push({...orders[0],id:'JUA-test-2',sequence:2});revision++;
 await ap.evaluate(()=>{for(let i=0;i<8;i++)window.__events.filter(e=>e.name==='juanelos-order-events-durable').forEach(e=>e.handler({}))});
 await ap.locator('[data-order-id=JUA-test-2]').waitFor();assert.equal(af.max.getOrders,1,'Order refreshes must not overlap or drop events during a request');
 af.deny();await ap.reload();await ap.locator('#auth-form[data-mode=login]').waitFor();assert.equal(await ap.locator('#admin-app').isHidden(),true,'Private cache must stay hidden without valid session');
 const offlineContext=await browser.newContext({serviceWorkers:'allow'});await setup(offlineContext);const offlinePage=await offlineContext.newPage();
 await offlinePage.goto('http://localhost:3000/enlaces.html');await offlinePage.waitForFunction(()=>!!navigator.serviceWorker.controller,{timeout:30000});
 const keys=await offlinePage.evaluate(async()=>{const keys=await caches.keys();return(await(await caches.open(keys[0])).keys()).map(request=>request.url)});
 assert.ok(keys.some(key=>key.includes('config.js?v=20261010-2')));assert.equal(keys.some(key=>key.includes('script.google.com')),false,'Order and location APIs must never enter the static cache');
 await offlineContext.setOffline(true);await offlinePage.reload();await offlinePage.locator('a[href*=instagram]').waitFor();assert.equal(await offlinePage.locator('.links-dessert-main').evaluate(image=>image.complete&&image.naturalWidth>0),true);
 assert.deepEqual(errors,[]);console.log('PASS: delayed-network rendering, cached catalog/links/orders, checkout freshness, early realtime, event coalescing, lazy admin panels and private cache authorization.');console.log(JSON.stringify(metrics));
}finally{await browser.close()}
