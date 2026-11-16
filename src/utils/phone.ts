const PHONE = /^(\+27|0)[0-9]{9}$/

// Spaces, dashes and brackets are allowed when typing
export const cleanPhone = (raw: string) => raw.replace(/[\s\-()]/g, '')
export const phoneOk = (raw: string) => PHONE.test(cleanPhone(raw))

// A stored number (+27123456789) shown the way people write it: 012 345 6789
export function showPhone(stored: string | null): string {
  if (!stored) return ''
  const local = stored.startsWith('+27') ? `0${stored.slice(3)}` : stored
  return `${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`
}