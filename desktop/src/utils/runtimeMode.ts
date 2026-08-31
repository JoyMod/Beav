export function isLocalBrowserPreview(): boolean {
  if (typeof window === 'undefined') return false;
  const localPreviewOrigins = new Set([
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  ]);
  return !window.__RED_ELECTRON_IPC__ && localPreviewOrigins.has(window.location.origin);
}
