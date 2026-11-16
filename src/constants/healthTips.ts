import type { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name']

// General health advice shown to patients. The clinical supervisor should read and approve
// every line before the app is used with real patients. Edit the text here. The screen needs no change.
export const HEALTH_TIPS: { id: string; title: string; icon: IconName; tips: string[] }[] = [
  {
    id: 'medicine',
    title: 'Take your medicine',
    icon: 'pill',
    tips: [
      'Take your medicine every day, as the nurse showed you, even when you feel well.',
      'Never stop or share your medicine without asking your nurse.',
      'Collect your next supply before the medicine runs out. Your next collection date is on your Medication screen.',
      'If you miss doses or have side effects, tell your nurse. Do not just stop.',
    ],
  },
  {
    id: 'eat',
    title: 'Eat well',
    icon: 'food-apple-outline',
    tips: [
      'Eat vegetables and fruit every day.',
      'Choose water instead of sugary drinks.',
      'Eat less salt, sugar and fatty or fried food.',
      'If you have diabetes, ask your nurse about your meals and your medicine.',
    ],
  },
  {
    id: 'active',
    title: 'Stay active',
    icon: 'run',
    tips: [
      'Be active for about 30 minutes on most days. A brisk walk counts.',
      'Start slowly if you have not exercised for a long time.',
      'Stop and get help if you have chest pain or trouble breathing.',
    ],
  },
  {
    id: 'heart',
    title: 'Look after your heart',
    icon: 'heart-pulse',
    tips: [
      'Have your blood pressure and blood sugar checked at the clinic as often as the nurse advises.',
      'High blood pressure and high blood sugar often have no signs, so check even when you feel well.',
      'Do not smoke. Drink little or no alcohol.',
    ],
  },
  {
    id: 'protect',
    title: 'Protect yourself and others',
    icon: 'shield-check-outline',
    tips: [
      'Know your HIV status. Testing is free and confidential at the clinic.',
      'Use a condom every time you have sex. It helps prevent HIV, other infections and pregnancy.',
      'Ask the clinic about contraception and about screening tests, such as cervical screening for women.',
      'A cough for two weeks or more, night sweats, fever or weight loss can mean TB. Go to the clinic for a check.',
      'Wash your hands with soap and water before you eat or cook, and after the toilet.',
    ],
  },
  {
    id: 'pregnancy',
    title: 'Pregnancy and babies',
    icon: 'baby-carriage',
    tips: [
      'If you think you are pregnant, go to the clinic as soon as you can and come for every antenatal visit.',
      'Keep your baby\u2019s Road to Health booklet safe and bring it to every visit.',
      'Take your baby for all immunisations on time.',
      'Breast milk alone is best for the first six months.',
      'Take your baby to the clinic quickly if the baby is very sleepy, will not feed, has a fever or is breathing fast.',
    ],
  },
  {
    id: 'mind',
    title: 'Look after your mind',
    icon: 'emoticon-happy-outline',
    tips: [
      'Feeling sad, worried or hopeless for a long time is a health problem, and help is available.',
      'Talk to a nurse, a family member or a friend you trust.',
      'If you think about harming yourself, call the crisis line on 0800 567 567 or open Emergency help now.',
    ],
  },
  {
    id: 'appointments',
    title: 'Keep your appointments',
    icon: 'calendar-check-outline',
    tips: [
      'Come to every appointment, even when you feel well. The nurse can find problems early.',
      'Bring all your medicine and your questions to each visit.',
      'If you cannot come, tell the clinic as early as you can, so that you can be given a new date.',
    ],
  },
]