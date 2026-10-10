(() => {
  'use strict';

  if (!document.querySelector('#products')) return;

  const CONFIG = window.JUANELOS_CONFIG;
  const fast = window.JuanelosPerformance;
  const WHATSAPP_NUMBER = '573209370199';
  const isSupabaseConfigured = /^https:\/\/.+\.supabase\.co$/i.test(CONFIG.supabaseUrl)
    && !CONFIG.supabaseAnonKey.includes('PEGA_');
  const isOrdersConfigured = /^https:\/\/script\.google\.com\//i.test(CONFIG.appsScriptUrl)
    && !CONFIG.appsScriptUrl.includes('PEGA_');
  const supabaseClient = isSupabaseConfigured && window.supabase
    ? window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseAnonKey, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
      })
    : null;

  const option = (id, name, price = 0) => ({ id, name, price });
  const group = (id, name, type, options, settings = {}) => ({ id, name, type, options, ...settings });
  const localToppings = [
    ['brownie','Brownie','Topping',3200],['queso','Queso','Topping',3200],['chocmelos','Chocmelos','Topping',3200],
    ['chocoramo','Chocoramo','Topping',3200],['quipitos','Quipitos','Topping',3200],['chococrispi','Chococrispi','Topping',3200],
    ['chips-chocolate','Chips de chocolate','Topping',3200],['mango','Mango','Topping',3200],['oreo','Oreo','Topping',3200],
    ['milo','Milo','Topping',3200],['biscolata','Biscolata','Topping',3200],['chocolatina-jumbo','Chocolatina Jumbo','Topping',3200],
    ['piazza','Piazza','Topping',3200],['chunks','Chunks','Topping',3200],['minichips','Minichips','Topping',3200],
    ['mani','Maní','Topping',3200],['klim','Klim','Topping',3200],['leche-condensada','Leche condensada','Salsa',0],
    ['arequipe-alpina','Arequipe Alpina','Salsa',0],['frutos-rojos','Frutos rojos','Salsa',0],['leche-polvo','Leche en polvo','Salsa',0],['hersheys',"Hershey's",'Salsa',0]
  ].map(([id,name,kind,price], index) => ({ id,name,kind,price,available:true,sort_order:index }));

  const toppingsOf = kind => localToppings.filter(item => item.kind === kind).map(item => option(item.id, item.name, item.price));
  const includedToppings = count => group('toppings', `Elige ${count} topping${count > 1 ? 's' : ''}`, 'multiple', toppingsOf('Topping').map(item => ({ ...item, price:0 })), { required:true,min:count,max:count });
  const includedSauces = count => group('salsas', `Elige ${count} salsa${count > 1 ? 's' : ''}`, 'multiple', toppingsOf('Salsa').map(item => ({ ...item, price:0 })), { required:true,min:count,max:count });
  const extraToppings = () => group('extras', 'Toppings adicionales', 'multiple', toppingsOf('Topping'), { max:5 });

  const localProducts = [
    {id:'original-12',name:'La Original · 12 oz',category:'La Original',price:19900,image:'./images/juanelos-original.png',description:'Cama de fresas, crema de la casa y fruta fresca. Incluye 2 salsas.',modifiers:[includedSauces(2),extraToppings()],featured:true,badge:'12 oz',available:true,sort_order:1},
    {id:'original-16',name:'La Original · 16 oz',category:'La Original',price:23500,image:'./images/juanelos-original.png',description:'La Original en tamaño grande. Incluye 2 salsas.',modifiers:[includedSauces(2),extraToppings()],featured:true,badge:'16 oz',available:true,sort_order:2},
    {id:'poderosa-12',name:'La Poderosa · 12 oz',category:'La Poderosa',price:23900,image:'./images/juanelos-poderosa.png',description:'Nuestra copa más poderosa: 1 salsa y 3 toppings.',modifiers:[includedSauces(1),includedToppings(3),extraToppings()],featured:true,badge:'12 oz',available:true,sort_order:3},
    {id:'poderosa-16',name:'La Poderosa · 16 oz',category:'La Poderosa',price:27900,image:'./images/juanelos-poderosa.png',description:'Nuestra copa más poderosa en tamaño grande: 1 salsa y 3 toppings.',modifiers:[includedSauces(1),includedToppings(3),extraToppings()],featured:true,badge:'16 oz',available:true,sort_order:4},
    {id:'paye-maracuya',name:'Paye de Maracuyá · 12 oz',category:'Carta de Payes',price:18900,image:'./images/juanelos-payes.png',description:'Postre de tres leches y galleta Ducal con topping de maracuyá.',featured:true,available:true,sort_order:10},
    {id:'paye-klim',name:'Paye de Klim · 12 oz',category:'Carta de Payes',price:18900,image:'./images/juanelos-payes.png',description:'Postre de tres leches y galleta Ducal con topping de Klim.',available:true,sort_order:11},
    {id:'paye-oreo',name:'Paye de Oreo · 12 oz',category:'Carta de Payes',price:18900,image:'./images/juanelos-payes.png',description:'Postre de tres leches y galleta Ducal con topping de Oreo.',featured:true,available:true,sort_order:12},
    {id:'paye-arequipe',name:'Paye de Arequipe · 12 oz',category:'Carta de Payes',price:18900,image:'./images/juanelos-payes.png',description:'Postre de tres leches y galleta Ducal con topping de arequipe.',available:true,sort_order:13},
    {id:'paye-frutos-rojos',name:'Paye de Frutos rojos · 12 oz',category:'Carta de Payes',price:18900,image:'./images/juanelos-payes.png',description:'Postre de tres leches y galleta Ducal con topping de frutos rojos.',available:true,sort_order:14},
    {id:'paye-chocolate',name:'Paye de Chocolate · 12 oz',category:'Carta de Payes',price:21900,image:'./images/juanelos-payes.png',description:'Postre de tres leches y galleta Ducal en versión de chocolate.',featured:true,available:true,sort_order:15},
    {id:'parfait-12',name:'Parfait · 12 oz',category:'Especiales',price:23900,image:'./images/juanelos-parfait.png',description:'Yogurt griego, 3 tipos de fruta y granola artesanal.',featured:true,badge:'12 oz',available:true,sort_order:20},
    {id:'parfait-16',name:'Parfait · 16 oz',category:'Especiales',price:27900,image:'./images/juanelos-parfait.png',description:'Yogurt griego, 3 tipos de fruta y granola artesanal.',badge:'16 oz',available:true,sort_order:21},
    {id:'maracu-brownie-12',name:'Maracú Brownie · 12 oz',category:'Especiales',price:20900,image:'./images/juanelos-maracu-brownie.png',description:'Crema de maracuyá con brownie, trozos de mango y fresa.',featured:true,badge:'12 oz',available:true,sort_order:22},
    {id:'maracu-brownie-16',name:'Maracú Brownie · 16 oz',category:'Especiales',price:25900,image:'./images/juanelos-maracu-brownie.png',description:'Crema de maracuyá con brownie, trozos de mango y fresa.',badge:'16 oz',available:true,sort_order:23},
    {id:'choco-cruch-12',name:'Choco Cruch · 12 oz',category:'Especiales',price:23900,image:'./images/juanelos-choco-cruch.png',description:"Fresas con crema y cobertura de chocolate, Chococrispi, Biscolata y salsa Hershey's.",featured:true,badge:'12 oz',available:true,sort_order:24},
    {id:'choco-cruch-16',name:'Choco Cruch · 16 oz',category:'Especiales',price:28900,image:'./images/juanelos-choco-cruch.png',description:"Fresas con crema y cobertura de chocolate, Chococrispi, Biscolata y salsa Hershey's.",badge:'16 oz',available:true,sort_order:25},
    {id:'fres-helada-12',name:'Fres helada · 12 oz',category:'Especiales',price:24500,image:'./images/juanelos-fresas.png',description:"Fresas con crema, queso cremoso, bola de helado y salsa de chocolate Hershey's.",featured:true,badge:'12 oz',available:true,sort_order:26},
    {id:'fres-helada-16',name:'Fres helada · 16 oz',category:'Especiales',price:29500,image:'./images/juanelos-fresas.png',description:"Fresas con crema, queso cremoso, bola de helado y salsa de chocolate Hershey's.",badge:'16 oz',available:true,sort_order:27},
    {id:'fresas-chocolate',name:'Fresas con Chocolate · 12 oz',category:'Especiales',price:25500,image:'./images/juanelos-fresas.png',description:'Fresas enteras cubiertas de chocolate.',featured:true,badge:'12 oz',available:true,sort_order:28},
    {id:'soda-saborizada',name:'Soda saborizada · 22 oz',category:'Bebidas',price:12000,image:'./images/juanelos-bebidas.png',description:'Soda fría saborizada.',available:true,sort_order:30},
    {id:'agua',name:'Botella de agua',category:'Bebidas',price:5000,image:'./images/juanelos-bebidas.png',description:'Agua embotellada.',available:true,sort_order:31},
    {id:'soda-sencilla',name:'Soda sencilla',category:'Bebidas',price:5000,image:'./images/juanelos-bebidas.png',description:'Soda fría sencilla.',available:true,sort_order:32},
    {id:'americano',name:'Americano',category:'Bebidas',price:5000,image:'./images/juanelos-bebidas.png',description:'Café americano.',available:true,sort_order:33},
    {id:'frappe-cafe',name:'Frappé Café · 22 oz',category:'Bebidas',price:14000,image:'./images/juanelos-bebidas.png',description:'Frappé de café.',available:true,sort_order:34},
    {id:'frappe-casa',name:'Frappé de la casa · 22 oz',category:'Bebidas',price:12000,image:'./images/juanelos-bebidas.png',description:'Frappé especial de la casa.',featured:true,available:true,sort_order:35}
  ];

  let products = [...localProducts];
  let categories = ['Para ti', ...new Set(products.map(product => product.category))];
  let paymentMethods = [
    {id:'transferencia',name:'Transferencia',account_value:'',instructions:'Datos pendientes',available:true,sort_order:1},
    {id:'nequi',name:'Nequi',account_value:'',instructions:'Datos pendientes',available:true,sort_order:2},
    {id:'bre-b',name:'Bre-B',account_value:'',instructions:'Datos pendientes',available:true,sort_order:3},
    {id:'efectivo',name:'Efectivo',account_value:'Pago contra entrega',instructions:'Ten el valor exacto si es posible.',available:true,sort_order:4}
  ];
  let neighborhoods = [];
  let toppingCatalog = [...localToppings];

  const state = {
    category:'Para ti', query:'', active:null, selections:{}, quantity:1, editingKey:null,
    cart:[], cartStep:'cart', fulfillment:'pickup', payment:'transferencia', selectedNeighborhood:null,
    customer:{name:'',phone:'',address:'',neighborhood:'',notes:''}, orderTotal:0, realtime:null, orderSignal:null,
    sendingTimer:null,
    receipt:null, receiptBusy:false, receiptRevision:0, lastWhatsappUrl:'',
    availabilitySignature:''
  };
  state.catalogReady = !supabaseClient;
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const moneyFormatter = new Intl.NumberFormat('es-CO', { style:'currency', currency:'COP', maximumFractionDigits:0 });
  const money = value => moneyFormatter.format(Number(value) || 0);
  const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[character]));
  async function copyText(value) { if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(value); window.prompt('Copia este contenido:', value); }
  const delivery = window.JuanelosDelivery;
  delivery.configure(() => { const wrapper = $('#checkout-location'); if (wrapper) wrapper.innerHTML = delivery.markup(); }, toast);

  function orderWhatsAppUrl(order, orderId, confirmedTotal) {
    const productLines = order.items.flatMap((item, index) => {
      const lines = [`${index + 1}. *${item.quantity} × ${item.name}*`];
      if (item.selections.length) lines.push(`   ↳ ${item.selections.join(' · ')}`);
      lines.push(`   💰 ${money(item.unitPrice * item.quantity)}`);
      return lines;
    });
    const deliveryLines = order.fulfillment === 'delivery'
      ? ['🚚 *Entrega:* Domicilio', `📍 *Barrio:* ${order.neighborhood}`, `🏠 *Dirección:* ${order.address}`]
      : ['🏪 *Entrega:* Recoger en Juanelos'];
    const totalValue = confirmedTotal ?? (Number(order.subtotal) + Number(order.deliveryFee));
    const lines = [
      '🍓 *JUANELOS · NUEVO PEDIDO*',
      '',
      'Hola, equipo de Juanelos 👋',
      'Acabo de realizar este pedido desde la página web:',
      '',
      `🧾 *Pedido:* ${orderId}`,
      `👤 *Cliente:* ${order.customerName}`,
      `📱 *Teléfono:* ${order.phone}`,
      ...deliveryLines,
      '',
      '🛍️ *PRODUCTOS*',
      ...productLines,
      '',
      `🧮 *Subtotal:* ${money(order.subtotal)}`,
      ...(order.fulfillment === 'delivery' ? [`🛵 *Domicilio:* ${money(order.deliveryFee)}`] : []),
      `💵 *TOTAL:* ${money(totalValue)}`,
      `💳 *Método de pago:* ${order.paymentMethod}`,
      ...(order.receipt ? ['📎 Comprobante adjunto a la orden.'] : []),
      ...(order.liveLocation ? ['📍 *Ubicación del cliente:* ' + window.JuanelosServices.locationUrl(orderId, order.liveLocation.viewerToken)] : []),
      ...(order.notes ? ['', `📝 *Indicaciones:* ${order.notes}`] : []),
      '',
      '✅ Quedo atento(a) a la confirmación. ¡Gracias!'
    ];
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(lines.join('\n'))}`;
  }

  try { state.cart = JSON.parse(localStorage.getItem('juanelos-cart-v2') || '[]'); } catch { state.cart = []; }
  const table = new URLSearchParams(location.search).get('table');
  if (table) $('#order-location').textContent = `Mesa ${table}`;

  function saveCart() { localStorage.setItem('juanelos-cart-v2', JSON.stringify(state.cart)); updateCounts(); showAvailabilityAlert(); }
  function updateCounts() { const count = state.cart.reduce((sum,item) => sum + item.quantity, 0); $$('.cart-count').forEach(node => { node.textContent = count; }); $('#nav-cart').classList.toggle('has-items', count > 0); }
  function toast(title, copy = '', cartFeedback = false) { const element = $('#toast'); element.classList.toggle('cart-feedback', cartFeedback); $('#toast-title').textContent = title; $('#toast-copy').textContent = copy; element.hidden = false; clearTimeout(toast.timer); toast.timer = setTimeout(() => { element.hidden = true; }, 2900); }
  function subtotal() { return state.cart.reduce((sum,item) => sum + item.unitPrice * item.quantity, 0); }
  function deliveryFee() { return state.fulfillment === 'delivery' ? Number(state.selectedNeighborhood?.delivery_fee || 0) : 0; }
  function total() { return subtotal() + deliveryFee(); }
  function productById(id) { return products.find(product => product.id === id) || state.cart.find(item => item.productId === id)?.productSnapshot; }

  function cartAvailabilityIssues() {
    return state.cart.map(item => {
      const liveProduct = products.find(product => product.id === item.productId);
      const product = liveProduct || item.productSnapshot;
      const reasons = [];
      if (!liveProduct || liveProduct.available === false) reasons.push('Este producto ya no está disponible.');
      const selectedIds = [...new Set(Object.values(item.selections || {}).flat())];
      selectedIds.forEach(id => {
        const topping = toppingCatalog.find(entry => entry.id === id);
        if (!topping || topping.available === false) reasons.push(`${topping?.name || 'Un topping seleccionado'} se agotó.`);
      });
      return reasons.length ? { item, product, reasons } : null;
    }).filter(Boolean);
  }

  function showAvailabilityAlert() {
    const issues = cartAvailabilityIssues();
    const signature = issues.map(issue => `${issue.item.key}:${issue.reasons.join('|')}`).sort().join('::');
    if (!issues.length) {
      state.availabilitySignature = '';
      if (!$('#availability-overlay').hidden) hideOverlay('availability');
      return;
    }
    if (signature === state.availabilitySignature) return;
    state.availabilitySignature = signature;
    $('#availability-items').innerHTML = issues.map(issue => `<article class="availability-item"><img src="${escapeHtml(fast.imageUrl(issue.product?.image) || './images/juanelos-original.png')}" alt="${escapeHtml(issue.product?.name || 'Producto')}"><div><strong>${escapeHtml(issue.product?.name || 'Producto del pedido')}</strong>${issue.reasons.map(reason => `<span>${escapeHtml(reason)}</span>`).join('')}</div></article>`).join('');
    showOverlay('availability');
  }

  function buildModifiers(definitions, toppingRows) {
    if (!Array.isArray(definitions)) return [];
    return definitions.map(definition => {
      const options = toppingRows.filter(item => item.available !== false && item.kind === definition.source).map(item => option(item.id, item.name, definition.usePrice ? Number(item.price || 0) : 0));
      return group(definition.id, definition.name, definition.max === 1 ? 'single' : 'multiple', options, {
        required:Boolean(definition.required), min:Number(definition.min || 0), max:Number(definition.max || 99)
      });
    });
  }

  function applyStoreData(data) {
      const [productResult,toppingResult,paymentResult,neighborhoodResult] = data;
      const toppingRows = toppingResult.data || [];
      toppingCatalog = toppingRows;
      products = (productResult.data || []).map(row => ({
        id:row.id,name:row.name,category:row.category,price:Number(row.price),image:fast.imageUrl(row.image_url),
        description:row.description,badge:row.badge,featured:row.featured,available:row.available,
        sort_order:row.sort_order,modifiers:buildModifiers(row.modifiers,toppingRows)
      }));
      paymentMethods = (paymentResult.data || []).filter(item => item.available !== false);
      neighborhoods = (neighborhoodResult.data || []).filter(item => item.available !== false);
      if (state.customer.neighborhood) setNeighborhood(state.customer.neighborhood);
      categories = ['Para ti', ...new Set(products.map(product => product.category))];
      if (!categories.includes(state.category)) state.category = 'Para ti';
      if (!paymentMethods.some(method => method.id === state.payment)) state.payment = paymentMethods[0]?.id || '';
      renderCategories(); renderProducts();
      if (!$('#cart-overlay').hidden && ['cart','checkout'].includes(state.cartStep)) renderCart();
      showAvailabilityAlert();
  }
  let catalogLoading = null, catalogQueued = false;
  function loadStoreData(showError = false, queue = false) {
    if (catalogLoading) { if (queue) catalogQueued = true; return catalogLoading; }
    catalogLoading = refreshStoreData(showError).finally(() => { catalogLoading = null; if (catalogQueued) { catalogQueued = false; void loadStoreData(false); } });
    return catalogLoading;
  }
  async function refreshStoreData(showError) {
    if (!supabaseClient) { renderCategories(); renderProducts(); return; }
    try {
      const [productResult,toppingResult,paymentResult,neighborhoodResult] = await Promise.all([
        supabaseClient.from('products').select('*').order('sort_order').order('name'),
        supabaseClient.from('toppings').select('*').order('kind').order('sort_order'),
        supabaseClient.from('payment_methods').select('*').order('sort_order'),
        supabaseClient.from('neighborhoods').select('*').order('sort_order').order('name')
      ]);
      const firstError = [productResult,toppingResult,paymentResult,neighborhoodResult].find(result => result.error)?.error;
      if (firstError) throw firstError;
      state.catalogReady = true;
      const data = [productResult,toppingResult,paymentResult,neighborhoodResult];
      fast.write('catalog',data,localStorage);
      applyStoreData(data);
    } catch {
      if (showError) toast('Usando la carta local', 'No fue posible sincronizar con Supabase.');
      renderCategories(); renderProducts();
    }
  }

  function connectRealtime() {
    if (!supabaseClient) return;
    let refreshTimer;
    const refresh = () => { clearTimeout(refreshTimer); refreshTimer = setTimeout(() => loadStoreData(false,true), 80); };
    state.realtime = supabaseClient.channel('juanelos-storefront')
      .on('postgres_changes',{event:'*',schema:'public',table:'products'},refresh)
      .on('postgres_changes',{event:'*',schema:'public',table:'toppings'},refresh)
      .on('postgres_changes',{event:'*',schema:'public',table:'payment_methods'},refresh)
      .on('postgres_changes',{event:'*',schema:'public',table:'neighborhoods'},refresh)
      .subscribe();
    state.orderSignal = supabaseClient.channel('juanelos-orders-live')
      .subscribe();
  }

  function renderCategories() {
    const root = $('#categories');
    root.innerHTML = categories.map(name => `<button role="tab" aria-selected="${state.category === name}" data-category="${escapeHtml(name)}">${escapeHtml(name)}</button>`).join('');
  }
  function visibleProducts() {
    const query = state.query.trim().toLowerCase();
    return products.filter(product => (state.category === 'Para ti' ? product.featured : product.category === state.category) && (!query || `${product.name} ${product.description} ${product.category}`.toLowerCase().includes(query)));
  }
  function renderProducts(loading = false) {
    const root = $('#products');
    if (loading) { root.innerHTML = '<div class="skeleton"></div>'.repeat(6); return; }
    const list = visibleProducts();
    if (!list.length) { root.innerHTML = '<div class="empty"><b>No encontramos ese antojo</b><p>Prueba con otro nombre o explora una categoría.</p><button id="reset-filter">Ver recomendados</button></div>'; return; }
    root.innerHTML = list.map(product => `<article class="product-card ${product.available === false ? 'sold-out' : ''}" data-product="${escapeHtml(product.id)}" tabindex="0" aria-label="${escapeHtml(product.name)}${product.available === false ? ', agotado' : ''}">
      <button class="favorite" data-favorite="${escapeHtml(product.id)}" aria-label="Guardar ${escapeHtml(product.name)}">♡</button>
      <div class="product-image"><img src="${escapeHtml(fast.imageUrl(product.image))}" alt="${escapeHtml(product.name)}" loading="lazy">${product.badge ? `<span class="product-badge">${escapeHtml(product.badge)}</span>` : ''}${product.available === false ? '<span class="sold-label">Agotado</span>' : ''}</div>
      <div class="product-copy"><h3>${escapeHtml(product.name)}</h3><p>${escapeHtml(product.description)}</p><div class="product-foot"><strong>${money(product.price)}</strong><button class="add" ${product.available === false ? 'disabled' : ''} data-add="${escapeHtml(product.id)}" aria-label="Personalizar ${escapeHtml(product.name)}">+</button></div></div>
    </article>`).join('');
  }

  function defaultSelections(product) { const values = {}; (product.modifiers || []).forEach(modifier => { values[modifier.id] = []; }); return values; }
  function selectedUnitPrice() { return state.active ? state.active.price + (state.active.modifiers || []).reduce((sum,modifier) => sum + (state.selections[modifier.id] || []).reduce((groupSum,id) => groupSum + (modifier.options.find(item => item.id === id)?.price || 0),0),0) : 0; }
  function groupIsComplete(modifier) { return !modifier.required || (state.selections[modifier.id] || []).length >= (modifier.min || 1); }
  function firstMissingGroup() { return (state.active?.modifiers || []).find(modifier => !groupIsComplete(modifier)); }
  function optionLabel(item) { return Object.values(item.selectionLabels || {}).flat().join(' · ') || 'Preparación original'; }
  function quantityMarkup(value,key='detail') { return `<div class="quantity ${key !== 'detail' ? 'compact' : ''}" data-quantity="${escapeHtml(key)}"><button data-qty="minus" aria-label="Disminuir">−</button><b>${value}</b><button data-qty="plus" aria-label="Aumentar">+</button></div>`; }

  function openProduct(product,item=null) {
    if (!product || product.available === false) { toast('Producto agotado','Estará disponible nuevamente muy pronto.'); return; }
    state.active = product;
    state.selections = defaultSelections(product);
    if (item) {
      (product.modifiers || []).forEach(modifier => {
        const allowed = new Set(modifier.options.map(entry => entry.id));
        state.selections[modifier.id] = (item.selections?.[modifier.id] || []).filter(id => allowed.has(id));
      });
    }
    state.quantity = item?.quantity || 1;
    state.editingKey = item?.key || null;
    renderProductDetail(); showOverlay('product');
  }
  function renderProductDetail() {
    const product = state.active; if (!product) return;
    const modifiers = (product.modifiers || []).map(modifier => `<fieldset class="modifier" data-modifier="${escapeHtml(modifier.id)}" tabindex="-1"><legend>${escapeHtml(modifier.name)}<small class="requirement-badge ${modifier.required && !groupIsComplete(modifier) ? 'is-pending' : ''}">${modifier.required ? 'Obligatorio' : `Opcional${modifier.max ? ` · Máx. ${modifier.max}` : ''}`}</small></legend>${modifier.options.map(item => {
      const checked = (state.selections[modifier.id] || []).includes(item.id);
      return `<label class="option"><span><input type="${modifier.type === 'single' ? 'radio' : 'checkbox'}" name="${escapeHtml(modifier.id)}" value="${escapeHtml(item.id)}" data-group="${escapeHtml(modifier.id)}" ${checked ? 'checked' : ''}>${escapeHtml(item.name)}</span><em>${item.price ? `+${money(item.price)}` : 'Incluido'}</em></label>`;
    }).join('')}</fieldset>`).join('');
    const complete = !firstMissingGroup();
    $('#product-detail').innerHTML = `<div class="detail-content"><div class="detail-photo"><img src="${escapeHtml(fast.imageUrl(product.image))}" alt="${escapeHtml(product.name)}"></div><div class="detail-head"><div><h2 id="product-title">${escapeHtml(product.name)}</h2><p>${escapeHtml(product.description)}</p></div><strong>${money(product.price)}</strong></div><div class="modifier-list">${modifiers}<div class="qty-block"><div><strong>Cantidad</strong><small>¿Cuántos quieres?</small></div>${quantityMarkup(state.quantity)}</div></div></div><div class="sticky-action"><button id="add-product" class="${complete ? '' : 'is-disabled'}" aria-disabled="${!complete}">${state.editingKey ? 'Actualizar pedido' : 'Agregar al pedido'} · <span id="detail-total">${money(selectedUnitPrice() * state.quantity)}</span></button></div>`;
  }
  function refreshDetailTotal() {
    $('#detail-total').textContent = money(selectedUnitPrice() * state.quantity);
    $('[data-quantity="detail"] b').textContent = state.quantity;
    (state.active?.modifiers || []).forEach(modifier => {
      const field = $(`.modifier[data-modifier="${CSS.escape(modifier.id)}"]`);
      const complete = groupIsComplete(modifier);
      field?.querySelector('.requirement-badge')?.classList.toggle('is-pending', modifier.required && !complete);
      if (complete) field?.classList.remove('modifier-attention');
    });
    const complete = !firstMissingGroup(), button = $('#add-product');
    button.classList.toggle('is-disabled', !complete); button.setAttribute('aria-disabled', String(!complete));
  }
  function addActive() {
    if (!state.active) return;
    const missing = firstMissingGroup();
    if (missing) { const field = $(`.modifier[data-modifier="${CSS.escape(missing.id)}"]`); field.classList.add('modifier-attention'); field.scrollIntoView({behavior:'smooth',block:'center'}); toast('Completa tu elección', missing.name); return; }
    const selectionLabels = {};
    (state.active.modifiers || []).forEach(modifier => { selectionLabels[modifier.id] = (state.selections[modifier.id] || []).map(id => modifier.options.find(item => item.id === id)?.name).filter(Boolean); });
    const item = { key:state.editingKey || `${state.active.id}-${Date.now()}`, productId:state.active.id, productSnapshot:{...state.active}, quantity:state.quantity, selections:structuredClone(state.selections), selectionLabels, unitPrice:selectedUnitPrice() };
    state.cart = state.editingKey ? state.cart.map(entry => entry.key === state.editingKey ? item : entry) : [...state.cart,item];
    saveCart(); hideOverlay('product'); toast(state.editingKey ? 'Producto actualizado' : 'Agregado a tu pedido', `${item.quantity} × ${state.active.name}`, true); state.active = null; state.editingKey = null;
  }

  function confettiMarkup(count = 58) {
    const colors = ['#10a5d2','#073b57','#ff6b35','#8b2ad9','#ffd23f','#21c778'];
    return Array.from({ length: count }, (_, index) => {
      const x = (index * 37 + 7) % 100;
      const delay = -((index * 0.13) % 4.8);
      const duration = 3.6 + ((index * 17) % 25) / 10;
      const drift = ((index * 29) % 120) - 60;
      const rotation = (index * 67) % 360;
      const color = colors[index % colors.length];
      const shape = index % 3 === 0 ? 'round' : index % 3 === 1 ? 'strip' : 'square';
      return `<i class="confetti-piece ${shape}" style="--x:${x};--delay:${delay}s;--duration:${duration}s;--drift:${drift}px;--rotation:${rotation}deg;--color:${color}"></i>`;
    }).join('');
  }

  function startSendingMessages() {
    clearInterval(state.sendingTimer);
    const messages = ['Enviando tu pedido a Juanelos…','Confirmando productos y total…','Avisando al equipo de cocina…','Ya casi está listo…'];
    let index = 0;
    state.sendingTimer = setInterval(() => {
      const message = $('#sending-message');
      if (!message || state.cartStep !== 'sending') return clearInterval(state.sendingTimer);
      index = (index + 1) % messages.length;
      message.classList.remove('message-in');
      requestAnimationFrame(() => { message.textContent = messages[index]; message.classList.add('message-in'); });
    }, 1250);
  }

  function receiptMarkup() {
    return `<div class="receipt-card-heading"><span aria-hidden="true">▤</span><div><strong>Comprobante de pago</strong><p>Opcional · Adjunta la imagen de tu transferencia.</p></div></div>${state.receipt ? `<div class="receipt-selected"><img src="${state.receipt.dataUrl}" alt="Vista previa del comprobante"><div><strong>${escapeHtml(state.receipt.name)}</strong><span>Se enviará junto con tu pedido.</span><button type="button" id="receipt-remove">Quitar imagen</button></div></div>` : ''}<label class="premium-upload"><input name="receiptFile" id="receipt-file" type="file" accept="image/png,image/jpeg,image/webp" ${state.receiptBusy ? 'disabled' : ''}><span class="upload-symbol" aria-hidden="true">↑</span><span><strong>${state.receiptBusy ? 'Preparando imagen…' : state.receipt ? 'Cambiar comprobante' : 'Seleccionar comprobante'}</strong><small>JPG, PNG o WebP · hasta 10 MB</small></span><b aria-hidden="true">+</b></label>`;
  }
  async function selectReceipt(file) {
    if (!file) return;
    const revision = ++state.receiptRevision; state.receiptBusy = true;
    $('#checkout-receipt').innerHTML = receiptMarkup(); $('#confirm-order').disabled = true;
    try { const receipt = await window.JuanelosServices.prepareReceipt(file); if (revision === state.receiptRevision) state.receipt = receipt; }
    catch (error) { toast('Revisa el comprobante', error.message); }
    finally { if (revision === state.receiptRevision) { state.receiptBusy = false; const wrapper = $('#checkout-receipt'); if (wrapper) wrapper.innerHTML = receiptMarkup(); const button = $('#confirm-order'); if (button) button.disabled = false; } }
  }

  function renderCart() {
    const root = $('#cart-content'), action = $('#cart-action');
    $('#cart-overlay .cart-sheet').classList.toggle('checkout-view', state.cartStep === 'checkout');
    $('#cart-overlay .cart-sheet').classList.toggle('celebration-view', state.cartStep === 'sending' || state.cartStep === 'success');
    if (state.cartStep !== 'sending') clearInterval(state.sendingTimer);
    $('#cart-kicker').textContent = state.cartStep === 'cart' ? 'TU PEDIDO' : state.cartStep === 'checkout' ? 'FINALIZAR' : state.cartStep === 'sending' ? 'ENVIANDO' : 'ORDEN RECIBIDA';
    $('#cart-title').textContent = state.cartStep === 'cart' ? 'Tu pedido' : state.cartStep === 'checkout' ? 'Datos del pedido' : state.cartStep === 'sending' ? 'Creando tu orden' : 'Pedido confirmado';
    $('#cart-back').textContent = state.cartStep === 'checkout' ? '←' : '×';
    if (state.cartStep === 'sending') {
      root.innerHTML = `<div class="sending-experience" role="status" aria-live="polite"><div class="sending-orbit" aria-hidden="true"><span></span><span></span><span></span><div class="sending-logo"><img src="./images/juanelos-app-icon-192.png" alt="" decoding="async" loading="lazy"></div></div><small>ESTAMOS PREPARANDO TODO</small><h3>Tu orden va en camino</h3><p id="sending-message" class="message-in">Enviando tu pedido a Juanelos…</p><div class="sending-progress" aria-hidden="true"><i></i></div><div class="sending-tip"><strong>Un momento delicioso</strong><span>No cierres esta ventana mientras confirmamos tu pedido.</span></div></div>`;
      action.innerHTML = '';
      startSendingMessages();
      return;
    }
    if (state.cartStep === 'success') {
      root.innerHTML = `<div class="confetti-layer" aria-hidden="true">${confettiMarkup()}</div><div class="success success-celebration"><button class="success-close" id="success-close" type="button" aria-label="Cerrar">×</button><div class="success-mark"><svg viewBox="0 0 52 52" aria-hidden="true"><path d="M14 27.5 22.5 36 39 18"></path></svg></div><small>ORDEN REALIZADA</small><h3>¡Pedido realizado<br>con éxito!</h3><p>Gracias, ${escapeHtml(state.customer.name.split(' ')[0] || '')}. Te llevaremos a WhatsApp para enviar los detalles de tu pedido.</p><div class="order-number"><small>NÚMERO DE PEDIDO</small><strong>${escapeHtml(state.lastOrderId)}</strong></div><button id="finish-order">Volver al menú</button></div>`;
      if (delivery.confirmed && delivery.active) {
        $('.success-celebration p', root).textContent = 'Tu ubicación se está compartiendo con Juanelos. Envíanos los detalles por WhatsApp sin cerrar esta página.';
        const link = document.createElement('a'); link.href = state.lastWhatsappUrl; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.className = 'order-whatsapp-link'; link.textContent = 'Enviar pedido por WhatsApp ↗'; $('#finish-order').before(link);
      }
      action.innerHTML = ''; return;
    }
    if (state.cartStep === 'checkout') {
      const selectedPayment = paymentMethods.find(method => method.id === state.payment);
      const paymentInfo = selectedPayment ? `<div class="payment-info"><div><small>Dato para pagar</small><strong>${escapeHtml(selectedPayment.account_value || 'Pendiente de configurar')}</strong><span>${escapeHtml(selectedPayment.instructions || '')}</span></div>${selectedPayment.account_value ? '<button type="button" id="copy-payment" aria-label="Copiar dato de pago">▣</button>' : ''}</div>` : '';
      const neighborhoodOptions = neighborhoods.map(item => `<option value="${escapeHtml(item.name)}"></option>`).join('');
      const deliveryFields = state.fulfillment === 'delivery' ? `<div class="delivery-fields"><label>Dirección<input name="address" value="${escapeHtml(state.customer.address)}" placeholder="Calle, carrera, número y detalles" maxlength="120" autocomplete="street-address" required><div class="neighborhood-suggestions" id="neighborhood-suggestions"></div></label><label>Barrio<input name="neighborhood" list="neighborhood-list" value="${escapeHtml(state.customer.neighborhood)}" placeholder="Escribe y selecciona tu barrio" maxlength="60" autocomplete="off" required><datalist id="neighborhood-list">${neighborhoodOptions}</datalist></label></div>` : '';
      root.innerHTML = `<form class="checkout" id="checkout-form"><fieldset class="checkout-choice"><legend>¿Cómo quieres recibir tu pedido?</legend><div class="choice-grid"><label><input type="radio" name="fulfillment" value="pickup" ${state.fulfillment === 'pickup' ? 'checked' : ''}><span><b>⌂</b><strong>Recoger</strong><small>En Juanelos</small></span></label><label><input type="radio" name="fulfillment" value="delivery" ${state.fulfillment === 'delivery' ? 'checked' : ''}><span><b>⌖</b><strong>Domicilio</strong><small>En tu dirección</small></span></label></div></fieldset>${deliveryFields}<label>Nombre completo<input name="name" value="${escapeHtml(state.customer.name)}" placeholder="¿A nombre de quién?" maxlength="60" autocomplete="name" required></label><label>Teléfono<input name="phone" type="tel" inputmode="tel" value="${escapeHtml(state.customer.phone)}" placeholder="300 000 0000" maxlength="20" autocomplete="tel" required></label><label>Indicaciones especiales <small><span id="note-count">${state.customer.notes.length}</span>/180</small><textarea name="notes" maxlength="180" placeholder="Ej: sin pitillo, alergias o alguna indicación...">${escapeHtml(state.customer.notes)}</textarea></label><fieldset class="checkout-choice payment-choice"><legend>Método de pago</legend><div class="payment-grid">${paymentMethods.map(method => `<label><input type="radio" name="payment" value="${escapeHtml(method.id)}" ${state.payment === method.id ? 'checked' : ''}><span>${escapeHtml(method.name)}</span></label>`).join('')}</div></fieldset>${paymentInfo}<div class="summary"><div><span>Subtotal</span><span>${money(subtotal())}</span></div>${state.fulfillment === 'delivery' ? `<div><span>Domicilio${state.selectedNeighborhood ? ` · ${escapeHtml(state.selectedNeighborhood.name)}` : ''}</span><span>${state.selectedNeighborhood ? money(deliveryFee()) : 'Selecciona tu barrio'}</span></div>` : ''}<div class="total"><strong>Total</strong><strong>${money(total())}</strong></div></div></form>`;
      if (state.fulfillment === 'delivery') {
        const wrapper = document.createElement('div'); wrapper.id = 'checkout-location'; wrapper.innerHTML = delivery.markup(); $('.delivery-fields', root).after(wrapper);
      }
      const receipt = document.createElement('section'); receipt.id = 'checkout-receipt'; receipt.className = 'receipt-checkout-card'; receipt.innerHTML = receiptMarkup(); ($('.payment-info', root) || $('.payment-choice', root)).after(receipt);
      action.innerHTML = `<button id="confirm-order" ${state.receiptBusy ? 'disabled' : ''}>Confirmar pedido · ${money(total())}</button>`; return;
    }
    if (!state.cart.length) { root.innerHTML = '<div class="cart-empty"><i>♢</i><h3>Tu pedido está vacío</h3><p>Explora el menú y agrega algo delicioso.</p><button id="explore-menu">Explorar el menú</button></div>'; action.innerHTML = ''; return; }
    const issues = cartAvailabilityIssues();
    root.innerHTML = `<div class="cart-items">${state.cart.map(item => { const product = productById(item.productId) || item.productSnapshot; const issue = issues.find(entry => entry.item.key === item.key); return `<article class="cart-item ${issue ? 'is-unavailable' : ''}"><div class="cart-thumb"><img src="${escapeHtml(fast.imageUrl(product.image))}" alt="${escapeHtml(product.name)}">${issue ? '<span>Agotado</span>' : ''}</div><div class="cart-info"><div class="cart-name"><strong>${escapeHtml(product.name)}</strong><button class="delete" data-delete="${escapeHtml(item.key)}" aria-label="Eliminar ${escapeHtml(product.name)}">×</button></div>${issue ? `<div class="cart-availability">${issue.reasons.map(reason => escapeHtml(reason)).join(' ')}</div>` : `<p>${escapeHtml(optionLabel(item))}</p>`}<button class="edit" data-edit="${escapeHtml(item.key)}">✎ Editar</button><div class="cart-line">${quantityMarkup(item.quantity,item.key)}<strong>${money(item.unitPrice * item.quantity)}</strong></div></div></article>`; }).join('')}</div><button class="continue" id="continue-shopping">＋ Seguir agregando</button><div class="summary"><div><span>Subtotal</span><span>${money(subtotal())}</span></div><div class="total"><strong>Total</strong><strong>${money(subtotal())}</strong></div></div>`;
    action.innerHTML = `<button id="go-checkout" ${issues.length ? 'disabled' : ''}>${issues.length ? 'Revisa lo agotado' : `Continuar · ${money(subtotal())}`}</button>`;
  }

  function openCart() { state.cartStep = 'cart'; renderCart(); showOverlay('cart'); }
  function showOverlay(name) { $(`#${name}-overlay`).hidden = false; document.body.classList.add('modal-open'); }
  function hideOverlay(name) { $(`#${name}-overlay`).hidden = true; if (!$$('.overlay:not([hidden])').length) document.body.classList.remove('modal-open'); }
  function setNeighborhood(value) {
    const normalized = String(value || '').trim().toLocaleLowerCase('es');
    state.selectedNeighborhood = neighborhoods.find(item => item.name.toLocaleLowerCase('es') === normalized) || null;
    state.customer.neighborhood = state.selectedNeighborhood?.name || String(value || '');
  }
  function renderAddressSuggestions(value) {
    const root = $('#neighborhood-suggestions'); if (!root) return;
    const query = value.trim().toLocaleLowerCase('es');
    if (query.length < 2) { root.innerHTML = ''; return; }
    const matches = neighborhoods.filter(item => item.name.toLocaleLowerCase('es').includes(query) || query.includes(item.name.toLocaleLowerCase('es'))).slice(0,5);
    root.innerHTML = matches.map(item => `<button type="button" data-neighborhood="${escapeHtml(item.id)}"><span>${escapeHtml(item.name)}</span><strong>${money(item.delivery_fee)}</strong></button>`).join('');
  }
  function chooseNeighborhood(id) {
    const neighborhood = neighborhoods.find(item => item.id === id); if (!neighborhood) return;
    state.selectedNeighborhood = neighborhood; state.customer.neighborhood = neighborhood.name;
    const field = $('[name="neighborhood"]'); if (field) field.value = neighborhood.name;
    $('#neighborhood-suggestions').innerHTML = '';
    renderCart();
  }
  function guideCheckoutField(selector,title,copy) { const field = $(selector,$('#checkout-form')); if (!field) return; const target = field.type === 'radio' ? field.closest('.checkout-choice') : field.closest('label'); target.classList.add('checkout-attention'); target.scrollIntoView({behavior:'smooth',block:'center'}); field.focus({preventScroll:true}); toast(title,copy); }
  async function confirmOrder() {
    if (state.cartStep === 'sending' || state.receiptBusy) return;
    if (!state.catalogReady) { void loadStoreData(true); return toast('Actualizando la carta','Estamos verificando los precios y la disponibilidad antes de confirmar.'); }
    if (delivery.preparing) return toast('Un momento', 'Espera a que termine la solicitud de ubicación o continúa sin compartirla.');
    const digits = state.customer.phone.replace(/\D/g,'');
    if (cartAvailabilityIssues().length) {
      showAvailabilityAlert();
      return toast('Revisa tu pedido', 'Un producto o topping dejó de estar disponible.');
    }
    if (state.fulfillment === 'delivery' && !state.customer.address.trim()) return guideCheckoutField('[name="address"]','Completa el domicilio','Ingresa la dirección para continuar.');
    if (state.fulfillment === 'delivery' && !state.selectedNeighborhood) return guideCheckoutField('[name="neighborhood"]','Selecciona un barrio','Elige un barrio de la lista para calcular el domicilio.');
    if (!state.customer.name.trim()) return guideCheckoutField('[name="name"]','Completa tus datos','Ingresa tu nombre para continuar.');
    if (digits.length < 7) return guideCheckoutField('[name="phone"]','Completa tus datos','Ingresa un teléfono válido para continuar.');
    if (!state.payment) return guideCheckoutField('[name="payment"]','Selecciona el pago','Elige un método de pago para continuar.');
    if (!isOrdersConfigured) return toast('Falta conectar las órdenes','Configura el URL de Apps Script al inicio de app.js.');
    const selectedPayment = paymentMethods.find(method => method.id === state.payment);
    const order = {
      customerName:state.customer.name,phone:state.customer.phone,fulfillment:state.fulfillment,
      address:state.customer.address,neighborhood:state.customer.neighborhood,deliveryFee:deliveryFee(),
      subtotal:subtotal(),paymentMethod:selectedPayment?.name || state.payment,paymentValue:selectedPayment?.account_value || '',notes:state.customer.notes,
      items:state.cart.map(item => ({ productId:item.productId,name:(productById(item.productId) || item.productSnapshot).name,quantity:item.quantity,unitPrice:item.unitPrice,selections:Object.values(item.selectionLabels || {}).flat() }))
    };
    if (state.receipt) order.receipt = { name:state.receipt.name, mimeType:state.receipt.mimeType, base64:state.receipt.base64 };
    if (state.fulfillment === 'delivery' && delivery.payload()) order.liveLocation = delivery.payload();
    state.cartStep = 'sending';
    renderCart();
    try {
      if (order.receipt) await window.JuanelosServices.requireCapability('receipts');
      if (order.liveLocation) await window.JuanelosServices.requireCapability('liveLocation');
      const response = await fetch(CONFIG.appsScriptUrl, { method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action:'createOrder',order,supabaseUrl:CONFIG.supabaseUrl,supabaseAnonKey:CONFIG.supabaseAnonKey}) });
      const result = await response.json(); if (!result.ok) throw new Error(result.error || 'No se pudo crear la orden.');
      if (state.orderSignal) void state.orderSignal.send({ type:'broadcast', event:'order-created', payload:{ orderId:result.orderId } });
      const whatsappUrl = orderWhatsAppUrl(order, result.orderId, result.total);
      if (result.locationEnabled && order.liveLocation) delivery.bind(result.orderId);
      state.lastWhatsappUrl = whatsappUrl; state.lastOrderId = result.orderId; state.orderTotal = result.total; state.cartStep = 'success'; state.cart = []; state.receipt = null; saveCart(); renderCart();
      if (!delivery.active) setTimeout(() => { window.location.assign(whatsappUrl); }, 900);
    } catch (error) { state.cartStep = 'checkout'; renderCart(); toast('No pudimos enviar la orden', error.message || 'Intenta nuevamente.'); }
  }

  $('#categories').addEventListener('click', event => { const button = event.target.closest('[data-category]'); if (!button) return; state.category = button.dataset.category; renderCategories(); renderProducts(); });
  $('#products').addEventListener('click', event => { if (event.target.closest('[data-favorite]')) return toast('Guardado en favoritos','Lo tendrás a mano para tu próxima compra.'); const target = event.target.closest('[data-product],[data-add]'); if (target) openProduct(productById(target.dataset.product || target.dataset.add)); });
  $('#products').addEventListener('keydown', event => { if ((event.key === 'Enter' || event.key === ' ') && event.target.matches('[data-product]')) { event.preventDefault(); openProduct(productById(event.target.dataset.product)); } });
  $('#search').addEventListener('input', event => { state.query = event.target.value; $('#clear-search').hidden = !state.query; renderProducts(); });
  $('#clear-search').addEventListener('click', () => { state.query = ''; $('#search').value = ''; $('#clear-search').hidden = true; renderProducts(); });
  $('#products').addEventListener('click', event => { if (event.target.id === 'reset-filter') { state.query = ''; state.category = 'Para ti'; $('#search').value = ''; renderCategories(); renderProducts(); } });
  $('#product-detail').addEventListener('change', event => { const input = event.target.closest('[data-group]'); if (!input) return; const modifier = state.active.modifiers.find(item => item.id === input.dataset.group); const current = state.selections[modifier.id] || []; if (modifier.type === 'single') state.selections[modifier.id] = [input.value]; else if (input.checked) { if (modifier.max && current.length >= modifier.max) { input.checked = false; return toast('Máximo alcanzado',`Puedes elegir hasta ${modifier.max} opciones.`); } state.selections[modifier.id] = [...current,input.value]; } else state.selections[modifier.id] = current.filter(id => id !== input.value); refreshDetailTotal(); });
  $('#product-detail').addEventListener('click', event => { const quantity = event.target.closest('[data-qty]'); if (quantity) { state.quantity = Math.max(1,state.quantity + (quantity.dataset.qty === 'plus' ? 1 : -1)); refreshDetailTotal(); } if (event.target.closest('#add-product')) addActive(); });
  $('[data-close="product"]').addEventListener('click', () => hideOverlay('product'));
  $('#product-overlay').addEventListener('click', event => { if (event.target.id === 'product-overlay') hideOverlay('product'); });
  $('#header-cart').addEventListener('click', openCart); $('#nav-cart').addEventListener('click', openCart);
  $('#cart-overlay').addEventListener('click', event => { if (event.target.id === 'cart-overlay' && state.cartStep !== 'sending') hideOverlay('cart'); });
  $('#cart-back').addEventListener('click', () => {
    if (state.cartStep === 'sending') return;
    if (state.cartStep === 'checkout') { state.cartStep = 'cart'; renderCart(); return; }
    hideOverlay('cart');
    if (state.cartStep === 'success') { state.cartStep = 'cart'; state.customer = {name:'',phone:'',address:'',neighborhood:'',notes:''}; }
  });
  $('#cart-content').addEventListener('click', event => {
    if (event.target.closest('#checkout-location-toggle')) { if (delivery.active) void delivery.stop(); else delivery.open(); return; }
    if (event.target.closest('#receipt-remove')) { state.receiptRevision++; state.receiptBusy = false; state.receipt = null; $('#checkout-receipt').innerHTML = receiptMarkup(); $('#confirm-order').disabled = false; return; }
    const remove = event.target.closest('[data-delete]'); if (remove) { state.cart = state.cart.filter(item => item.key !== remove.dataset.delete); saveCart(); renderCart(); return; }
    const edit = event.target.closest('[data-edit]'); if (edit) { const item = state.cart.find(entry => entry.key === edit.dataset.edit); hideOverlay('cart'); openProduct(productById(item.productId) || item.productSnapshot,item); return; }
    const quantity = event.target.closest('[data-quantity] [data-qty]'); if (quantity) { const wrapper = quantity.closest('[data-quantity]'), item = state.cart.find(entry => entry.key === wrapper.dataset.quantity); item.quantity = Math.max(1,item.quantity + (quantity.dataset.qty === 'plus' ? 1 : -1)); saveCart(); renderCart(); return; }
    const suggestion = event.target.closest('[data-neighborhood]'); if (suggestion) { chooseNeighborhood(suggestion.dataset.neighborhood); return; }
    if (event.target.closest('#copy-payment')) { const method = paymentMethods.find(item => item.id === state.payment); void copyText(method.account_value).then(() => toast('Dato copiado',method.account_value)).catch(() => toast('No pudimos copiar', 'Mantén presionado el dato para copiarlo.')); }
    if (event.target.closest('#continue-shopping') || event.target.closest('#explore-menu')) hideOverlay('cart');
    if (event.target.closest('#finish-order') || event.target.closest('#success-close')) { hideOverlay('cart'); state.cartStep = 'cart'; state.customer = {name:'',phone:'',address:'',neighborhood:'',notes:''}; }
  });
  $('#cart-content').addEventListener('input', event => {
    if (event.target.name === 'receiptFile') return;
    if (!event.target.name) return;
    event.target.closest('.checkout-attention')?.classList.remove('checkout-attention');
    if (event.target.name === 'fulfillment') { state.fulfillment = event.target.value; if (state.fulfillment === 'pickup') { state.selectedNeighborhood = null; if (!delivery.confirmed) void delivery.stop(); } renderCart(); return; }
    if (event.target.name === 'payment') { state.payment = event.target.value; renderCart(); return; }
    state.customer[event.target.name] = event.target.value;
    if (event.target.name === 'notes') $('#note-count').textContent = event.target.value.length;
    if (event.target.name === 'address') renderAddressSuggestions(event.target.value);
    if (event.target.name === 'neighborhood') { setNeighborhood(event.target.value); const current = event.target.value; const selected = state.selectedNeighborhood; if (selected) { state.customer.neighborhood = selected.name; event.target.value = selected.name; setTimeout(renderCart,0); } else state.customer.neighborhood = current; }
  });
  $('#cart-action').addEventListener('click', event => { if (event.target.closest('#go-checkout')) { state.cartStep = 'checkout'; renderCart(); } if (event.target.closest('#confirm-order')) void confirmOrder(); });
  $('#cart-content').addEventListener('change', event => { if (event.target.name === 'receiptFile') void selectReceipt(event.target.files?.[0]); });
  $('#favorites').addEventListener('click', () => toast('Tus favoritos','Toca el corazón de un producto para guardarlo.'));
  $('#profile').addEventListener('click', () => toast('Perfil','Tus pedidos se coordinan con Juanelos por WhatsApp.'));
  document.body.classList.add('modal-open');
  $('#welcome-close').addEventListener('click', () => hideOverlay('welcome')); $('#welcome-dismiss').addEventListener('click', () => hideOverlay('welcome')); $('#welcome-overlay').addEventListener('click', event => { if (event.target.id === 'welcome-overlay') hideOverlay('welcome'); });
  $('#availability-dismiss').addEventListener('click', () => hideOverlay('availability'));
  $('#availability-review').addEventListener('click', () => { hideOverlay('availability'); $('#welcome-overlay').hidden = true; openCart(); });
  $('#availability-overlay').addEventListener('click', event => { if (event.target.id === 'availability-overlay') hideOverlay('availability'); });
  localProducts.forEach(product => { product.image = fast.imageUrl(product.image); });
  const cachedCatalog = fast.read('catalog',3 * 60000,localStorage);
  if (Array.isArray(cachedCatalog) && cachedCatalog.length === 4 && cachedCatalog.every(result => Array.isArray(result.data))) applyStoreData(cachedCatalog);
  else { renderCategories(); renderProducts(); }
  updateCounts();
  void loadStoreData(true);
  connectRealtime();
})();
