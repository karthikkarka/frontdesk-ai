export type Language = 'en' | 'hi' | 'te';

export interface QuickReplyItem {
  label: string;
  query: string;
}

export interface LanguagePack {
  name: string;
  nativeName: string;
  clinicName: string;
  clinicTagline: string;
  hoursPrefix: string;
  emergencyPrefix: string;
  patientChatTab: string;
  staffTab: string;
  welcomeMessage: string;
  senderYou: string;
  senderBot: string;
  senderStaff: string;
  checkingRecords: string;
  transparencyBadge: string;
  emergencyAlertTitle: string;
  inputPlaceholder: string;
  sendBtnTitle: string;
  quickReplies: {
    consultation: QuickReplyItem;
    saturdayHours: QuickReplyItem;
    rootCanal: QuickReplyItem;
    insurance: QuickReplyItem;
    childrenDoctor: QuickReplyItem;
    bookVisit: QuickReplyItem;
    emergencyContact: QuickReplyItem;
  };
}

export const translations: Record<Language, LanguagePack> = {
  en: {
    name: 'English',
    nativeName: 'English',
    clinicName: 'Bright Roots',
    clinicTagline: 'Dental Clinic • Banjara Hills',
    hoursPrefix: 'Mon–Sat',
    emergencyPrefix: 'Emergency',
    patientChatTab: 'Patient Chat',
    staffTab: 'Staff (/staff)',
    welcomeMessage: 'Hello! Welcome to Bright Roots Dental, Banjara Hills. I can answer questions about our timings, doctors, prices, location, and insurance. How can I help you today?',
    senderYou: 'You',
    senderBot: '🦷 Front Desk AI',
    senderStaff: '👨‍⚕️ Clinic Staff (Live)',
    checkingRecords: 'Checking records...',
    transparencyBadge: 'Answered from the clinic file',
    emergencyAlertTitle: 'PRIORITY EMERGENCY CARE',
    inputPlaceholder: 'Ask questions about timings, doctors, prices...',
    sendBtnTitle: 'Send Message',
    quickReplies: {
      consultation: {
        label: 'Consultation Fee',
        query: 'How much is consultation?'
      },
      saturdayHours: {
        label: 'Saturday Hours',
        query: 'What time do you open on Saturday?'
      },
      rootCanal: {
        label: 'Root Canal Cost',
        query: 'How much is a root canal?'
      },
      insurance: {
        label: 'Insurance (Niva Bupa)',
        query: 'Do you take Niva Bupa insurance?'
      },
      childrenDoctor: {
        label: 'Children Doctor',
        query: 'Which doctor sees children?'
      },
      bookVisit: {
        label: 'Book Visit',
        query: 'I want to book an appointment tomorrow at 11am'
      },
      emergencyContact: {
        label: 'Emergency Contact',
        query: 'What is the emergency number?'
      }
    }
  },

  hi: {
    name: 'Hindi',
    nativeName: 'हिन्दी',
    clinicName: 'Bright Roots',
    clinicTagline: 'Dental Clinic • Banjara Hills',
    hoursPrefix: 'सोम–शनि',
    emergencyPrefix: 'आपातकालीन',
    patientChatTab: 'मरीज़ चैट (Patient Chat)',
    staffTab: 'स्टाफ (/staff)',
    welcomeMessage: 'नमस्ते! ब्राइट रूट्स डेंटल (Bright Roots Dental), बंजारा हिल्स में आपका स्वागत है। मैं हमारे समय, डॉक्टरों, उपचार शुल्क, स्थान और बीमा के बारे में आपके प्रश्नों के उत्तर दे सकता हूँ। आज मैं आपकी क्या सहायता कर सकता हूँ?',
    senderYou: 'आप (You)',
    senderBot: '🦷 फ्रंट डेस्क AI',
    senderStaff: '👨‍⚕️ क्लिनिक स्टाफ (Live)',
    checkingRecords: 'रिकॉर्ड्स जांचे जा रहे हैं...',
    transparencyBadge: 'क्लिनिक फ़ाइल से उत्तर (Answered from the clinic file)',
    emergencyAlertTitle: 'प्राथमिकता आपातकालीन सहायता (PRIORITY EMERGENCY)',
    inputPlaceholder: 'समय, डॉक्टर और उपचार शुल्क के बारे में पूछें...',
    sendBtnTitle: 'संदेश भेजें (Send)',
    quickReplies: {
      consultation: {
        label: 'परामर्श शुल्क (Consultation Fee)',
        query: 'कंसल्टेशन फीस कितनी है? (How much is consultation?)'
      },
      saturdayHours: {
        label: 'शनिवार का समय (Saturday Hours)',
        query: 'शनिवार को क्लिनिक किस समय खुलता है? (What time do you open on Saturday?)'
      },
      rootCanal: {
        label: 'रूट कैनाल खर्च (Root Canal Cost)',
        query: 'रूट कैनाल का खर्च कितना है? (How much is a root canal?)'
      },
      insurance: {
        label: 'बीमा (Insurance)',
        query: 'क्या आप निवा बूपा (Niva Bupa) बीमा स्वीकार करते हैं?'
      },
      childrenDoctor: {
        label: 'बच्चों के डॉक्टर (Children Doctor)',
        query: 'बच्चों के दांतों के डॉक्टर कौन हैं? (Which doctor sees children?)'
      },
      bookVisit: {
        label: 'अपॉइंटमेंट बुक (Book Visit)',
        query: 'मैं कल सुबह 11 बजे का अपॉइंटमेंट बुक करना चाहता हूँ (Appointment tomorrow at 11am)'
      },
      emergencyContact: {
        label: 'आपातकालीन संपर्क (Emergency Contact)',
        query: 'आपातकालीन नंबर क्या है? (What is the emergency number?)'
      }
    }
  },

  te: {
    name: 'Telugu',
    nativeName: 'తెలుగు',
    clinicName: 'Bright Roots',
    clinicTagline: 'Dental Clinic • Banjara Hills',
    hoursPrefix: 'సోమ–శని',
    emergencyPrefix: 'అత్యవసరం',
    patientChatTab: 'రోగి చాట్ (Patient Chat)',
    staffTab: 'స్టాఫ్ (/staff)',
    welcomeMessage: 'నమస్కారం! బ్రైట్ రూట్స్ డెంటల్ (Bright Roots Dental), బంజారా హిల్స్‌కు స్వాగతం. మా క్లినిక్ వేళలు, వైద్యులు, చికిత్సల ఫీజులు, చిరునామా మరియు బీమా గురించిన వివరాలను నేను మీకు అందించగలను. ఈరోజు మీకు నేను ఎలా సహాయపడగలను?',
    senderYou: 'మీరు (You)',
    senderBot: '🦷 ఫ్రంట్ డెస్క్ AI',
    senderStaff: '👨‍⚕️ క్లినిక్ సిబ్బంది (Live)',
    checkingRecords: 'వివరాలు పరిశీలిస్తున్నాము...',
    transparencyBadge: 'క్లినిక్ ఫైల్ నుండి సమాధానం (Answered from the clinic file)',
    emergencyAlertTitle: 'అత్యవసర చికిత్స విభాగం (PRIORITY EMERGENCY)',
    inputPlaceholder: 'క్లినిక్ వేళలు, డాక్టర్లు మరియు ధరల గురించి అడగండి...',
    sendBtnTitle: 'సందేశం పంపండి (Send)',
    quickReplies: {
      consultation: {
        label: 'కన్సల్టేషన్ ఫీజు (Consultation Fee)',
        query: 'కన్సల్టేషన్ ఫీజు ఎంత? (How much is consultation?)'
      },
      saturdayHours: {
        label: 'శనివారం వేళలు (Saturday Hours)',
        query: 'శనివారం క్లినిక్ ఏ సమయానికి తెరుస్తారు? (What time do you open on Saturday?)'
      },
      rootCanal: {
        label: 'రూట్ కెనాల్ ఖర్చు (Root Canal Cost)',
        query: 'రూట్ కెనాల్ చికిత్స ఖర్చు ఎంత? (How much is a root canal?)'
      },
      insurance: {
        label: 'బీమా (Insurance)',
        query: 'మీరు నివా బూపా (Niva Bupa) ఇన్సూరెన్స్ తీసుకుంటారా?'
      },
      childrenDoctor: {
        label: 'పిల్లల డాక్టర్ (Children Doctor)',
        query: 'పిల్లల స్పెషలిస్ట్ డాక్టర్ ఎవరు? (Which doctor sees children?)'
      },
      bookVisit: {
        label: 'అపాయింట్‌మెంట్ బుక్ (Book Visit)',
        query: 'నేను రేపు ఉదయం 11 గంటలకు అపాయింట్‌మెంట్ బుక్ చేసుకోవాలనుకుంటున్నాను (Appointment tomorrow at 11am)'
      },
      emergencyContact: {
        label: 'అత్యవసర కాంటాక్ట్ (Emergency Contact)',
        query: 'ఎమర్జెన్సీ నంబర్ ఏమిటి? (What is the emergency number?)'
      }
    }
  }
};

export function getTranslation(lang: Language): LanguagePack {
  return translations[lang] || translations.en;
}
