export async function downloadFileParts(file, onProgress = () => {}) {
  if (!Array.isArray(file.parts) || !file.parts.length) throw new Error('Archivo no disponible.');
  const parts = [];
  for (let index = 0; index < file.parts.length; index++) {
    const path = file.parts[index];
    if (typeof path !== 'string' || !path.startsWith('/catalog/live-files/')) throw new Error('Enlace de descarga inválido.');
    onProgress(index + 1, file.parts.length);
    const response = await fetch(path);
    if (!response.ok) throw new Error('No se pudo descargar una parte del archivo.');
    parts.push(await response.blob());
  }
  const blob = new Blob(parts, { type: /\.zip$/i.test(file.name) ? 'application/zip' : 'application/octet-stream' });
  if (blob.size !== file.size) throw new Error('El archivo descargado está incompleto.');
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
