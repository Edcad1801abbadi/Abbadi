// In-memory fallback when localStorage is blocked (private browsing, iOS restrictions)
let _memFallbackId: string | null = null;

export function getOrCreateDeviceId(): string {
  const key = "em_device_id";
  try {
    const stored = localStorage.getItem(key);
    if (stored) return stored;
    const id = crypto.randomUUID();
    localStorage.setItem(key, id);
    return id;
  } catch {
    if (!_memFallbackId) _memFallbackId = crypto.randomUUID();
    return _memFallbackId;
  }
}

// First segment of UUID (8 hex chars) used as short peer ID suffix
export function getDeviceSuffix(): string {
  return getOrCreateDeviceId().split("-")[0];
}
