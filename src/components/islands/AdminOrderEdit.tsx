import { useState } from 'preact/hooks';
import type { JSX } from 'preact';
import styles from '../../pages/admin/admin.module.css';
import { useToast, ToastView } from './Toast';

export type OrderStateOption = { value: string; label: string };

export type AdminOrderInitial = {
  id: string;
  estado: string;
  tracking: string;
  nota: string;
};

type Props = {
  initial: AdminOrderInitial;
  states: OrderStateOption[];
};

export default function AdminOrderEdit({ initial, states }: Props) {
  const [estado, setEstado] = useState(initial.estado);
  const [tracking, setTracking] = useState(initial.tracking);
  const [nota, setNota] = useState(initial.nota);
  const [saving, setSaving] = useState(false);
  const { toast, showSuccess, showError } = useToast();

  async function onSubmit(e: JSX.TargetedEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    try {
      const body = new URLSearchParams({ estado, tracking, nota });
      const res = await fetch(`/api/admin/orders/${initial.id}`, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      showSuccess();
    } catch (err) {
      showError(`No se pudieron guardar los cambios. ${(err as Error).message}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <ToastView toast={toast} />

      <form class={styles.editForm} onSubmit={onSubmit}>
        <label class={styles.metaItem}>
          <span class={styles.metaLabel}>Estado</span>
          <select
            class={styles.select}
            value={estado}
            onChange={(e) => setEstado((e.target as HTMLSelectElement).value)}
          >
            {states.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </label>
        <label class={styles.metaItem}>
          <span class={styles.metaLabel}>Guía de envío (opcional)</span>
          <input
            class={styles.textInput}
            type="text"
            value={tracking}
            onInput={(e) => setTracking((e.target as HTMLInputElement).value)}
          />
        </label>
        <label class={styles.metaItem}>
          <span class={styles.metaLabel}>Nota para el cliente (opcional)</span>
          <textarea
            class={styles.textarea}
            value={nota}
            onInput={(e) => setNota((e.target as HTMLTextAreaElement).value)}
          />
        </label>
        <button type="submit" class={styles.save} disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
      </form>
    </>
  );
}
