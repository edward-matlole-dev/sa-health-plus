import { VITAL_FIELDS, type VitalKey, calculateBmi, parseNumber } from '../constants/vitals'
import type { Values } from '../stores/visitDraftStore'

export type VitalErrors = Partial<Record<VitalKey, string>>

export function validateVitals(values: Values) {
  const errors: VitalErrors = {}
  const numbers: Partial<Record<VitalKey, number>> = {}

  for (const f of VITAL_FIELDS) {
    const raw = values[f.key]
    if (raw.trim() === '') continue
    const n = parseNumber(raw)
    if (n === null) errors[f.key] = 'Enter a number, for example 36.6'
    else if (n < f.min || n > f.max) errors[f.key] = `Must be between ${f.min} and ${f.max} ${f.unit}`
    else numbers[f.key] = n
  }

  // Blood pressure needs both numbers, and the top number must be higher
  const hasTop = values.bp_systolic.trim() !== ''
  const hasBottom = values.bp_diastolic.trim() !== ''
  if (hasTop !== hasBottom) {
    const missing = hasTop ? 'bp_diastolic' : 'bp_systolic'
    errors[missing] ??= 'Enter both blood pressure numbers'
  } else if (
    numbers.bp_systolic !== undefined &&
    numbers.bp_diastolic !== undefined &&
    numbers.bp_systolic <= numbers.bp_diastolic
  ) {
    errors.bp_systolic ??= 'The top number must be higher than the bottom number'
  }

  // BMI is worked out from weight and height, never typed in
  let bmi: number | null = null
  if (numbers.weight !== undefined && numbers.height !== undefined) {
    bmi = calculateBmi(numbers.weight, numbers.height)
    if (bmi < 5 || bmi > 100) {
      errors.height ??= 'Weight and height give an impossible BMI. Please check both.'
      bmi = null
    }
  }

  return { errors, numbers, bmi }
}