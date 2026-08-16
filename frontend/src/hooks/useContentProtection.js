import { useEffect } from 'react';

const FORM_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);
const isFormField = (el) => FORM_TAGS.has(el?.tagName) || el?.isContentEditable;

export function useContentProtection() {
  useEffect(() => {
    /* ── Menú contextual habilitado ──────────────────────── */
    const onContextMenu = () => {};

    /* ── Bloquear atajos de teclado ───────────────────────── */
    const onKeyDown = (e) => {
      if (isFormField(e.target)) return;

      const ctrl = e.ctrlKey || e.metaKey;
      const k    = e.key?.toLowerCase();

      // DevTools: F12, Ctrl+Shift+I/J/C/K
      if (e.keyCode === 123) { e.preventDefault(); return; }
      if (ctrl && e.shiftKey && ['i','j','c','k'].includes(k)) { e.preventDefault(); return; }

      // Ver fuente: Ctrl+U
      if (ctrl && k === 'u') { e.preventDefault(); return; }

      // Guardar: Ctrl+S
      if (ctrl && k === 's') { e.preventDefault(); return; }

      // Imprimir: Ctrl+P
      if (ctrl && k === 'p') { e.preventDefault(); return; }

      // Copiar / cortar / seleccionar todo
      if (ctrl && (k === 'c' || k === 'x' || k === 'a')) { e.preventDefault(); return; }
    };

    /* ── Bloquear eventos copy / cut ──────────────────────── */
    const onCopy = (e) => {
      if (isFormField(e.target)) return;
      e.preventDefault();
    };
    const onCut = (e) => {
      if (isFormField(e.target)) return;
      e.preventDefault();
    };

    /* ── Bloquear arrastre de imágenes ────────────────────── */
    const onDragStart = (e) => {
      if (e.target.tagName === 'IMG' || e.target.tagName === 'A') {
        e.preventDefault();
      }
    };

    /* ── Consola: advertencia visible en DevTools ─────────── */
    const warnMsg = [
      '%cSitio protegido',
      'color:#FF3131;font-size:20px;font-weight:bold;',
    ];
    console.log(...warnMsg);
    console.log(
      '%cEste sitio y su contenido son propiedad de Kodeo. El acceso no autorizado o la extracción de contenido está prohibida.',
      'font-size:13px;color:#9b9b9b;'
    );

    document.addEventListener('contextmenu', onContextMenu);
    document.addEventListener('keydown',     onKeyDown,    { capture: true });
    document.addEventListener('copy',        onCopy,       { capture: true });
    document.addEventListener('cut',         onCut,        { capture: true });
    document.addEventListener('dragstart',   onDragStart);

    return () => {
      document.removeEventListener('contextmenu', onContextMenu);
      document.removeEventListener('keydown',     onKeyDown,    { capture: true });
      document.removeEventListener('copy',        onCopy,       { capture: true });
      document.removeEventListener('cut',         onCut,        { capture: true });
      document.removeEventListener('dragstart',   onDragStart);
    };
  }, []);
}
