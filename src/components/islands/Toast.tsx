import { useEffect, useState } from 'preact/hooks';
import styles from '../../pages/admin/admin.module.css';

export type ToastState = { kind: 'success' | 'error'; message: string; id: number } | null;

export function useToast() {
  const [toast, setToast] = useState<ToastState>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast((prev) => (prev?.id === toast.id ? null : prev)), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  return {
    toast,
    showSuccess: (message = 'Cambios guardados.') =>
      setToast({ kind: 'success', message, id: Date.now() }),
    showError: (message: string) =>
      setToast({ kind: 'error', message, id: Date.now() }),
  };
}

export function ToastView({ toast }: { toast: ToastState }) {
  if (!toast) return null;
  return (
    <div
      key={toast.id}
      class={`${styles.toast} ${toast.kind === 'error' ? styles.toastError : ''}`}
      role={toast.kind === 'error' ? 'alert' : 'status'}
    >
      {toast.message}
    </div>
  );
}

const ERROR_MESSAGES: Record<string, string> = {
  'no-file': 'Selecciona una imagen antes de subir.',
  'bad-type': 'Solo se permiten imágenes (JPG, PNG, WebP, AVIF, GIF, SVG).',
  'too-big': 'La imagen es demasiado grande (máx. 5 MB).',
};

export function describeError(code: string | undefined | null): string {
  if (!code) return 'No se pudieron guardar los cambios.';
  return ERROR_MESSAGES[code] ?? `Error: ${code}`;
}
