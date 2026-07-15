import { safeFileName } from '../utils/format';

export function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

export async function saveFile(
  suggestedName: string,
  data: Uint8Array,
  mimeType: string,
): Promise<boolean> {
  const safeName = safeFileName(suggestedName);
  if (isTauriRuntime()) {
    const [{ save }, { writeFile }] = await Promise.all([
      import('@tauri-apps/plugin-dialog'),
      import('@tauri-apps/plugin-fs'),
    ]);
    const path = await save({
      defaultPath: safeName,
      filters: [{ name: 'Export', extensions: [safeName.split('.').pop() ?? 'txt'] }],
    });
    if (!path) return false;
    await writeFile(path, data);
    return true;
  }
  const blob = new Blob([data as BlobPart], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = safeName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}

export async function saveText(
  suggestedName: string,
  text: string,
  mimeType: string,
): Promise<boolean> {
  return saveFile(suggestedName, new TextEncoder().encode(text), mimeType);
}
