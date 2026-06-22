import { persistentMap } from '@nanostores/persistent';
import { atom, computed } from 'nanostores';

export type CartLine = {
  key: string;
  slug: string;
  nombre: string;
  precio: number;
  qty: number;
  imagen?: string;
  colorCombinationId?: number | null;
  colorCombinationNombre?: string | null;
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

type CartLineInput = Omit<CartLine, 'key' | 'qty'> & { key?: string };

function lineKey(line: Pick<CartLineInput, 'slug' | 'colorCombinationId' | 'key'>): string {
  return line.key ?? `${line.slug}::${line.colorCombinationId ?? 'base'}`;
}

export function addToCart(line: CartLineInput, qty = 1) {
  const key = lineKey(line);
  const current = $cart.get();
  const existing = current[key];
  $cart.setKey(key, {
    ...line,
    key,
    qty: (existing?.qty ?? 0) + qty,
  });
}

export function setQty(key: string, qty: number) {
  if (qty <= 0) {
    removeFromCart(key);
    return;
  }
  const current = $cart.get();
  const existing = current[key];
  if (!existing) return;
  $cart.setKey(key, { ...existing, key, qty });
}

export function removeFromCart(key: string) {
  const current = $cart.get();
  if (!(key in current)) return;
  const next: Cart = { ...current };
  delete next[key];
  $cart.set(next);
}

export function clearCart() {
  $cart.set({});
}

export const $cartLines = computed($cart, (cart) =>
  Object.entries(cart).map(([key, line]) => ({ ...line, key: line.key ?? key })),
);

export const $cartCount = computed($cart, (cart) =>
  Object.values(cart).reduce((n, l) => n + l.qty, 0),
);

export const $cartTotal = computed($cart, (cart) =>
  Object.values(cart).reduce((sum, l) => sum + l.precio * l.qty, 0),
);

export const $cartOpen = atom(false);

export function openCart() {
  $cartOpen.set(true);
}

export function closeCart() {
  $cartOpen.set(false);
}
