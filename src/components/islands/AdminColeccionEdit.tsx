import { useRef, useState } from 'preact/hooks';
import type { JSX } from 'preact';
import styles from '../../pages/admin/admin.module.css';
import { useToast, ToastView, describeError } from './Toast';

export type AdminColeccionInitial = {
  slug: string;
  nombre: string;
  descripcion: string;
  descripcionMd: string;
  hero: string;
  orden: number;
  destacada: boolean;
};

type Props = { initial: AdminColeccionInitial };

export default function AdminColeccionEdit({ initial }: Props) {
  const [nombre, setNombre] = useState(initial.nombre);
  const [descripcion, setDescripcion] = useState(initial.descripcion);
  const [descripcionMd, setDescripcionMd] = useState(initial.descripcionMd);
  const [hero, setHero] = useState(initial.hero);
  const [orden, setOrden] = useState(String(initial.orden));
  const [destacada, setDestacada] = useState(initial.destacada);

  const [savingForm, setSavingForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { toast, showSuccess, showError } = useToast();

  async function onSubmitForm(e: JSX.TargetedEvent<HTMLFormElement>) {
    e.preventDefault();
    setSavingForm(true);
    try {
      const body = new URLSearchParams({
        nombre,
        descripcion,
        descripcionMd,
        hero,
        orden,
      });
      if (destacada) body.set('destacada', 'on');

      const res = await fetch(`/api/admin/colecciones/${initial.slug}`, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      showSuccess();
    } catch (err) {
      showError(`No se pudieron guardar los cambios. ${(err as Error).message}`);
    } finally {
      setSavingForm(false);
    }
  }

  async function onUploadHero(e: JSX.TargetedEvent<HTMLFormElement>) {
    e.preventDefault();
    const input = fileInputRef.current;
    const file = input?.files?.[0];
    if (!file) {
      showError('Selecciona una imagen.');
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set('hero', file);
      const res = await fetch(`/api/admin/colecciones/${initial.slug}/hero`, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: fd,
      });
      const data = await res.json().catch(() => ({})) as
        | { ok: true; url: string }
        | { ok: false; error?: string };
      if (!res.ok || !data.ok) {
        const code = 'error' in data ? data.error : undefined;
        showError(describeError(code));
        return;
      }
      setHero(data.url);
      if (input) input.value = '';
      showSuccess('Imagen subida.');
    } catch (err) {
      showError(`No se pudo subir la imagen. ${(err as Error).message}`);
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <ToastView toast={toast} />

      <form class={styles.editForm} onSubmit={onSubmitForm}>
        <label class={styles.metaItem}>
          <span class={styles.metaLabel}>Nombre</span>
          <input
            class={styles.textInput}
            type="text"
            required
            maxLength={120}
            value={nombre}
            onInput={(e) => setNombre((e.target as HTMLInputElement).value)}
          />
        </label>

        <label class={styles.metaItem}>
          <span class={styles.metaLabel}>Descripción corta</span>
          <input
            class={styles.textInput}
            type="text"
            required
            maxLength={500}
            value={descripcion}
            onInput={(e) => setDescripcion((e.target as HTMLInputElement).value)}
          />
        </label>

        <label class={styles.metaItem}>
          <span class={styles.metaLabel}>Texto largo (markdown, opcional)</span>
          <textarea
            class={styles.textarea}
            maxLength={20000}
            rows={10}
            value={descripcionMd}
            onInput={(e) => setDescripcionMd((e.target as HTMLTextAreaElement).value)}
          />
        </label>

        <label class={styles.metaItem}>
          <span class={styles.metaLabel}>Imagen hero (URL)</span>
          <input
            class={styles.textInput}
            type="text"
            maxLength={500}
            value={hero}
            onInput={(e) => setHero((e.target as HTMLInputElement).value)}
          />
          <span class={styles.slugHint}>Edita este campo manualmente o usa el cargador abajo.</span>
        </label>

        <div class={styles.fieldRow}>
          <label class={styles.metaItem}>
            <span class={styles.metaLabel}>Orden</span>
            <input
              class={styles.textInput}
              type="number"
              step={1}
              value={orden}
              onInput={(e) => setOrden((e.target as HTMLInputElement).value)}
            />
          </label>
          <div class={styles.metaItem}>
            <span class={styles.metaLabel}>Destacada</span>
            <label class={styles.checkboxField}>
              <input
                type="checkbox"
                checked={destacada}
                onChange={(e) => setDestacada((e.target as HTMLInputElement).checked)}
              />
              <span>Mostrar en la portada</span>
            </label>
          </div>
        </div>

        <button type="submit" class={styles.save} disabled={savingForm}>
          {savingForm ? 'Guardando…' : 'Guardar'}
        </button>
      </form>

      <div class={styles.sectionBox}>
        <span class={styles.sectionTitleSm}>Imagen hero</span>

        {hero ? (
          <img
            src={hero}
            alt={initial.nombre}
            style={{
              maxWidth: '360px',
              borderRadius: 'var(--r-md)',
              border: '1px solid var(--line)',
            }}
          />
        ) : (
          <p style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-sm)' }}>
            No hay imagen hero.
          </p>
        )}

        <form class={styles.uploadField} onSubmit={onUploadHero}>
          <label class={styles.metaItem}>
            <span class={styles.metaLabel}>{hero ? 'Reemplazar imagen' : 'Subir imagen'}</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/avif,image/gif,image/svg+xml"
              required
            />
            <span class={styles.slugHint}>JPG, PNG, WebP, AVIF, GIF o SVG. Máx. 5 MB.</span>
          </label>
          <button type="submit" class={styles.save} disabled={uploading}>
            {uploading ? 'Subiendo…' : 'Subir'}
          </button>
        </form>
      </div>
    </>
  );
}
