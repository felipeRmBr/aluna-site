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

export type ProductLineOption = {
  slug: string;
  nombre: string;
  colores: Array<{
    id: number;
    nombre: string;
    hex: string | null;
    activo: boolean;
  }>;
};

type ColorCombinationDraft = {
  nombre: string;
  colorIds: number[];
  orden: number;
  activo: boolean;
};

type ComboKind = 'single' | 'multi';
type Draft = ColorCombinationDraft & { kind: ComboKind };

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
  productLineSlug: string;
  colorCombinaciones: ColorCombinationDraft[];
  imagenes: ImageItem[];
};

type Props = {
  initial: AdminProductInitial;
  allColecciones: ColeccionOption[];
  allProductLines: ProductLineOption[];
};

export default function AdminProductEdit({ initial, allColecciones, allProductLines }: Props) {
  const [nombre, setNombre] = useState(initial.nombre);
  const [sku, setSku] = useState(initial.sku);
  const [precio, setPrecio] = useState(String(initial.precio));
  const [orden, setOrden] = useState(String(initial.orden));
  const [descripcionCorta, setDescripcionCorta] = useState(initial.descripcionCorta);
  const [descripcionMd, setDescripcionMd] = useState(initial.descripcionMd);
  const [disponible, setDisponible] = useState(initial.disponible);
  const [colecciones, setColecciones] = useState<Set<string>>(new Set(initial.colecciones));
  const [productLineSlug, setProductLineSlug] = useState(initial.productLineSlug);
  const [colorCombinaciones, setColorCombinaciones] = useState<Draft[]>(
    initial.colorCombinaciones.map((c) => ({
      ...c,
      kind: c.colorIds.length > 1 ? 'multi' : 'single',
    })),
  );

  const [images, setImages] = useState<ImageItem[]>(initial.imagenes);
  const [savingForm, setSavingForm] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [pending, setPending] = useState<Array<{ file: File; url: string }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { toast, showSuccess, showError } = useToast();

  const selectedProductLine = allProductLines.find((v) => v.slug === productLineSlug);
  const availableColors = selectedProductLine?.colores.filter((color) => color.activo) ?? [];
  const colorById = new Map(availableColors.map((c) => [c.id, c] as const));
  const singleColorIds = new Set(
    colorCombinaciones.filter((c) => c.kind === 'single').map((c) => c.colorIds[0]),
  );
  const multiCombos = colorCombinaciones
    .map((combo, index) => ({ combo, index }))
    .filter((x) => x.combo.kind === 'multi');

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
        productLineSlug,
        colorCombinaciones: JSON.stringify(
          colorCombinaciones
            .map((combo, index) => {
              const colorIds = combo.colorIds.filter(Boolean).slice(0, 4);
              const nombre =
                combo.nombre.trim() ||
                colorIds
                  .map((id) => colorById.get(id)?.nombre)
                  .filter(Boolean)
                  .join(' + ');
              return { nombre, orden: index, activo: combo.activo, colorIds };
            })
            .filter((combo) => combo.nombre && combo.colorIds.length > 0),
        ),
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

  function onProductLineChange(nextSlug: string) {
    setProductLineSlug(nextSlug);
    setColorCombinaciones([]);
  }

  function toggleIndividualColor(colorId: number) {
    setColorCombinaciones((prev) => {
      const exists = prev.some((c) => c.kind === 'single' && c.colorIds[0] === colorId);
      if (exists) {
        return prev.filter((c) => !(c.kind === 'single' && c.colorIds[0] === colorId));
      }
      const color = colorById.get(colorId);
      return [
        ...prev,
        {
          nombre: color?.nombre ?? '',
          colorIds: [colorId],
          orden: prev.length,
          activo: true,
          kind: 'single',
        },
      ];
    });
  }

  function addColorCombination() {
    setColorCombinaciones((prev) => [
      ...prev,
      {
        nombre: '',
        colorIds: [],
        orden: prev.length,
        activo: true,
        kind: 'multi',
      },
    ]);
  }

  function updateColorCombination(index: number, patch: Partial<Draft>) {
    setColorCombinaciones((prev) =>
      prev.map((combo, i) => (i === index ? { ...combo, ...patch } : combo)),
    );
  }

  function setComboColor(index: number, colorIndex: number, value: string) {
    const colorId = Number(value);
    setColorCombinaciones((prev) =>
      prev.map((combo, i) => {
        if (i !== index) return combo;
        const nextIds = [...combo.colorIds];
        if (value) nextIds[colorIndex] = colorId;
        else nextIds.splice(colorIndex, 1);
        return {
          ...combo,
          colorIds: nextIds.filter((id, idIndex, arr) => id && arr.indexOf(id) === idIndex).slice(0, 4),
        };
      }),
    );
  }

  function removeColorCombination(index: number) {
    setColorCombinaciones((prev) => prev.filter((_, i) => i !== index));
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

        <label class={styles.metaItem}>
          <span class={styles.metaLabel}>Línea de producto</span>
          <select
            class={styles.textInput}
            value={productLineSlug}
            onChange={(e) => onProductLineChange((e.target as HTMLSelectElement).value)}
          >
            <option value="">Sin línea de producto / sin colores</option>
            {allProductLines.map((v) => (
              <option key={v.slug} value={v.slug}>{v.nombre}</option>
            ))}
          </select>
        </label>

        <div class={styles.sectionBox}>
          <div>
            <span class={styles.sectionTitleSm}>Colores disponibles</span>
            <p style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-sm)', marginTop: 'var(--s-1)' }}>
              Activa los colores individuales que el cliente podrá elegir. Cada color marcado se vende por separado.
            </p>
          </div>

          {!selectedProductLine ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-sm)' }}>
              Selecciona una línea de producto para configurar colores.
            </p>
          ) : availableColors.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-sm)' }}>
              Esta línea de producto no tiene colores activos todavía.
            </p>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--s-2)', marginTop: 'var(--s-3)' }}>
              {availableColors.map((color) => {
                const on = singleColorIds.has(color.id);
                return (
                  <button
                    key={color.id}
                    type="button"
                    onClick={() => toggleIndividualColor(color.id)}
                    aria-pressed={on}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 'var(--s-2)',
                      padding: 'var(--s-2) var(--s-3)',
                      borderRadius: 'var(--r-pill, 999px)',
                      border: on ? '1.5px solid var(--text)' : '1px solid var(--line)',
                      background: on ? 'var(--surface-2, rgba(0,0,0,0.04))' : 'transparent',
                      color: 'var(--text)',
                      fontWeight: on ? 600 : 400,
                      fontSize: 'var(--fs-sm)',
                      cursor: 'pointer',
                    }}
                  >
                    <span
                      style={{
                        width: '14px',
                        height: '14px',
                        borderRadius: '50%',
                        background: color.hex ?? 'transparent',
                        border: '1px solid var(--line)',
                        flexShrink: 0,
                      }}
                    />
                    {color.nombre}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {selectedProductLine && availableColors.length > 0 && (
          <div class={styles.sectionBox}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--s-3)', alignItems: 'center' }}>
              <div>
                <span class={styles.sectionTitleSm}>Combinaciones de varios colores</span>
                <p style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-sm)', marginTop: 'var(--s-1)' }}>
                  Opcional. Crea opciones que mezclan 2 o más colores (hasta 4). El nombre se genera solo si lo dejas vacío.
                </p>
              </div>
              <button type="button" class={styles.iconBtn} onClick={addColorCombination}>
                + Agregar
              </button>
            </div>

            {multiCombos.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-sm)' }}>
                Sin combinaciones de varios colores.
              </p>
            ) : (
              <div style={{ display: 'grid', gap: 'var(--s-4)', marginTop: 'var(--s-4)' }}>
                {multiCombos.map(({ combo, index }) => (
                  <div
                    key={index}
                    style={{
                      border: '1px solid var(--line)',
                      borderRadius: 'var(--r-md)',
                      padding: 'var(--s-4)',
                      display: 'grid',
                      gap: 'var(--s-3)',
                    }}
                  >
                    <label class={styles.metaItem}>
                      <span class={styles.metaLabel}>Nombre de combinación</span>
                      <input
                        class={styles.textInput}
                        type="text"
                        maxLength={200}
                        value={combo.nombre}
                        onInput={(e) => updateColorCombination(index, {
                          nombre: (e.target as HTMLInputElement).value,
                        })}
                        placeholder="Blanco + Negro"
                      />
                    </label>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 'var(--s-3)' }}>
                      {[0, 1, 2, 3].map((colorIndex) => (
                        <label class={styles.metaItem} key={colorIndex}>
                          <span class={styles.metaLabel}>Color {colorIndex + 1}</span>
                          <select
                            class={styles.textInput}
                            value={combo.colorIds[colorIndex] ?? ''}
                            onChange={(e) => setComboColor(index, colorIndex, (e.target as HTMLSelectElement).value)}
                          >
                            <option value="">{colorIndex === 0 ? 'Elige un color' : 'Sin color'}</option>
                            {availableColors.map((color) => (
                              <option key={color.id} value={color.id}>{color.nombre}</option>
                            ))}
                          </select>
                        </label>
                      ))}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--s-3)', alignItems: 'center' }}>
                      <label class={styles.checkboxField}>
                        <input
                          type="checkbox"
                          checked={combo.activo}
                          onChange={(e) => updateColorCombination(index, {
                            activo: (e.target as HTMLInputElement).checked,
                          })}
                        />
                        <span>Disponible para compra</span>
                      </label>
                      <button
                        type="button"
                        class={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                        onClick={() => removeColorCombination(index)}
                      >
                        Quitar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

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
