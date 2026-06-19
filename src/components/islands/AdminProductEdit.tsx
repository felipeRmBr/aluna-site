import { useRef, useState } from 'preact/hooks';
import type { JSX } from 'preact';
import styles from '../../pages/admin/admin.module.css';
import { useToast, ToastView, describeError } from './Toast';
import { compressImage } from '../../lib/image-compress';

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export type ImageItem = {
  id: number;
  url: string;
  orden: number;
};

export type ColeccionOption = {
  slug: string;
  nombre: string;
};

export type AdminProductInitial = {
  slug: string;
  nombre: string;
  sku: string;
  precio: number;
  orden: number;
  descripcionCorta: string;
  descripcionMd: string;
  disponible: boolean;
  colecciones: string[];
  imagenes: ImageItem[];
};

type Props = {
  initial: AdminProductInitial;
  allColecciones: ColeccionOption[];
};

export default function AdminProductEdit({ initial, allColecciones }: Props) {
  const [nombre, setNombre] = useState(initial.nombre);
  const [sku, setSku] = useState(initial.sku);
  const [precio, setPrecio] = useState(String(initial.precio));
  const [orden, setOrden] = useState(String(initial.orden));
  const [descripcionCorta, setDescripcionCorta] = useState(initial.descripcionCorta);
  const [descripcionMd, setDescripcionMd] = useState(initial.descripcionMd);
  const [disponible, setDisponible] = useState(initial.disponible);
  const [colecciones, setColecciones] = useState<Set<string>>(new Set(initial.colecciones));

  const [images, setImages] = useState<ImageItem[]>(initial.imagenes);
  const [savingForm, setSavingForm] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [pending, setPending] = useState<Array<{ file: File; url: string }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { toast, showSuccess, showError } = useToast();

  function toggleColeccion(slug: string) {
    setColecciones((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  async function onSubmitForm(e: JSX.TargetedEvent<HTMLFormElement>) {
    e.preventDefault();
    setSavingForm(true);
    try {
      const body = new URLSearchParams({
        nombre,
        sku,
        precio,
        orden,
        descripcionCorta,
        descripcionMd,
        colecciones: [...colecciones].join(','),
      });
      if (disponible) body.set('disponible', 'on');

      const res = await fetch(`/api/admin/products/${initial.slug}`, {
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

  function onFilesPicked(e: JSX.TargetedEvent<HTMLInputElement>) {
    const files = Array.from((e.target as HTMLInputElement).files ?? []);
    // Revoke any previous object URLs to avoid leaks
    pending.forEach((p) => URL.revokeObjectURL(p.url));
    setPending(files.map((file) => ({ file, url: URL.createObjectURL(file) })));
  }

  function removePending(index: number) {
    setPending((prev) => {
      const removed = prev[index];
      if (removed) URL.revokeObjectURL(removed.url);
      return prev.filter((_, i) => i !== index);
    });
  }

  function clearPending() {
    pending.forEach((p) => URL.revokeObjectURL(p.url));
    setPending([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function uploadOne(file: File): Promise<ImageItem | { error: string }> {
    try {
      const optimized = await compressImage(file);
      const fd = new FormData();
      fd.set('imagen', optimized);
      const res = await fetch(`/api/admin/products/${initial.slug}/images`, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: fd,
      });
      const data = await res.json().catch(() => ({})) as
        | { ok: true; image: ImageItem }
        | { ok: false; error?: string };
      if (!res.ok || !data.ok) {
        return { error: 'error' in data ? data.error ?? 'unknown' : 'unknown' };
      }
      return { id: data.image.id, url: data.image.url, orden: 0 };
    } catch (err) {
      return { error: (err as Error).message };
    }
  }

  async function onUpload(e: JSX.TargetedEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending.length === 0) {
      showError('Selecciona al menos una imagen.');
      return;
    }

    const queue = pending.slice();
    let succeeded = 0;
    let failed = 0;
    let lastError: string | undefined;

    for (let i = 0; i < queue.length; i++) {
      setUploadProgress({ current: i + 1, total: queue.length });
      const result = await uploadOne(queue[i].file);
      if ('error' in result) {
        failed++;
        lastError = result.error;
      } else {
        succeeded++;
        setImages((prev) => [...prev, { ...result, orden: prev.length }]);
      }
    }

    setUploadProgress(null);
    clearPending();

    if (failed === 0) {
      showSuccess(succeeded === 1 ? 'Imagen subida.' : `${succeeded} imágenes subidas.`);
    } else if (succeeded === 0) {
      showError(describeError(lastError));
    } else {
      showError(`${succeeded} subidas, ${failed} con error.`);
    }
  }

  async function onDeleteImage(id: number) {
    const before = images;
    setImages((prev) => prev.filter((i) => i.id !== id));
    try {
      const res = await fetch(
        `/api/admin/products/${initial.slug}/images/${id}/delete`,
        { method: 'POST', headers: { Accept: 'application/json' } },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      showSuccess('Imagen eliminada.');
    } catch (err) {
      setImages(before);
      showError(`No se pudo eliminar. ${(err as Error).message}`);
    }
  }

  async function onMoveImage(id: number, dir: 'up' | 'down') {
    const idx = images.findIndex((i) => i.id === id);
    if (idx < 0) return;
    const newIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= images.length) return;

    const next = [...images];
    [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
    setImages(next);

    try {
      const body = new URLSearchParams({ ids: next.map((i) => String(i.id)).join(',') });
      const res = await fetch(`/api/admin/products/${initial.slug}/images/reorder`, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      setImages(images);
      showError(`No se pudo reordenar. ${(err as Error).message}`);
    }
  }

  return (
    <>
      <ToastView toast={toast} />

      <form class={styles.editForm} onSubmit={onSubmitForm}>
        <div class={styles.fieldRow}>
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
            <span class={styles.metaLabel}>SKU</span>
            <input
              class={styles.textInput}
              type="text"
              maxLength={60}
              value={sku}
              onInput={(e) => setSku((e.target as HTMLInputElement).value)}
            />
          </label>
        </div>

        <div class={styles.fieldRow}>
          <label class={styles.metaItem}>
            <span class={styles.metaLabel}>Precio (MXN)</span>
            <input
              class={styles.textInput}
              type="number"
              required
              min={0}
              step={1}
              value={precio}
              onInput={(e) => setPrecio((e.target as HTMLInputElement).value)}
            />
          </label>
          <label class={styles.metaItem}>
            <span class={styles.metaLabel}>Orden de aparición</span>
            <input
              class={styles.textInput}
              type="number"
              step={1}
              value={orden}
              onInput={(e) => setOrden((e.target as HTMLInputElement).value)}
            />
          </label>
        </div>

        <label class={styles.metaItem}>
          <span class={styles.metaLabel}>Descripción corta</span>
          <input
            class={styles.textInput}
            type="text"
            required
            maxLength={500}
            value={descripcionCorta}
            onInput={(e) => setDescripcionCorta((e.target as HTMLInputElement).value)}
          />
        </label>

        <label class={styles.metaItem}>
          <span class={styles.metaLabel}>Descripción larga (markdown)</span>
          <textarea
            class={styles.textarea}
            maxLength={20000}
            rows={10}
            value={descripcionMd}
            onInput={(e) => setDescripcionMd((e.target as HTMLTextAreaElement).value)}
          />
        </label>

        <div class={styles.metaItem}>
          <span class={styles.metaLabel}>Visibilidad</span>
          <label class={styles.checkboxField}>
            <input
              type="checkbox"
              checked={disponible}
              onChange={(e) => setDisponible((e.target as HTMLInputElement).checked)}
            />
            <span>Disponible en el catálogo</span>
          </label>
        </div>

        <fieldset class={styles.metaItem} style={{ border: 0, padding: 0, margin: 0 }}>
          <legend class={styles.metaLabel}>Colecciones</legend>
          <div style={{ display: 'flex', gap: 'var(--s-3)', flexWrap: 'wrap', paddingTop: 'var(--s-2)' }}>
            {allColecciones.length === 0 ? (
              <span style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-sm)' }}>
                No hay colecciones todavía.
              </span>
            ) : (
              allColecciones.map((c) => (
                <label key={c.slug} class={styles.checkboxField}>
                  <input
                    type="checkbox"
                    checked={colecciones.has(c.slug)}
                    onChange={() => toggleColeccion(c.slug)}
                  />
                  <span>{c.nombre}</span>
                </label>
              ))
            )}
          </div>
        </fieldset>

        <button type="submit" class={styles.save} disabled={savingForm}>
          {savingForm ? 'Guardando…' : 'Guardar'}
        </button>
      </form>

      <div id="imagenes" class={styles.sectionBox} style={{ scrollMarginTop: 'var(--s-6)' }}>
        <span class={styles.sectionTitleSm}>Imágenes</span>

        {images.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-sm)' }}>
            Este producto no tiene imágenes. Sube la primera abajo.
          </p>
        ) : (
          <div class={styles.imagesGrid}>
            {images.map((img, i) => (
              <div key={img.id} class={styles.imageCard}>
                <img src={img.url} alt={`Imagen ${i + 1}`} />
                <div class={styles.imageCardActions}>
                  <span style={{ color: 'var(--text-muted)' }}>#{i + 1}</span>
                  <button
                    type="button"
                    class={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                    onClick={() => onDeleteImage(img.id)}
                  >
                    Borrar
                  </button>
                </div>
                {images.length > 1 && (
                  <div class={styles.imageCardActions}>
                    <button
                      type="button"
                      class={styles.iconBtn}
                      onClick={() => onMoveImage(img.id, 'up')}
                      disabled={i === 0}
                    >↑</button>
                    <button
                      type="button"
                      class={styles.iconBtn}
                      onClick={() => onMoveImage(img.id, 'down')}
                      disabled={i === images.length - 1}
                    >↓</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <form class={styles.uploadField} onSubmit={onUpload}>
          <label class={styles.metaItem}>
            <span class={styles.metaLabel}>Subir imágenes</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/avif,image/gif,image/svg+xml"
              multiple
              onChange={onFilesPicked}
            />
            <span class={styles.slugHint}>
              Una o más imágenes. JPG, PNG, WebP, AVIF, GIF o SVG. Máx. 5 MB cada una.
            </span>
          </label>

          {pending.length > 0 && (
            <div class={styles.imagesGrid}>
              {pending.map((p, i) => (
                <div key={p.url} class={styles.imageCard}>
                  <img src={p.url} alt={p.file.name} />
                  <div class={styles.imageCardActions}>
                    <span style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-xs)' }}>
                      {formatBytes(p.file.size)}
                    </span>
                    <button
                      type="button"
                      class={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                      onClick={() => removePending(i)}
                      disabled={uploadProgress !== null}
                    >
                      Quitar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: 'var(--s-3)', justifyContent: 'flex-end', alignItems: 'center' }}>
            {pending.length > 0 && uploadProgress === null && (
              <button type="button" class={styles.iconBtn} onClick={clearPending}>
                Limpiar
              </button>
            )}
            <button
              type="submit"
              class={styles.save}
              disabled={pending.length === 0 || uploadProgress !== null}
            >
              {uploadProgress
                ? `Subiendo ${uploadProgress.current} de ${uploadProgress.total}…`
                : pending.length > 1
                  ? `Subir ${pending.length} imágenes`
                  : 'Subir'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
