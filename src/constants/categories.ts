import type { MaterialCommunityIcons } from '@expo/vector-icons'
import type { ComponentProps } from 'react'

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name']

// One tick on a tick-sheet. Each ticked item is saved as one row in visit_indicators.
export type Tick = {
  key: string
  label: string
  // A choice that goes with the tick (for example the number of pill packets)
  options?: number[]
  optionLabel?: string
  // Extra ticks that appear only when this one is ticked
  children?: { prompt: string; ticks: Tick[] }
}

export type NumberField = { key: string; label: string; unit: string; min: number; max: number }
export type TextField = { key: string; label: string; placeholder?: string; step?: 'checklist' | 'notes' }
export type Section = { title: string; ticks?: Tick[]; numbers?: NumberField[] }
export type AgeGroup = { key: string; label: string; ticks: Tick[] }

export type Sheet = {
  info?: string
  sections?: Section[]
  ageGroups?: AgeGroup[] // immunisation: pick the child's age first
  texts?: TextField[] // free text that is added to the clinical notes
}

export type Category = {
  key: string
  label: string
  icon: IconName
  // Sensitive categories show a neutral label on the patient's phone and in SMS
  sensitive: boolean
  sheet: Sheet
}

const t = (key: string, label: string): Tick => ({ key, label })

const MH_CONDITIONS: [string, string][] = [
  ['depression', 'Depression'],
  ['anxiety', 'Anxiety'],
  ['ptsd', 'PTSD'],
  ['substance_use', 'Substance use'],
  ['schizophrenia', 'Schizophrenia'],
  ['bipolar', 'Bipolar'],
  ['epilepsy', 'Epilepsy'],
  ['dementia', 'Dementia'],
  ['childhood_behavioural', 'Childhood behavioural'],
]

export const CATEGORIES: Category[] = [
  {
    key: 'womens_health',
    label: "Women's Health",
    icon: 'gender-female',
    sensitive: true,
    sheet: {
      sections: [
        {
          title: 'Cervical cancer screening',
          ticks: [
            t('cervical_screening_hiv_neg', 'HIV negative woman 30-50 years'),
            t('cervical_screening_hiv_pos', 'HIV positive woman 20+ years'),
          ],
        },
        {
          title: 'Contraception',
          ticks: [
            t('iucd_inserted', 'IUCD inserted'),
            t('nur_isterate_injection', 'Nur-Isterate injection (2-month)'),
            t('medroxy_injection', 'Medroxy / Depo Provera (3-month)'),
            { key: 'oral_pill_cycle', label: 'Oral pill cycle', options: [1, 3, 6], optionLabel: 'Number of packets' },
            t('subdermal_implant', 'Sub-dermal implant inserted'),
          ],
        },
      ],
    },
  },
  {
    key: 'maternal_health',
    label: 'Maternal Health (ANC)',
    icon: 'mother-nurse',
    sensitive: false,
    sheet: {
      sections: [
        {
          title: 'ANC visit type',
          ticks: [
            t('anc_first_before_20wks', 'ANC 1st visit before 20 weeks'),
            t('anc_first_after_20wks', 'ANC 1st visit 20 weeks or later'),
            t('anc_follow_up', 'ANC follow-up visit'),
          ],
          numbers: [{ key: 'gestational_age_weeks', label: 'Gestational age', unit: 'weeks', min: 1, max: 45 }],
        },
        {
          title: 'HIV status at this visit',
          ticks: [
            t('anc_hiv_first_test', 'ANC HIV 1st test done'),
            t('anc_hiv_first_positive', 'ANC HIV 1st test POSITIVE'),
            t('anc_hiv_retest', 'ANC HIV re-test done'),
            t('anc_hiv_retest_positive', 'ANC HIV re-test POSITIVE'),
            t('anc_already_on_art', 'Already on ART at 1st visit'),
            t('anc_hiv_positive_not_art', 'Known HIV+ but NOT on ART'),
            t('anc_initiated_on_art', 'Initiated on ART this visit'),
            t('anc_initiated_on_prep', 'Initiated on PrEP this visit'),
          ],
        },
        {
          title: 'Syphilis',
          ticks: [
            t('syphilis_first_test', 'Syphilis 1st test done'),
            t('syphilis_first_positive', 'Syphilis 1st test POSITIVE'),
            t('syphilis_retest', 'Syphilis re-test done'),
            t('syphilis_retest_positive', 'Syphilis re-test POSITIVE'),
            t('syphilis_bpg_dose1', 'BPG 1st dose given'),
          ],
        },
        {
          title: 'Hepatitis B',
          ticks: [t('hbsag_tested', 'Tested for HBsAg'), t('hbsag_positive', 'HBsAg POSITIVE')],
        },
      ],
    },
  },
  {
    key: 'immunisation',
    label: 'Immunisation',
    icon: 'needle',
    sensitive: false,
    sheet: {
      ageGroups: [
        { key: 'birth', label: 'Birth', ticks: [t('bcg_given', 'BCG dose'), t('opv0_given', 'OPV 0 dose'), t('hbv0_given', 'HBV 0 dose (if mother HBsAg+)')] },
        { key: '6_weeks', label: '6 Weeks', ticks: [t('hexavalent1_given', 'Hexavalent 1st dose'), t('opv1_given', 'OPV 1st dose'), t('pcv1_given', 'PCV 1st dose'), t('rv1_given', 'RV 1st dose')] },
        { key: '10_weeks', label: '10 Weeks', ticks: [t('hexavalent2_given', 'Hexavalent 2nd dose')] },
        { key: '14_weeks', label: '14 Weeks', ticks: [t('hexavalent3_given', 'Hexavalent 3rd dose'), t('pcv2_given', 'PCV 2nd dose'), t('rv2_given', 'RV 2nd dose')] },
        { key: '6_months', label: '6 Months', ticks: [t('mr1_given', 'MR 1st dose')] },
        { key: '9_months', label: '9 Months', ticks: [t('pcv3_given', 'PCV 3rd dose'), t('fully_immunised_u1', 'Fully immunised under 1 year')] },
        { key: '12_months', label: '12 Months', ticks: [t('mr2_given', 'MR 2nd dose')] },
        { key: '18_months', label: '18 Months', ticks: [t('hexavalent4_given', 'Hexavalent 4th dose')] },
        { key: '6_years', label: '6 Years', ticks: [t('tdap_6yr_given', 'Tdap dose')] },
        { key: '12_years', label: '12 Years', ticks: [t('tdap_12yr_given', 'Tdap dose')] },
      ],
    },
  },
  {
    key: 'chronic_care',
    label: 'Chronic Care Management',
    icon: 'heart-pulse',
    sensitive: false,
    sheet: {
      info: 'TB screening excludes clients already on TB treatment and clients screened in communities.',
      sections: [
        {
          title: 'Hypertension',
          ticks: [
            t('htn_new_18_44', 'New client 18-44 years'),
            t('htn_new_45_plus', 'New client 45+ years'),
            t('htn_followup_meds', 'Follow-up / collecting medication'),
            t('htn_screened_18_44', 'Screened 18-44 years'),
            t('htn_screened_45_plus', 'Screened 45+ years'),
          ],
        },
        {
          title: 'Diabetes',
          ticks: [
            t('dm_new_18_44', 'New client 18-44 years'),
            t('dm_new_45_plus', 'New client 45+ years'),
            t('dm_followup_meds', 'Follow-up / collecting medication'),
            t('dm_screened_18_44', 'Screened 18-44 years'),
            t('dm_screened_45_plus', 'Screened 45+ years'),
          ],
        },
        {
          title: 'HIV/AIDS (chronic)',
          ticks: [
            t('hiv_art_followup', 'On ART: follow-up visit'),
            t('hiv_viral_load', 'Viral load done'),
            t('hiv_cd4_done', 'CD4 done'),
          ],
        },
        {
          title: 'Tuberculosis (TB)',
          ticks: [
            t('tb_screened_under_5', 'Screened for TB: under 5 years'),
            t('tb_screened_5_plus', 'Screened for TB: 5 years and older'),
            t('tb_treatment_followup', 'On TB treatment: follow-up'),
            t('tb_treatment_completed', 'TB treatment completed'),
          ],
        },
        {
          title: 'Other chronic conditions',
          ticks: [
            t('asthma_new', 'Asthma: new'),
            t('asthma_followup', 'Asthma: follow-up'),
            t('heart_disease_new', 'Heart disease: new'),
            t('heart_disease_followup', 'Heart disease: follow-up'),
            t('kidney_disease_new', 'Kidney disease: new'),
            t('kidney_disease_followup', 'Kidney disease: follow-up'),
            t('cancer_new', 'Cancer: new'),
            t('cancer_followup', 'Cancer: follow-up'),
          ],
        },
      ],
    },
  },
  {
    key: 'htc',
    label: 'HIV Testing (HTC)',
    icon: 'test-tube',
    sensitive: true,
    sheet: {
      sections: [
        {
          title: 'HIV testing',
          ticks: [
            t('hiv_test_done', 'HIV test done'),
            t('hiv_test_positive', 'HIV test POSITIVE'),
            t('hiv_test_negative', 'HIV test NEGATIVE'),
            t('cd4_newly_diagnosed', 'CD4 done on newly diagnosed'),
          ],
        },
        {
          title: 'PrEP / PEP',
          ticks: [
            t('prep_initiated', 'PrEP initiated'),
            t('prep_remaining', 'Total remaining on PrEP'),
            t('pep_issued', 'PEP issued'),
          ],
        },
        {
          title: 'Sexual offence',
          ticks: [
            t('sexual_offence_case', 'Sexual offence case seen'),
            t('pep_sexual_offence', 'PEP issued to sexual offence case'),
          ],
        },
      ],
    },
  },
  {
    key: 'ccmdd',
    label: 'CCMDD',
    icon: 'pill',
    sensitive: false,
    sheet: {
      info: 'CCMDD is for stable patients with chronic diseases on the Central Chronic Medicines Dispensing and Distribution programme.',
      sections: [
        {
          title: 'CCMDD: chronic medication programme',
          ticks: [
            t('ccmdd_new_enrolment', 'New CCMDD enrolment'),
            t('ccmdd_renewal', 'CCMDD renewal'),
            t('ccmdd_collecting_from_pup', 'Collecting from external PuP'),
          ],
        },
      ],
    },
  },
  {
    key: 'mental_health',
    label: 'Mental Health',
    icon: 'brain',
    sensitive: true,
    sheet: {
      info: 'Mental health screening is excluded. Only record actual visits and treatment.',
      sections: [
        {
          title: 'Mental health visit',
          ticks: [
            t('mh_new_client_treated', 'New PHC client treated'),
            {
              key: 'mh_visit_under_18',
              label: 'Visit: under 18 years',
              children: {
                prompt: 'Select the condition(s) for this visit',
                ticks: MH_CONDITIONS.map(([k, label]) => t(`mh_u18_${k}`, label)),
              },
            },
            {
              key: 'mh_visit_18_plus',
              label: 'Visit: 18 years and older',
              children: {
                prompt: 'Select the condition(s) for this visit',
                ticks: MH_CONDITIONS.map(([k, label]) => t(`mh_18plus_${k}`, label)),
              },
            },
          ],
        },
        {
          title: 'Suicide attempts',
          ticks: [
            t('mh_suicide_attempt_u18', 'Client under 18: suicide attempt'),
            t('mh_suicide_attempt_18plus', 'Client 18+: suicide attempt'),
          ],
        },
      ],
    },
  },
  {
    key: 'child_nutrition',
    label: 'Child & Nutrition',
    icon: 'baby-face-outline',
    sensitive: false,
    sheet: {
      sections: [
        {
          title: 'Child and nutrition (under 5 years)',
          ticks: [
            t('food_supplementation_new', 'Food supplementation: new'),
            t('overweight_obese_new', 'Overweight / obese: new'),
            t('mam_new', 'Moderate acute malnutrition (MAM)'),
            t('sam_new', 'Severe acute malnutrition (SAM)'),
            t('diarrhoea_dehydration_new', 'Diarrhoea with dehydration: new'),
            t('pneumonia_new', 'Pneumonia: new'),
          ],
        },
        {
          title: '12-59 months',
          ticks: [
            t('deworming_12_59months', 'Deworming dose 12-59 months'),
            t('vitamin_a_12_59months', 'Vitamin A dose 12-59 months'),
          ],
        },
      ],
    },
  },
  {
    key: 'annual_wellness',
    label: 'Annual Wellness / PHC',
    icon: 'stethoscope',
    sensitive: false,
    sheet: { info: 'Annual wellness visit. Continue to record vital signs on the next step.' },
  },
  {
    key: 'acute_care',
    label: 'Acute Care',
    icon: 'ambulance',
    sensitive: false,
    sheet: {
      sections: [{ title: 'Priority', ticks: [t('acute_urgent', 'Urgent: needs prompt attention')] }],
      texts: [
        { key: 'acute_symptoms', label: 'Presenting symptoms', placeholder: 'Describe the symptoms' },
        { key: 'acute_treatment', label: 'Treatment given', placeholder: 'Describe the treatment provided', step: 'notes' },
      ],
    },
  },
  {
    key: 'follow_up',
    label: 'Follow-up Visit',
    icon: 'calendar-check',
    sensitive: false,
    sheet: {
      texts: [
        { key: 'followup_reference', label: 'Previous visit reference', placeholder: 'For example the date of the previous visit' },
        { key: 'followup_progress', label: 'Progress notes', placeholder: 'How is the patient progressing?' },
      ],
    },
  },
  {
    key: 'specialist',
    label: 'Specialist Consultation',
    icon: 'doctor',
    sensitive: false,
    sheet: {
      texts: [
        { key: 'specialist_referred_by', label: 'Referred by' },
        { key: 'specialist_name', label: 'Specialist name' },
        { key: 'specialist_notes', label: 'Consultation notes', placeholder: 'Findings and recommendations' },
      ],
    },
  },
]

export function getCategory(key: string): Category | undefined {
  return CATEGORIES.find((c) => c.key === key)
}

// The label to show on the patient's phone and in SMS: sensitive categories get a neutral label
export function categoryLabel(key: string, forPatient = false): string {
  const c = getCategory(key)
  if (!c) return key
  return forPatient && c.sensitive ? 'Clinic visit' : c.label
}

// Every tick key in a tick list, including the ticks that appear under another tick
function collect(ticks: Tick[] | undefined, into: string[]) {
  for (const tick of ticks ?? []) {
    into.push(tick.key)
    collect(tick.children?.ticks, into)
  }
}

export function allIndicatorKeys(): string[] {
  const keys: string[] = []
  for (const c of CATEGORIES) {
    for (const s of c.sheet.sections ?? []) {
      collect(s.ticks, keys)
      for (const n of s.numbers ?? []) keys.push(n.key)
    }
    for (const g of c.sheet.ageGroups ?? []) {
      keys.push(`age_group_${g.key}`)
      collect(g.ticks, keys)
    }
  }
  return keys
}