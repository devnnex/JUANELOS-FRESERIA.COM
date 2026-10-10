(() => {
  'use strict';
  const service = window.JuanelosServices;
  const overlay = document.createElement('div'); overlay.className = 'receipt-lightbox'; overlay.hidden = true;
  overlay.innerHTML = '<section role="dialog" aria-modal="true" aria-label="Comprobante de pago ampliado" tabindex="-1"><header><strong>Comprobante de pago</strong><button type="button" aria-label="Cerrar comprobante">×</button></header><div><img alt="Comprobante de pago ampliado"></div></section>';
  document.body.append(overlay);
  let returnFocus = null, inertElements = [], previewUrl = null;
  function close() { overlay.hidden = true; overlay.querySelector('img').removeAttribute('src'); inertElements.forEach(element => { element.inert = false; }); inertElements = []; if (returnFocus?.isConnected) returnFocus.focus(); }
  function show(src) {
    returnFocus = document.activeElement; overlay.querySelector('img').src = src; overlay.hidden = false;
    inertElements = [...document.body.children].filter(element => element !== overlay && !element.inert && element.tagName !== 'SCRIPT'); inertElements.forEach(element => { element.inert = true; }); overlay.querySelector('button').focus();
  }
  overlay.querySelector('button').addEventListener('click', close);
  overlay.addEventListener('click', event => { if (event.target === overlay) close(); });
  overlay.addEventListener('keydown', event => { if (event.key === 'Escape') close(); if (event.key === 'Tab') { event.preventDefault(); overlay.querySelector('button').focus(); } });
  const orderModal = document.querySelector('#order-modal');
  new MutationObserver(() => { if (orderModal.hidden) close(); }).observe(orderModal, { attributes:true, attributeFilter:['hidden'] });
  function styleImagePicker(form, currentUrl) {
    if (previewUrl) URL.revokeObjectURL(previewUrl); previewUrl = null;
    const label = form.querySelector('.file-field'); if (!label) return;
    label.classList.add('product-image-field'); label.replaceChildren();
    const title = document.createElement('strong'); title.textContent = 'Imagen del producto'; label.append(title);
    const preview = document.createElement('img'); preview.className = 'product-image-preview'; preview.alt = 'Vista previa de la imagen del producto';
    if (currentUrl) preview.src = currentUrl; else preview.hidden = true; label.append(preview);
    const picker = document.createElement('span'); picker.className = 'premium-upload';
    picker.innerHTML = '<input name="imageFile" type="file" accept="image/png,image/jpeg,image/webp" aria-label="Seleccionar imagen del producto"><span class="upload-symbol" aria-hidden="true">↑</span><span><strong>Elegir imagen</strong><small>JPG, PNG o WebP · hasta 2.5 MB</small></span><b aria-hidden="true">+</b>'; label.append(picker);
    const input = picker.querySelector('input');
    input.addEventListener('change', () => {
      const file = input.files?.[0]; if (!file) return;
      if (!/^image\/(png|jpeg|webp)$/.test(file.type) || file.size > 2.5 * 1024 * 1024) {
        input.value = ''; if (previewUrl) URL.revokeObjectURL(previewUrl); previewUrl = null;
        if (currentUrl) { preview.src = currentUrl; preview.hidden = false; } else { preview.removeAttribute('src'); preview.hidden = true; }
        picker.querySelector('strong').textContent = 'Elegir imagen'; picker.querySelector('small').textContent = 'Elige JPG, PNG o WebP de hasta 2.5 MB.'; return;
      }
      if (previewUrl) URL.revokeObjectURL(previewUrl); previewUrl = URL.createObjectURL(file); preview.src = previewUrl; preview.hidden = false;
      picker.querySelector('strong').textContent = 'Cambiar imagen'; picker.querySelector('small').textContent = file.name;
    });
  }
  new MutationObserver(() => { if (document.querySelector('#editor-modal').hidden && previewUrl) { URL.revokeObjectURL(previewUrl); previewUrl = null; } }).observe(document.querySelector('#editor-modal'), { attributes:true, attributeFilter:['hidden'] });
  function renderOrder(order, api, toast) {
    const column = document.querySelector('#order-detail .order-side-column'); if (!column) return;
    if (order.receiptFileId) {
      const card = document.createElement('section'); card.className = 'command-card order-receipt-card';
      card.innerHTML = '<div class="command-heading"><div><small>PAGO</small><h3>Comprobante adjunto</h3></div></div><p>Consulta la imagen enviada por el cliente.</p><div class="receipt-admin-preview" role="status">Cargando comprobante…</div><small>Adjuntar un comprobante no confirma el pago.</small>'; column.insertBefore(card, column.lastElementChild);
      const container = card.querySelector('.receipt-admin-preview');
      async function load() {
        container.textContent = 'Cargando comprobante…';
        try {
          const result = await api('getOrderReceipt', { orderId:order.id });
          if (!container.isConnected) return;
          if (!/^image\/(jpeg|png|webp)$/.test(result.mimeType || '') || !/^[A-Za-z0-9+/]+={0,2}$/.test(result.base64 || '')) throw new Error('El comprobante no pudo abrirse.');
          const src = `data:${result.mimeType};base64,${result.base64}`;
          const button = document.createElement('button'); button.type = 'button'; button.className = 'receipt-preview-button'; button.setAttribute('aria-label','Ampliar comprobante de pago');
          const image = document.createElement('img'); image.src = src; image.alt = 'Comprobante de pago del cliente'; button.append(image);
          const hint = document.createElement('span'); hint.textContent = 'Toca para ampliar ↗'; button.append(hint); button.addEventListener('click', () => show(src)); container.replaceChildren(button);
          image.addEventListener('error', () => { container.textContent = 'No pudimos visualizar la imagen.'; });
        } catch (error) {
          if (!container.isConnected) return;
          container.textContent = 'No se pudo cargar el comprobante.'; const retry = document.createElement('button'); retry.type = 'button'; retry.className = 'secondary-button'; retry.textContent = 'Reintentar'; retry.addEventListener('click', () => { void load(); }); container.append(retry);
          toast('Comprobante no disponible', error.message);
        }
      }
      void load();
    }
    const url = service.locationUrl(order.id, order.locationViewToken);
    if (url) {
      const card = document.createElement('section'); card.className = 'command-card order-location-card';
      card.innerHTML = '<div class="command-heading"><div><small>DOMICILIO</small><h3>Ubicación del cliente</h3></div></div><p>Abre el mapa Juanelos o comparte el enlace con el domiciliario. El mapa indica si está actualizando o en pausa.</p>';
      const link = document.createElement('a'); link.href = url; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.className = 'secondary-button'; link.textContent = 'Ver mapa Juanelos ↗'; card.append(link);
      const copy = document.createElement('button'); copy.type = 'button'; copy.className = 'primary-button compact'; copy.textContent = 'Copiar enlace para domiciliario';
      copy.addEventListener('click', async () => { try { await navigator.clipboard.writeText(url); toast('Enlace copiado', 'Puedes compartirlo con el domiciliario.'); } catch { window.prompt('Copia el enlace del mapa Juanelos:', url); } }); card.append(copy); column.insertBefore(card, column.lastElementChild);
    }
  }
  window.JuanelosAdminExtras = Object.freeze({ styleImagePicker, renderOrder });
})();
