// VIP users: Developer & Manager only
export const VIP_EMPLOYEE_IDS = [1, 1801];

export const VIP_NAMES = [
  "Mubarak Omar Salem Omar",
  "Abdallah Mohammad Abdallah Abbadi",
];

/** Check if an employee ID belongs to a VIP */
export function isVipById(employeeId: number | string | null | undefined): boolean {
  if (!employeeId) return false;
  const id = typeof employeeId === "string" ? parseInt(employeeId, 10) : employeeId;
  return VIP_EMPLOYEE_IDS.includes(id);
}

/** Check if a name belongs to a VIP */
export function isVipByName(name: string | null | undefined): boolean {
  if (!name) return false;
  return VIP_NAMES.some(v => name.includes(v) || v.includes(name));
}

/** Check if a peerId (instructor-{empId}-{suffix}) belongs to a VIP */
export function isVipByPeerId(peerId: string | null | undefined): boolean {
  if (!peerId) return false;
  const match = peerId.match(/^instructor-(\d+)/);
  if (match) return isVipById(parseInt(match[1], 10));
  return false;
}

/** CSS class for VIP golden gradient name text */
export const VIP_NAME_CLASS = "vip-name";

/** CSS class for VIP animated border container */
export const VIP_BORDER_CLASS = "vip-border";
