export type VitalKey =
  | 'bp_systolic'
  | 'bp_diastolic'
  | 'pulse'
  | 'temperature'
  | 'spo2'
  | 'respiration'
  | 'glucose'
  | 'weight'
  | 'height'
  | 'muac'
  | 'haemoglobin'

export type VitalStatus = 'normal' | 'elevated' | 'high' | 'low' | 'crisis'

export type VitalField = { key: VitalKey; label: string; unit: string; min: number; max: number }

// The limits are the same plausible ranges the database enforces (vitals_value_plausible)
export const VITAL_FIELDS: VitalField[] = [
  { key: 'bp_systolic', label: 'Blood pressure, top number', unit: 'mmHg', min: 40, max: 300 },
  { key: 'bp_diastolic', label: 'Blood pressure, bottom number', unit: 'mmHg', min: 20, max: 200 },
  { key: 'pulse', label: 'Pulse', unit: 'bpm', min: 20, max: 250 },
  { key: 'temperature', label: 'Temperature', unit: 'C', min: 25, max: 45 },
  { key: 'spo2', label: 'Oxygen saturation (SpO2)', unit: '%', min: 50, max: 100 },
  { key: 'respiration', label: 'Respiration rate', unit: 'breaths/min', min: 4, max: 80 },
  { key: 'glucose', label: 'Blood glucose', unit: 'mmol/L', min: 0.5, max: 60 },
  { key: 'weight', label: 'Weight', unit: 'kg', min: 0.5, max: 400 },
  { key: 'height', label: 'Height', unit: 'cm', min: 30, max: 250 },
  { key: 'muac', label: 'MUAC (mid-upper arm)', unit: 'cm', min: 3, max: 60 },
  { key: 'haemoglobin', label: 'Haemoglobin', unit: 'g/dL', min: 2, max: 25 },
]

export const VITAL_NAMES: Record<string, string> = {
  bp_systolic: 'Blood pressure (top)',
  bp_diastolic: 'Blood pressure (bottom)',
  pulse: 'Pulse',
  temperature: 'Temperature',
  spo2: 'Oxygen saturation',
  respiration: 'Respiration rate',
  glucose: 'Blood glucose',
  weight: 'Weight',
  height: 'Height',
  bmi: 'BMI',
  muac: 'MUAC',
  haemoglobin: 'Haemoglobin',
}

// Plain-language text for each flag code the database can give.
// These move into the five language files in the translation step.
export const FLAG_LABELS: Record<string, string> = {
  hypertensive_crisis: 'Hypertensive crisis',
  high_bp: 'High blood pressure',
  elevated_bp: 'Elevated blood pressure',
  low_bp: 'Low blood pressure',
  very_high_glucose: 'Very high glucose',
  high_glucose: 'High glucose',
  pre_diabetic_range: 'Pre-diabetic range',
  low_glucose: 'Low glucose',
  high_fever: 'High fever',
  fever: 'Fever',
  slightly_high_temp: 'Slightly high temperature',
  hypothermia: 'Hypothermia (low temperature)',
  critical_spo2: 'Critically low oxygen',
  low_spo2: 'Low oxygen',
  very_high_pulse: 'Very high pulse',
  high_pulse: 'High pulse',
  very_low_pulse: 'Very low pulse',
  low_pulse: 'Low pulse',
  very_high_rr: 'Very fast breathing',
  high_rr: 'Fast breathing',
  very_low_rr: 'Very slow breathing',
  low_rr: 'Slow breathing',
  severely_obese: 'Severely obese range',
  obese: 'Obese range',
  overweight: 'Overweight range',
  severely_underweight: 'Severely underweight',
  underweight: 'Underweight',
  severe_malnutrition: 'Severe malnutrition',
  moderate_malnutrition: 'Moderate malnutrition',
  at_risk_malnutrition: 'At risk of malnutrition',
  critical_low_hb: 'Critically low haemoglobin',
  low_hb: 'Low haemoglobin (anaemia)',
  high_hb: 'High haemoglobin',
}

// "36,8" and "36.8" both work, because many phones use a decimal comma.
// Returns null when the text is empty or is not a number.
export function parseNumber(raw: string): number | null {
  const cleaned = raw.trim().replace(',', '.')
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return null
  return Number(cleaned)
}

export function calculateBmi(weightKg: number, heightCm: number): number {
  const metres = heightCm / 100
  return Math.round((weightKg / (metres * metres)) * 10) / 10
}