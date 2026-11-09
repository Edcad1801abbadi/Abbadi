// Persistent device ID for unique device identification
export function getOrCreateDeviceId(): string {
  const k = "em_device_id";
  const v = localStorage.getItem(k);
  if (v) return v;
  const id = crypto.randomUUID();
  localStorage.setItem(k, id);
  return id;
}

// Short device suffix (first 6 chars of UUID) for peer IDs
export function getDeviceSuffix(): string {
  return getOrCreateDeviceId().split("-")[0];
}
