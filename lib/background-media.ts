const VIDEO_EXT_RE = /\.(?:mp4|webm|ogg|ogv|mov|m4v)(?:[?#].*)?$/i;
const VIDEO_DATA_URL_RE = /^data:video\/(?:mp4|webm|ogg);base64,/i;

export function isVideoResourceUrl(url: string): boolean {
  const value = url.trim();
  return VIDEO_EXT_RE.test(value) || VIDEO_DATA_URL_RE.test(value);
}
