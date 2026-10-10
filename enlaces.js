(() => {
  'use strict';
  const service = window.JuanelosServices;
  const paths = {
    instagram:'<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.5 6.5h.01"/>',
    tiktok:'<path d="M14 3v12a4 4 0 1 1-4-4M14 3c0 4 3 6 6 6"/>',
    facebook:'<path d="M14 22V12h4l1-4h-5V6c0-2 1-3 3-3h2V0h-3c-4 0-6 2-6 6v2H7v4h3v10"/>',
    whatsapp:'<path d="M21 11.5a8.5 8.5 0 0 1-12.3 7.6L3 21l1.9-5.7A8.5 8.5 0 1 1 21 11.5Z"/><path d="M8 8c1 4 3 6 7 7l2-2-3-1-1 1-2-2 1-1-2-3-2 1Z"/>',
    web:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a20 20 0 0 1 0 18 20 20 0 0 1 0-18Z"/>',
    maps:'<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="3"/>'
  };
  const defaults = [
    { title:'Hablemos por WhatsApp',subtitle:'Estamos a un mensaje de tu próximo antojo.',url:'https://wa.me/573209370199',kind:'whatsapp',active:true },
    { title:'Ven a conocernos',subtitle:'Tu rincón favorito en Villavicencio.',url:'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('Juanelos 8va de La Esperanza edificio Tocoragua Villavicencio'),kind:'maps',active:true }
  ];
  const root = document.querySelector('#brand-links'); let loading = false;
  function render(links) {
    const valid = links.filter(link => link.active === true && service.safeLink(link.url));
    const list = [...valid, ...defaults.filter(item => !valid.some(link => link.kind === item.kind))];
    root.innerHTML = list.map(link => `<a class="links-destination" href="${service.escapeHtml(service.safeLink(link.url))}" target="_blank" rel="noopener noreferrer"><span class="links-destination-icon" aria-hidden="true"><svg viewBox="0 0 24 24">${paths[link.kind] || paths.web}</svg></span><span><strong>${service.escapeHtml(link.title)}</strong><small>${service.escapeHtml(link.subtitle)}</small></span><b aria-hidden="true">↗</b></a>`).join('');
  }
  async function load() {
    if (loading) return; loading = true; root.setAttribute('aria-busy','true');
    try { const result = await service.api('getPublicLinks'); if (!Array.isArray(result.links)) throw new Error('Enlaces no disponibles'); render(result.links); document.querySelector('#links-status').textContent = ''; }
    catch { render([]); document.querySelector('#links-status').textContent = 'Puedes hacer tu pedido o escribirnos por WhatsApp. Las redes estarán disponibles al restablecer la conexión.'; }
    finally { loading = false; root.setAttribute('aria-busy','false'); }
  }
  render([]); void load(); window.addEventListener('online', () => { void load(); }); document.addEventListener('visibilitychange', () => { if (!document.hidden) void load(); });
})();
