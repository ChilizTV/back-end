/**
 * Extracts stream key from mediamtx path.
 * Path format: "live/{streamKey}" or "live/{streamKey}/variant"
 */
export function extractStreamKey(path: string): string | null {
  const parts = path.split('/');
  // parts[0] = 'live', parts[1] = streamKey
  return parts.length >= 2 && parts[1] ? parts[1] : null;
}
