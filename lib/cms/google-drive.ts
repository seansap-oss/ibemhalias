/** Drive file previews are useful for a trial, but their share links are not DRM. */
export function getGoogleDrivePreviewUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.hostname !== "drive.google.com") return null;
    const match = url.pathname.match(/^\/file\/d\/([A-Za-z0-9_-]+)(?:\/(?:view|preview))?\/?$/);
    if (!match) return null;
    const preview = new URL(`https://drive.google.com/file/d/${match[1]}/preview`);
    const resourceKey = url.searchParams.get("resourcekey");
    if (resourceKey) preview.searchParams.set("resourcekey", resourceKey);
    return preview.toString();
  } catch {
    return null;
  }
}
