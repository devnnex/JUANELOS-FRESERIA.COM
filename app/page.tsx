'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, Bell, Check, ChevronDown, CircleUserRound, Coffee, CreditCard,
  Heart, Home, MapPin, Minus, Pencil, Plus, Search, ShoppingBag, Sparkles,
  Store, Trash2, UtensilsCrossed, X,
} from 'lucide-react';
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Toaster, toast } from '@/components/ui/toast';

type ModifierOption = { id: string; name: string; additionalPrice: number };
type ModifierGroup = { id: string; name: string; required?: boolean; minSelections?: number; maxSelections?: number; type: 'single' | 'multiple'; options: ModifierOption[] };
type Product = { id: string; name: string; description: string; price: number; category: string; image: string; featured?: boolean; available?: boolean; badge?: string; modifierGroups?: ModifierGroup[] };
type CartItem = { key: string; productId: string; quantity: number; selections: Record<string, string[]>; unitPrice: number };

declare global {
  interface Document {
    modelContext?: { registerTool: (tool: unknown, options?: { signal?: AbortSignal }) => void | Promise<void> };
  }
}

const milkGroup: ModifierGroup = {
  id: 'milk', name: 'Elige tu leche', required: true, minSelections: 1, maxSelections: 1, type: 'single',
  options: [
    { id: 'whole', name: 'Leche entera', additionalPrice: 0 },
    { id: 'lactose-free', name: 'Deslactosada', additionalPrice: 0 },
    { id: 'oat', name: 'Avena', additionalPrice: 3500 },
    { id: 'almond', name: 'Almendras', additionalPrice: 3500 },
  ],
};
const foamGroup: ModifierGroup = {
  id: 'foam', name: 'Foam it', type: 'single', maxSelections: 1,
  options: [
    { id: 'none', name: 'Sin foam', additionalPrice: 0 },
    { id: 'vanilla', name: 'Vainilla foam', additionalPrice: 3500 },
    { id: 'matcha', name: 'Matcha foam', additionalPrice: 3500 },
    { id: 'tiramisu', name: 'Tiramisú foam', additionalPrice: 3500 },
  ],
};
const toastExtras: ModifierGroup = {
  id: 'extras', name: '¿Quieres agregar algo más?', type: 'multiple', maxSelections: 2,
  options: [
    { id: 'egg', name: 'Huevo', additionalPrice: 5000 },
    { id: 'bacon', name: 'Tocineta', additionalPrice: 7000 },
  ],
};
const bowlToppings: ModifierGroup = {
  id: 'toppings', name: 'Toppings extra', type: 'multiple', maxSelections: 2,
  options: [
    { id: 'strawberry', name: 'Fresa', additionalPrice: 2500 },
    { id: 'passionfruit', name: 'Maracuyá', additionalPrice: 2500 },
    { id: 'coconut', name: 'Coco', additionalPrice: 2500 },
    { id: 'protein', name: 'Scoop de proteína', additionalPrice: 7000 },
  ],
};

const products: Product[] = [
  { id: 'matcha-latte', name: 'Matcha Latte', description: 'Té verde japonés con leche fría.', price: 15000, category: 'Matcha', image: '/images/matcha-latte.png', featured: true, badge: 'Favorito', modifierGroups: [milkGroup, foamGroup] },
  { id: 'matcha-mango', name: 'Matcha Mango', description: 'Té verde japonés, leche fría y mango puré.', price: 16000, category: 'Matcha', image: '/images/matcha-latte.png', modifierGroups: [milkGroup, foamGroup] },
  { id: 'dirty-matcha', name: 'Dirty Matcha', description: 'Matcha, leche fría y espresso.', price: 16000, category: 'Matcha', image: '/images/matcha-latte.png', modifierGroups: [milkGroup, foamGroup] },
  { id: 'matcha-fresa', name: 'Matcha Fresa', description: 'Matcha, leche fría y puré de fresa.', price: 16000, category: 'Matcha', image: '/images/matcha-latte.png', modifierGroups: [milkGroup, foamGroup] },
  { id: 'matcha-tiramisu', name: 'Matcha Tiramisú', description: 'Matcha, leche fría y foam de tiramisú.', price: 17000, category: 'Matcha', image: '/images/matcha-latte.png', modifierGroups: [milkGroup] },
  { id: 'matcha-yuzu', name: 'Matcha Yuzu', description: 'Té verde japonés, limón y miel.', price: 15000, category: 'Matcha', image: '/images/matcha-latte.png' },
  { id: 'oki-bowl', name: 'OKI bowl', description: 'Matcha, aguacate, banano, miel y yogurt griego. Con granola, coco, chía, fresa y almendras.', price: 26000, category: 'Bowls', image: '/images/acai-bowl.png', featured: true, badge: 'OKI pick', modifierGroups: [bowlToppings] },
  { id: 'acai-bowl', name: 'Acai berries bowl', description: 'Açaí, banano y berries con granola, coco, chía, fresa y crema de maní.', price: 25000, category: 'Bowls', image: '/images/acai-bowl.png', modifierGroups: [bowlToppings] },
  { id: 'mango-bowl', name: 'Mango bowl', description: 'Mango, maracuyá, yogurt griego y miel.', price: 25000, category: 'Bowls', image: '/images/acai-bowl.png', modifierGroups: [bowlToppings] },
  { id: 'yogurt-bowl', name: 'Yogurt bowl', description: 'Yogurt griego con granola, coco, chía y frutas a elección.', price: 26000, category: 'Bowls', image: '/images/acai-bowl.png', modifierGroups: [bowlToppings] },
  { id: 'green-toast', name: 'Green toast', description: 'Mozzarella, tomates cherry confitados, rúgula, crema de aguacate y pesto fresco.', price: 23000, category: 'Toasts', image: '/images/green-toast.png', featured: true, modifierGroups: [toastExtras] },
  { id: 'mozzarella-toast', name: 'Mozzarella toast', description: 'Jamón serrano, mozzarella de búfala y cebollas encurtidas.', price: 27000, category: 'Toasts', image: '/images/green-toast.png', modifierGroups: [toastExtras] },
  { id: 'morning-toast', name: 'Morning toast', description: 'Huevo cremoso, queso fresco, tocino crunchy, aguacate y dip de crema.', price: 25000, category: 'Toasts', image: '/images/green-toast.png', modifierGroups: [toastExtras] },
  { id: 'french-toast', name: 'Tostada francesa', description: 'Pan brioche tostado tipo churro, mermelada de arándanos, fresas y helado.', price: 20000, category: 'Sweet', image: '/images/green-toast.png', available: false },
  { id: 'berries-lover', name: 'Berries lover', description: 'Fresa, mora, arándanos, yogurt, miel y leche a elección.', price: 15000, category: 'Smoothies', image: '/images/acai-bowl.png', modifierGroups: [milkGroup] },
  { id: 'morning-smoothie', name: 'Mornings', description: 'Maracuyá, mango, yogurt y leche a elección.', price: 15000, category: 'Smoothies', image: '/images/acai-bowl.png', modifierGroups: [milkGroup] },
  { id: 'iced-latte', name: 'Iced latte', description: 'Espresso con leche fría.', price: 12000, category: 'Café', image: '/images/matcha-latte.png', modifierGroups: [milkGroup] },
  { id: 'pistachio-latte', name: 'Pistacho latte', description: 'Espresso, leche fría y crema de pistacho.', price: 15000, category: 'Café', image: '/images/matcha-latte.png', modifierGroups: [milkGroup] },
  { id: 'chai-latte', name: 'Chai Latte', description: 'Té chai con leche fría.', price: 12000, category: 'Té y chai', image: '/images/matcha-latte.png', modifierGroups: [milkGroup, foamGroup] },
  { id: 'dirty-chai', name: 'Dirty Chai', description: 'Té chai, leche fría y espresso.', price: 15500, category: 'Té y chai', image: '/images/matcha-latte.png', modifierGroups: [milkGroup, foamGroup] },
  { id: 'banana-bread', name: 'Banana bread', description: 'Pan suave clásico de banano y nueces.', price: 15000, category: 'Bakery', image: '/images/green-toast.png' },
  { id: 'brownie', name: 'Brownie', description: 'Brownie artesanal de chocolate.', price: 13500, category: 'Bakery', image: '/images/green-toast.png' },
];

const categories = ['Para ti', 'Matcha', 'Bowls', 'Toasts', 'Sweet', 'Smoothies', 'Café', 'Té y chai', 'Bakery'];
const money = (value: number) => `$${new Intl.NumberFormat('es-CO').format(value)}`;

function itemLabel(item: CartItem) {
  return Object.entries(item.selections).flatMap(([groupId, values]) => {
    const product = products.find((entry) => entry.id === item.productId);
    const group = product?.modifierGroups?.find((entry) => entry.id === groupId);
    return values.map((value) => group?.options.find((option) => option.id === value)?.name).filter(Boolean);
  }).join(' · ');
}

function Quantity({ value, onChange, compact = false }: { value: number; onChange: (value: number) => void; compact?: boolean }) {
  return <div className={`quantity ${compact ? 'compact' : ''}`} aria-label="Cantidad">
    <button type="button" onClick={() => onChange(Math.max(1, value - 1))} aria-label="Disminuir cantidad"><Minus size={compact ? 15 : 19} /></button>
    <span aria-live="polite">{value}</span>
    <button type="button" onClick={() => onChange(value + 1)} aria-label="Aumentar cantidad"><Plus size={compact ? 15 : 19} /></button>
  </div>;
}

function App() {
  const [ready, setReady] = useState(false);
  const [category, setCategory] = useState('Para ti');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Product | null>(null);
  const [selections, setSelections] = useState<Record<string, string[]>>({});
  const [quantity, setQuantity] = useState(1);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<'cart' | 'checkout' | 'success'>('cart');
  const [customer, setCustomer] = useState({ name: '', phone: '', notes: '' });
  const [table, setTable] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('oki-cart-v1');
      if (saved) setCart(JSON.parse(saved));
    } catch { localStorage.removeItem('oki-cart-v1'); }
    setTable(new URLSearchParams(window.location.search).get('table'));
    const timer = window.setTimeout(() => setReady(true), 450);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => { if (ready) localStorage.setItem('oki-cart-v1', JSON.stringify(cart)); }, [cart, ready]);

  const filtered = useMemo(() => products.filter((product) => {
    const categoryMatch = category === 'Para ti' ? product.featured : product.category === category;
    const queryMatch = `${product.name} ${product.description}`.toLowerCase().includes(query.toLowerCase().trim());
    return categoryMatch && queryMatch;
  }), [category, query]);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

  const openProduct = (product: Product, item?: CartItem) => {
    if (product.available === false) return;
    const defaults: Record<string, string[]> = {};
    product.modifierGroups?.forEach((group) => {
      if (group.type === 'single' && group.options.length) defaults[group.id] = [group.options[0].id];
      else defaults[group.id] = [];
    });
    setSelected(product); setSelections(item?.selections ?? defaults); setQuantity(item?.quantity ?? 1); setEditingKey(item?.key ?? null);
  };
  const unitPrice = selected ? selected.price + (selected.modifierGroups ?? []).reduce((sum, group) => sum + (selections[group.id] ?? []).reduce((groupSum, optionId) => groupSum + (group.options.find((option) => option.id === optionId)?.additionalPrice ?? 0), 0), 0) : 0;
  const isValid = selected?.modifierGroups?.every((group) => !group.required || (selections[group.id]?.length ?? 0) >= (group.minSelections ?? 1)) ?? true;

  const addSelected = () => {
    if (!selected || !isValid) return;
    const item: CartItem = { key: editingKey ?? `${selected.id}-${Date.now()}`, productId: selected.id, quantity, selections, unitPrice };
    setCart((current) => editingKey ? current.map((entry) => entry.key === editingKey ? item : entry) : [...current, item]);
    toast.add({ title: editingKey ? 'Producto actualizado' : 'Agregado a tu pedido', description: `${quantity} × ${selected.name}`, type: 'success' });
    setSelected(null); setEditingKey(null);
  };
  const updateCartQuantity = (key: string, next: number) => setCart((current) => current.map((item) => item.key === key ? { ...item, quantity: Math.max(1, next) } : item));
  const removeCartItem = (key: string) => setCart((current) => current.filter((item) => item.key !== key));
  const confirmOrder = () => {
    if (!customer.name.trim() || customer.phone.replace(/\D/g, '').length < 7) {
      toast.add({ title: 'Completa tus datos', description: 'Ingresa tu nombre y un teléfono válido.', type: 'warning' }); return;
    }
    setCheckoutStep('success'); localStorage.removeItem('oki-cart-v1');
  };

  useEffect(() => {
    const context = document.modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const report = () => undefined;
    try {
      void Promise.resolve(context.registerTool({
        name: 'read_oki_menu', title: 'Consultar menú de OKI',
        description: 'Devuelve los productos disponibles y sus precios actuales.',
        inputSchema: { type: 'object', properties: {}, additionalProperties: false },
        annotations: { readOnlyHint: true, untrustedContentHint: false },
        execute: () => ({ products: products.filter((p) => p.available !== false).map(({ id, name, price, category }) => ({ id, name, price, category })) }),
      }, { signal: lifecycle.signal })).catch(report);
      void Promise.resolve(context.registerTool({
        name: 'add_oki_product_to_cart', title: 'Agregar producto al pedido',
        description: 'Agrega al carrito un producto disponible del menú de OKI con cantidad entre 1 y 20.',
        inputSchema: { type: 'object', properties: { productId: { type: 'string' }, quantity: { type: 'integer', minimum: 1, maximum: 20 } }, required: ['productId', 'quantity'], additionalProperties: false },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        execute: (input: unknown) => {
          const value = input as { productId?: string; quantity?: number };
          const product = products.find((entry) => entry.id === value.productId && entry.available !== false);
          if (!product || !Number.isInteger(value.quantity) || (value.quantity ?? 0) < 1 || (value.quantity ?? 0) > 20) throw new Error('Producto o cantidad no válidos.');
          const defaults: Record<string, string[]> = {};
          product.modifierGroups?.forEach((group) => defaults[group.id] = group.type === 'single' ? [group.options[0].id] : []);
          const item: CartItem = { key: `${product.id}-${Date.now()}`, productId: product.id, quantity: value.quantity!, selections: defaults, unitPrice: product.price };
          setCart((current) => [...current, item]);
          return { status: 'added', product: product.name, quantity: value.quantity };
        },
      }, { signal: lifecycle.signal })).catch(report);
    } catch { report(); }
    return () => lifecycle.abort();
  }, []);

  return <main className="min-h-dvh bg-background pb-28 text-foreground">
    <header className="site-header">
      <div className="header-inner">
        <a href="#menu" className="brand" aria-label="OKI, ir al menú"><span className="brand-kana">おき</span>OKI</a>
        <div className="desktop-slogan">TU PAUSA FAVORITA</div>
        <div className="header-actions">
          <button className="icon-button" aria-label="Notificaciones"><Bell size={20} /></button>
          <button className="icon-button relative" onClick={() => { setCheckoutStep('cart'); setCartOpen(true); }} aria-label={`Abrir carrito, ${cartCount} productos`}><ShoppingBag size={20} /><span className="cart-dot">{cartCount}</span></button>
        </div>
      </div>
      <button className="location-card" aria-label="Cambiar modalidad del pedido">
        <span className="location-pin">{table ? <UtensilsCrossed size={19} /> : <MapPin size={19} />}</span>
        <span className="min-w-0 flex-1 text-left"><small>Tu pedido en</small><strong>{table ? `Mesa ${table}` : 'OKI · Recoger en tienda'}</strong></span><ChevronDown size={18} />
      </button>
    </header>

    <section className="hero-section">
      <div className="hero-card">
        <div className="hero-copy"><span className="eyebrow">TU PAUSA FAVORITA</span><h1>Matcha mood,<br />all day.</h1><a href="#menu" className="hero-cta">Pedir ahora <span>→</span></a></div>
        <Image src="/images/matcha-latte.png" alt="Matcha latte frío" fill priority sizes="(max-width: 768px) 56vw, 520px" className="hero-image" />
      </div>
      <label className="search-wrap"><Search size={19} /><input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Buscar en el menú" placeholder="¿Qué se te antoja hoy?" />{query && <button onClick={() => setQuery('')} aria-label="Limpiar búsqueda"><X size={17} /></button>}</label>
    </section>

    <section id="menu" className="menu-section">
      <div className="section-heading"><div><p className="section-kicker">HECHO PARA TI</p><h2>Explora el menú</h2></div><span className="open-pill"><span /> Abierto hoy</span></div>
      <div className="category-row" role="tablist" aria-label="Categorías del menú">
        {categories.map((item) => <button key={item} role="tab" aria-selected={category === item} className={category === item ? 'active' : ''} onClick={() => setCategory(item)}>{item}</button>)}
      </div>
      {!ready ? <div className="product-grid">{[1,2,3,4].map((item) => <div className="product-skeleton" key={item}><Skeleton className="h-full w-full rounded-[20px]" /></div>)}</div> : filtered.length ? <div className="product-grid">
        {filtered.map((product) => <article className={`product-card ${product.available === false ? 'sold-out' : ''}`} key={product.id} onClick={() => openProduct(product)}>
          <button className="favorite" aria-label={`Guardar ${product.name}`} onClick={(event) => event.stopPropagation()}><Heart size={17} /></button>
          <div className="product-image-wrap"><Image src={product.image} alt={product.name} fill sizes="(max-width: 640px) 44vw, (max-width: 1024px) 30vw, 260px" className="product-image" loading={product.featured ? 'eager' : 'lazy'} />{product.badge && <span className="product-badge"><Sparkles size={12} />{product.badge}</span>}{product.available === false && <span className="sold-label">Agotado</span>}</div>
          <div className="product-info"><h3>{product.name}</h3><p>{product.description}</p><div className="product-footer"><strong>{money(product.price)}</strong><button disabled={product.available === false} onClick={(event) => { event.stopPropagation(); openProduct(product); }} aria-label={`Personalizar ${product.name}`}><Plus size={20} /></button></div></div>
        </article>)}
      </div> : <div className="empty-state"><Search size={32} /><h3>No encontramos ese antojo</h3><p>Prueba con otro nombre o explora una categoría.</p><button onClick={() => { setQuery(''); setCategory('Para ti'); }}>Ver recomendados</button></div>}
    </section>

    <nav className="bottom-nav" aria-label="Navegación principal">
      <a className="active" href="#menu"><Home size={20} />Inicio</a><a href="#menu"><Coffee size={20} />Menú</a>
      <button onClick={() => { setCheckoutStep('cart'); setCartOpen(true); }} aria-label="Abrir pedido"><span className="nav-cart"><ShoppingBag size={20} />{cartCount > 0 && <b>{cartCount}</b>}</span>Pedido</button>
      <button onClick={() => toast.add({ title: 'Tus favoritos', description: 'Guarda aquí los productos que más te gustan.', type: 'info' })}><Heart size={20} />Favoritos</button>
      <button onClick={() => toast.add({ title: 'Perfil', description: 'Tu perfil estará disponible próximamente.', type: 'info' })}><CircleUserRound size={20} />Perfil</button>
    </nav>

    <Drawer open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)} showSwipeHandle>
      <DrawerContent className="product-drawer">
        {selected && <><div className="drawer-scroll">
          <div className="detail-image"><Image src={selected.image} alt={selected.name} fill sizes="(max-width: 768px) 100vw, 560px" className="product-image" /><DrawerClose className="drawer-close" aria-label="Cerrar"><X size={20} /></DrawerClose></div>
          <DrawerHeader className="detail-header"><div className="detail-title-row"><div><DrawerTitle>{selected.name}</DrawerTitle><DrawerDescription>{selected.description}</DrawerDescription></div><strong>{money(selected.price)}</strong></div></DrawerHeader>
          <div className="modifier-list">
            {(selected.modifierGroups ?? []).map((group) => <fieldset className="modifier-group" key={group.id}><legend>{group.name}<small>{group.required ? 'Obligatorio' : `Opcional${group.maxSelections ? ` · Máx. ${group.maxSelections}` : ''}`}</small></legend>
              {group.type === 'single' ? <RadioGroup value={selections[group.id]?.[0] ?? ''} onValueChange={(value) => setSelections((current) => ({ ...current, [group.id]: [String(value)] }))}>
                {group.options.map((option) => <label className="option-row" key={option.id}><span><RadioGroupItem value={option.id} /><span>{option.name}</span></span><em>{option.additionalPrice ? `+${money(option.additionalPrice)}` : 'Incluido'}</em></label>)}
              </RadioGroup> : group.options.map((option) => { const checked = selections[group.id]?.includes(option.id) ?? false; const atMax = (selections[group.id]?.length ?? 0) >= (group.maxSelections ?? 99); return <label className="option-row" key={option.id}><span><Checkbox checked={checked} disabled={!checked && atMax} onCheckedChange={(next) => setSelections((current) => ({ ...current, [group.id]: next ? [...(current[group.id] ?? []), option.id] : (current[group.id] ?? []).filter((id) => id !== option.id) }))} /><span>{option.name}</span></span><em>+{money(option.additionalPrice)}</em></label>; })}
            </fieldset>)}
            <div className="quantity-block"><div><strong>Cantidad</strong><span>¿Cuántos quieres?</span></div><Quantity value={quantity} onChange={setQuantity} /></div>
          </div>
        </div><div className="drawer-cta"><button disabled={!isValid} onClick={addSelected}>{editingKey ? 'Actualizar pedido' : 'Agregar al pedido'} <span>· {money(unitPrice * quantity)}</span></button></div></>}
      </DrawerContent>
    </Drawer>

    <Drawer open={cartOpen} onOpenChange={setCartOpen} showSwipeHandle>
      <DrawerContent className="cart-drawer">
        <div className="cart-topbar"><button onClick={() => checkoutStep === 'checkout' ? setCheckoutStep('cart') : setCartOpen(false)} aria-label="Volver">{checkoutStep === 'checkout' ? <ArrowLeft size={20} /> : <X size={20} />}</button><div><span>{checkoutStep === 'cart' ? 'TU PEDIDO' : checkoutStep === 'checkout' ? 'FINALIZAR' : 'LISTO'}</span><h2>{checkoutStep === 'cart' ? 'Tu pedido' : checkoutStep === 'checkout' ? 'Datos del pedido' : 'Pedido confirmado'}</h2></div><span /></div>
        {checkoutStep === 'cart' && <div className="cart-body">{cart.length ? <>
          <div className="cart-items">{cart.map((item) => { const product = products.find((entry) => entry.id === item.productId)!; return <article className="cart-item" key={item.key}><div className="cart-thumb"><Image src={product.image} alt="" fill sizes="82px" className="product-image" /></div><div className="cart-item-info"><div className="cart-name"><strong>{product.name}</strong><button onClick={() => removeCartItem(item.key)} aria-label={`Eliminar ${product.name}`}><Trash2 size={16} /></button></div><p>{itemLabel(item) || 'Preparación original'}</p><button className="edit-link" onClick={() => { setCartOpen(false); window.setTimeout(() => openProduct(product, item), 150); }}><Pencil size={13} /> Editar</button><div className="cart-line"><Quantity compact value={item.quantity} onChange={(value) => updateCartQuantity(item.key, value)} /><strong>{money(item.unitPrice * item.quantity)}</strong></div></div></article>; })}</div>
          <button className="continue-link" onClick={() => setCartOpen(false)}><Plus size={16} /> Seguir agregando</button>
          <div className="summary"><div><span>Subtotal</span><span>{money(subtotal)}</span></div><div><span>Servicio</span><span>$0</span></div><div className="summary-total"><strong>Total</strong><strong>{money(subtotal)}</strong></div></div>
        </> : <div className="empty-state cart-empty"><ShoppingBag size={38} /><h3>Tu pedido está vacío</h3><p>Explora el menú y agrega algo delicioso.</p><button onClick={() => setCartOpen(false)}>Explorar el menú</button></div>}</div>}
        {checkoutStep === 'checkout' && <div className="checkout-body">
          <div className="checkout-mode"><span><Store size={19} /></span><div><small>Modalidad</small><strong>{table ? `Servicio en mesa ${table}` : 'Recoger en OKI'}</strong></div><Check size={19} /></div>
          <label>Nombre completo<Input value={customer.name} onChange={(event) => setCustomer((current) => ({ ...current, name: event.target.value }))} placeholder="¿A nombre de quién?" maxLength={60} /></label>
          <label>Teléfono<Input type="tel" value={customer.phone} onChange={(event) => setCustomer((current) => ({ ...current, phone: event.target.value }))} placeholder="300 000 0000" maxLength={20} /></label>
          <label>Indicaciones especiales <small>{customer.notes.length}/180</small><Textarea value={customer.notes} onChange={(event) => setCustomer((current) => ({ ...current, notes: event.target.value }))} placeholder="Ej: sin pitillo, alergias o alguna indicación..." maxLength={180} /></label>
          <div className="payment-placeholder"><CreditCard size={20} /><div><strong>Pago en el establecimiento</strong><span>El método de pago se confirma al recibir tu pedido.</span></div><Check size={18} /></div>
          <div className="summary checkout-summary"><div><span>Total del pedido</span><strong>{money(subtotal)}</strong></div></div>
        </div>}
        {checkoutStep === 'success' && <div className="success-state"><div className="success-check"><Check size={40} /></div><p>Gracias, {customer.name.split(' ')[0]}.</p><h3>Estamos preparando<br />tu pausa favorita.</h3><div className="order-number"><small>NÚMERO DE PEDIDO</small><strong>OKI-{String(Date.now()).slice(-4)}</strong></div><p className="success-note">Te avisaremos cuando tu pedido esté listo.</p><button onClick={() => { setCart([]); setCartOpen(false); setCheckoutStep('cart'); }}>Volver al menú</button></div>}
        {checkoutStep !== 'success' && <div className="cart-sticky"><button disabled={!cart.length} onClick={() => checkoutStep === 'cart' ? setCheckoutStep('checkout') : confirmOrder()}>{checkoutStep === 'cart' ? 'Continuar' : 'Confirmar pedido'} <span>· {money(subtotal)}</span></button></div>}
      </DrawerContent>
    </Drawer>
  </main>;
}

export default function HomePage() { return <Toaster><App /></Toaster>; }
