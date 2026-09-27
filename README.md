# OKI — Pedidos online

Aplicación web estática y Mobile First para consultar el menú completo de OKI, personalizar productos y gestionar un pedido.

## Abrir la aplicación

Abre `index.html` directamente en el navegador. No requiere instalación ni servidor.

También puedes iniciar un servidor local:

```bash
npm run dev
```

## Publicar en GitHub Pages

El proyecto está preparado para publicarse desde la raíz de la rama `main`. En GitHub, selecciona **Settings → Pages → Deploy from a branch → main / root**.

## Funcionalidad

- 65 productos transcritos de las cuatro cartas del menú.
- Categorías, búsqueda y estados sin resultados.
- Leches, toppings, foams, proteína, salsas y extras por producto.
- Precios dinámicos y selector de cantidad.
- Carrito editable y persistente en el dispositivo.
- Checkout y detección de mesa con `?table=12`.
