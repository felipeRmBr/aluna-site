import { useEffect, useState } from 'preact/hooks';
import styles from '../ProductGallery.module.css';
import { img } from '../../lib/img';

export type GalleryImage = {
  url: string;
  alt: string;
};

type Props = {
  images: GalleryImage[];
  nombre: string;
};

export default function ProductGallery({ images, nombre }: Props) {
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState(false);

  const count = images.length;
  const hasMany = count > 1;

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightbox(false);
      if (e.key === 'ArrowLeft') setActive((i) => (i - 1 + count) % count);
      if (e.key === 'ArrowRight') setActive((i) => (i + 1) % count);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [lightbox, count]);

  if (count === 0) return null;
  const current = images[active];

  return (
    <div class={styles.gallery}>
      <button
        type="button"
        class={styles.mainBtn}
        onClick={() => setLightbox(true)}
        aria-label={`Ampliar ${nombre}`}
      >
        <img
          class={styles.mainImg}
          src={img(current.url, { w: 1200, fit: 'cover', fm: 'webp', q: 82 })}
          alt={current.alt}
          loading="eager"
        />
        <span class={styles.expandHint} aria-hidden="true">⤢</span>
      </button>

      {hasMany && (
        <div class={styles.thumbs} role="tablist" aria-label="Galería">
          {images.map((thumb, i) => (
            <button
              key={i}
              type="button"
              class={`${styles.thumb} ${i === active ? styles.thumbActive : ''}`}
              onClick={() => setActive(i)}
              role="tab"
              aria-selected={i === active}
              aria-label={`Ver imagen ${i + 1}`}
            >
              <img src={img(thumb.url, { w: 200, fit: 'cover', fm: 'webp', q: 75 })} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}

      {lightbox && (
        <div
          class={styles.lightbox}
          onClick={() => setLightbox(false)}
          role="dialog"
          aria-modal="true"
          aria-label={`${nombre} — vista ampliada`}
        >
          <button
            type="button"
            class={styles.close}
            aria-label="Cerrar"
            onClick={() => setLightbox(false)}
          >×</button>

          {hasMany && (
            <button
              type="button"
              class={`${styles.nav} ${styles.navPrev}`}
              aria-label="Anterior"
              onClick={(e) => {
                e.stopPropagation();
                setActive((i) => (i - 1 + count) % count);
              }}
            >‹</button>
          )}

          <img
            class={styles.lightboxImg}
            src={img(current.url, { w: 2000, fit: 'contain', fm: 'webp', q: 85 })}
            alt={current.alt}
            onClick={(e) => e.stopPropagation()}
          />

          {hasMany && (
            <button
              type="button"
              class={`${styles.nav} ${styles.navNext}`}
              aria-label="Siguiente"
              onClick={(e) => {
                e.stopPropagation();
                setActive((i) => (i + 1) % count);
              }}
            >›</button>
          )}

          {hasMany && (
            <span class={styles.counter}>{active + 1} / {count}</span>
          )}
        </div>
      )}
    </div>
  );
}
