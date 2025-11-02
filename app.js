// app.js — lógica completa para The Boss (con imágenes locales)

// ---------- Config ----------
const BUSINESS_PHONE = '573144601540'; // <- reemplaza por el número real (sin '+')
const DELIVERY_FEE = 5000; // tarifa por defecto de domicilio

// ---------- Datos de ejemplo ----------
const products = [
  // ===== TAMAÑOS =====
  {
    id: 'original-12oz',
    category: 'La Original',
    title: 'La Original 12 oz',
    price: 17900,
    desc: 'Incluye 2 salsas.',
    ingredients: ['Brownie', 'Queso', 'Chocmelos', 'Chócaramo', 'Quipitos', 'Leche condensada', 'Chips de chocolate', 'Mango', 'Oreo', 'Milo', 'Hershey’s', 'Arequipe Alpina', 'Piazza', 'Chokis', 'Minichips', 'Maní', 'Klim', 'Chocolatina Jumbo'],
    extras: [
      { name: 'Brownie', price: 3000 },
      { name: 'Queso', price: 3000 },
      { name: 'Chocmelos', price: 3000 },
      { name: 'Chócaramo', price: 3000 },
      { name: 'Quipitos', price: 3000 },
      { name: 'Leche condensada', price: 3000 },
      { name: 'Chips de chocolate', price: 3000 },
      { name: 'Mango', price: 3000 },
      { name: 'Oreo', price: 3000 },
      { name: 'Milo', price: 3000 },
      { name: 'Hershey’s', price: 3000 },
      { name: 'Arequipe Alpina', price: 3000 },
      { name: 'Piazza', price: 3000 },
      { name: 'Chokis', price: 3000 },
      { name: 'Minichips', price: 3000 },
      { name: 'Maní', price: 3000 },
      { name: 'Klim', price: 3000 },
      { name: 'Chocolatina Jumbo', price: 3000 }
    ],
    image: 'images/original-12oz.png'
  },
  {
    id: 'original-16oz',
    category: 'La Original',
    title: 'La Original 16 oz',
    price: 22900,
    desc: 'Incluye 2 salsas.',
    ingredients: ['Brownie', 'Queso', 'Chocmelos', 'Chócaramo', 'Quipitos', 'Leche condensada', 'Chips de chocolate', 'Mango', 'Oreo', 'Milo', 'Hershey’s', 'Arequipe Alpina', 'Piazza', 'Chokis', 'Minichips', 'Maní', 'Klim', 'Chocolatina Jumbo'],
    extras: [
      { name: 'Brownie', price: 3000 },
      { name: 'Queso', price: 3000 },
      { name: 'Chocmelos', price: 3000 },
      { name: 'Chócaramo', price: 3000 },
      { name: 'Quipitos', price: 3000 },
      { name: 'Leche condensada', price: 3000 },
      { name: 'Chips de chocolate', price: 3000 },
      { name: 'Mango', price: 3000 },
      { name: 'Oreo', price: 3000 },
      { name: 'Milo', price: 3000 },
      { name: 'Hershey’s', price: 3000 },
      { name: 'Arequipe Alpina', price: 3000 },
      { name: 'Piazza', price: 3000 },
      { name: 'Chokis', price: 3000 },
      { name: 'Minichips', price: 3000 },
      { name: 'Maní', price: 3000 },
      { name: 'Klim', price: 3000 },
      { name: 'Chocolatina Jumbo', price: 3000 }
    ],
    image: 'images/original-16oz.png'
  },
  {
    id: 'poderosa-12oz',
    category: 'La Poderosa',
    title: 'La Poderosa 12 oz',
    price: 21900,
    desc: 'Incluye 1 salsa y 3 toppings.',
    ingredients: ['Brownie', 'Queso', 'Chocmelos', 'Chócaramo', 'Quipitos', 'Leche condensada', 'Chips de chocolate', 'Mango', 'Oreo', 'Milo', 'Hershey’s', 'Arequipe Alpina', 'Piazza', 'Chokis', 'Minichips', 'Maní', 'Klim', 'Chocolatina Jumbo'],
    extras: [
      { name: 'Brownie', price: 3000 },
      { name: 'Queso', price: 3000 },
      { name: 'Chocmelos', price: 3000 },
      { name: 'Chócaramo', price: 3000 },
      { name: 'Quipitos', price: 3000 },
      { name: 'Leche condensada', price: 3000 },
      { name: 'Chips de chocolate', price: 3000 },
      { name: 'Mango', price: 3000 },
      { name: 'Oreo', price: 3000 },
      { name: 'Milo', price: 3000 },
      { name: 'Hershey’s', price: 3000 },
      { name: 'Arequipe Alpina', price: 3000 },
      { name: 'Piazza', price: 3000 },
      { name: 'Chokis', price: 3000 },
      { name: 'Minichips', price: 3000 },
      { name: 'Maní', price: 3000 },
      { name: 'Klim', price: 3000 },
      { name: 'Chocolatina Jumbo', price: 3000 }
    ],
    image: 'images/poderosa-12oz.png'
  },
  {
    id: 'poderosa-16oz',
    category: 'La Poderosa',
    title: 'La Poderosa 16 oz',
    price: 25500,
    desc: 'Incluye 1 salsa y 3 toppings.',
    ingredients: ['Brownie', 'Queso', 'Chocmelos', 'Chócaramo', 'Quipitos', 'Leche condensada', 'Chips de chocolate', 'Mango', 'Oreo', 'Milo', 'Hershey’s', 'Arequipe Alpina', 'Piazza', 'Chokis', 'Minichips', 'Maní', 'Klim', 'Chocolatina Jumbo'],
    extras: [
      { name: 'Brownie', price: 3000 },
      { name: 'Queso', price: 3000 },
      { name: 'Chocmelos', price: 3000 },
      { name: 'Chócaramo', price: 3000 },
      { name: 'Quipitos', price: 3000 },
      { name: 'Leche condensada', price: 3000 },
      { name: 'Chips de chocolate', price: 3000 },
      { name: 'Mango', price: 3000 },
      { name: 'Oreo', price: 3000 },
      { name: 'Milo', price: 3000 },
      { name: 'Hershey’s', price: 3000 },
      { name: 'Arequipe Alpina', price: 3000 },
      { name: 'Piazza', price: 3000 },
      { name: 'Chokis', price: 3000 },
      { name: 'Minichips', price: 3000 },
      { name: 'Maní', price: 3000 },
      { name: 'Klim', price: 3000 },
      { name: 'Chocolatina Jumbo', price: 3000 }
    ],
    image: 'images/poderosa-16oz.png'
  },
  {
  id: 'pave-maracuya',
  category: 'Carta de Paves',
  title: 'Pavé Maracuyá',
  price: 18900,
  desc: 'Delicioso pavé de maracuyá con base cremosa y galleta.',
  ingredients: ['Brownie', 'Queso', 'Chocmelos', 'Chócaramo', 'Quipitos', 'Leche condensada', 'Chips de chocolate', 'Mango', 'Oreo', 'Milo', 'Hershey’s', 'Arequipe Alpina', 'Piazza', 'Chokis', 'Minichips', 'Maní', 'Klim', 'Chocolatina Jumbo'],
  extras: [
    { name: 'Brownie', price: 3000 },
    { name: 'Queso', price: 3000 },
    { name: 'Chocmelos', price: 3000 },
    { name: 'Chócaramo', price: 3000 },
    { name: 'Quipitos', price: 3000 },
    { name: 'Leche condensada', price: 3000 },
    { name: 'Chips de chocolate', price: 3000 },
    { name: 'Mango', price: 3000 },
    { name: 'Oreo', price: 3000 },
    { name: 'Milo', price: 3000 },
    { name: 'Hershey’s', price: 3000 },
    { name: 'Arequipe Alpina', price: 3000 },
    { name: 'Piazza', price: 3000 },
    { name: 'Chokis', price: 3000 },
    { name: 'Minichips', price: 3000 },
    { name: 'Maní', price: 3000 },
    { name: 'Klim', price: 3000 },
    { name: 'Chocolatina Jumbo', price: 3000 }
  ],
  image: 'images/pave-maracuya.png'
},
{
  id: 'pave-klim',
  category: 'Carta de Paves',
  title: 'Pavé Klim',
  price: 18900,
  desc: 'Postre frío de leche Klim con galleta y crema suave.',
  ingredients: ['Brownie', 'Queso', 'Chocmelos', 'Chócaramo', 'Quipitos', 'Leche condensada', 'Chips de chocolate', 'Mango', 'Oreo', 'Milo', 'Hershey’s', 'Arequipe Alpina', 'Piazza', 'Chokis', 'Minichips', 'Maní', 'Klim', 'Chocolatina Jumbo'],
  extras: [
    { name: 'Brownie', price: 3000 },
    { name: 'Queso', price: 3000 },
    { name: 'Chocmelos', price: 3000 },
    { name: 'Chócaramo', price: 3000 },
    { name: 'Quipitos', price: 3000 },
    { name: 'Leche condensada', price: 3000 },
    { name: 'Chips de chocolate', price: 3000 },
    { name: 'Mango', price: 3000 },
    { name: 'Oreo', price: 3000 },
    { name: 'Milo', price: 3000 },
    { name: 'Hershey’s', price: 3000 },
    { name: 'Arequipe Alpina', price: 3000 },
    { name: 'Piazza', price: 3000 },
    { name: 'Chokis', price: 3000 },
    { name: 'Minichips', price: 3000 },
    { name: 'Maní', price: 3000 },
    { name: 'Klim', price: 3000 },
    { name: 'Chocolatina Jumbo', price: 3000 }
  ],
  image: 'images/pave-klim.png'
},
{
  id: 'pave-oreo',
  category: 'Carta de Paves',
  title: 'Pavé Oreo',
  price: 18900,
  desc: 'Cremoso pavé con trozos de galleta Oreo y base dulce.',
  ingredients: ['Brownie', 'Queso', 'Chocmelos', 'Chócaramo', 'Quipitos', 'Leche condensada', 'Chips de chocolate', 'Mango', 'Oreo', 'Milo', 'Hershey’s', 'Arequipe Alpina', 'Piazza', 'Chokis', 'Minichips', 'Maní', 'Klim', 'Chocolatina Jumbo'],
  extras: [
    { name: 'Brownie', price: 3000 },
    { name: 'Queso', price: 3000 },
    { name: 'Chocmelos', price: 3000 },
    { name: 'Chócaramo', price: 3000 },
    { name: 'Quipitos', price: 3000 },
    { name: 'Leche condensada', price: 3000 },
    { name: 'Chips de chocolate', price: 3000 },
    { name: 'Mango', price: 3000 },
    { name: 'Oreo', price: 3000 },
    { name: 'Milo', price: 3000 },
    { name: 'Hershey’s', price: 3000 },
    { name: 'Arequipe Alpina', price: 3000 },
    { name: 'Piazza', price: 3000 },
    { name: 'Chokis', price: 3000 },
    { name: 'Minichips', price: 3000 },
    { name: 'Maní', price: 3000 },
    { name: 'Klim', price: 3000 },
    { name: 'Chocolatina Jumbo', price: 3000 }
  ],
  image: 'images/pave-oreo.png'
},
{
  id: 'pave-arequipe',
  category: 'Carta de Paves',
  title: 'Pavé Arequipe',
  price: 18900,
  desc: 'Suave pavé con sabor a arequipe y textura artesanal.',
  ingredients: ['Brownie', 'Queso', 'Chocmelos', 'Chócaramo', 'Quipitos', 'Leche condensada', 'Chips de chocolate', 'Mango', 'Oreo', 'Milo', 'Hershey’s', 'Arequipe Alpina', 'Piazza', 'Chokis', 'Minichips', 'Maní', 'Klim', 'Chocolatina Jumbo'],
  extras: [
    { name: 'Brownie', price: 3000 },
    { name: 'Queso', price: 3000 },
    { name: 'Chocmelos', price: 3000 },
    { name: 'Chócaramo', price: 3000 },
    { name: 'Quipitos', price: 3000 },
    { name: 'Leche condensada', price: 3000 },
    { name: 'Chips de chocolate', price: 3000 },
    { name: 'Mango', price: 3000 },
    { name: 'Oreo', price: 3000 },
    { name: 'Milo', price: 3000 },
    { name: 'Hershey’s', price: 3000 },
    { name: 'Arequipe Alpina', price: 3000 },
    { name: 'Piazza', price: 3000 },
    { name: 'Chokis', price: 3000 },
    { name: 'Minichips', price: 3000 },
    { name: 'Maní', price: 3000 },
    { name: 'Klim', price: 3000 },
    { name: 'Chocolatina Jumbo', price: 3000 }
  ],
  image: 'images/pave-arequipe.png'
},
{
  id: 'pave-jumbo',
  category: 'Carta de Paves',
  title: 'Pavé Jumbo',
  price: 19900,
  desc: 'Versión extra grande de nuestros pavés clásicos.',
  ingredients: ['Brownie', 'Queso', 'Chocmelos', 'Chócaramo', 'Quipitos', 'Leche condensada', 'Chips de chocolate', 'Mango', 'Oreo', 'Milo', 'Hershey’s', 'Arequipe Alpina', 'Piazza', 'Chokis', 'Minichips', 'Maní', 'Klim', 'Chocolatina Jumbo'],
  extras: [
    { name: 'Brownie', price: 3000 },
    { name: 'Queso', price: 3000 },
    { name: 'Chocmelos', price: 3000 },
    { name: 'Chócaramo', price: 3000 },
    { name: 'Quipitos', price: 3000 },
    { name: 'Leche condensada', price: 3000 },
    { name: 'Chips de chocolate', price: 3000 },
    { name: 'Mango', price: 3000 },
    { name: 'Oreo', price: 3000 },
    { name: 'Milo', price: 3000 },
    { name: 'Hershey’s', price: 3000 },
    { name: 'Arequipe Alpina', price: 3000 },
    { name: 'Piazza', price: 3000 },
    { name: 'Chokis', price: 3000 },
    { name: 'Minichips', price: 3000 },
    { name: 'Maní', price: 3000 },
    { name: 'Klim', price: 3000 },
    { name: 'Chocolatina Jumbo', price: 3000 }
  ],
  image: 'images/pave-jumbo.png'
},
{
  id: 'parfait-mediano',
  category: 'Carta de Paves',
  title: 'Parfait Mediano',
  price: 17900,
  desc: 'Yogurt griego, 3 tipos de fruta y granola artesanal.',
  ingredients: ['Brownie', 'Queso', 'Chocmelos', 'Chócaramo', 'Quipitos', 'Leche condensada', 'Chips de chocolate', 'Mango', 'Oreo', 'Milo', 'Hershey’s', 'Arequipe Alpina', 'Piazza', 'Chokis', 'Minichips', 'Maní', 'Klim', 'Chocolatina Jumbo'],
  extras: [
    { name: 'Brownie', price: 3000 },
    { name: 'Queso', price: 3000 },
    { name: 'Chocmelos', price: 3000 },
    { name: 'Chócaramo', price: 3000 },
    { name: 'Quipitos', price: 3000 },
    { name: 'Leche condensada', price: 3000 },
    { name: 'Chips de chocolate', price: 3000 },
    { name: 'Mango', price: 3000 },
    { name: 'Oreo', price: 3000 },
    { name: 'Milo', price: 3000 },
    { name: 'Hershey’s', price: 3000 },
    { name: 'Arequipe Alpina', price: 3000 },
    { name: 'Piazza', price: 3000 },
    { name: 'Chokis', price: 3000 },
    { name: 'Minichips', price: 3000 },
    { name: 'Maní', price: 3000 },
    { name: 'Klim', price: 3000 },
    { name: 'Chocolatina Jumbo', price: 3000 }
  ],
  image: 'images/parfait-mediano.png'
},
{
  id: 'parfait-grande',
  category: 'Carta de Paves',
  title: 'Parfait Grande',
  price: 21900,
  desc: 'Yogurt griego, 4 tipos de fruta y granola artesanal.',
  ingredients: ['Brownie', 'Queso', 'Chocmelos', 'Chócaramo', 'Quipitos', 'Leche condensada', 'Chips de chocolate', 'Mango', 'Oreo', 'Milo', 'Hershey’s', 'Arequipe Alpina', 'Piazza', 'Chokis', 'Minichips', 'Maní', 'Klim', 'Chocolatina Jumbo'],
  extras: [
    { name: 'Brownie', price: 3000 },
    { name: 'Queso', price: 3000 },
    { name: 'Chocmelos', price: 3000 },
    { name: 'Chócaramo', price: 3000 },
    { name: 'Quipitos', price: 3000 },
    { name: 'Leche condensada', price: 3000 },
    { name: 'Chips de chocolate', price: 3000 },
    { name: 'Mango', price: 3000 },
    { name: 'Oreo', price: 3000 },
    { name: 'Milo', price: 3000 },
    { name: 'Hershey’s', price: 3000 },
    { name: 'Arequipe Alpina', price: 3000 },
    { name: 'Piazza', price: 3000 },
    { name: 'Chokis', price: 3000 },
    { name: 'Minichips', price: 3000 },
    { name: 'Maní', price: 3000 },
    { name: 'Klim', price: 3000 },
    { name: 'Chocolatina Jumbo', price: 3000 }
  ],
  image: 'images/parfait-grande.png'
},
{
  id: 'maracu-brownie',
  category: 'Carta de Paves',
  title: 'Maracu Brownie',
  price: 18900,
  desc: 'Crujiente base de brownie con crema de maracuyá y frutas.',
  ingredients: ['Brownie', 'Queso', 'Chocmelos', 'Chócaramo', 'Quipitos', 'Leche condensada', 'Chips de chocolate', 'Mango', 'Oreo', 'Milo', 'Hershey’s', 'Arequipe Alpina', 'Piazza', 'Chokis', 'Minichips', 'Maní', 'Klim', 'Chocolatina Jumbo'],
  extras: [
    { name: 'Brownie', price: 3000 },
    { name: 'Queso', price: 3000 },
    { name: 'Chocmelos', price: 3000 },
    { name: 'Chócaramo', price: 3000 },
    { name: 'Quipitos', price: 3000 },
    { name: 'Leche condensada', price: 3000 },
    { name: 'Chips de chocolate', price: 3000 },
    { name: 'Mango', price: 3000 },
    { name: 'Oreo', price: 3000 },
    { name: 'Milo', price: 3000 },
    { name: 'Hershey’s', price: 3000 },
    { name: 'Arequipe Alpina', price: 3000 },
    { name: 'Piazza', price: 3000 },
    { name: 'Chokis', price: 3000 },
    { name: 'Minichips', price: 3000 },
    { name: 'Maní', price: 3000 },
    { name: 'Klim', price: 3000 },
    { name: 'Chocolatina Jumbo', price: 3000 }
  ],
  image: 'images/maracu-brownie.png'
},
{
  id: 'fresas-chocolate',
  category: 'Carta de Paves',
  title: 'Fresas con Chocolate',
  price: 22500,
  desc: 'Fresas enteras cubiertas de chocolate.',
  ingredients: ['Brownie', 'Queso', 'Chocmelos', 'Chócaramo', 'Quipitos', 'Leche condensada', 'Chips de chocolate', 'Mango', 'Oreo', 'Milo', 'Hershey’s', 'Arequipe Alpina', 'Piazza', 'Chokis', 'Minichips', 'Maní', 'Klim', 'Chocolatina Jumbo'],
  extras: [
    { name: 'Brownie', price: 3000 },
    { name: 'Queso', price: 3000 },
    { name: 'Chocmelos', price: 3000 },
    { name: 'Chócaramo', price: 3000 },
    { name: 'Quipitos', price: 3000 },
    { name: 'Leche condensada', price: 3000 },
    { name: 'Chips de chocolate', price: 3000 },
    { name: 'Mango', price: 3000 },
    { name: 'Oreo', price: 3000 },
    { name: 'Milo', price: 3000 },
    { name: 'Hershey’s', price: 3000 },
    { name: 'Arequipe Alpina', price: 3000 },
    { name: 'Piazza', price: 3000 },
    { name: 'Chokis', price: 3000 },
    { name: 'Minichips', price: 3000 },
    { name: 'Maní', price: 3000 },
    { name: 'Klim', price: 3000 },
    { name: 'Chocolatina Jumbo', price: 3000 }
  ],
  image: 'images/fresas-chocolate.png'
},

// ---------------------- Bebidas ----------------------
{
  id: 'frape-casa',
  category: 'Bebidas',
  title: 'Frappe de la Casa',
  price: 12000,
  desc: 'Refrescante frappe preparado con la receta especial de la casa.',
  image: 'images/frape-casa.png'
},
{
  id: 'soda-casa',
  category: 'Bebidas',
  title: 'Soda de la Casa',
  price: 12000,
  desc: 'Soda artesanal con sabores frutales únicos.',
  image: 'images/soda-casa.png'
},
{
  id: 'botella-agua',
  category: 'Bebidas',
  title: 'Botella de Agua',
  price: 5000,
  desc: 'Agua embotellada purificada.',
  image: 'images/botella-agua.png'
},
{
  id: 'soda-sencilla',
  category: 'Bebidas',
  title: 'Soda Sencilla',
  price: 8500,
  desc: 'Soda clásica fría para acompañar tu postre.',
  image: 'images/soda-sencilla.png'
},
{
  id: 'frappe-cafe',
  category: 'Bebidas',
  title: 'Frappe de Café',
  price: 12000,
  desc: 'Frappe cremoso con café y hielo.',
  image: 'images/frappe-cafe.png'
},
{
  id: 'americano',
  category: 'Bebidas',
  title: 'Americano',
  price: 5000,
  desc: 'Café americano caliente y aromático.',
  image: 'images/americano.png'
},
{
  id: 'campesino',
  category: 'Bebidas',
  title: 'Campesino',
  price: 5500,
  desc: 'Tradicional café campesino colombiano.',
  image: 'images/campesino.png'
},
{
  id: 'latte-frio',
  category: 'Bebidas',
  title: 'Latte Frío',
  price: 10000,
  desc: 'Delicioso café con leche servido frío.',
  image: 'images/latte-frio.png'
}
];

const categories = [...new Set(products.map(p=>p.category))];

// ---------- Estado ----------
let cart = JSON.parse(localStorage.getItem('tb_cart') || '[]');
let activeCategory = 'La Original';

// ---------- DOM refs ----------
const catalogEl = document.getElementById('catalog');
const categoriesEl = document.querySelector('.categories');
const navBtns = document.querySelectorAll('.nav-btn');
const cartCountEl = document.getElementById('cart-count');
const cartDrawer = document.getElementById('cart-drawer');
const cartItemsEl = document.getElementById('cart-items');
const cartSubtotalEl = document.getElementById('cart-subtotal');
const cartDeliveryEl = document.getElementById('cart-delivery');
const cartTotalEl = document.getElementById('cart-total');
const openCartBtn = document.getElementById('open-cart');
const closeCartBtn = document.getElementById('close-cart');
const checkoutBtn = document.getElementById('checkout-btn');
const productModal = document.getElementById('product-modal');
const modalContent = document.getElementById('modal-content');
const modalClose = document.getElementById('modal-close');
const checkoutModal = document.getElementById('checkout-modal');
const checkoutForm = document.getElementById('checkout-form');
const addressLabel = document.getElementById('address-label');
const checkoutClose = document.getElementById('checkout-close');
const backToCartBtn = document.getElementById('back-to-cart');
const clearCartBtn = document.getElementById('clear-cart');
const searchInput = document.getElementById('search');

// ---------- Init ----------
function init(){
  renderCategories();
  setActiveCategory(activeCategory);
  bindEvents();
  refreshCartUI();
}
init();

// ---------- Render categorías ----------
function renderCategories(){
  categoriesEl.innerHTML = '';
  categories.forEach(cat=>{
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = cat === activeCategory ? 'active' : '';
    btn.dataset.cat = cat;
    btn.textContent = capitalize(cat);
    btn.addEventListener('click', ()=> switchCategory(cat));
    categoriesEl.appendChild(btn);
  });
}

// ---------- Cambiar categoría ----------
function setActiveCategory(cat){
  activeCategory = cat;
  Array.from(document.querySelectorAll('.categories button')).forEach(b=> b.classList.toggle('active', b.dataset.cat === cat));
  Array.from(navBtns).forEach(b=> b.classList.toggle('active', b.dataset.cat === cat));
  renderProducts(cat);
}

function switchCategory(cat){
  const ct = catalogEl;
  ct.classList.remove('fade-in');
  ct.classList.add('fade-out');
  setTimeout(()=>{
    setActiveCategory(cat);
    ct.classList.remove('fade-out');
    ct.classList.add('fade-in');
  }, 180);
}

// ---------- Render productos ----------
function renderProducts(cat){
  const q = (searchInput.value || '').trim().toLowerCase();
  const items = products.filter(p => p.category === cat && (p.title.toLowerCase().includes(q) || p.desc.toLowerCase().includes(q)));
  catalogEl.innerHTML = '';

  if(items.length === 0){
    catalogEl.innerHTML = `<div class="no-results">No hay productos</div>`;
    return;
  }

  items.forEach(p=>{
    const el = document.createElement('article');
    el.className = 'card';
    el.innerHTML = `
      <img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.title)}">
      <div class="title">${escapeHtml(p.title)}</div>
      <div class="desc">${escapeHtml(p.desc)}</div>
      <div class="meta">
        <div class="price">$${numberWithCommas(p.price)}</div>
        <button class="add" data-id="${p.id}">Agregar</button>
      </div>
    `;
    el.querySelector('.add').addEventListener('click', ()=> openProductModal(p.id));
    catalogEl.appendChild(el);
  });
}

// ---------- Modal producto ----------
function openProductModal(productId) {
  const p = products.find(x => x.id === productId);
  if (!p) return;

  productModal.classList.remove('hidden');
  productModal.setAttribute('aria-hidden', 'false');
  modalContent.innerHTML = '';

  const modalInner = document.createElement('div');
  modalInner.className = 'modal-inner';
  modalInner.innerHTML = `
    <div class="modal-header">
      <img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.title)}" class="modal-img">
      <h3>${escapeHtml(p.title)} — $${numberWithCommas(p.price)}</h3>
      <p class="desc">${escapeHtml(p.desc)}</p>
    </div>
    <div class="modal-body scrollable-area"></div>
    <div class="modal-footer">
      <div class="qty-controls">
        <button id="qty-decr" type="button">-</button>
        <span id="qty-val">1</span>
        <button id="qty-incr" type="button">+</button>
      </div>
      <div class="price-actions">
        <div id="price-breakdown">
          <div><strong>Subtotal:</strong> <span id="subtotal">$${numberWithCommas(p.price)}</span></div>
          <div><strong>Adicionales:</strong> <span id="extras-total">$0</span></div>
          <div><strong>Total:</strong> <span id="modal-price">$${numberWithCommas(p.price)}</span></div>
        </div>
        <button id="modal-add" class="btn-primary" type="button">Añadir al carrito</button>
      </div>
    </div>
  `;

  const scrollArea = modalInner.querySelector('.scrollable-area');
  let ingSection = null, extrasSection = null;

  // === Sección generadora ===
  function buildSection(title, items, dataAttr) {
    const section = document.createElement('div');
    section.className = 'section collapsed';

    const header = document.createElement('div');
    header.className = 'section-header';
    header.innerHTML = `<strong>${title} ▼</strong>`;

    const body = document.createElement('div');
    body.className = 'section-body checklist';

    items.forEach((item, idx) => {
      const id = `${dataAttr}-${p.id}-${idx}`;
      const label = document.createElement('label');
      label.className = 'check-item';

      if (dataAttr === 'ing') {
        label.innerHTML = `
          <input type="checkbox" data-ing="${escapeHtml(item)}" id="${id}">
          <span>${escapeHtml(item)}</span>
        `;
      } else {
        label.innerHTML = `
          <div class="extra-item">
            <label>
              <input type="checkbox" data-extra="${escapeHtml(item.name)}" data-price="${item.price}" id="${id}">
              <span>${escapeHtml(item.name)} (+$${numberWithCommas(item.price)})</span>
            </label>
            <div class="extra-qty hidden">
              <button type="button" class="ex-decr">-</button>
              <span class="ex-val">1</span>
              <button type="button" class="ex-incr">+</button>
            </div>
          </div>
        `;
      }

      body.appendChild(label);
    });

    section.appendChild(header);
    section.appendChild(body);
    scrollArea.appendChild(section);
    return { section, header };
  }

  // === Ingredientes y adicionales ===
  if (p.ingredients?.length) {
    const { section, header } = buildSection('Selecciona Toppings', p.ingredients, 'ing');
    ingSection = section;
    header.addEventListener('click', () => {
      const open = !ingSection.classList.contains('collapsed');
      ingSection.classList.toggle('collapsed', open);
      header.innerHTML = `<strong>Selecciona Toppings ${open ? '▼' : '▲'}</strong>`;
      if (extrasSection) {
        extrasSection.classList.add('collapsed');
        extrasSection.querySelector('.section-header').innerHTML = '<strong>Agregar adicionales ▼</strong>';
      }
    });
  }

  // === Limitar a máximo 3 toppings ===
modalContent.addEventListener('change', e => {
  if (e.target.matches('input[data-ing]')) {
    const checked = modalContent.querySelectorAll('input[data-ing]:checked');
    if (checked.length > 3) {
      e.target.checked = false;
      alert('Selecciona máximo 3 toppings!');
    }
  }
});

  if (p.extras?.length) {
    const { section, header } = buildSection('Agregar adicionales', p.extras, 'ex');
    extrasSection = section;
    header.addEventListener('click', () => {
      const open = !extrasSection.classList.contains('collapsed');
      extrasSection.classList.toggle('collapsed', open);
      header.innerHTML = `<strong>Agregar adicionales ${open ? '▼' : '▲'}</strong>`;
      if (ingSection) {
        ingSection.classList.add('collapsed');
        ingSection.querySelector('.section-header').innerHTML = '<strong>Selecciona Toppings ▼</strong>';
      }
    });
  }

  modalContent.appendChild(modalInner);

  // === Lógica de cantidad ===
  let qty = 1;
  function getExtrasSum() {
    let total = 0;
    modalContent.querySelectorAll('input[data-extra]:checked').forEach(chk => {
      const price = Number(chk.dataset.price);
      const parent = chk.closest('.extra-item');
      const exQty = Number(parent.querySelector('.ex-val').textContent);
      total += price * exQty;
    });
    return total;
  }

  function updateModalPrice() {
    const extrasSum = getExtrasSum();
    const subtotal = p.price * qty;
    const total = subtotal + extrasSum;

    document.getElementById('subtotal').textContent = '$' + numberWithCommas(subtotal);
    document.getElementById('extras-total').textContent = '$' + numberWithCommas(extrasSum);
    document.getElementById('modal-price').textContent = '$' + numberWithCommas(total);
  }

  // === Eventos de cantidad global ===
  modalContent.querySelector('#qty-decr').addEventListener('click', () => {
    if (qty > 1) qty--;
    document.getElementById('qty-val').textContent = qty;
    updateModalPrice();
  });
  modalContent.querySelector('#qty-incr').addEventListener('click', () => {
    qty++;
    document.getElementById('qty-val').textContent = qty;
    updateModalPrice();
  });

  // === Checkbox adicionales con contador ===
  modalContent.addEventListener('change', e => {
    if (e.target.matches('input[data-extra]')) {
      const extraItem = e.target.closest('.extra-item');
      const qtyBox = extraItem.querySelector('.extra-qty');
      qtyBox.classList.toggle('hidden', !e.target.checked);
      updateModalPrice();
    }
  });

// === Control preciso de botones + y - para adicionales ===
['click', 'touchstart'].forEach(evtType => {
  modalContent.addEventListener(evtType, e => {
    const btn = e.target.closest('.ex-incr, .ex-decr');
    if (!btn) return;

    e.stopPropagation();
    e.preventDefault();

    // Previene clicks múltiples simultáneos
    if (btn.disabled) return;
    btn.disabled = true;
    setTimeout(() => btn.disabled = false, 150);

    const qtyBox = btn.closest('.extra-qty');
    const valEl = qtyBox.querySelector('.ex-val');
    let val = Number(valEl.textContent);

    if (btn.classList.contains('ex-incr')) val++;
    else if (val > 1) val--;

    valEl.textContent = val;
    updateModalPrice();
  });
});



  // === Añadir al carrito ===
  modalContent.querySelector('#modal-add').addEventListener('click', () => {
    const removed = Array.from(modalContent.querySelectorAll('input[data-ing]:checked')).map(i => i.dataset.ing);
    const extras = Array.from(modalContent.querySelectorAll('input[data-extra]:checked')).map(i => {
      const parent = i.closest('.extra-item');
      const exQty = Number(parent.querySelector('.ex-val').textContent);
      return {
        name: i.dataset.extra,
        price: Number(i.dataset.price),
        qty: exQty
      };
    });
    addToCart({ productId: p.id, title: p.title, price: p.price, qty, removed, extras });
    closeProductModal();
  });
}









function closeProductModal(){
  productModal.classList.add('hidden');
  productModal.setAttribute('aria-hidden','true');
  modalContent.innerHTML = '';
}
modalClose.addEventListener('click', closeProductModal);
productModal.addEventListener('click', (e)=>{ if(e.target === productModal) closeProductModal(); });

// ---------- Carrito ----------
function addToCart(item){
  const key = generateCartKey(item);
  const existing = cart.find(c => c.key === key);
  if(existing){ existing.qty += item.qty; }
  else{ cart.push({...item, key}); }
  persistCart();
  refreshCartUI();
}

function generateCartKey(it){
  const extrasPart = (it.extras || []).map(e => e.name).sort().join('|') || '';
  const removedPart = (it.removed || []).slice().sort().join('|') || '';
  return `${it.productId}::${extrasPart}::${removedPart}`;
}

function persistCart(){
  localStorage.setItem('tb_cart', JSON.stringify(cart));
}

function refreshCartUI(){
  cartCountEl.textContent = String(cart.reduce((s,i) => s + i.qty, 0));
  cartItemsEl.innerHTML = '';
  let subtotal = 0;

  if(cart.length === 0){
    cartItemsEl.innerHTML = '<div class="muted">Tu carrito está vacío</div>';
  } else {
    cart.forEach((c, idx)=>{
      const extrasText = (c.extras && c.extras.length) ? ('+' + c.extras.map(e=>e.name).join(', ')) : '';
      const removedText = (c.removed && c.removed.length) ? ('(Toppings: ' + c.removed.join(', ') + ')') : '';
      const extrasSum = (c.extras || []).reduce((s,e)=> s + (e.price || 0), 0);
      const itemTotal = (c.price + extrasSum) * c.qty;
      subtotal += itemTotal;

      const row = document.createElement('div');
      row.className = 'cart-item';
      row.innerHTML = `
        <div class="info">
          <div><strong>${escapeHtml(c.title)}</strong> ${escapeHtml(removedText)}</div>
          <div class="muted">${escapeHtml(extrasText)}</div>
        </div>
        <div style="text-align:right">
          <div>$${numberWithCommas(itemTotal)}</div>
          <div class="qty-controls">
            <button data-action="decr" data-idx="${idx}" type="button">-</button>
            <span>${c.qty}</span>
            <button data-action="incr" data-idx="${idx}" type="button">+</button>
            <button data-action="del" data-idx="${idx}" type="button">🗑</button>
          </div>
        </div>
      `;
      cartItemsEl.appendChild(row);
    });
  }

  cartSubtotalEl.textContent = '$' + numberWithCommas(subtotal);
  
 cartDeliveryEl.textContent = '$0';
cartTotalEl.textContent = '$' + numberWithCommas(subtotal);

  // bind buttons
  cartItemsEl.querySelectorAll('button').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const action = btn.dataset.action;
      const i = Number(btn.dataset.idx);
      if(Number.isNaN(i)) return;
      if(action === 'incr') cart[i].qty++;
      else if(action === 'decr') cart[i].qty = Math.max(1, cart[i].qty - 1);
      else if(action === 'del') cart.splice(i, 1);
      persistCart();
      refreshCartUI();
    });
  });
}

// ---------- Interacciones UI ----------
openCartBtn.addEventListener('click', ()=>{ cartDrawer.classList.remove('hidden'); cartDrawer.setAttribute('aria-hidden','false'); });
closeCartBtn.addEventListener('click', ()=>{ cartDrawer.classList.add('hidden'); cartDrawer.setAttribute('aria-hidden','true'); });
checkoutBtn.addEventListener('click', ()=>{ cartDrawer.classList.add('hidden'); openCheckout(); });
clearCartBtn.addEventListener('click', ()=>{ if(confirm('Vaciar carrito?')){ cart = []; persistCart(); refreshCartUI(); } });

// ---------- Checkout ----------
function openCheckout(){
  if(cart.length === 0){ alert('El carrito está vacío.'); return; }
  checkoutForm.reset();
  addressLabel.classList.add('hidden');
  checkoutModal.classList.remove('hidden');
  checkoutModal.setAttribute('aria-hidden','false');
}

checkoutClose.addEventListener('click', ()=>{ checkoutModal.classList.add('hidden'); checkoutModal.setAttribute('aria-hidden','true'); });
backToCartBtn.addEventListener('click', ()=>{ checkoutModal.classList.add('hidden'); cartDrawer.classList.remove('hidden'); });

// Mostrar campo dirección sólo si es domicilio
checkoutForm.addEventListener('change', () => {
  const method = checkoutForm.querySelector('input[name="method"]:checked')?.value || 'recoger';
  const addressLabel = document.getElementById('address-label');
  const envioRow = document.getElementById('envio-row');
  const deliveryEl = document.getElementById('cart-delivery');
  const totalEl = document.getElementById('cart-total-checkout');

  // Mostrar campo de dirección solo si es domicilio
  addressLabel.classList.toggle('hidden', method !== 'domicilio');

  // Calcular subtotal
  const subtotal = cart.reduce((s, i) => {
    const extrasSum = (i.extras || []).reduce((x, e) => x + (e.price || 0), 0);
    return s + (i.price + extrasSum) * i.qty;
  }, 0);

  // Calcular envío y total
  const delivery = method === 'domicilio' && subtotal > 0 ? DELIVERY_FEE : 0;
  const total = subtotal + delivery;

  // Mostrar u ocultar fila de envío
  envioRow.classList.toggle('hidden', method !== 'domicilio');

  // Actualizar textos
  deliveryEl.textContent = `$${numberWithCommas(delivery)}`;
  totalEl.textContent = `$${numberWithCommas(total)}`;
});





// Envío por WhatsApp
checkoutForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const fd = new FormData(checkoutForm);
  const clientName = fd.get('name') || '';
  const clientPhone = fd.get('phone') || '';
  const method = fd.get('method') || 'recoger';
  const payment = fd.get('payment') || '';
  const address = fd.get('address') || '';
  const notes = fd.get('notes') || '';

  let textParts = [];
  textParts.push('🧾 *Nuevo Pedido - Juanelos🍓✅*');
  textParts.push(`👤 Cliente: ${clientName}`);
  textParts.push(`📞 Teléfono: ${clientPhone}`);
  textParts.push(`🚚 Tipo: ${method}`);
  if (method === 'domicilio') textParts.push(`🏠 Dirección: ${address}`);
  textParts.push(`💳 Pago: ${payment}`);
  textParts.push('');
  textParts.push('🍨🍓 *Detalle del pedido:*');

  let subtotal = 0;
  cart.forEach(c => {
    const extrasList = (c.extras && c.extras.length)
      ? c.extras.map(x => `   ➕ ${x.qty}x ${x.name} ($${numberWithCommas(x.price * x.qty)})`).join('\n')
      : '';
    const removedText = (c.removed && c.removed.length)
      ? (' Toppings: ' + c.removed.join(', '))
      : '';
    const extrasSum = (c.extras || []).reduce((s, e) => s + (e.price * e.qty || 0), 0);
    const itemTotal = (c.price + extrasSum) * c.qty;
    subtotal += itemTotal;

    textParts.push(`${c.qty}x ${c.title}${removedText} — *$${numberWithCommas(itemTotal)}*`);
    if (extrasList) textParts.push(extrasList);
  });

  const delivery = method === 'domicilio' ? DELIVERY_FEE : 0;
  const total = subtotal + delivery;

  textParts.push('');
  textParts.push(`🧮 Subtotal: $${numberWithCommas(subtotal)}`);
  if (method === 'domicilio') {
    textParts.push(`🚗 Envío: $${numberWithCommas(delivery)}`);
  } else {
    textParts.push(`🏪 Envío: Sin costo (recoge en el local)`);
  }
  textParts.push(`💰 *Total: $${numberWithCommas(total)}*`);

  if (notes) textParts.push(`📝 Notas: ${notes}`);

  const msg = encodeURIComponent(textParts.join('\n'));
  const bp = String(BUSINESS_PHONE || '').replace(/[^0-9]/g, '');

  if (!bp || bp.length < 8) {
    alert('Configura BUSINESS_PHONE en app.js con el número del negocio.');
    return;
  }

  const waUrl = `https://wa.me/${bp}?text=${msg}`;
  window.open(waUrl, '_blank');
});



// ---------- Utilidades ----------
function bindEvents(){
  navBtns.forEach(b=> b.addEventListener('click', ()=> setActiveCategory(b.dataset.cat)));
  cartCountEl.addEventListener('dblclick', ()=> { if(confirm('Vaciar carrito?')){ cart = []; persistCart(); refreshCartUI(); } });
  checkoutModal.addEventListener('click', (e)=> { if(e.target === checkoutModal) checkoutModal.classList.add('hidden'); });
  searchInput.addEventListener('input', ()=> renderProducts(activeCategory));
}

function capitalize(s){ return String(s || '').charAt(0).toUpperCase() + String(s || '').slice(1); }
function numberWithCommas(x){ return String(x).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
function escapeHtml(s){ return String(s || '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }



// ====== MENÚ LATERAL ======
const menuBtn = document.getElementById('menu-btn');
const sideMenu = document.getElementById('side-menu');
const closeMenu = document.getElementById('close-menu');

menuBtn.addEventListener('click', () => {
  // Primero activamos el menú
  sideMenu.classList.add('show');
  sideMenu.style.opacity = 0;
  sideMenu.style.transform = 'translateX(-20px)'; // empieza desplazado
  sideMenu.style.transition = 'opacity 0.5s ease, transform 0.5s ease';

  // Forzamos el repaint antes de animar
  requestAnimationFrame(() => {
    sideMenu.style.opacity = 1;
    sideMenu.style.transform = 'translateX(0)';
  });
  sideMenu.classList.remove('hidden');
});


closeMenu.addEventListener('click', () => {
  sideMenu.classList.remove('show');
  setTimeout(() => sideMenu.classList.add('hidden'), 350);
});

// Cerrar tocando fuera del panel
sideMenu.addEventListener('click', (e) => {
  if (e.target === sideMenu) {
    sideMenu.classList.remove('show');
    setTimeout(() => sideMenu.classList.add('hidden'), 350);
  }
});




// ====== FORMULARIO DE PAGO ======

document.addEventListener("DOMContentLoaded", () => {
  const paymentSelect = document.getElementById("payment-method");
  const transferInfo = document.getElementById("transfer-info");
  const methodRadios = document.querySelectorAll('input[name="method"]');
  const addressLabel = document.getElementById("address-label");
  const envioRow = document.getElementById("envio-row");
  const cartDelivery = document.getElementById("cart-delivery");
  const DELIVERY_FEE = 5000; // 💰 valor del domicilio
  const accountNumber = document.getElementById("account-number");
  const copyBtn = document.getElementById("copy-account");

  // 🔸 Mostrar u ocultar dirección según método de entrega
  methodRadios.forEach(radio => {
    radio.addEventListener("change", () => {
      if (radio.value === "domicilio" && radio.checked) {
        addressLabel.classList.remove("hidden");
        envioRow.classList.remove("hidden");
        cartDelivery.textContent = `$${DELIVERY_FEE.toLocaleString()}`;
      } else if (radio.value === "recoger" && radio.checked) {
        addressLabel.classList.add("hidden");
        envioRow.classList.add("hidden");
        cartDelivery.textContent = "$0";
      }
    });
  });

  // 🔸 Mostrar info bancaria solo si selecciona transferencia
  paymentSelect.addEventListener("change", () => {
    if (paymentSelect.value === "transferencia") {
      transferInfo.classList.remove("hidden");
    } else {
      transferInfo.classList.add("hidden");
    }
  });

  // 🔸 Copiar número de cuenta
  copyBtn.addEventListener("click", () => {
    navigator.clipboard.writeText(accountNumber.textContent.trim())
      .then(() => {
        copyBtn.textContent = "¡Copiado!";
        copyBtn.classList.add("copied");
        setTimeout(() => {
          copyBtn.textContent = "Copiar";
          copyBtn.classList.remove("copied");
        }, 1800);
      })
      .catch(() => alert("No se pudo copiar"));
  });
});


// --- FORM MULTIPASO (compatible con checkout actual) ---
const form = document.getElementById("checkout-form");
const step1 = document.getElementById("step1");
const step2 = document.getElementById("step2");
const nextStep1 = document.getElementById("next-step1");
const backStep2 = document.getElementById("back-step2");
const clientSummary = document.getElementById("client-summary");

if (nextStep1) {
  nextStep1.addEventListener("click", () => {
    const name = form.name.value.trim();
    const phone = form.phone.value.trim();

    if (!name || !phone) {
      alert("Por favor completa tu nombre y teléfono.");
      return;
    }

    // Mostrar resumen
    clientSummary.innerHTML = `<strong>${name} </strong><span>${phone}</span>`;

    // Animación de transición
    step1.classList.remove("active");
    step2.classList.add("active");
  });
}

if (backStep2) {
  backStep2.addEventListener("click", () => {
    step2.classList.remove("active");
    step1.classList.add("active");
  });
}

