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
