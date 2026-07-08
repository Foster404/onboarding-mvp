// Uploaded files live in our own Supabase Storage bucket, whereas pasted
// links (e.g. YouTube) point elsewhere and should just open normally.
export function isUploadedFileUrl(url: string) {
  return url.includes("/storage/v1/object/public/media/");
}

// The browser's native `download` attribute is silently ignored for
// cross-origin URLs (which Supabase Storage links are), so it falls back to
// the raw storage object key as the filename. Fetching the file ourselves
// and saving it from a same-origin blob URL lets us set the real filename.
export async function downloadAsFile(url: string, filename: string) {
  const res = await fetch(url);
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(objectUrl);
}
