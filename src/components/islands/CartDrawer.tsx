import { useStore } from '@nanostores/preact';
import { useEffect, useState } from 'preact/hooks';
import {
  $cartLines,
  $cartOpen,
  $cartTotal,
  clearCart,
  closeCart,
  removeFromCart,
  setQty,
} from '../../stores/cart';
import { formatMXN } from '../../lib/money';
import styles from '../CartDrawer.module.css';

export default function CartDrawer() {
  const lines = useStore($cartLines);
  const total = useStore($cartTotal);
  const open = useStore($cartOpen);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeCart();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open]);

  const isEmpty = lines.length === 0;

  async function checkout() {
    if (isEmpty) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          items: lines.map((l) => ({
            slug: l.slug,
            nombre: l.nombre,
            precio: l.precio,
            qty: l.qty,
          })),
          total,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { whatsappUrl: string; orderUrl: string };
      clearCart();
      window.location.href = data.whatsappUrl;
    } catch {
      setError('No pudimos crear el pedido. Intenta de nuevo.');
      setSubmitting(false);
    }
  }

  return (
    <>
      <div
        class={styles.overlay}
        data-open={open ? 'true' : 'false'}
        onClick={closeCart}
      />
      <aside
        class={styles.drawer}
        data-open={open ? 'true' : 'false'}
        aria-label="Carrito"
        aria-hidden={open ? 'false' : 'true'}
      >
        <div class={styles.head}>
          <span class={styles.title}>Carrito</span>
          <button
            type="button"
            class={styles.close}
            aria-label="Cerrar carrito"
            onClick={closeCart}
          >
            ×
          </button>
        </div>

        <div class={styles.body}>
          {isEmpty ? (
            <div class={styles.empty}>
              <p>Aún no has añadido productos.</p>
            </div>
          ) : (
            <ul class={styles.lines}>
              {lines.map((l) => (
                <li key={l.slug} class={styles.line}>
                  <img
                    class={styles.thumb}
                    src={l.imagen ?? '/img/placeholder.svg'}
                    alt=""
                  />
                  <div class={styles.info}>
                    <span class={styles.name}>{l.nombre}</span>
                    <span class={styles.price}>{formatMXN(l.precio)} c/u</span>
                    <button
                      type="button"
                      class={styles.remove}
                      onClick={() => removeFromCart(l.slug)}
                    >
                      Quitar
                    </button>
                  </div>
                  <div class={styles.qty}>
                    <button
                      type="button"
                      class={styles.qtyBtn}
                      aria-label="Restar"
                      onClick={() => setQty(l.slug, l.qty - 1)}
                    >
                      −
                    </button>
                    <span class={styles.qtyN}>{l.qty}</span>
                    <button
                      type="button"
                      class={styles.qtyBtn}
                      aria-label="Sumar"
                      onClick={() => setQty(l.slug, l.qty + 1)}
                    >
                      +
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {!isEmpty && (
          <div class={styles.foot}>
            <div class={styles.totalRow}>
              <span class={styles.totalLabel}>Total</span>
              <span class={styles.totalAmount}>{formatMXN(total)}</span>
            </div>
            <button
              type="button"
              class={styles.checkout}
              onClick={checkout}
              disabled={submitting}
            >
              {submitting ? 'Creando pedido…' : 'Pedir por WhatsApp'}
            </button>
            {error && <p class={styles.errorMsg}>{error}</p>}
          </div>
        )}
      </aside>
    </>
  );
}
