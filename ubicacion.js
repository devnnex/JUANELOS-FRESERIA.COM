(() => {
  'use strict';
  const service = window.JuanelosServices;
  const orderId = new URLSearchParams(location.search).get('order') || '', viewerToken = new URLSearchParams(location.hash.slice(1)).get('token') || '';
  const $ = selector => document.querySelector(selector);
  let map = null, marker = null, accuracyCircle = null, current = null, busy = false, timer = null, follow = true, ended = false, connectionFailed = false;
  $('#map-order').textContent = orderId || 'Enlace incompleto';
  function state(label, mode = '') { $('#map-state').textContent = label; $('#map-state').className = `delivery-map-state ${mode}`; }
  function empty(title, copy) { $('#map-empty').hidden = false; $('#map-empty-title').textContent = title; $('#map-empty-copy').textContent = copy; $('#map-center').disabled = true; $('#map-route').hidden = true; }
  function renderStatus() {
    if (!current || ended) return;
    const age = Math.max(0, Math.round((Date.now() - new Date(current.updatedAt).getTime()) / 1000));
    const paused = current.paused || age > 45 || connectionFailed;
    state(connectionFailed ? 'Sin conexión' : paused ? 'En pausa' : 'Actualizando', paused ? 'is-paused' : 'is-live');
    $('#map-time').textContent = new Date(current.updatedAt).toLocaleTimeString('es-CO', { hour:'2-digit',minute:'2-digit',second:'2-digit',timeZone:'America/Bogota' });
    $('#map-status').textContent = paused ? `Última posición recibida hace ${age < 60 ? `${age} segundos` : `${Math.floor(age / 60)} minutos`}. ${connectionFailed ? 'Reintentando la conexión.' : 'Esperando que el cliente vuelva a la página o recupere la señal.'}` : 'Ubicación reciente. El punto se actualiza con las nuevas posiciones del cliente.';
  }
  function draw(data) {
    const lat = Number(data.latitude), lng = Number(data.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180 || !Number.isFinite(new Date(data.updatedAt).getTime())) throw new Error('No se recibió una posición válida.');
    current = data; $('#map-empty').hidden = true;
    $('#map-accuracy').textContent = `${Math.round(Number(data.accuracy) || 0)} m`; $('#map-route').href = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`; $('#map-route').hidden = false;
    if (window.L) {
      const point = [lat,lng];
      if (!map) {
        map = L.map('delivery-map', { zoomControl:false }).setView(point,16);
        map.attributionControl.setPrefix(false);
        L.control.zoom({ position:'topleft' }).addTo(map);
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom:19, attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>' }).addTo(map);
        marker = L.marker(point,{icon:L.divIcon({className:'juanelos-map-marker',html:'<span></span>',iconSize:[28,28],iconAnchor:[14,14]})}).addTo(map).bindTooltip('Ubicación del cliente');
        accuracyCircle = L.circle(point,{radius:Math.max(1,Number(data.accuracy)||1),color:'#10a5d2',weight:1,fillOpacity:.08}).addTo(map);
        map.on('dragstart', () => { follow = false; });
      } else { marker.setLatLng(point); accuracyCircle.setLatLng(point).setRadius(Math.max(1,Number(data.accuracy)||1)); if (follow && !map.getCenter().equals(L.latLng(point),.00001)) map.panTo(point,{animate:!matchMedia('(prefers-reduced-motion: reduce)').matches}); }
      $('#map-center').disabled = false;
    } else { empty('La ubicación está disponible', 'No se pudo cargar el mapa. Usa «Abrir ruta en el mapa» para consultar la última posición.'); $('#map-route').hidden = false; }
    renderStatus();
  }
  async function load() {
    if (busy || ended || document.hidden) return;
    clearTimeout(timer); busy = true; $('#map-refresh').disabled = true;
    try {
      const result = await service.api('getCustomerLocation', {orderId,viewerToken}); connectionFailed = false;
      if (!result.active) { ended = true; current = null; state('Finalizada'); empty('La ubicación compartida terminó', 'El cliente detuvo la ubicación o el enlace llegó a su tiempo de expiración.'); $('#map-time').textContent = '—'; $('#map-accuracy').textContent = '—'; $('#map-status').textContent = 'Esta ubicación dejó de estar disponible.'; if (map) { map.remove(); map = null; } }
      else draw(result);
    } catch (error) {
      connectionFailed = true;
      if (!current) { state('Sin conexión','is-paused'); empty('No pudimos abrir esta ubicación', /no es válido|no está disponible/.test(error.message) ? 'El enlace es inválido o ya no está disponible. Solicita el enlace de esta orden a Juanelos.' : 'Comprueba la conexión y vuelve a intentarlo.'); }
      else renderStatus();
    } finally { busy = false; $('#map-refresh').disabled = ended; if (!ended) timer = setTimeout(() => { void load(); },8000); }
  }
  $('#map-refresh').addEventListener('click', () => { void load(); });
  $('#map-center').addEventListener('click', () => { if (map && current) { follow = true; map.setView([current.latitude,current.longitude],16); } });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) void load(); else clearTimeout(timer); });
  window.addEventListener('online', () => { void load(); });
  if (!/^JUA-[A-Za-z0-9-]+$/.test(orderId) || !/^[a-f0-9]{64}$/.test(viewerToken)) { ended = true; state('Enlace incompleto'); empty('Este enlace no es válido', 'Abre el enlace completo que te compartió Juanelos para esta entrega.'); $('#map-refresh').disabled = true; }
  else { void load(); setInterval(renderStatus,1000); }
})();
