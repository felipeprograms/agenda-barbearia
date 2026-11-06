/** Links de contato montados a partir dos dados da barbearia. */

/** "71999999999" -> https://wa.me/5571999999999 (assume Brasil quando não tem código do país) */
export function whatsappLink(phone: string, text?: string): string {
  const full = phone.length <= 11 ? `55${phone}` : phone;
  return `https://wa.me/${full}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

export function mapsLink(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

export function instagramLink(handle: string): string {
  return `https://instagram.com/${handle}`;
}

/** "71999999999" -> "(71) 99999-9999" */
export function formatPhone(phone: string): string {
  const d = phone.length > 11 ? phone.slice(-11) : phone;
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return phone;
}
