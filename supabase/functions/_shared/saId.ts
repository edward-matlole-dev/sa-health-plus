// South African ID number validation (13 digits, Luhn checksum, real date of birth)

export type SaIdResult =
  | { valid: true; dateOfBirth: string; gender: 'female' | 'male' }
  | { valid: false; reason: string }

export function luhnValid(digits: string): boolean {
  let sum = 0
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[digits.length - 1 - i])
    if (i % 2 === 1) {
      d *= 2
      if (d > 9) d -= 9
    }
    sum += d
  }
  return sum % 10 === 0
}

export function parseSaId(raw: string, today: Date = new Date()): SaIdResult {
  const id = raw.replace(/\s/g, '')
  if (!/^\d{13}$/.test(id)) return { valid: false, reason: 'ID number must be 13 digits' }
  if (!luhnValid(id)) return { valid: false, reason: 'ID number is not valid' }

  const yy = Number(id.slice(0, 2))
  const mm = Number(id.slice(2, 4))
  const dd = Number(id.slice(4, 6))

  // Two-digit year: a date in the future means the 1900s
  let year = 2000 + yy
  if (new Date(Date.UTC(year, mm - 1, dd)) > today) year = 1900 + yy

  const date = new Date(Date.UTC(year, mm - 1, dd))
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== mm - 1 || date.getUTCDate() !== dd) {
    return { valid: false, reason: 'ID number contains an invalid date of birth' }
  }

  const gender = Number(id.slice(6, 10)) < 5000 ? 'female' : 'male'
  const dateOfBirth = `${year}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`
  return { valid: true, dateOfBirth, gender }
}