(() => {
  'use strict';

  const CONFIG = window.JUANELOS_CONFIG || {};
  const fast = window.JuanelosPerformance;
  const configured = /^https:\/\/.+\.supabase\.co$/i.test(CONFIG.supabaseUrl || '')
    && CONFIG.supabaseAnonKey && !String(CONFIG.supabaseAnonKey).includes('PEGA_')
    && /^https:\/\/script\.google\.com\//i.test(CONFIG.appsScriptUrl || '');
  const client = configured && window.supabase
    ? window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseAnonKey, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
      })
    : null;

  const state = {
    token: localStorage.getItem('juanelos-admin-token') || '',
    user: null,
    snapshot: { products: [], toppings: [], payments: [], neighborhoods: [], users: [], audit: [] },
    orders: [],
    orderRevision: -1,
    orderPage: 1,
    orderPageSize: 15,
    orderQuery: '',
    activeSection: 'orders',
    brandLinks: [], brandLinksReady: false, brandLinksLoading: false,
    editor: null,
    realtime: null,
    orderRealtime: null,
    orderEventsRealtime: null,
    orderTimer: null,
    ordersLoading: false,
    ordersReloadQueued: false,
    ordersReloadForce: false,
    ordersInitialized: false,
    knownOrderIds: new Set(),
    alertsArmed: false,
    audioUnlocked: false,
    audioUnlocking: false,
    notificationAudio: null,
    nativeNotifications: [],
    pendingOrderId: new URLSearchParams(location.search).get('order') || ''
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const moneyFormatter = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
  const dateFormatter = new Intl.DateTimeFormat('es-CO', { dateStyle: 'short', timeStyle: 'short' });
  const money = value => moneyFormatter.format(Number(value) || 0);
  const dateTime = value => value ? dateFormatter.format(new Date(value)) : '—';
  const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[character]));
  const slug = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 70);
  const can = permission => state.user?.role === 'jefe' || Boolean(state.user?.permissions?.[permission]);
  const formText = (form, name) => { const value = form.get(name); return typeof value === 'string' ? value : ''; };
  let deleteConfirmationResolve = null;
  let deleteConfirmationFocus = null;

  async function copyText(value) {
    if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(value);
    window.prompt('Copia este contenido:', value);
  }

  function toast(title, copy = '') {
    const element = $('#admin-toast');
    $('strong', element).textContent = title;
    $('span', element).textContent = copy;
    element.hidden = false;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => { element.hidden = true; }, 3300);
  }

  function confirmDeletion(title, copy, confirmLabel = 'Sí, eliminar') {
    if (deleteConfirmationResolve) deleteConfirmationResolve(false);
    deleteConfirmationFocus = document.activeElement;
    $('#delete-confirm-title').textContent = title;
    $('#delete-confirm-copy').textContent = copy;
    $('#confirm-delete').textContent = confirmLabel;
    $('#delete-confirm-modal').hidden = false;
    requestAnimationFrame(() => $('#cancel-delete').focus());
    return new Promise(resolve => { deleteConfirmationResolve = resolve; });
  }

  function closeDeleteConfirmation(confirmed) {
    if (!deleteConfirmationResolve) return;
    const resolve = deleteConfirmationResolve;
    deleteConfirmationResolve = null;
    $('#delete-confirm-modal').hidden = true;
    if (deleteConfirmationFocus instanceof HTMLElement) deleteConfirmationFocus.focus();
    deleteConfirmationFocus = null;
    resolve(confirmed);
  }

  function armAlerts(event) {
    if (!state.token) return;
    if (!state.alertsArmed) {
      state.alertsArmed = true;
      sessionStorage.setItem('juanelos-alerts-armed', '1');
      state.notificationAudio = new Audio('./sounds/order-notification.mp3');
      state.notificationAudio.preload = 'auto';
      const status = $('#alert-status');
      if (status) { status.classList.add('is-active'); status.innerHTML = '<i></i> Alertas internas activas'; }
    }
    if (!state.audioUnlocked && !state.audioUnlocking && state.notificationAudio) {
      state.audioUnlocking = true;
      state.notificationAudio.volume = 0;
      const unlock = state.notificationAudio.play();
      if (unlock) unlock.then(() => {
        state.notificationAudio.pause();
        state.notificationAudio.currentTime = 0;
        state.notificationAudio.volume = 0.82;
        state.audioUnlocked = true;
        state.audioUnlocking = false;
      }).catch(() => { state.notificationAudio.volume = 0.82; state.audioUnlocking = false; });
      else { state.notificationAudio.volume = 0.82; state.audioUnlocked = true; state.audioUnlocking = false; }
    }
    const explicitGesture = event && ['pointerdown','touchstart','keydown','click'].includes(event.type);
    if (explicitGesture && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        const status = $('#alert-status');
        if (status) status.innerHTML = permission === 'granted' ? '<i></i> Sonido y Chrome activos' : '<i></i> Alertas internas activas';
      }).catch(() => {});
    } else if ('Notification' in window && Notification.permission === 'granted') {
      const status = $('#alert-status');
      if (status) status.innerHTML = '<i></i> Sonido y Chrome activos';
    }
  }

  function playOrderSound() {
    if (!state.alertsArmed || !state.notificationAudio) return;
    state.notificationAudio.currentTime = 0;
    state.notificationAudio.play().catch(() => {});
  }

  function platformNotification(order) {
    const root = $('#platform-notifications');
    const notice = document.createElement('button');
    notice.type = 'button';
    notice.className = 'platform-notification';
    notice.dataset.notificationOrder = order.id;
    notice.innerHTML = `<span class="notification-pulse"></span><div><small>NUEVA ORDEN</small><strong>${escapeHtml(order.id)} · ${escapeHtml(order.customerName)}</strong><span>${money(order.total)} · Toca para abrirla</span></div><b>→</b>`;
    root.prepend(notice);
    setTimeout(() => notice.classList.add('show'), 20);
    setTimeout(() => { notice.classList.remove('show'); setTimeout(() => notice.remove(), 260); }, 9000);
  }

  async function showSystemNotification(orders) {
    if (!state.alertsArmed || !('Notification' in window) || Notification.permission !== 'granted') return;
    const first = orders[0];
    const title = orders.length === 1 ? `Nueva orden ${first.id}` : `${orders.length} órdenes nuevas`;
    const options = {
      body: orders.length === 1 ? `${first.customerName} · ${money(first.total)}` : 'Abre Juanelos Admin para atenderlas.',
      icon: './images/juanelos-app-icon-192.png',
      badge: './images/juanelos-app-icon-192.png',
      tag: `juanelos-orders-${state.orderRevision}`,
      renotify: true,
      data: { orderId: orders.length === 1 ? first.id : '' }
    };
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, options);
      return;
    }
    const notification = new Notification(title, options);
    notification.onclick = () => { window.focus(); switchSection('orders'); if (orders.length === 1) openOrder(first.id); notification.close(); };
    state.nativeNotifications.push(notification);
  }

  function announceNewOrders(orders) {
    if (!orders.length) return;
    playOrderSound();
    orders.forEach(platformNotification);
    void showSystemNotification(orders).catch(() => {});
  }

  function scheduleOrderPolling(delay = document.hidden ? 15000 : 3000) {
    clearTimeout(state.orderTimer);
    if (!state.token || !can('orders')) return;
    state.orderTimer = setTimeout(async () => {
      await loadOrders(false);
      scheduleOrderPolling();
    }, delay);
  }

  function errorMessage(error) {
    return error?.message?.replace(/^.*?message[:=]\s*/i, '') || 'No fue posible completar la acción.';
  }

  async function rpc(name, parameters = {}) {
    if (!client) throw new Error('Configura Supabase y Apps Script en las primeras líneas de config.js.');
    const { data, error } = await client.rpc(name, parameters);
    if (error) throw new Error(error.message);
    return data;
  }

  async function orderApi(action, data = {}) {
    if (!configured) throw new Error('Falta configurar el URL de Apps Script.');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), action === 'getOrderReceipt' ? 25000 : 9000);
    try {
      const response = await fetch(CONFIG.appsScriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        cache: 'no-store',
        signal: controller.signal,
        body: JSON.stringify({
          action,
          token: state.token,
          supabaseUrl: CONFIG.supabaseUrl,
          supabaseAnonKey: CONFIG.supabaseAnonKey,
          ...data
        })
      });
      const result = await response.json();
      if (!result.ok) throw new Error(result.error || 'Error de Apps Script.');
      return result;
    } catch (error) {
      if (error?.name === 'AbortError') throw new Error('Apps Script tardó demasiado. Reintentando automáticamente.');
      throw error;
    } finally { clearTimeout(timeout); }
  }

  function setAuthLoading(loading) {
    $('#auth-submit').disabled = loading;
    $('#auth-submit span').hidden = loading;
    $('#auth-submit .button-loader').hidden = !loading;
  }

  async function initializeAuth() {
    if (!configured) {
      $('#auth-title').textContent = 'Falta la configuración';
      $('#auth-description').textContent = 'Pega la URL, anon key y URL de Apps Script al inicio de config.js.';
      $('#auth-form').hidden = true;
      return;
    }

    try {
      if (state.token) {
        const validation = await rpc('validate_admin_session', { p_token: state.token, p_permission: null });
        if (validation?.valid) {
          state.user = validation.user;
          await enterAdmin();
          return;
        }
        localStorage.removeItem('juanelos-admin-token');
        fast.remove('private-admin');
        state.token = '';
      }
      const status = await rpc('bootstrap_status');
      configureAuthForm(!status?.hasBoss);
    } catch (error) {
      $('#auth-status').textContent = errorMessage(error);
    }
  }

  function configureAuthForm(needsBoss) {
    $('#auth-form').dataset.mode = needsBoss ? 'bootstrap' : 'login';
    $('#display-name-field').hidden = !needsBoss;
    $('[name="displayName"]').required = needsBoss;
    $('[name="password"]').autocomplete = needsBoss ? 'new-password' : 'current-password';
    $('#auth-kicker').textContent = needsBoss ? 'CONFIGURACIÓN INICIAL' : 'ACCESO DEL EQUIPO';
    $('#auth-title').textContent = needsBoss ? 'Crea el jefe' : 'Bienvenido';
    $('#auth-description').textContent = needsBoss ? 'Será el único perfil con control total para crear usuarios y permisos.' : 'Ingresa para gestionar Juanelos.';
    $('#auth-submit span').textContent = needsBoss ? 'Crear jefe y entrar' : 'Ingresar';
  }

  async function submitAuth(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const mode = event.currentTarget.dataset.mode;
    setAuthLoading(true);
    $('#auth-status').textContent = '';
    try {
      const result = mode === 'bootstrap'
        ? await rpc('create_initial_boss', { p_username: form.get('username'), p_display_name: form.get('displayName'), p_password: form.get('password') })
        : await rpc('admin_login', { p_username: form.get('username'), p_password: form.get('password') });
      state.token = result.token;
      state.user = result.user;
      localStorage.setItem('juanelos-admin-token', state.token);
      await enterAdmin();
    } catch (error) {
      $('#auth-status').textContent = errorMessage(error);
    } finally { setAuthLoading(false); }
  }

  async function enterAdmin() {
    $('#auth-shell').hidden = true;
    $('#admin-app').hidden = false;
    $('#user-name').textContent = state.user.displayName;
    $('#user-role').textContent = state.user.role === 'jefe' ? 'Jefe · control total' : 'Usuario del equipo';
    $('#user-avatar').textContent = state.user.displayName.charAt(0).toUpperCase();
    $$('[data-permission]').forEach(button => { button.hidden = !can(button.dataset.permission); });
    const cached = fast.read('private-admin',60000);
    if (cached?.token === state.token && cached.scope === adminScope()) {
      if (cached.snapshot) { state.snapshot = cached.snapshot; renderAll(); }
      if (can('orders') && Array.isArray(cached.orders)) {
        state.orders = cached.orders; state.orderRevision = cached.revision; state.ordersInitialized = true;
        state.knownOrderIds = new Set(cached.orders.map(order => order.id)); renderOrders();
      }
    }
    if (!can('orders')) switchSection(firstAllowedSection());
    connectRealtime();
    if (sessionStorage.getItem('juanelos-alerts-armed') === '1') armAlerts({ type: 'restore' });
    if (can('orders')) scheduleOrderPolling();
    await Promise.all([loadSnapshot(), can('orders') ? loadOrders(false) : Promise.resolve()]);
  }

  function adminScope() { return JSON.stringify({id:state.user.id,role:state.user.role,permissions:state.user.permissions}); }
  function cacheAdmin() { fast.write('private-admin',{token:state.token,scope:adminScope(),snapshot:state.snapshot,orders:can('orders')&&state.ordersInitialized?state.orders:null,revision:state.orderRevision}); }

  function firstAllowedSection() {
    return ['orders','products','toppings','payments','neighborhoods','links','users'].find(section => section === 'orders' ? can('orders') : can(section)) || 'products';
  }

  async function logout() {
    fast.remove('private-admin');
    clearTimeout(state.orderTimer);
    state.alertsArmed = false;
    state.notificationAudio?.pause();
    state.nativeNotifications.forEach(notification => notification.close());
    try { await rpc('admin_logout', { p_token: state.token }); } catch { /* cerrar localmente */ }
    localStorage.removeItem('juanelos-admin-token');
    sessionStorage.removeItem('juanelos-alerts-armed');
    location.reload();
  }

  let snapshotLoading = null, snapshotQueued = false;
  function loadSnapshot() {
    if (snapshotLoading) { snapshotQueued = true; return snapshotLoading; }
    snapshotLoading = refreshSnapshot().finally(() => { snapshotLoading = null; if (snapshotQueued) { snapshotQueued = false; void loadSnapshot(); } });
    return snapshotLoading;
  }
  async function refreshSnapshot() {
    try {
      state.snapshot = await rpc('admin_snapshot', { p_token: state.token });
      fast.write('catalog',[state.snapshot.products,state.snapshot.toppings,state.snapshot.payments,state.snapshot.neighborhoods].map(data => ({data})),localStorage);
      renderAll();
      cacheAdmin();
    } catch (error) {
      if (/sesión/i.test(errorMessage(error))) return logout();
      toast('No pudimos actualizar', errorMessage(error));
    }
  }

  async function loadOrders(force = false, queue = false) {
    if (state.ordersLoading) {
      if (force || queue) { state.ordersReloadQueued = true; state.ordersReloadForce ||= force; }
      return;
    }
    state.ordersLoading = true;
    $('#order-list').setAttribute('aria-busy','true');
    try {
      const result = await orderApi('getOrders', { sinceRevision: force ? -1 : state.orderRevision });
      if (result.changed) {
        const incoming = result.orders || [];
        const newOrders = state.ordersInitialized
          ? incoming.filter(order => !state.knownOrderIds.has(order.id))
          : [];
        state.orders = incoming;
        state.knownOrderIds = new Set(incoming.map(order => order.id));
        state.orderRevision = Number(result.revision);
        state.ordersInitialized = true;
        cacheAdmin();
        if (newOrders.length) state.orderPage = 1;
        renderOrders();
        announceNewOrders(newOrders);
        if (state.pendingOrderId && incoming.some(order => order.id === state.pendingOrderId)) {
          const pendingOrderId = state.pendingOrderId;
          state.pendingOrderId = '';
          switchSection('orders');
          openOrder(pendingOrderId);
        }
      }
    } catch (error) {
      if (force) toast('Órdenes no disponibles', errorMessage(error));
    } finally {
      $('#order-list').setAttribute('aria-busy','false');
      state.ordersLoading = false;
      if (state.ordersReloadQueued) {
        const forceReload = state.ordersReloadForce;
        state.ordersReloadQueued = false;
        state.ordersReloadForce = false;
        queueMicrotask(() => { void loadOrders(forceReload); });
      }
    }
  }

  function connectRealtime() {
    if (!client) return;
    let refreshTimer;
    const refreshCatalog = () => { clearTimeout(refreshTimer); refreshTimer = setTimeout(() => { void loadSnapshot(); },80); };
    state.realtime = client.channel('juanelos-admin-catalog')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, refreshCatalog)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'toppings' }, refreshCatalog)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payment_methods' }, refreshCatalog)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'neighborhoods' }, refreshCatalog)
      .subscribe();
    state.orderRealtime = client.channel('juanelos-orders-live')
      .on('broadcast', { event: 'order-created' }, () => { if(can('orders'))void loadOrders(false,true); })
      .subscribe(status => {
        const indicator = $('#realtime-status');
        if (!indicator) return;
        const connected = status === 'SUBSCRIBED';
        indicator.classList.toggle('is-offline', !connected);
        indicator.innerHTML = connected ? '<i></i> Tiempo real' : '<i></i> Reconectando';
        if (connected && can('orders')) void loadOrders(false);
      });
    state.orderEventsRealtime = client.channel('juanelos-order-events-durable')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'order_events' }, () => { if(can('orders'))void loadOrders(false,true); })
      .subscribe();
  }

  function switchSection(section) {
    state.activeSection = section;
    $$('[data-section]').forEach(button => button.classList.toggle('active', button.dataset.section === section));
    $$('[data-panel]').forEach(panel => panel.classList.toggle('active', panel.dataset.panel === section));
    const titles = { orders:'Órdenes', products:'Productos', toppings:'Toppings', payments:'Banco y pagos', neighborhoods:'Barrios', links:'Enlaces de Juanelos', users:'Usuarios' };
    $('#section-title').textContent = titles[section];
    $('#section-kicker').textContent = section === 'orders' ? 'OPERACIÓN EN VIVO' : 'CONFIGURACIÓN';
    $('#sidebar').classList.remove('open');
    renderCatalogSection(section);
    if (section === 'links' && can('links') && (!state.brandLinksReady || Date.now()-state.brandLinksUpdated > 30000)) void loadBrandLinks();
  }

  let dirtySections = new Set();
  function renderAll() { dirtySections = new Set(['products','toppings','payments','neighborhoods','users']); renderCatalogSection(state.activeSection); }
  function renderCatalogSection(section) {
    if (!dirtySections.has(section)) return;
    const render = {products:renderProducts,toppings:renderToppings,payments:renderPayments,neighborhoods:renderNeighborhoods,users:renderUsers}[section];
    if (render) { render(); dirtySections.delete(section); }
  }

  function emptyMarkup(copy) { return `<div class="empty-admin">${escapeHtml(copy)}</div>`; }
  function switchMarkup(entity, item) { return `<label class="switch" title="${item.available ? 'Disponible' : 'Agotado'}"><input type="checkbox" data-toggle="${entity}" data-id="${escapeHtml(item.id)}" ${item.available ? 'checked' : ''}><span></span></label>`; }
  function actionsMarkup(entity, id) { return `<div class="card-actions"><button class="icon-action" data-edit="${entity}" data-id="${escapeHtml(id)}" aria-label="Editar">✎</button><button class="icon-action danger" data-delete="${entity}" data-id="${escapeHtml(id)}" aria-label="Eliminar">⌫</button></div>`; }

  function renderProducts() {
    const root = $('#products-admin');
    const list = state.snapshot.products || [];
    $('[data-delete-all="product"]').disabled = !list.length;
    root.innerHTML = list.length ? list.map(item => `<article class="admin-card"><div class="admin-card-image"><img src="${escapeHtml(fast.imageUrl(item.image_url || './images/juanelos-original.png'))}" alt="" decoding="async" loading="lazy"></div><div class="admin-card-body"><div class="admin-card-head"><div><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.category)}</p></div>${switchMarkup('product', item)}</div><p>${escapeHtml(item.description)}</p><div class="admin-card-foot"><strong>${money(item.price)}</strong>${actionsMarkup('product', item.id)}</div></div></article>`).join('') : emptyMarkup('Aún no hay productos.');
  }

  function renderToppings() {
    const list = state.snapshot.toppings || [];
    $('[data-delete-all="topping"]').disabled = !list.length;
    $('#toppings-admin').innerHTML = list.length ? `<table><thead><tr><th>Nombre</th><th>Tipo</th><th>Precio adicional</th><th>Disponible</th><th></th></tr></thead><tbody>${list.map(item => `<tr><td><strong>${escapeHtml(item.name)}</strong></td><td>${escapeHtml(item.kind)}</td><td>${money(item.price)}</td><td>${switchMarkup('topping', item)}</td><td><div class="table-actions">${actionsMarkup('topping', item.id)}</div></td></tr>`).join('')}</tbody></table>` : emptyMarkup('Aún no hay toppings.');
  }

  function renderPayments() {
    const list = state.snapshot.payments || [];
    $('[data-delete-all="payment"]').disabled = !list.length;
    $('#payments-admin').innerHTML = list.length ? list.map(item => `<article class="admin-card"><div class="admin-card-body"><div class="admin-card-head"><div><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.instructions || 'Sin indicaciones')}</p></div>${switchMarkup('payment', item)}</div><p><strong>${escapeHtml(item.account_value || 'Dato pendiente')}</strong></p><div class="admin-card-foot"><span></span>${actionsMarkup('payment', item.id)}</div></div></article>`).join('') : emptyMarkup('Aún no hay métodos de pago.');
  }

  function renderNeighborhoods() {
    const list = state.snapshot.neighborhoods || [];
    $('[data-delete-all="neighborhood"]').disabled = !list.length;
    $('#neighborhoods-admin').innerHTML = list.length ? `<table><thead><tr><th>Barrio</th><th>Domicilio</th><th>Disponible</th><th></th></tr></thead><tbody>${list.map(item => `<tr><td><strong>${escapeHtml(item.name)}</strong></td><td>${money(item.delivery_fee)}</td><td>${switchMarkup('neighborhood', item)}</td><td><div class="table-actions">${actionsMarkup('neighborhood', item.id)}</div></td></tr>`).join('')}</tbody></table>` : emptyMarkup('Agrega el primer barrio para habilitar domicilios.');
  }

  function renderUsers() {
    const root = $('#users-admin');
    if (!can('users')) return;
    const labels = { products:'Productos', toppings:'Toppings', payments:'Pagos', neighborhoods:'Barrios', links:'Enlaces de Juanelos', orders:'Órdenes', users:'Usuarios' };
    root.innerHTML = (state.snapshot.users || []).map(user => {
      const permissions = user.role === 'jefe' ? ['Control total'] : Object.keys(user.permissions || {}).filter(key => user.permissions[key]).map(key => labels[key]);
      return `<article class="user-card"><div class="user-card-head"><div class="avatar">${escapeHtml(user.displayName.charAt(0).toUpperCase())}</div><div><h3>${escapeHtml(user.displayName)}</h3><p>@${escapeHtml(user.username)} · ${user.role === 'jefe' ? 'Jefe' : user.active ? 'Activo' : 'Inactivo'}</p></div></div><div class="permission-pills">${permissions.map(value => `<span>${escapeHtml(value)}</span>`).join('')}</div><div class="user-card-foot"><small>Último acceso: ${dateTime(user.lastLoginAt)}</small>${user.role === 'jefe' ? '' : `<label class="switch"><input type="checkbox" data-user-active="${user.id}" ${user.active ? 'checked' : ''}><span></span></label>`}</div><button class="secondary-button" data-reset-user="${user.id}" style="width:100%;margin-top:12px">Cambiar contraseña</button></article>`;
    }).join('') || emptyMarkup('Aún no hay usuarios.');
  }

  function normalizeOrderSearch(value) {
    return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').trim();
  }

  function orderSearchText(order) {
    return normalizeOrderSearch([
      order.id, order.sequence, order.customerName, order.phone, order.address, order.neighborhood,
      order.fulfillment, order.fulfillment === 'delivery' ? 'domicilio' : 'recoger',
      order.paymentMethod, order.paymentValue, order.notes, order.status, order.subtotal, order.deliveryFee, order.total,
      order.messageStatus, order.handledByName, order.createdAt,
      ...(order.items || []).flatMap(item => [item.name, ...(item.selections || [])])
    ].join(' '));
  }

  function paginationMarkup(totalPages) {
    const first = Math.max(1, Math.min(state.orderPage - 2, totalPages - 4));
    const last = Math.min(totalPages, first + 4);
    const pages = Array.from({ length: last - first + 1 }, (_, index) => first + index);
    return `<button type="button" data-order-page="previous" ${state.orderPage === 1 ? 'disabled' : ''} aria-label="Página anterior">←</button>${pages.map(page => `<button type="button" data-order-page="${page}" class="${page === state.orderPage ? 'active' : ''}" ${page === state.orderPage ? 'aria-current="page"' : ''}>${page}</button>`).join('')}<button type="button" data-order-page="next" ${state.orderPage === totalPages ? 'disabled' : ''} aria-label="Página siguiente">→</button>`;
  }

  function renderOrders() {
    const counts = status => state.orders.filter(order => order.status === status).length;
    $('#delete-all-orders').disabled = !state.orders.length;
    const activeFilter = $('#order-status-filter').value;
    $('#order-metrics').innerHTML = `<button class="metric new ${activeFilter === 'nueva' ? 'active' : ''}" data-kpi-filter="nueva"><span>NUEVAS</span><strong>${counts('nueva')}</strong><small>Ver pendientes →</small></button><button class="metric progress ${activeFilter === 'atendiendo' ? 'active' : ''}" data-kpi-filter="atendiendo"><span>ATENDIENDO</span><strong>${counts('atendiendo')}</strong><small>Ver en proceso →</small></button><button class="metric done ${activeFilter === 'despachada' ? 'active' : ''}" data-kpi-filter="despachada"><span>DESPACHADAS</span><strong>${counts('despachada')}</strong><small>Ver completadas →</small></button><button class="metric ${activeFilter === 'borrador' ? 'active' : ''}" data-kpi-filter="borrador"><span>BORRADOR</span><strong>${counts('borrador')}</strong><small>Ver borradores →</small></button>`;
    const badge = $('#new-orders-badge');
    badge.textContent = counts('nueva');
    badge.hidden = counts('nueva') === 0;
    const statusFilter = $('#order-status-filter').value;
    const messageFilter = $('#order-message-filter').value;
    const query = normalizeOrderSearch(state.orderQuery);
    const compactQuery = query.replace(/[^a-z0-9]/g, '');
    const filtered = state.orders
      .filter(order => {
        if (statusFilter && order.status !== statusFilter) return false;
        if (messageFilter && (messageFilter === 'sin_mensaje' ? Boolean(order.messageStatus) : order.messageStatus !== messageFilter)) return false;
        if (!query) return true;
        const searchText = orderSearchText(order);
        return searchText.includes(query) || searchText.replace(/[^a-z0-9]/g, '').includes(compactQuery);
      })
      .sort((a, b) => Number(b.sequence) - Number(a.sequence));
    const totalPages = Math.max(1, Math.ceil(filtered.length / state.orderPageSize));
    state.orderPage = Math.min(Math.max(1, state.orderPage), totalPages);
    const start = (state.orderPage - 1) * state.orderPageSize;
    const visible = filtered.slice(start, start + state.orderPageSize);
    $('#order-list').innerHTML = visible.length ? visible.map(order => {
      const itemCount = (order.items || []).reduce((sum,item) => sum + Number(item.quantity || 0), 0);
      const delivery = order.fulfillment === 'delivery' ? order.neighborhood || order.address || 'Domicilio' : 'Recoger en Juanelos';
      return `<button type="button" class="order-card status-${escapeHtml(order.status)}" data-order-id="${escapeHtml(order.id)}" aria-label="Abrir orden ${escapeHtml(order.id)} de ${escapeHtml(order.customerName)}"><div class="order-card-top"><div class="arrival-number"><small>LLEGADA</small><strong>#${String(order.sequence || 0).padStart(3,'0')}</strong></div><div class="order-card-tags"><span class="status-tag">${escapeHtml(order.status)}</span>${order.messageStatus ? `<span class="message-tag">${escapeHtml(order.messageStatus.replaceAll('_',' '))}</span>` : ''}</div></div><div class="order-customer"><small>${escapeHtml(order.id)}</small><h3>${escapeHtml(order.customerName)}</h3><span>${escapeHtml(order.phone)}</span></div><div class="order-card-details"><div><span>ENTREGA</span><strong>${escapeHtml(delivery)}</strong></div><div><span>RECIBIDA</span><strong>${dateTime(order.createdAt)}</strong></div><div><span>RESPONSABLE</span><strong>${escapeHtml(order.handledByName || 'Sin asignar')}</strong></div></div><div class="order-card-foot"><div><strong>${money(order.total)}</strong><span>${itemCount} ${itemCount === 1 ? 'producto' : 'productos'}</span></div><b aria-hidden="true">→</b></div></button>`;
    }).join('') : emptyMarkup(query ? 'No encontramos órdenes con esa búsqueda.' : 'No hay órdenes con estos filtros.');
    const pagination = $('#order-pagination');
    pagination.hidden = filtered.length <= state.orderPageSize;
    pagination.innerHTML = filtered.length > state.orderPageSize ? `<span>Mostrando ${start + 1}–${Math.min(start + state.orderPageSize, filtered.length)} de ${filtered.length}</span><div>${paginationMarkup(totalPages)}</div>` : '';
  }

  async function loadBrandLinks() {
    if (!can('links') || state.brandLinksLoading) return;
    state.brandLinksLoading = true; $('#refresh-brand-links').disabled = true; $('#brand-links-status').textContent = 'Actualizando enlaces…';
    try {
      const result = await orderApi('getBrandLinks');
      if (!Array.isArray(result.links)) throw new Error('La lista de enlaces no está disponible.');
      state.brandLinks = result.links; state.brandLinksReady = true; state.brandLinksUpdated = Date.now(); renderBrandLinks();
      $('#brand-links-status').textContent = 'Los enlaces activos se muestran en enlaces.html.';
    } catch (error) {
      state.brandLinksReady = false;
      $('#brand-links-status').textContent = /no reconocida|no está disponible/i.test(errorMessage(error)) ? 'Para activar los enlaces, actualiza el deployment de Apps Script con el Code.gs de este proyecto.' : errorMessage(error);
    } finally { state.brandLinksLoading = false; $('#refresh-brand-links').disabled = false; $('#new-brand-link').disabled = !state.brandLinksReady; }
  }
  function renderBrandLinks() {
    state.brandLinksUpdated = Date.now();
    fast.write('brand-links',state.brandLinks.filter(link => link.active === true),localStorage);
    $('#brand-links-admin').innerHTML = state.brandLinks.map(link => `<article class="admin-card brand-link-card"><div class="brand-link-card-heading"><span>${escapeHtml(link.kind)}</span><b>${link.active ? 'Activo' : 'Oculto'}</b></div><h3>${escapeHtml(link.title)}</h3><p>${escapeHtml(link.subtitle)}</p><a href="${escapeHtml(window.JuanelosServices.safeLink(link.url))}" target="_blank" rel="noopener noreferrer">${escapeHtml(link.url)}</a><div class="brand-link-card-actions"><small>Orden ${Number(link.sortOrder) || 0}</small><button type="button" class="secondary-button" data-brand-edit="${escapeHtml(link.id)}">Editar</button><button type="button" class="danger-button" data-brand-delete="${escapeHtml(link.id)}">Eliminar</button></div></article>`).join('') || emptyMarkup('Agrega tus redes y enlaces. La página ya incluye el menú, WhatsApp y cómo llegar a Juanelos.');
  }
  function openBrandLinkEditor(id = '') {
    if (!can('links') || !state.brandLinksReady) return;
    const item = state.brandLinks.find(link => link.id === id); if (id && !item) return;
    state.editor = { entity:'brand-link', item };
    $('#editor-kicker').textContent = 'PÁGINA DE JUANELOS'; $('#editor-title').textContent = item ? 'Editar enlace' : 'Nuevo enlace';
    $('#editor-form').innerHTML = `<div class="form-grid"><input type="hidden" name="id" value="${escapeHtml(item?.id || '')}"><label class="field full">Título<input name="title" required minlength="2" maxlength="60" value="${escapeHtml(item?.title || '')}" placeholder="Ej.: Síguenos en Instagram"></label><label class="field full">Descripción breve<input name="subtitle" maxlength="120" value="${escapeHtml(item?.subtitle || '')}" placeholder="Postres, novedades y momentos deliciosos"></label><label class="field full">Enlace oficial<input name="url" type="url" required maxlength="1000" pattern="https://.*" value="${escapeHtml(item?.url || '')}" placeholder="https://www.instagram.com/tu-cuenta/"></label><label class="field">Icono<select name="kind">${Object.entries({instagram:'Instagram',tiktok:'TikTok',facebook:'Facebook',whatsapp:'WhatsApp',web:'Sitio web',maps:'Ubicación'}).map(([value,label]) => `<option value="${value}" ${item?.kind === value ? 'selected' : ''}>${label}</option>`).join('')}</select></label><label class="field">Orden<input type="number" name="sortOrder" min="0" max="999" step="1" value="${Number(item?.sortOrder) || 0}"></label><label class="check-row field full">Mostrar en la página<span class="switch"><input name="active" type="checkbox" ${item?.active !== false ? 'checked' : ''}><span></span></span></label></div><div class="modal-actions"><button type="button" class="secondary-button" data-close-modal>Cancelar</button><button type="submit" class="primary-button compact">Guardar enlace</button></div>`;
    $('#editor-modal').hidden = false; requestAnimationFrame(() => $('[name="title"]', $('#editor-form')).focus());
  }
  async function submitBrandLink(event) {
    event.preventDefault(); if (!can('links') || !state.brandLinksReady) return;
    const form = new FormData(event.target), button = $('[type="submit"]', event.target); if (button.disabled) return;
    const link = {id:formText(form,'id'),title:formText(form,'title').trim(),subtitle:formText(form,'subtitle').trim(),url:formText(form,'url').trim(),kind:formText(form,'kind'),sortOrder:Number(form.get('sortOrder')),active:form.get('active')==='on'};
    if (!window.JuanelosServices.safeLink(link.url) || link.title.length < 2) return toast('Revisa el enlace', 'Ingresa un título y una dirección HTTPS válida.');
    button.disabled = true;
    try { const result = await orderApi('mutateBrandLink', {operation:'save',link}); state.brandLinks = result.links; renderBrandLinks(); $('#editor-modal').hidden = true; $('#new-brand-link').focus(); toast('Enlace guardado', 'Tu página de Juanelos quedó actualizada.'); }
    catch (error) { toast('No se pudo guardar', errorMessage(error)); } finally { button.disabled = false; }
  }
  async function deleteBrandLink(id, button) {
    if (!can('links') || !state.brandLinksReady || button.disabled) return;
    const link = state.brandLinks.find(item => item.id === id); if (!link) return;
    if (!await confirmDeletion(`¿Eliminar “${link.title}”?`, 'El enlace dejará de aparecer en tu página de Juanelos.')) return;
    button.disabled = true;
    try { const result = await orderApi('mutateBrandLink', {operation:'delete',link}); state.brandLinks = result.links; renderBrandLinks(); toast('Enlace eliminado'); }
    catch (error) { toast('No se pudo eliminar', errorMessage(error)); } finally { button.disabled = false; }
  }

  const entityMap = {
    product: { list:'products', title:'Producto', plural:'productos' },
    topping: { list:'toppings', title:'Topping o salsa', plural:'toppings y salsas' },
    payment: { list:'payments', title:'Método de pago', plural:'métodos de pago' },
    neighborhood: { list:'neighborhoods', title:'Barrio', plural:'barrios' }
  };

  function openEditor(entity, id = '') {
    const definition = entityMap[entity];
    const item = id ? state.snapshot[definition.list].find(entry => entry.id === id) : null;
    state.editor = { entity, item };
    $('#editor-kicker').textContent = item ? 'EDITAR' : 'NUEVO';
    $('#editor-title').textContent = definition.title;
    $('#editor-form').innerHTML = editorFields(entity, item || {}) + `<div class="modal-actions"><button type="button" class="secondary-button" data-close-modal>Cancelar</button><button type="submit" class="primary-button compact">Guardar cambios</button></div>`;
    if (entity === 'product') window.JuanelosAdminExtras.styleImagePicker($('#editor-form'), item?.image_url || '');
    $('#editor-modal').hidden = false;
  }

  function editorFields(entity, item) {
    const field = (label, name, value = '', type = 'text', extra = '') => `<label class="field">${label}<input name="${name}" type="${type}" value="${escapeHtml(value)}" ${extra}></label>`;
    const toggle = (label, name, checked) => `<label class="check-row">${label}<span class="switch"><input name="${name}" type="checkbox" ${checked ? 'checked' : ''}><span></span></span></label>`;
    const base = `<input type="hidden" name="id" value="${escapeHtml(item.id || '')}">`;
    if (entity === 'product') {
      const sauceCount = item.modifiers?.find(modifier => modifier.id === 'salsas')?.min || 0;
      const toppingCount = item.modifiers?.find(modifier => modifier.id === 'toppings')?.min || 0;
      const allowsExtras = Boolean(item.modifiers?.some(modifier => modifier.id === 'extras'));
      return `<div class="form-grid">${base}${field('Nombre','name',item.name,'text','required maxlength="120"')}${field('Categoría','category',item.category,'text','required maxlength="70"')}${field('Precio (COP)','price',item.price || 0,'number','required min="0" step="100"')}${field('Orden','sort_order',item.sort_order || 0,'number','min="0"')}${field('Salsas incluidas','included_sauces',sauceCount,'number','min="0" max="5"')}${field('Toppings incluidos','included_toppings',toppingCount,'number','min="0" max="10"')}${field('Distintivo','badge',item.badge,'text','maxlength="35"')}${field('URL o ruta de imagen','image_url',item.image_url,'text','maxlength="500"')}<label class="field full">Descripción<textarea name="description" maxlength="300">${escapeHtml(item.description || '')}</textarea></label><label class="field full file-field">O subir una imagen<input name="imageFile" type="file" accept="image/png,image/jpeg,image/webp"></label>${toggle('Disponible','available',item.available ?? true)}${toggle('Destacado en “Para ti”','featured',Boolean(item.featured))}${toggle('Permitir toppings adicionales','allow_extras',allowsExtras)}</div>`;
    }
    if (entity === 'topping') return `<div class="form-grid">${base}${field('Nombre','name',item.name,'text','required maxlength="100"')}<label class="field">Tipo<select name="kind"><option ${item.kind === 'Topping' ? 'selected' : ''}>Topping</option><option ${item.kind === 'Salsa' ? 'selected' : ''}>Salsa</option></select></label>${field('Precio adicional (COP)','price',item.price || 0,'number','min="0" step="100"')}${field('Orden','sort_order',item.sort_order || 0,'number','min="0"')}${toggle('Disponible','available',item.available ?? true)}</div>`;
    if (entity === 'payment') return `<div class="form-grid">${base}${field('Nombre','name',item.name,'text','required maxlength="70"')}${field('Orden','sort_order',item.sort_order || 0,'number','min="0"')}<label class="field full">Dato que copiará el cliente<input name="account_value" value="${escapeHtml(item.account_value || '')}" maxlength="160" placeholder="Número, llave o cuenta"></label><label class="field full">Indicaciones<textarea name="instructions" maxlength="240">${escapeHtml(item.instructions || '')}</textarea></label>${toggle('Disponible','available',item.available ?? true)}</div>`;
    return `<div class="form-grid">${base}${field('Nombre del barrio','name',item.name,'text','required maxlength="100"')}${field('Costo del domicilio (COP)','delivery_fee',item.delivery_fee || 0,'number','required min="0" step="100"')}${field('Orden','sort_order',item.sort_order || 0,'number','min="0"')}${toggle('Disponible','available',item.available ?? true)}</div>`;
  }

  async function submitEditor(event) {
    event.preventDefault();
    const { entity, item } = state.editor;
    const form = new FormData(event.currentTarget);
    const button = $('button[type="submit"]', event.currentTarget);
    button.disabled = true;
    try {
      let imageUrl = formText(form, 'image_url') || item?.image_url || '';
      const image = form.get('imageFile');
      if (image instanceof File && image.size) imageUrl = await uploadImage(image);
      const name = formText(form, 'name').trim();
      const data = { id: formText(form, 'id') || slug(name), name, available: form.get('available') === 'on' };
      if (entity === 'product') {
        const includedSauces = Math.max(0, Number(form.get('included_sauces')) || 0);
        const includedToppings = Math.max(0, Number(form.get('included_toppings')) || 0);
        const modifiers = [];
        if (includedSauces) modifiers.push({ id:'salsas', name:`Elige ${includedSauces} salsa${includedSauces > 1 ? 's' : ''}`, source:'Salsa', required:true, min:includedSauces, max:includedSauces });
        if (includedToppings) modifiers.push({ id:'toppings', name:`Elige ${includedToppings} topping${includedToppings > 1 ? 's' : ''}`, source:'Topping', required:true, min:includedToppings, max:includedToppings });
        if (form.get('allow_extras') === 'on') modifiers.push({ id:'extras', name:'Toppings adicionales', source:'Topping', max:5, usePrice:true });
        Object.assign(data, { category: form.get('category'), price: Number(form.get('price')), image_url: imageUrl, description: form.get('description'), badge: form.get('badge'), featured: form.get('featured') === 'on', sort_order: Number(form.get('sort_order')), modifiers });
      }
      if (entity === 'topping') Object.assign(data, { kind: form.get('kind'), price: Number(form.get('price')), sort_order: Number(form.get('sort_order')) });
      if (entity === 'payment') Object.assign(data, { account_value: form.get('account_value'), instructions: form.get('instructions'), sort_order: Number(form.get('sort_order')) });
      if (entity === 'neighborhood') Object.assign(data, { delivery_fee: Number(form.get('delivery_fee')), sort_order: Number(form.get('sort_order')) });
      await rpc('admin_mutate', { p_token: state.token, p_entity: entity, p_action: 'save', p_data: data });
      $('#editor-modal').hidden = true;
      await loadSnapshot();
      toast('Cambios guardados', `${data.name} ya está actualizado.`);
    } catch (error) { toast('No se pudo guardar', errorMessage(error)); }
    finally { button.disabled = false; }
  }

  async function uploadImage(file) {
    const image = await window.JuanelosServices.prepareProductImage(file);
    const result = await orderApi('uploadImage',image);
    return result.url;
  }

  async function deleteEntity(entity, id) {
    const definition = entityMap[entity];
    const previous = state.snapshot[definition.list];
    const item = previous.find(entry => entry.id === id);
    const confirmed = await confirmDeletion(`¿Eliminar “${item?.name || id}”?`, `Se eliminará este ${definition.title.toLocaleLowerCase('es')} de forma permanente.`);
    if (!confirmed) return;
    state.snapshot[definition.list] = previous.filter(entry => entry.id !== id);
    renderAll();
    try {
      await rpc('admin_mutate', { p_token: state.token, p_entity: entity, p_action: 'delete', p_data: { id } });
      await loadSnapshot();
      toast('Elemento eliminado');
    } catch (error) {
      state.snapshot[definition.list] = previous;
      renderAll();
      toast('No se pudo eliminar', errorMessage(error));
    }
  }

  async function deleteAllEntities(entity, button) {
    const definition = entityMap[entity];
    const count = state.snapshot[definition?.list]?.length || 0;
    if (!definition || !count) return;
    const confirmed = await confirmDeletion(`¿Eliminar los ${count} ${definition.plural}?`, 'Todos los elementos de esta sección se eliminarán de forma permanente.', 'Sí, eliminar todo');
    if (!confirmed) return;
    const previous = state.snapshot[definition.list];
    state.snapshot[definition.list] = [];
    renderAll();
    button.disabled = true;
    try {
      await rpc('admin_mutate', { p_token: state.token, p_entity: entity, p_action: 'delete_all', p_data: {} });
      await loadSnapshot();
      toast('Sección vaciada', `Se eliminaron ${count} ${definition.plural}.`);
    } catch (error) {
      state.snapshot[definition.list] = previous;
      renderAll();
      toast('No se pudo eliminar todo', errorMessage(error));
      button.disabled = false;
    }
  }

  async function toggleEntity(entity, id, available) {
    const item = state.snapshot[entityMap[entity].list].find(entry => entry.id === id);
    if (!item) return;
    try {
      await rpc('admin_mutate', { p_token: state.token, p_entity: entity, p_action: 'save', p_data: { ...item, available } });
      item.available = available;
      renderAll();
      toast(available ? 'Disponible' : 'Marcado como agotado', item.name);
    } catch (error) { await loadSnapshot(); toast('No se pudo cambiar', errorMessage(error)); }
  }

  function openNewUser() {
    state.editor = { entity: 'user' };
    $('#editor-kicker').textContent = 'NUEVO';
    $('#editor-title').textContent = 'Usuario del equipo';
    const permissionLabels = { products:'Productos', toppings:'Toppings', payments:'Banco y pagos', neighborhoods:'Barrios', links:'Enlaces de Juanelos', orders:'Órdenes' };
    $('#editor-form').innerHTML = `<div class="form-grid"><label class="field">Nombre<input name="displayName" required maxlength="70"></label><label class="field">Usuario<input name="username" required minlength="3" maxlength="40"></label><label class="field full">Contraseña temporal<input name="password" type="text" required minlength="8" maxlength="100"></label><div class="permissions-box"><strong>Permisos</strong><div class="permission-checks">${Object.entries(permissionLabels).map(([key,label]) => `<label><input type="checkbox" name="permission" value="${key}" ${key === 'orders' ? 'checked' : ''}> ${label}</label>`).join('')}</div></div><div class="modal-actions"><button type="button" class="secondary-button" data-close-modal>Cancelar</button><button type="submit" class="primary-button compact">Crear usuario</button></div></div>`;
    $('#editor-modal').hidden = false;
  }

  async function submitNewUser(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const credentials = { displayName: formText(form, 'displayName'), username: formText(form, 'username'), password: formText(form, 'password') };
    const permissions = {};
    form.getAll('permission').forEach(key => { if (typeof key === 'string') permissions[key] = true; });
    try {
      await rpc('admin_create_user', { p_token: state.token, p_username: credentials.username, p_display_name: credentials.displayName, p_password: credentials.password, p_permissions: permissions });
      await loadSnapshot();
      $('#editor-title').textContent = 'Usuario creado';
      $('#editor-form').innerHTML = `<div class="form-grid"><div class="field full"><p style="margin:0">Comparte estos datos con <strong>${escapeHtml(credentials.displayName)}</strong>.</p><div class="detail-card"><div class="detail-line"><span>Usuario</span><strong>${escapeHtml(credentials.username)}</strong></div><div class="detail-line"><span>Contraseña</span><strong>${escapeHtml(credentials.password)}</strong></div></div></div><div class="modal-actions"><button type="button" class="secondary-button" data-close-modal>Cerrar</button><button type="button" class="primary-button compact" id="copy-credentials">Copiar datos de acceso</button></div></div>`;
      $('#copy-credentials').addEventListener('click', async () => {
        await copyText(`Juanelos · Datos de acceso\nUsuario: ${credentials.username}\nContraseña: ${credentials.password}\nURL: ${location.href}`);
        toast('Datos copiados');
      });
    } catch (error) { toast('No se pudo crear', errorMessage(error)); }
  }

  async function setUserActive(userId, active) {
    try { await rpc('admin_set_user_active', { p_token: state.token, p_user_id: userId, p_active: active }); await loadSnapshot(); }
    catch (error) { await loadSnapshot(); toast('No se pudo actualizar', errorMessage(error)); }
  }

  function resetUserPassword(userId) {
    const user = (state.snapshot.users || []).find(entry => entry.id === userId);
    if (!user) return;
    state.editor = { entity: 'user-password', user };
    $('#editor-kicker').textContent = 'SEGURIDAD';
    $('#editor-title').textContent = `Cambiar clave de ${user.displayName}`;
    $('#editor-form').innerHTML = `<div class="form-grid"><label class="field full">Nueva contraseña<input name="password" type="password" autocomplete="new-password" required minlength="8" maxlength="100"></label><label class="field full">Confirmar contraseña<input name="passwordConfirm" type="password" autocomplete="new-password" required minlength="8" maxlength="100"></label><div class="modal-actions"><button type="button" class="secondary-button" data-close-modal>Cancelar</button><button type="submit" class="primary-button compact">Guardar contraseña</button></div></div>`;
    $('#editor-modal').hidden = false;
  }

  async function submitUserPassword(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = formText(form, 'password');
    if (password !== formText(form, 'passwordConfirm')) { toast('Las contraseñas no coinciden'); return; }
    const button = $('button[type="submit"]', event.currentTarget);
    button.disabled = true;
    try {
      const user = state.editor.user;
      await rpc('admin_reset_user_password', { p_token: state.token, p_user_id: user.id, p_password: password });
      $('#editor-modal').hidden = true;
      if (user.id === state.user.id) {
        localStorage.removeItem('juanelos-admin-token');
        state.token = '';
        toast('Contraseña actualizada', 'Ingresa nuevamente con tu nueva contraseña.');
        setTimeout(() => location.reload(), 1400);
      } else {
        toast('Contraseña actualizada', 'Las sesiones anteriores fueron cerradas.');
      }
    } catch (error) {
      toast('No se pudo cambiar', errorMessage(error));
      button.disabled = false;
    }
  }

  function historyLabel(entry) {
    if (entry.action === 'crear_orden') return 'Orden recibida';
    if (entry.action === 'cambiar_estado') return `Cambió el estado a ${String(entry.status || '').replaceAll('_', ' ')}`;
    if (entry.action === 'enviar_mensaje') return `Envió el mensaje ${String(entry.messageStatus || '').replaceAll('_', ' ')}`;
    return String(entry.action || 'Actualizó la orden').replaceAll('_', ' ');
  }

  function openOrder(orderId) {
    const order = state.orders.find(entry => entry.id === orderId);
    if (!order) return;
    const productImage = item => fast.imageUrl(state.snapshot.products?.find(product => product.id === item.productId)?.image_url || './images/juanelos-original.png');
    const history = order.history || [];
    $('#order-modal-title').textContent = order.id;
    $('#order-modal-subtitle').textContent = `${dateTime(order.createdAt)} · ${order.customerName}`;
    $('#order-detail').innerHTML = `<div class="order-hero"><div><span class="status-orb status-${escapeHtml(order.status)}"></span><small>ESTADO ACTUAL</small><strong>${escapeHtml(order.status)}</strong></div><div><small>TOTAL</small><strong>${money(order.total)}</strong></div><div><small>RESPONSABLE ACTUAL</small><strong>${escapeHtml(order.handledByName || 'Sin asignar')}</strong></div></div><div class="order-premium-grid"><div class="order-primary-column"><section class="command-card"><div class="command-heading"><div><small>COMANDA</small><h3>Productos</h3></div><span>${(order.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0)} unidades</span></div><div class="order-items premium-items">${(order.items || []).map(item => `<article class="order-item premium-item"><img src="${escapeHtml(productImage(item))}" alt="" decoding="async" loading="lazy"><div><strong>${item.quantity} × ${escapeHtml(item.name)}</strong>${item.selections?.length ? `<small>${item.selections.map(escapeHtml).join(' · ')}</small>` : '<small>Preparación original</small>'}</div><span>${money(Number(item.unitPrice) * Number(item.quantity))}</span></article>`).join('')}</div><div class="order-totals"><div><span>Subtotal</span><strong>${money(order.subtotal)}</strong></div><div><span>Domicilio</span><strong>${money(order.deliveryFee)}</strong></div><div class="grand-total"><span>Total</span><strong>${money(order.total)}</strong></div></div></section><section class="command-card trace-card"><div class="command-heading"><div><small>TRAZABILIDAD</small><h3>Historia de la orden</h3></div></div><div class="order-timeline">${history.length ? history.map((entry, index) => `<article><i class="${index === 0 ? 'current' : ''}"></i><div><strong>${escapeHtml(historyLabel(entry))}</strong><span>${escapeHtml(entry.userName || 'Sistema')} · ${dateTime(entry.createdAt)}</span></div></article>`).join('') : '<p class="empty-trace">La historia aparecerá a medida que el equipo atienda la orden.</p>'}</div></section></div><aside class="order-side-column"><section class="command-card customer-card"><div class="command-heading"><div><small>CLIENTE</small><h3>Entrega y pago</h3></div></div><div class="detail-line"><span>Nombre</span><strong>${escapeHtml(order.customerName)}</strong></div><div class="detail-line"><span>Teléfono</span><strong>${escapeHtml(order.phone)}</strong></div><div class="detail-line"><span>Entrega</span><strong>${order.fulfillment === 'delivery' ? 'Domicilio' : 'Recoger'}</strong></div>${order.fulfillment === 'delivery' ? `<div class="detail-line"><span>Barrio</span><strong>${escapeHtml(order.neighborhood)}</strong></div><div class="detail-line"><span>Dirección</span><strong>${escapeHtml(order.address)}</strong></div>` : ''}<div class="detail-line"><span>Pago</span><strong>${escapeHtml(order.paymentMethod)}</strong></div>${order.notes ? `<div class="order-notes"><small>NOTAS</small><p>${escapeHtml(order.notes)}</p></div>` : ''}</section><section class="command-card order-controls"><label class="select-shell"><span>Estado de la orden</span><select class="juanelos-select" id="order-status"><option value="nueva">Nueva</option><option value="atendiendo">Atendiendo</option><option value="despachada">Despachada</option><option value="borrador">Borrador</option></select></label><label class="select-shell"><span>Mensaje al cliente</span><select class="juanelos-select" id="message-type"><option value="">Elegir mensaje…</option><option value="esperando_pago">Esperando tu pago</option><option value="en_preparacion">Pedido en preparación</option><option value="despachada">Pedido despachado</option></select></label><button class="whatsapp-button" id="send-whatsapp">Enviar por WhatsApp</button><button class="danger-button delete-order" id="delete-order">Eliminar orden</button></section></aside></div>`;
    $('#order-status').value = order.status;
    $('#message-type').value = order.messageStatus || '';
    $('#order-status').addEventListener('change', event => { void updateOrder(order.id, { status: event.target.value }); });
    $('#send-whatsapp').addEventListener('click', () => { void sendWhatsApp(order); });
    $('#delete-order').addEventListener('click', () => { void deleteOrder(order); });
    $('#order-modal').hidden = false;
    window.JuanelosAdminExtras.renderOrder(order, orderApi, toast);
  }

  async function updateOrder(orderId, changes) {
    try { await orderApi('updateOrder', { orderId, changes }); await loadOrders(true); if (!$('#order-modal').hidden) openOrder(orderId); toast('Orden actualizada'); }
    catch (error) { toast('No se pudo actualizar', errorMessage(error)); }
  }

  async function sendWhatsApp(order) {
    const type = $('#message-type').value;
    if (!type) return toast('Elige un mensaje', 'Selecciona qué quieres informar al cliente.');
    const firstName = order.customerName.split(' ')[0];
    const templates = {
      esperando_pago: `Hola ${firstName}, somos Juanelos 💙. Recibimos tu orden ${order.id} y estamos esperando la confirmación de tu pago para continuar.`,
      en_preparacion: `Hola ${firstName}, tu orden ${order.id} ya está siendo atendida en Juanelos 💙. Te avisaremos tan pronto salga.`,
      despachada: `Hola ${firstName}, tu orden ${order.id} fue despachada y está en camino. Esperamos que la disfrutes 💙.`
    };
    const popup = window.open('about:blank', '_blank');
    try {
      await orderApi('updateOrder', { orderId: order.id, changes: { messageStatus: type, ...(type === 'despachada' ? { status: 'despachada' } : {}) } });
      const phone = String(order.phone).replace(/\D/g, '').replace(/^0+/, '');
      const international = phone.startsWith('57') ? phone : `57${phone}`;
      const url = `https://wa.me/${international}?text=${encodeURIComponent(templates[type])}`;
      if (popup) popup.location.href = url; else location.href = url;
      await loadOrders(true);
      $('#order-modal').hidden = true;
    } catch (error) { if (popup) popup.close(); toast('No se pudo registrar el mensaje', errorMessage(error)); }
  }

  async function deleteOrder(order) {
    const confirmed = await confirmDeletion(`¿Eliminar la orden ${order.id}?`, `La orden de ${order.customerName} se eliminará de forma permanente.`);
    if (!confirmed) return;
    const previous = state.orders;
    $('#order-modal').hidden = true;
    state.orders = previous.filter(entry => entry.id !== order.id);
    state.knownOrderIds.delete(order.id);
    renderOrders();
    try {
      await orderApi('deleteOrder', { orderId: order.id });
      await loadOrders(true);
      toast('Orden eliminada');
    } catch (error) {
      state.orders = previous;
      state.knownOrderIds.add(order.id);
      renderOrders();
      toast('No se pudo eliminar', errorMessage(error));
    }
  }

  async function deleteAllOrders() {
    const count = state.orders.length;
    if (!count) return;
    const confirmed = await confirmDeletion(`¿Eliminar las ${count} órdenes?`, 'Todas las órdenes se eliminarán de forma permanente.', 'Sí, eliminar todas');
    if (!confirmed) return;
    const button = $('#delete-all-orders');
    const previous = state.orders;
    const previousIds = state.knownOrderIds;
    state.orders = [];
    state.knownOrderIds = new Set();
    renderOrders();
    button.disabled = true;
    try {
      await orderApi('deleteAllOrders');
      state.orderPage = 1;
      await loadOrders(true);
      toast('Órdenes eliminadas', `Se eliminaron ${count} órdenes.`);
    } catch (error) {
      state.orders = previous;
      state.knownOrderIds = previousIds;
      renderOrders();
      toast('No se pudieron eliminar', errorMessage(error));
      button.disabled = false;
    }
  }

  document.addEventListener('click', event => {
    const notificationOrder = event.target.closest('[data-notification-order]');
    if (notificationOrder) { switchSection('orders'); openOrder(notificationOrder.dataset.notificationOrder); notificationOrder.remove(); }
    const metric = event.target.closest('[data-kpi-filter]');
    if (metric) { state.orderPage = 1; $('#order-status-filter').value = $('#order-status-filter').value === metric.dataset.kpiFilter ? '' : metric.dataset.kpiFilter; renderOrders(); }
    const pageButton = event.target.closest('[data-order-page]');
    if (pageButton && !pageButton.disabled) {
      const target = pageButton.dataset.orderPage;
      state.orderPage = target === 'previous' ? state.orderPage - 1 : target === 'next' ? state.orderPage + 1 : Number(target);
      renderOrders();
      $('#order-list').scrollIntoView({ block: 'start' });
    }
    const section = event.target.closest('[data-section]'); if (section) switchSection(section.dataset.section);
    const newButton = event.target.closest('[data-new]'); if (newButton) openEditor(newButton.dataset.new);
    const edit = event.target.closest('[data-edit]'); if (edit) openEditor(edit.dataset.edit, edit.dataset.id);
    const remove = event.target.closest('[data-delete]'); if (remove) void deleteEntity(remove.dataset.delete, remove.dataset.id);
    const removeAll = event.target.closest('[data-delete-all]'); if (removeAll) void deleteAllEntities(removeAll.dataset.deleteAll, removeAll);
    const order = event.target.closest('[data-order-id]'); if (order) openOrder(order.dataset.orderId);
    if (event.target.closest('[data-close-modal]')) $('#editor-modal').hidden = true;
    if (event.target.closest('[data-close-order]')) $('#order-modal').hidden = true;
  });
  document.addEventListener('change', event => {
    const toggle = event.target.closest('[data-toggle]'); if (toggle) void toggleEntity(toggle.dataset.toggle, toggle.dataset.id, toggle.checked);
    const userToggle = event.target.closest('[data-user-active]'); if (userToggle) void setUserActive(userToggle.dataset.userActive, userToggle.checked);
  });
  document.addEventListener('click', event => { const reset = event.target.closest('[data-reset-user]'); if (reset) resetUserPassword(reset.dataset.resetUser); });
  $('#auth-form').addEventListener('submit', submitAuth);
  $('#auth-form').addEventListener('click', event => { if (event.target.matches('[data-show-password]')) { const input = $('[name="password"]'); input.type = input.type === 'password' ? 'text' : 'password'; event.target.textContent = input.type === 'password' ? 'Ver' : 'Ocultar'; } });
  $('#editor-form').addEventListener('submit', event => {
    if (state.editor?.entity === 'brand-link') void submitBrandLink(event);
    else if (state.editor?.entity === 'user') void submitNewUser(event);
    else if (state.editor?.entity === 'user-password') void submitUserPassword(event);
    else void submitEditor(event);
  });
  $('#new-user').addEventListener('click', openNewUser);
  $('#new-brand-link').addEventListener('click', () => openBrandLinkEditor());
  $('#refresh-brand-links').addEventListener('click', () => { void loadBrandLinks(); });
  $('#brand-links-admin').addEventListener('click', event => {
    const edit = event.target.closest('[data-brand-edit]'); if (edit) openBrandLinkEditor(edit.dataset.brandEdit);
    const remove = event.target.closest('[data-brand-delete]'); if (remove) void deleteBrandLink(remove.dataset.brandDelete, remove);
  });
  $('#logout').addEventListener('click', () => { void logout(); });
  $('#menu-button').addEventListener('click', () => $('#sidebar').classList.toggle('open'));
  $('#alert-status').addEventListener('click', armAlerts);
  $('#refresh-orders').addEventListener('click', () => { void loadOrders(true); });
  $('#delete-all-orders').addEventListener('click', () => { void deleteAllOrders(); });
  $('#order-search').addEventListener('input', event => { state.orderQuery = event.target.value; state.orderPage = 1; $('#clear-order-search').hidden = !state.orderQuery; renderOrders(); });
  $('#clear-order-search').addEventListener('click', () => { state.orderQuery = ''; state.orderPage = 1; $('#order-search').value = ''; $('#clear-order-search').hidden = true; renderOrders(); $('#order-search').focus(); });
  $('#order-status-filter').addEventListener('change', () => { state.orderPage = 1; renderOrders(); });
  $('#order-message-filter').addEventListener('change', () => { state.orderPage = 1; renderOrders(); });
  $('#editor-modal').addEventListener('click', event => { if (event.target.id === 'editor-modal') event.currentTarget.hidden = true; });
  $('#order-modal').addEventListener('click', event => { if (event.target.id === 'order-modal') event.currentTarget.hidden = true; });
  $('#cancel-delete').addEventListener('click', () => closeDeleteConfirmation(false));
  $('#confirm-delete').addEventListener('click', () => closeDeleteConfirmation(true));
  $('#delete-confirm-modal').addEventListener('click', event => { if (event.target.id === 'delete-confirm-modal') closeDeleteConfirmation(false); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !$('#delete-confirm-modal').hidden) closeDeleteConfirmation(false); });
  ['mousemove','pointerdown','touchstart','keydown','click'].forEach(eventName => document.addEventListener(eventName, armAlerts, { passive: true, capture: true }));
  document.addEventListener('visibilitychange', () => scheduleOrderPolling(150));
  window.addEventListener('focus', () => { void loadOrders(false); scheduleOrderPolling(250); });
  window.addEventListener('online', () => { void loadOrders(true); scheduleOrderPolling(250); });
  window.addEventListener('beforeunload', () => { clearTimeout(state.orderTimer); state.nativeNotifications.forEach(notification => notification.close()); if (state.realtime) client.removeChannel(state.realtime); if (state.orderRealtime) client.removeChannel(state.orderRealtime); if (state.orderEventsRealtime) client.removeChannel(state.orderEventsRealtime); });
  if ('serviceWorker' in navigator) navigator.serviceWorker.addEventListener('message', event => {
    if (event.data?.type !== 'OPEN_ORDER') return;
    state.pendingOrderId = event.data.orderId || '';
    switchSection('orders');
    if (state.pendingOrderId) void loadOrders(true);
  });

  void initializeAuth();
})();
