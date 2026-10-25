import { I18n } from 'i18n-js'

export const supportedLanguages = {
  en: 'English',
  zu: 'isiZulu',
  xh: 'isiXhosa',
  st: 'Sesotho',
  af: 'Afrikaans',
} as const

export type AppLanguage = keyof typeof supportedLanguages

const translations = {
  en: {
    tabs: { home: 'Home', checkups: 'Checkups', medication: 'Medication', messages: 'Messages', settings: 'Settings' },
    settings: {
      title: 'Settings',
      account: 'Your account',
      signedInAs: 'Signed in as',
      privacy: 'Privacy & security',
      changePin: 'Change PIN',
      changePassword: 'Change password',
      privacyDetail: 'Use a PIN or password that only you know.',
      communication: 'Communication preferences',
      sms: 'SMS reminders',
      smsDetail: 'Receive appointment and clinic reminders by SMS.',
      push: 'App notifications',
      pushDetail: 'Receive reminders when notifications are available on your device.',
      language: 'Language',
      languageDetail: 'Choose the language used in key parts of the app.',
      saving: 'Saving your preferences…',
      saveError: 'We could not save that preference. Please try again.',
      signOut: 'Sign out',
    },
    password: {
      title: 'Change security code',
      patientIntro: 'Choose a new six-digit PIN that only you know.',
      staffIntro: 'Use at least 12 characters, including uppercase, lowercase, a number and a symbol.',
      current: 'Current PIN or password',
      new: 'New PIN or password',
      confirm: 'Confirm new PIN or password',
      update: 'Update security code',
      updated: 'Your security code has been updated.',
      mismatch: 'The new values do not match.',
      patientRule: 'Your new PIN must be exactly 6 digits.',
      staffRule: 'Use 12 or more characters with uppercase, lowercase, a number and a symbol.',
      currentRequired: 'Enter your current PIN or password.',
      same: 'Choose a different PIN or password.',
      help: 'For your security, we verify your current PIN or password before saving the new one.',
    },
  },
  zu: {
    tabs: { home: 'Ekhaya', checkups: 'Ukuhlolwa', medication: 'Imithi', messages: 'Imilayezo', settings: 'Izilungiselelo' },
    settings: { title: 'Izilungiselelo', account: 'I-akhawunti yakho', signedInAs: 'Ungene njengo', privacy: 'Ubumfihlo nokuvikeleka', changePin: 'Shintsha i-PIN', changePassword: 'Shintsha iphasiwedi', privacyDetail: 'Sebenzisa i-PIN noma iphasiwedi oyaziyo wena kuphela.', communication: 'Okuncamelayo kwezokuxhumana', sms: 'Izikhumbuzi ze-SMS', smsDetail: 'Thola izikhumbuzi zomtholampilo nge-SMS.', push: 'Izaziso zohlelo', pushDetail: 'Thola izikhumbuzi ohlelweni uma izaziso zitholakala kudivayisi yakho.', language: 'Ulimi', languageDetail: 'Khetha ulimi lwezingxenye ezibalulekile zohlelo.', saving: 'Kulondolozwa okuncamelayo…', saveError: 'Asikwazanga ukulondoloza lokho. Sicela uzame futhi.', signOut: 'Phuma' },
    password: { title: 'Shintsha ikhodi yokuvikela', patientIntro: 'Khetha i-PIN entsha enezinombolo eziyisithupha oyaziyo wena kuphela.', staffIntro: 'Sebenzisa izinhlamvu eziyi-12 noma ngaphezulu, ezinohlamvu olukhulu, oluncane, inombolo nophawu.', current: 'I-PIN noma iphasiwedi yamanje', new: 'I-PIN noma iphasiwedi entsha', confirm: 'Qinisekisa i-PIN noma iphasiwedi entsha', update: 'Buyekeza ikhodi yokuvikela', updated: 'Ikhodi yakho yokuvikela ibuyekeziwe.', mismatch: 'Amanani amasha awafani.', patientRule: 'I-PIN entsha kumele ibe izinombolo eziyisithupha.', staffRule: 'Sebenzisa izinhlamvu eziyi-12 noma ngaphezulu ezinohlamvu olukhulu, oluncane, inombolo nophawu.', currentRequired: 'Faka i-PIN noma iphasiwedi yakho yamanje.', same: 'Khetha i-PIN noma iphasiwedi ehlukile.', help: 'Ukuvikela i-akhawunti yakho, siqinisekisa ikhodi yakho yamanje ngaphambi kokulondoloza entsha.' },
  },
  xh: {
    tabs: { home: 'Ekhaya', checkups: 'Uhlolo', medication: 'Amayeza', messages: 'Imiyalezo', settings: 'Iisetingi' },
    settings: { title: 'Iisetingi', account: 'Iakhawunti yakho', signedInAs: 'Ungene njengo', privacy: 'Ubumfihlo nokhuseleko', changePin: 'Tshintsha i-PIN', changePassword: 'Tshintsha igama lokugqitha', privacyDetail: 'Sebenzisa i-PIN okanye igama lokugqitha olaziyo wena kuphela.', communication: 'Izinto ozikhethayo zonxibelelwano', sms: 'Izikhumbuzi ze-SMS', smsDetail: 'Fumana izikhumbuzi zekliniki nge-SMS.', push: 'Izaziso ze-app', pushDetail: 'Fumana izikhumbuzi xa izaziso zifumaneka kwisixhobo sakho.', language: 'Ulwimi', languageDetail: 'Khetha ulwimi olusetyenziswa kwiindawo eziphambili ze-app.', saving: 'Kugcinwa izinto ozikhethayo…', saveError: 'Asikwazanga ukugcina oko. Nceda zama kwakhona.', signOut: 'Phuma' },
    password: { title: 'Tshintsha ikhowudi yokhuseleko', patientIntro: 'Khetha i-PIN entsha enamanani amathandathu oyaziyo wena kuphela.', staffIntro: 'Sebenzisa amagama ali-12 okanye ngaphezulu anoonobumba abakhulu, abancinci, inani nophawu.', current: 'I-PIN okanye igama lokugqitha langoku', new: 'I-PIN okanye igama lokugqitha elitsha', confirm: 'Qinisekisa i-PIN okanye igama lokugqitha elitsha', update: 'Hlaziya ikhowudi yokhuseleko', updated: 'Ikhowudi yakho yokhuseleko ihlaziyiwe.', mismatch: 'Amaxabiso amatsha awafani.', patientRule: 'I-PIN entsha kufuneka ibe ngamanani amathandathu.', staffRule: 'Sebenzisa amagama ali-12 okanye ngaphezulu anoonobumba abakhulu, abancinci, inani nophawu.', currentRequired: 'Faka i-PIN okanye igama lokugqitha langoku.', same: 'Khetha i-PIN okanye igama lokugqitha elahlukileyo.', help: 'Ukuze sikhusele iakhawunti yakho, siqinisekisa ikhowudi yakho yangoku ngaphambi kokugcina entsha.' },
  },
  st: {
    tabs: { home: 'Lehae', checkups: 'Ditlhahlobo', medication: 'Meriana', messages: 'Melaetsa', settings: 'Diseting' },
    settings: { title: 'Diseting', account: 'Akhaonto ya hao', signedInAs: 'O kene jwalo ka', privacy: 'Lekunutu le polokeho', changePin: 'Fetola PIN', changePassword: 'Fetola phasewete', privacyDetail: 'Sebedisa PIN kapa phasewete eo o e tsebang o le mong.', communication: 'Dikgetho tsa puisano', sms: 'Dikhopotso tsa SMS', smsDetail: 'Fumana dikhopotso tsa tleliniki ka SMS.', push: 'Ditemoso tsa app', pushDetail: 'Fumana dikhopotso ha ditemoso di fumaneha sesebedisweng sa hao.', language: 'Puo', languageDetail: 'Kgetha puo e sebediswang dikarolong tsa bohlokwa tsa app.', saving: 'Dikgetho tsa hao di a bolokwa…', saveError: 'Ha rea kgona ho boloka seo. Ka kopo leka hape.', signOut: 'Tsoa' },
    password: { title: 'Fetola khoutu ya polokeho', patientIntro: 'Kgetha PIN e ntjha ya dinomoro tse tsheletseng eo o e tsebang o le mong.', staffIntro: 'Sebedisa ditlhaku tse 12 kapa ho feta, ho kenyeletsa tlhaku e kgolo, e nyane, nomoro le letshwao.', current: 'PIN kapa phasewete ya hajoale', new: 'PIN kapa phasewete e ntjha', confirm: 'Netefatsa PIN kapa phasewete e ntjha', update: 'Ntlafatsa khoutu ya polokeho', updated: 'Khoutu ya hao ya polokeho e ntlafaditswe.', mismatch: 'Boleng bo botjha ha bo tshwane.', patientRule: 'PIN e ntjha e tshwanetse ho ba dinomoro tse 6.', staffRule: 'Sebedisa ditlhaku tse 12 kapa ho feta tse nang le tlhaku e kgolo, e nyane, nomoro le letshwao.', currentRequired: 'Kenya PIN kapa phasewete ya hao ya hajoale.', same: 'Kgetha PIN kapa phasewete e fapaneng.', help: 'Ho sireletsa akhaonto ya hao, re netefatsa khoutu ya hao ya hajoale pele re boloka e ntjha.' },
  },
  af: {
    tabs: { home: 'Tuis', checkups: 'Ondersoeke', medication: 'Medikasie', messages: 'Boodskappe', settings: 'Instellings' },
    settings: { title: 'Instellings', account: 'Jou rekening', signedInAs: 'Aangemeld as', privacy: 'Privaatheid en sekuriteit', changePin: 'Verander PIN', changePassword: 'Verander wagwoord', privacyDetail: 'Gebruik ’n PIN of wagwoord wat net jy ken.', communication: 'Kommunikasievoorkeure', sms: 'SMS-herinnerings', smsDetail: 'Ontvang kliniekherinnerings per SMS.', push: 'Programkennisgewings', pushDetail: 'Ontvang herinnerings wanneer kennisgewings op jou toestel beskikbaar is.', language: 'Taal', languageDetail: 'Kies die taal wat in belangrike dele van die program gebruik word.', saving: 'Jou voorkeure word gestoor…', saveError: 'Ons kon nie daardie voorkeur stoor nie. Probeer asseblief weer.', signOut: 'Meld af' },
    password: { title: 'Verander sekuriteitskode', patientIntro: 'Kies ’n nuwe ses-syfer PIN wat net jy ken.', staffIntro: 'Gebruik minstens 12 karakters, met hoof- en kleinletters, ’n nommer en ’n simbool.', current: 'Huidige PIN of wagwoord', new: 'Nuwe PIN of wagwoord', confirm: 'Bevestig nuwe PIN of wagwoord', update: 'Werk sekuriteitskode by', updated: 'Jou sekuriteitskode is bygewerk.', mismatch: 'Die nuwe waardes stem nie ooreen nie.', patientRule: 'Jou nuwe PIN moet presies 6 syfers wees.', staffRule: 'Gebruik 12 of meer karakters met hoof- en kleinletters, ’n nommer en ’n simbool.', currentRequired: 'Voer jou huidige PIN of wagwoord in.', same: 'Kies ’n ander PIN of wagwoord.', help: 'Vir jou sekuriteit verifieer ons jou huidige kode voordat die nuwe een gestoor word.' },
  },
} as const

const i18n = new I18n(translations)
i18n.enableFallback = true
i18n.defaultLocale = 'en'

export function translate(language: AppLanguage, key: string, options?: Record<string, unknown>) {
  i18n.locale = language
  return i18n.t(key, options)
}
