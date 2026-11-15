import type { MaterialCommunityIcons } from '@expo/vector-icons'
import type { ComponentProps } from 'react'

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name']

// The numbers shown on the Emergency screen. The clinical supervisor should confirm this list
// before the app is used with real patients. A change here changes the screen.
export const EMERGENCY_NUMBERS: {
  id: string
  name: string
  detail: string
  number: string // what the phone dials
  display: string // what the person reads
  icon: IconName
}[] = [
  { id: 'ambulance', name: 'Ambulance', detail: 'Medical emergencies, from any phone', number: '10177', display: '10177', icon: 'ambulance' },
  { id: 'cell', name: 'Emergency from a cell phone', detail: 'Connects you to the emergency services', number: '112', display: '112', icon: 'phone-alert' },
  { id: 'police', name: 'Police', detail: 'If you or someone else is in danger', number: '10111', display: '10111', icon: 'shield-alert-outline' },
  { id: 'gbv', name: 'Gender-based violence helpline', detail: 'Free, 24 hours a day', number: '0800428428', display: '0800 428 428', icon: 'heart-flash' },
  { id: 'crisis', name: 'Suicide crisis line (SADAG)', detail: 'Free, 24 hours a day', number: '0800567567', display: '0800 567 567', icon: 'lifebuoy' },
]

// Also for the supervisor to confirm.
export const WARNING_SIGNS = [
  'Trouble breathing, or chest pain',
  'Heavy bleeding that will not stop',
  'A fit (seizure), fainting or sudden confusion',
  'Sudden weakness, a drooping face or trouble speaking',
  'A severe allergic reaction, such as a swollen face or throat',
  'Bleeding or severe pain in pregnancy',
  'Thoughts of harming yourself or someone else',
]