// Run against npm run dev. Install Playwright separately, or set JUANELOS_PLAYWRIGHT_MODULE.
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createBackend } from './order-backend-fixture.mjs';
const { chromium } = await import(process.env.JUANELOS_PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ executablePath: process.env.JUANELOS_CHROME || undefined, headless: true });
const screenshots = process.env.JUANELOS_SCREENSHOTS;
if (screenshots) mkdirSync(screenshots, { recursive: true });
const api = createBackend(), errors = [], actions = [];
const product = { id:'p1', name:'Fresas Juanelos', category:'Fresas', price:12000, image_url:'./images/juanelos-original.png', description:'Fresas con crema', available:true, featured:true, sort_order:0, modifiers:[] };
const data = { products:[product], toppings:[], payment_methods:[{id:'pay1',name:'Nequi',account_value:'3001234567',instructions:'Transferencia',available:true}], neighborhoods:[{id:'n1',name:'Centro',delivery_fee:2000,available:true}] };
const user = { id:'boss',displayName:'Administrador',role:'jefe',permissions:{} };
const shim = `window.supabase={createClient(){const channel={on(){return channel},subscribe(){return channel},send:async()=>{},unsubscribe:async()=>{}};return {channel:()=>channel,removeChannel:()=>{},from(table){const query={select(){return query},order(){return query},eq(){return query},then(resolve){return fetch('/__fixtures/'+table).then(r=>r.json()).then(data=>({data,error:null})).then(resolve)}};return query},rpc:async(name,parameters)=>{const response=await fetch('/__fixtures/rpc/'+name,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(parameters)});return {data:await response.json(),error:null}}}}};`;
async function setup(context) {
  await context.route('https://cdn.jsdelivr.net/**', route=>route.fulfill({contentType:'application/javascript',body:shim}));
  await context.route('**/__fixtures/**', route=>{
    const name=route.request().url().split('/__fixtures/')[1];
    let result=data[name] || {};
    if(name==='rpc/validate_admin_session') result={valid:true,user};
    if(name==='rpc/admin_snapshot') result={products:data.products,toppings:[],payments:data.payment_methods,neighborhoods:data.neighborhoods,users:[]};
    return route.fulfill({contentType:'application/json',body:JSON.stringify(result)});
  });
  await context.route('https://script.google.com/**', route=>{
    const request=route.request(); api.advance(Date.now()-api.now());
    let result;
    if(request.method()==='GET') result=api.get();
    else { const {action,supabaseUrl:_supabaseUrl,supabaseAnonKey:_supabaseAnonKey,...body}=JSON.parse(request.postData() || '{}'); actions.push(action); result=api.post(action,body); }
    return route.fulfill({headers:{'access-control-allow-origin':'*'},contentType:'application/json',body:JSON.stringify(result)});
  });
  // Avoid external tile requests: geolocation and the backend are isolated fixtures.
  await context.route('https://tile.openstreetmap.org/**', route=>route.fulfill({contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=','base64')}));
  context.on('page', page=>page.on('pageerror',error=>errors.push(error.message)));
}
async function screenshot(page,name) { if(screenshots) await page.screenshot({path:join(screenshots,name+'.png'),fullPage:true}); }
async function fits(page) { assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,JSON.stringify(await page.evaluate(()=>({width:innerWidth,overflow:[...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().right>innerWidth+1&&e.getBoundingClientRect().width>0).map(e=>({tag:e.tagName,class:String(e.className),right:e.getBoundingClientRect().right,width:e.getBoundingClientRect().width})).slice(0,15)})))); }
try {
  const customer=await browser.newContext({viewport:{width:375,height:812},isMobile:true,hasTouch:true,serviceWorkers:'block'}); await setup(customer);
  await customer.addInitScript(()=>{
    window.__geoCalls=0; window.__geoDenied=false; window.__hidden=false;
    Object.defineProperty(document,'hidden',{get:()=>window.__hidden});
    const position=()=>({coords:{latitude:4.5,longitude:-74.1,accuracy:12},timestamp:Date.now()});
    Object.defineProperty(navigator,'geolocation',{value:{getCurrentPosition(success,error){window.__geoCalls++;setTimeout(()=>window.__geoDenied?error({code:1}):success(position()),10)},watchPosition(success){window.__geoCalls++;setTimeout(()=>success(position()),10);return 1},clearWatch(){}}});
  });
  const page=await customer.newPage(); await page.goto('http://localhost:3000/'); await page.locator('#welcome-close').click();
  assert.equal(await page.evaluate(()=>window.__geoCalls),0);
  await page.locator('[data-add=p1]').click(); await page.locator('#add-product').click();
  assert.equal(await page.locator('#nav-cart .cart-count').textContent(),'1');
  assert.equal(await page.locator('#nav-cart i').evaluate(e=>getComputedStyle(e,'::after').animationName),'cart-ring-glow');
  assert.equal(await page.locator('#toast').evaluate(e=>getComputedStyle(e).bottom),'126px');
  const badge=await page.locator('#nav-cart .cart-count').boundingBox(),toast=await page.locator('#toast').boundingBox();assert.ok(toast.y+toast.height<badge.y);
  await page.locator('#nav-cart').click(); await page.locator('#go-checkout').click(); await page.locator('label:has([name=fulfillment][value=delivery])').click();
  await page.locator('[name=address]').fill('Calle 1 # 2-3'); await page.locator('[name=neighborhood]').fill('Centro');
  await page.locator('[name=name]').fill('Cliente de prueba');await page.locator('[name=phone]').fill('3001234567');
  await page.locator('#receipt-file').setInputFiles('images/juanelos-logo.png'); await page.locator('.receipt-selected img').waitFor();
  assert.equal(await page.locator('.receipt-selected img').evaluate(img=>img.naturalWidth>0),true);
  await page.locator('#checkout-location-toggle').click(); await page.locator('[data-location-cancel]').last().click();assert.equal(await page.evaluate(()=>window.__geoCalls),0);
  await page.locator('#checkout-location-toggle').click();await page.evaluate(()=>{window.__geoDenied=true});await page.locator('#location-accept').click();
  await page.waitForFunction(()=>document.querySelector('#location-consent-status').textContent.includes('No se autorizó'));
  await page.evaluate(()=>{window.__geoDenied=false});await page.locator('#location-accept').click();await page.locator('#location-consent').waitFor({state:'hidden'});
  assert.equal(await page.evaluate(()=>window.JuanelosDelivery.active),true);
  await page.locator('#checkout-receipt').scrollIntoViewIfNeeded(); await screenshot(page,'checkout-mobile');await fits(page);
  await page.locator('#confirm-order').click(); await page.locator('#finish-order').waitFor();
  const order=api.post('getOrders',{token:'boss-token',sinceRevision:-1}).orders[0];assert.ok(order.receiptFileId);assert.ok(order.locationViewToken);
  assert.equal(await page.locator('.order-whatsapp-link').count(),1);assert.equal(await page.locator('#nav-cart .cart-count').textContent(),'0');
  await page.locator('#finish-order').click();
  const viewer=await customer.newPage();await viewer.goto(`http://localhost:3000/ubicacion.html?order=${order.id}#token=${order.locationViewToken}`);
  await viewer.waitForFunction(()=>document.querySelector('#map-state').textContent==='Actualizando');await fits(viewer);await screenshot(viewer,'mapa-mobile');
  const beforePause=api.post('getCustomerLocation',{orderId:order.id,viewerToken:order.locationViewToken}).updatedAt;
  await page.evaluate(()=>{window.__hidden=true;document.dispatchEvent(new Event('visibilitychange'))});
  await page.waitForTimeout(150);assert.equal(api.post('getCustomerLocation',{orderId:order.id,viewerToken:order.locationViewToken}).paused,true);
  await viewer.locator('#map-refresh').click();await viewer.waitForFunction(()=>document.querySelector('#map-state').textContent==='En pausa');
  assert.equal(api.post('getCustomerLocation',{orderId:order.id,viewerToken:order.locationViewToken}).updatedAt,beforePause);
  await page.evaluate(()=>{window.__hidden=false;document.dispatchEvent(new Event('visibilitychange'))});
  await page.waitForFunction(()=>document.querySelector('#location-sharing-status').textContent.includes('Actualizada ahora'));
  assert.equal(api.post('getCustomerLocation',{orderId:order.id,viewerToken:order.locationViewToken}).paused,false);
  await viewer.locator('#map-refresh').click();await viewer.waitForFunction(()=>document.querySelector('#map-state').textContent==='Actualizando');
  const admin=await browser.newContext({viewport:{width:1440,height:960},serviceWorkers:'block'});await setup(admin);
  await admin.addInitScript(()=>{if(location.origin==='http://localhost:3000')localStorage.setItem('juanelos-admin-token','boss-token')});
  const ap=await admin.newPage();await ap.goto('http://localhost:3000/admin.html');await ap.locator(`[data-order-id="${order.id}"]`).click();
  await ap.locator('.receipt-preview-button').waitFor();assert.equal(await ap.locator('.receipt-preview-button img').evaluate(img=>img.naturalWidth>0),true);
  await ap.locator('.receipt-preview-button').click();await ap.locator('.receipt-lightbox:not([hidden])').waitFor();await screenshot(ap,'comprobante-ampliado');
  await ap.locator('.receipt-lightbox button').click();assert.equal(await ap.locator('.receipt-lightbox').isHidden(),true);assert.equal(await ap.locator('#admin-app').evaluate(el=>el.inert),false);
  await screenshot(ap,'orden-admin');await ap.locator('[data-close-order]').click();
  await ap.locator('[data-section=links]').click();await ap.locator('#new-brand-link:not([disabled])').waitFor();await ap.locator('#new-brand-link').click();
  await ap.waitForFunction(()=>document.activeElement?.name==='title');
  await ap.locator('[name=title]').fill('Instagram Juanelos');await ap.locator('[name=subtitle]').fill('Nuestros momentos más deliciosos');await ap.locator('[name=url]').fill('https://instagram.com/juanelos');await ap.locator('[name=kind]').selectOption('instagram');
  await ap.locator('#editor-form [type=submit]').click();await ap.locator('#editor-modal').waitFor({state:'hidden'});assert.equal(api.post('getPublicLinks').links.length,1);
  const links=await customer.newPage();await links.goto('http://localhost:3000/enlaces.html');await links.locator('a[href="https://instagram.com/juanelos"]').waitFor();await screenshot(links,'enlaces-mobile');await fits(links);
  for(const width of [320,768,1440]){await links.setViewportSize({width,height:960});await fits(links)}await screenshot(links,'enlaces-desktop');
  const id=api.post('getPublicLinks').links[0].id;
  await ap.locator(`[data-brand-edit="${id}"]`).click();await ap.locator('[name=url]').fill('https://instagram.com/juanelosoficial');await ap.locator('label:has([name=active])').click();
  await ap.locator('#editor-form [type=submit]').click();await ap.locator('#editor-modal').waitFor({state:'hidden'});assert.equal(api.post('getPublicLinks').links.length,0);
  await links.reload();assert.equal(await links.locator('a[href*=instagram]').count(),0);
  await ap.locator(`[data-brand-delete="${id}"]`).click();await ap.locator('#confirm-delete').click();await ap.waitForFunction(()=>document.querySelectorAll('[data-brand-edit]').length===0);
  await ap.locator('[data-section=products]').click();await ap.locator('[data-edit=product]').first().click();await ap.locator('.product-image-field').waitFor();
  await ap.locator('[name=imageFile]').setInputFiles('images/juanelos-logo.png');assert.equal(await ap.locator('.product-image-preview').evaluate(img=>img.src.startsWith('blob:')),true);await screenshot(ap,'selector-imagen-admin');
  for(const width of [320,375,768]){await ap.setViewportSize({width,height:812});await ap.waitForTimeout(350);const picker=await ap.locator('.product-image-field').boundingBox();assert.ok(picker.x>=0&&picker.x+picker.width<=width);if(width>=375)await fits(ap)}
  await page.locator('#location-sharing-stop').click();await page.locator('#location-sharing-bar').waitFor({state:'hidden'});await viewer.locator('#map-refresh').click();await viewer.waitForFunction(()=>document.querySelector('#map-state').textContent==='Finalizada');
  await page.setViewportSize({width:1440,height:900});const bar=await page.locator('.bottom-nav').boundingBox();assert.ok(Math.abs(bar.x+bar.width/2-720)<1);
  const invalid=await customer.newPage();await invalid.goto('http://localhost:3000/ubicacion.html?order=bad');assert.equal(await invalid.locator('#map-refresh').isDisabled(),true);
  assert.deepEqual(errors,[]);console.log('PASS: checkout attachment, consent/denial, location pause/resume/stop, branded map, admin image viewer, links CRUD, image picker, responsive layouts and centered desktop cart.');
  assert.ok(actions.includes('pauseCustomerLocation'));assert.ok(actions.includes('getOrderReceipt'));
} catch (error) {
  console.error('Last backend actions:', actions.slice(-15));
  for (const context of browser.contexts()) for (const page of context.pages()) {
    if (page.url().includes('admin.html')) { console.error(await page.evaluate(()=>({toast:document.querySelector('#admin-toast')?.innerText,fields:[...document.querySelectorAll('#editor-form input')].map(e=>({name:e.name,value:e.value,valid:e.checkValidity(),message:e.validationMessage}))}))); await screenshot(page,'browser-failure'); }
  }
  throw error;
} finally { await browser.close(); }
