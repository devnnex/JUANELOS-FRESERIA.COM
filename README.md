# Juanelos · pedidos y administración

Aplicación web estática con carta para clientes, panel administrativo, catálogo en Supabase y comandas en Google Apps Script.

## Instalación reutilizable

1. Crea un proyecto vacío de Supabase y ejecuta `schema.sql` completo en **SQL Editor**.
2. Crea un proyecto de Google Apps Script, pega `Code.gs` y despliega como aplicación web:
   - Ejecutar como: **Yo**.
   - Quién tiene acceso: **Cualquier persona**.
3. `Code.gs` está vinculado al archivo `1sSL9ddfS4Jcp7vgmAxMXx3-B4EJTiPmRRXg-ReQz-Vo`. No crees hojas ni columnas manualmente: la primera solicitud normal del sitio las crea automáticamente dentro de ese archivo.
4. En las primeras líneas de `app.js`, cambia únicamente:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `APPS_SCRIPT_URL`
5. Publica la carpeta. La carta está en `index.html` y el panel en `admin.html`.

Al abrir `admin.html` por primera vez, el sistema permite crear el jefe. Después de eso solo muestra el inicio de sesión. Los demás usuarios y sus permisos se crean desde el panel.

## Seguridad y arquitectura

- No se usa Supabase Auth.
- Los usuarios viven en `staff_users`; las contraseñas se guardan con hash bcrypt y las sesiones propias expiran a las 12 horas.
- La anon key solo puede leer datos públicos y ejecutar funciones controladas. Las escrituras administrativas exigen una sesión válida y permisos.
- Apps Script valida cada acción administrativa contra la sesión propia de Supabase.
- Las órdenes se guardan en Google Sheets con consecutivo, estado, responsable, mensaje enviado y trazabilidad.
- Productos, toppings, pagos y barrios se actualizan en tiempo real mediante Supabase Realtime.

## Desarrollo local

```bash
npm run dev
```

Abre `http://localhost:3000/` y `http://localhost:3000/admin.html`.

## Compilación

```bash
npm run build
```

La carpeta publicable se genera en `dist/`.

## Comprobantes, enlaces y ubicación de entregas

La actualización del 10 de octubre de 2026 agrega comprobantes opcionales en el checkout, su vista previa y visor ampliado en las órdenes del admin, la página de marca `enlaces.html`, el mapa `ubicacion.html` y el selector de imágenes de productos con vista previa. La barra del carrito queda centrada en PC; en móvil el aviso de producto agregado deja visible el contador y el botón se ilumina cuando hay productos.

**Activación en el proyecto existente:** reemplaza el contenido de `Code.gs` en el proyecto de Google Apps Script que ya recibe las órdenes. Luego abre **Implementar → Administrar implementaciones → Editar → Nueva versión → Implementar**, conservando la URL actual, la ejecución como propietario y el acceso para cualquier persona. Autoriza Google Drive si Google lo solicita. Subir el repositorio a GitHub no actualiza este despliegue. No hace falta volver a ejecutar `schema.sql`.

Al visitar la URL de Apps Script, debe responder `apiVersion: 2` y capacidades `receipts`, `liveLocation` y `brandLinks` en `true`. Las hojas `Enlaces` y `Ubicaciones`, y las columnas adicionales de `Ordenes`, se crean automáticamente conservando las órdenes anteriores. Mientras se utiliza una versión anterior del servidor, el sitio permite pedidos normales y evita enviar comprobantes o ubicaciones que el servidor no pueda guardar.

- En **Admin → Enlaces de Juanelos**, agrega, edita, ordena u oculta enlaces HTTPS. Los enlaces públicos se muestran en `enlaces.html`. El jefe tiene acceso; otros usuarios necesitan el permiso **Enlaces de Juanelos**. WhatsApp y cómo llegar tienen destinos iniciales que se sustituyen al agregar enlaces activos del mismo tipo.
- Los comprobantes aceptan JPG, PNG y WebP hasta 10 MB en el cliente, se optimizan a una imagen de hasta 2.5 MB y se guardan en una carpeta privada de Drive. Solo una sesión con permiso de órdenes puede abrirlos. Al eliminar la orden se retira su comprobante y se invalida su enlace de ubicación.
- La ubicación requiere HTTPS y consentimiento explícito. Solo se empieza a compartir después de confirmar un pedido a domicilio; el enlace está en la orden del admin y en el mensaje para WhatsApp. El enlace de lectura y el token de actualización son diferentes. Compartir caduca después de dos horas y puede detenerse antes.
- Al cambiar de pestaña o aplicación se pausa la ubicación y se solicita una posición nueva al regresar. El mapa muestra la última hora real recibida y marca la pausa; no simula seguimiento en segundo plano. Al cerrar o recargar la página se intenta detener la ubicación. Si el dispositivo se desconecta abruptamente, el mapa muestra la última posición con su hora y el enlace caduca. El navegador debe seguir abierto para regresar y reanudar.
- El mapa usa Leaflet 1.9.4 incluido localmente y cartografía OpenStreetMap con atribución. Si la cartografía no está disponible, puede abrirse la última posición en Google Maps.

Verificación del servidor sin conexiones externas: `node --test scripts/order-backend.test.mjs`. El recorrido de navegador se verifica con Playwright, el servidor local en el puerto 3000 y `node scripts/order-browser.test.mjs`; se puede indicar una instalación externa con `JUANELOS_PLAYWRIGHT_MODULE` y un Chrome local con `JUANELOS_CHROME`.
