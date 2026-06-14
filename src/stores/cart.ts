import { persistentMap } from '@nanostores/persistent';
import { computed } from 'nanostores';

export type CartLine = {
  slug: string;
  nombre: string;
  precio: number;
  qty: number;
  imagen?: string;
};

export type Cart = Record<string, CartLine>;

// Stored as JSON in localStorage under the key "aluna_cart_v1"
export const $cart = persistentMap<Cart>(
  'aluna_cart_v1:',
  {},
  {
    encode: JSON.stringify,
    decode: JSON.parse,
  },
);

export function addToCart(line: Omit<CartLine, 'qty'>, qty = 1) {
  const current = $cart.get();
  const existing = current[line.slug];
  $cart.setKey(line.slug, {
    ...line,
    qty: (existing?.qty ?? 0) + qty,
  });
}

export function setQty(slug: string, qty: number) {
  if (qty <= 0) {
    removeFromCart(slug);
    return;
  }
  const current = $cart.get();
  const existing = current[slug];
  if (!existing) return;
  $cart.setKey(slug, { ...existing, qty });
}

export function removeFromCart(slug: string) {
  const current = $cart.get();
  if (!(slug in current)) return;
  const next: Cart = { ...current };
  delete next[slug];
  $cart.set(next);
}

export function clearCart() {
  $cart.set({});
}

export const $cartLines = computed($cart, (cart) => Object.values(cart));

export const $cartCount = computed($cart, (cart) =>
  Object.values(cart).reduce((n, l) => n + l.qty, 0),
);

export const $cartTotal = computed($cart, (cart) =>
  Object.values(cart).reduce((sum, l) => sum + l.precio * l.qty, 0),
);
