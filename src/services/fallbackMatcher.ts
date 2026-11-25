import { ClinicData, TicketStatus } from '../types';

export interface MatchResult {
  reply: string;
  status: TicketStatus;
  isEmergency: boolean;
  isMedicalAdviceQuery: boolean;
  isUnknown: boolean;
  isBooking: boolean;
  bookingTime?: string;
  language: 'en' | 'hi' | 'te';
}

export function detectLanguage(text: string): 'en' | 'hi' | 'te' {
  const lower = text.toLowerCase();
  
  // Telugu unicode range \u0C00-\u0C7F or transliterated Telugu keywords
  if (
    /[\u0C00-\u0C7F]/.test(text) ||
    /\b(nenu|meeru|panti|noppi|dantalu|samayam|dhara|evaru|ela|cheyyali|chesukundam|unnara|undi|chesukodaniki)\b/.test(lower)
  ) {
    return 'te';
  }
  
  // Hindi unicode range \u0900-\u097F or transliterated Hindi keywords
  if (
    /[\u0900-\u097F]/.test(text) ||
    /\b(kya|hai|kitna|kharch|samay|daant|dard|namaste|shukriya|mujhe|kaise|karna|chahiye)\b/.test(lower)
  ) {
    return 'hi';
  }
  
  return 'en';
}

function extractBookingTime(text: string): string | undefined {
  // English regex
  const enRegex = /\b(\d{1,2}(?::\d{2})?\s*(?:am|pm)|\d{1,2}\s*o'clock|today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)(?:\s+at\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?)?/i;
  const enMatch = text.match(enRegex);
  if (enMatch) return enMatch[0];

  // Telugu date/time extraction (e.g., రేపు ఉదయం 11 గంటలకు, ఈరోజు, శనివారం)
  const teRegex = /(రేపు|ఈరోజు|ఈ రోజు|ఎల్లుండి|సోమవారం|మంగళవారం|బుధవారం|గురువారం|శుక్రవారం|శనివారం|ఆదివారం)(?:\s*(ఉదయం|మధ్యాహ్నం|సాయంత్రం|రాత్రి))?(?:\s*(\d{1,2}(?::\d{2})?)\s*(గంటలకు|am|pm)?)?/i;
  const teMatch = text.match(teRegex);
  if (teMatch && teMatch[0].trim().length > 2) {
    return teMatch[0].trim();
  }

  // Hindi date/time extraction (e.g., कल सुबह 11 बजे, आज, शनिवार)
  const hiRegex = /(कल|आज|परसों|सोमवार|मंगलवार|बुधवार|गुरुवार|शुक्रवार|शनिवार|रविवार)(?:\s*(सुबह|दोपहर|शाम|रात))?(?:\s*(\d{1,2}(?::\d{2})?)\s*(बजे|am|pm)?)?/i;
  const hiMatch = text.match(hiRegex);
  if (hiMatch && hiMatch[0].trim().length > 2) {
    return hiMatch[0].trim();
  }

  return undefined;
}

export function matchClinicQuery(query: string, clinicData: ClinicData): MatchResult {
  const q = query.trim();
  const lower = q.toLowerCase();
  const lang = detectLanguage(q);

  // 1. Jailbreak / Discount / Rule-override protection
  const isJailbreak = 
    lower.includes('ignore') || lower.includes('rule') || lower.includes('bypass') || 
    lower.includes('discount') || lower.includes('off') || lower.includes('concession') ||
    lower.includes('తగ్గింపు') || lower.includes('డిస్కౌంట్') || lower.includes('छूट') || lower.includes('डिस्काउंट');

  if (isJailbreak) {
    let reply = "I cannot offer discounts, change our fixed prices, or alter our policies. Our standard fees are set by Bright Roots Dental.";
    if (lang === 'hi') {
      reply = "मैं आपको कोई छूट नहीं दे सकता या हमारी निश्चित दरों में बदलाव नहीं कर सकता। हमारी दरें ब्राइट रूट्स डेंटल द्वारा निर्धारित हैं।";
    } else if (lang === 'te') {
      reply = "నేను ఎటువంటి తగ్గింపులు ఇవ్వలేను లేదా మా నిర్ణీత ధరలను మార్చలేను. మా ధరలు బ్రైట్ రూట్స్ డెంటల్ పాలసీ ప్రకారం నిర్ణయించబడ్డాయి.";
    }
    return {
      reply,
      status: 'answered',
      isEmergency: false,
      isMedicalAdviceQuery: false,
      isUnknown: false,
      isBooking: false,
      language: lang,
    };
  }

  // 2. Emergency Detection (HIGHEST PRIORITY - COMES FIRST)
  const emergencyKeywords = [
    'emergency', 'urgent', 'urgently', 'critical', 'asap', 'immediate', 'immediately',
    "can't tolerate", 'cannot tolerate', "can't bear", 'cannot bear', 'unbearable', 'excruciating',
    'extreme pain', 'severe pain', 'intolerable',
    'swelling', 'swell', 'swollen', 'breathe', 'breathing', 'heavy bleeding', 'bleeding', 'blood',
    'choking', 'unconscious', 'severe trauma', 'accident', 'knocked out', 'broken jaw',
    // Telugu
    'ఎమర్జెన్సీ', 'అత్యవసరం', 'అత్యవసర', 'అర్జెంట్', 'భరించలేకపోతున్నాను', 'భరించలేని నొప్పి', 'ఆగని నొప్పి',
    'తీవ్రమైన నొప్పి', 'రక్తం', 'రక్తస్రావం', 'శ్వాస', 'వాపు', 'ముఖం వాపు', 'ఆగని రక్తం', 'వెంటనే',
    // Hindi
    'इमरजेंसी', 'आपातकालीन', 'अर्जेंट', 'बर्दाश्त नहीं', 'सहन नहीं', 'असहनीय दर्द', 'अत्यधिक दर्द',
    'खून', 'सूजन', 'सांस', 'गंभीर', 'तुरंत'
  ];

  const isEmergency = emergencyKeywords.some(k => lower.includes(k) || q.includes(k));

  if (isEmergency) {
    const emergencyPhone = clinicData.clinic.emergency_phone; // "98000 00123"
    let reply = `EMERGENCY NUMBER: ${emergencyPhone}. Please call our emergency dental line right away! Severe or unbearable pain, swelling of the face/neck, heavy bleeding, or breathing difficulty requires immediate care. Please call ${emergencyPhone} or visit the nearest emergency hospital immediately. Our front desk has flagged your ticket as URGENT.`;

    if (lang === 'hi') {
      reply = `इमरजेंसी नंबर: ${emergencyPhone} पर तुरंत कॉल करें! असहनीय दर्द, चेहरे या गर्दन में सूजन, अत्यधिक रक्तस्राव अथवा सांस लेने में कठिनाई होने पर तुरंत आपातकालीन सहायता लें। कृपया तुरंत ${emergencyPhone} पर कॉल करें या नजदीकी आपातकालीन अस्पताल जाएं। हमारे फ्रंट डेस्क पर इसके लिए URGENT टिकट दर्ज कर दिया गया है।`;
    } else if (lang === 'te') {
      reply = `అత్యవసర నంబర్: ${emergencyPhone} కు వెంటనే కాల్ చేయండి! భరించలేని నొప్పి, ముఖం లేదా మెడ వాపు, ఆగని రక్తస్రావం లేదా శ్వాస తీసుకోవడంలో ఇబ్బంది ఉంటే వెంటనే అత్యవసర చికిత్స అవసరం. దయచేసి వెంటనే ${emergencyPhone} నంబర్‌కు కాల్ చేయండి లేదా సమీపంలోని ఎమర్జెన్సీ ఆసుపత్రికి వెళ్లండి. మా ఫ్రంట్ డెస్క్ మీ సమస్యను అత్యవసర (URGENT) టికెట్‌గా నమోదు చేసింది.`;
    }

    return {
      reply,
      status: 'urgent',
      isEmergency: true,
      isMedicalAdviceQuery: false,
      isUnknown: false,
      isBooking: false,
      language: lang,
    };
  }

  // 3. Medical Advice / Symptom / Pain Diagnosis Guardrail
  const symptomKeywords = [
    'pain', 'hurts', 'hurt', 'ache', 'aching', 'toothache', 'painkiller', 'paracetamol', 'ibuprofen', 'medicine', 'tablet',
    'cavity', 'pus', 'sensitive', 'sensitivity', 'infection',
    'నొప్పి', 'పంటి నొప్పి', 'బాధ', 'మందు', 'టాబ్లెట్', 'పెయిన్ కిల్లర్', 'పారాసిటమాల్',
    'दर्द', 'दांत दर्द', 'तकलीफ', 'दवा', 'गोली', 'पेनकिलर', 'पैरासिटामोल'
  ];
  const isMedical = symptomKeywords.some(k => lower.includes(k) || q.includes(k));
  if (isMedical) {
    let reply = "I cannot provide medical advice, diagnosis, or prescribe medications. A dentist must examine you in person to evaluate your symptoms properly. Would you like to book an appointment with our dentists at Bright Roots Dental?";
    if (lang === 'hi') {
      reply = "मैं कोई डॉक्टरी सलाह, निदान या दवा की सिफारिश नहीं कर सकता। आपके लक्षणों की जांच के लिए एक दंत चिकित्सक (dentist) द्वारा व्यक्तिगत रूप से देखना आवश्यक है। क्या आप परामर्श के लिए अपॉइंटमेंट बुक करना चाहेंगे?";
    } else if (lang === 'te') {
      reply = "నేను ఎటువంటి వైద్య సలహా, రోగ నిర్ధారణ లేదా మందులను (పెయిన్ కిల్లర్స్ వంటివి) సిఫార్సు చేయలేను. మీ లక్షణాలను పరిశీలించడానికి ఒక దంతవైద్యుడు (dentist) స్వయంగా మిమ్మల్ని పరీక్షించాలి. మీరు బ్రైట్ రూట్స్ డెంటల్‌లో డాక్టర్‌తో అపాయింట్‌మెంట్ బుక్ చేసుకోవాలనుకుంటున్నారా?";
    }
    return {
      reply,
      status: 'answered',
      isEmergency: false,
      isMedicalAdviceQuery: true,
      isUnknown: false,
      isBooking: false,
      language: lang,
    };
  }

  // 4. Booking Request Intake & Procedure Questions
  // Checks for: "appointment", "book", "బుక్", "అపాయింట్‌మెంట్", "చేసుకోవడానికి ఎలా", "చేసుకుందామనుకుంటున్నాను", "बुक", "अपॉइंटमेंट"
  const isBooking = 
    lower.includes('book') || lower.includes('appointment') || lower.includes('slot') || lower.includes('schedule') ||
    q.includes('బుక్') || q.includes('అపాయింట్‌మెంట్') || q.includes('చేసుకుందామనుకుంటున్నాను') || q.includes('చేసుకోవడానికి') ||
    q.includes('बुक') || q.includes('अपॉइंटमेंट') || q.includes('करवाना');

  const bookingTime = extractBookingTime(q);

  if (isBooking) {
    if (bookingTime) {
      // User provided specific time slot
      let reply = `Thank you! I have created an appointment booking request for ${bookingTime}. Our front desk will confirm your appointment shortly. You can also reach us directly at ${clinicData.clinic.phone} or WhatsApp ${clinicData.clinic.whatsapp}.`;
      if (lang === 'hi') {
        reply = `धन्यवाद! मैंने ${bookingTime} के लिए अपॉइंटमेंट बुकिंग टिकट दर्ज कर लिया है। हमारा फ्रंट डेस्क शीघ्र ही आपके समय की पुष्टि करेगा। आप हमें सीधे ${clinicData.clinic.phone} या व्हाट्सएप ${clinicData.clinic.whatsapp} पर भी संपर्क कर सकते हैं।`;
      } else if (lang === 'te') {
        reply = `ధన్యవాదాలు! నేను ${bookingTime} సమయానికి అపాయింట్‌మెంట్ బుకింగ్ అభ్యర్థనను నమోదు చేసాను. మా ఫ్రంట్ డెస్క్ త్వరలోనే మీ స్లాట్‌ను నిర్ధారిస్తుంది. మీరు మమ్మల్ని నేరుగా ${clinicData.clinic.phone} లో లేదా వాట్సాప్ ${clinicData.clinic.whatsapp} లో కూడా సంప్రదించవచ్చు.`;
      }
      return {
        reply,
        status: 'needs human',
        isEmergency: false,
        isMedicalAdviceQuery: false,
        isUnknown: false,
        isBooking: true,
        bookingTime,
        language: lang,
      };
    } else {
      // User asked how to book or expresses general booking intent
      let reply = `To book an appointment, you can call our front desk directly at ${clinicData.clinic.phone} or message on WhatsApp at ${clinicData.clinic.whatsapp}. Alternatively, reply here with your preferred day and time (e.g., tomorrow at 11am), and I will immediately register a booking ticket for our team to confirm!`;
      if (lang === 'hi') {
        reply = `अपॉइंटमेंट बुक करने के लिए आप हमारे फ्रंट डेस्क को सीधे ${clinicData.clinic.phone} पर कॉल कर सकते हैं या व्हाट्सएप ${clinicData.clinic.whatsapp} पर मैसेज कर सकते हैं। अथवा आप जिस दिन और समय आना चाहते हैं (जैसे: कल सुबह 11 बजे) वह यहीं लिख दें, मैं तुरंत आपके लिए बुकिंग टिकट दर्ज कर दूंगा!`;
      } else if (lang === 'te') {
        reply = `అపాయింట్‌మెంట్ బుక్ చేసుకోవడానికి మీరు మా ఫ్రంట్ డెస్క్ ఫోన్ నంబర్ ${clinicData.clinic.phone} కు కాల్ చేయవచ్చు లేదా వాట్సాప్ ${clinicData.clinic.whatsapp} లో సందేశం పంపవచ్చు. లేదా మీరు రావాలనుకుంటున్న రోజు మరియు సమయాన్ని (ఉదాహరణకు: రేపు ఉదయం 11:00 గంటలకు) ఇక్కడే తెలియజేస్తే, నేను వెంటనే మీ కోసం బుకింగ్ టికెట్ నమోదు చేస్తాను, మా సిబ్బంది మీకు కన్ఫర్మ్ చేస్తారు!`;
      }
      return {
        reply,
        status: 'needs human',
        isEmergency: false,
        isMedicalAdviceQuery: false,
        isUnknown: false,
        isBooking: true,
        language: lang,
      };
    }
  }

  // 5. Operating Hours & Timing Queries
  const timingKeywords = [
    'time', 'timing', 'timings', 'open', 'close', 'opening', 'closing', 'hour', 'hours', 'sunday', 'saturday', 'lunch', 'holiday',
    'సమయం', 'సమయాలు', 'వేళలు', 'ఎప్పుడు', 'ఎప్పటినుండి', 'తెరుస్తారు', 'ఓపెన్', 'మూసివేస్తారు', 'క్లోజ్', 'శనివారం', 'ఆదివారం', 'సోమవారం', 'లంచ్', 'సెలవు',
    'समय', 'खुलता', 'बंद', 'शनिवार', 'रविवार', 'लंच'
  ];
  if (timingKeywords.some(k => lower.includes(k) || q.includes(k))) {
    const satHours = clinicData.hours.monday_to_saturday; // "9:00 am to 8:00 pm"
    const sunHours = clinicData.hours.sunday;             // "10:00 am to 2:00 pm, emergencies only"
    const lunch = clinicData.hours.lunch_break;

    if (lang === 'te') {
      let reply = `బ్రైట్ రూట్స్ డెంటల్ పనివేళలు: సోమవారం నుండి శనివారం వరకు ${satHours}. ఆదివారం: ${sunHours}. లంచ్ బ్రేక్: ${lunch}.`;
      if (q.includes('శనివారం') || lower.includes('saturday')) {
        reply = `శనివారం నాడు బ్రైట్ రూట్స్ డెంటల్ ${satHours} వరకు తెరిచి ఉంటుంది.`;
      } else if (q.includes('ఆదివారం') || lower.includes('sunday')) {
        reply = `ఆదివారం నాడు క్లినిక్ ${sunHours} వరకు మాత్రమే తెరిచి ఉంటుంది.`;
      }
      return {
        reply,
        status: 'answered',
        isEmergency: false,
        isMedicalAdviceQuery: false,
        isUnknown: false,
        isBooking: false,
        language: lang,
      };
    } else if (lang === 'hi') {
      let reply = `ब्राइट रूट्स डेंटल सोमवार से शनिवार ${satHours} तक खुला रहता है। रविवार को ${sunHours}। लंच ब्रेक ${lunch} है।`;
      if (lower.includes('saturday') || q.includes('शनिवार')) {
        reply = `शनिवार को ब्राइट रूट्स डेंटल ${satHours} तक खुला रहता है।`;
      } else if (lower.includes('sunday') || q.includes('रविवार')) {
        reply = `रविवार को क्लीनिक ${sunHours} तक खुला रहता है।`;
      }
      return {
        reply,
        status: 'answered',
        isEmergency: false,
        isMedicalAdviceQuery: false,
        isUnknown: false,
        isBooking: false,
        language: lang,
      };
    } else {
      let reply = `Bright Roots Dental is open Monday to Saturday from ${satHours}. On Sunday, hours are ${sunHours}. Lunch break is from ${lunch}.`;
      if (lower.includes('saturday') && !lower.includes('sunday')) {
        reply = `On Saturday, Bright Roots Dental is open from ${satHours}.`;
      } else if (lower.includes('sunday')) {
        reply = `On Sunday, we are open from ${sunHours}.`;
      }
      return {
        reply,
        status: 'answered',
        isEmergency: false,
        isMedicalAdviceQuery: false,
        isUnknown: false,
        isBooking: false,
        language: lang,
      };
    }
  }

  // 6. Pricing & Specific Services Queries
  // Check Root Canal
  if (
    lower.includes('root canal') || lower.includes('rct') ||
    q.includes('రూట్ కెనాల్') || q.includes('రూట్ కెనాల్స్') ||
    q.includes('रूट कैनाल')
  ) {
    const rct = clinicData.services.find(s => s.name.toLowerCase().includes('root canal'));
    const price = rct ? rct.price : "Rs 6,500 to Rs 9,000";
    let reply = `Root canal treatment costs ${price} at Bright Roots Dental (usually two visits).`;
    if (lang === 'te') {
      reply = `బ్రైట్ రూట్స్ డెంటల్‌లో రూట్ కెనాల్ చికిత్స ఖర్చు ${price} (సాధారణంగా రెండు విజిట్లు అవసరం).`;
    } else if (lang === 'hi') {
      reply = `ब्राइट रूट्स डेंटल में रूट कैनाल ट्रीटमेंट का खर्च ${price} है (आमतौर पर दो बार आना होता है)।`;
    }
    return {
      reply,
      status: 'answered',
      isEmergency: false,
      isMedicalAdviceQuery: false,
      isUnknown: false,
      isBooking: false,
      language: lang,
    };
  }

  // Check Cleaning / Scaling
  if (
    lower.includes('clean') || lower.includes('scaling') || lower.includes('polishing') ||
    q.includes('క్లీనింగ్') || q.includes('శుభ్రం') || q.includes('స్కేలింగ్') ||
    q.includes('सफाई') || q.includes('क्लीनिंग')
  ) {
    const service = clinicData.services.find(s => s.name.toLowerCase().includes('cleaning'));
    const price = service ? service.price : "Rs 1,200";
    let reply = `Teeth cleaning (scaling and polishing) is ${price} (takes approx 45 minutes).`;
    if (lang === 'te') {
      reply = `టీత్ క్లీనింగ్ (పళ్ళు శుభ్రపరచడం & పాలిషింగ్) ఖర్చు ${price} (సుమారు 45 నిమిషాలు పడుతుంది).`;
    } else if (lang === 'hi') {
      reply = `दांतों की सफाई (स्केलिंग और पॉलिशिंग) का खर्च ${price} है (लगभग 45 मिनट का समय लगता है)।`;
    }
    return {
      reply,
      status: 'answered',
      isEmergency: false,
      isMedicalAdviceQuery: false,
      isUnknown: false,
      isBooking: false,
      language: lang,
    };
  }

  // Check Consultation
  if (
    lower.includes('consultation') || lower.includes('checkup') || lower.includes('check up') || lower.includes('fee') ||
    q.includes('కన్సల్టేషన్') || q.includes('పరిశీలన') || q.includes('ఫీజు') || q.includes('చూపించుకోవడానికి') ||
    q.includes('परामर्श') || q.includes('फीस') || q.includes('कंसल्टेशन')
  ) {
    const service = clinicData.services.find(s => s.name.toLowerCase().includes('consultation'));
    const price = service ? service.price : "Rs 400";
    let reply = `Consultation fee is ${price}. (Adjusted against treatment if you start within 7 days).`;
    if (lang === 'te') {
      reply = `కన్సల్టేషన్ ఫీజు ${price}. (మీరు 7 రోజుల్లో చికిత్స ప్రారంభిస్తే ఈ ఫీజు చికిత్స ఖర్చులో సర్దుబాటు చేయబడుతుంది).`;
    } else if (lang === 'hi') {
      reply = `कंसल्टेशन फीस ${price} है। (यदि आप 7 दिनों के भीतर इलाज शुरू करते हैं तो यह फीस इलाज में समायोजित कर दी जाएगी)।`;
    }
    return {
      reply,
      status: 'answered',
      isEmergency: false,
      isMedicalAdviceQuery: false,
      isUnknown: false,
      isBooking: false,
      language: lang,
    };
  }

  // Check Braces / Aligners
  if (
    lower.includes('brace') || lower.includes('braces') || lower.includes('aligner') || lower.includes('aligners') ||
    q.includes('బ్రేసెస్') || q.includes('క్లిప్పులు') || q.includes('క్లిప్స్') || q.includes('అలైన్ర్స్') ||
    q.includes('ब्रेसिज़') || q.includes('क्लिप')
  ) {
    const service = clinicData.services.find(s => s.name.toLowerCase().includes('braces'));
    const price = service ? service.price : "Rs 35,000 to Rs 60,000";
    let reply = `Braces (metal) cost ${price}. Doctor decides after a checkup. We also offer 6 months no-cost EMI.`;
    if (lang === 'te') {
      reply = `క్లిప్పులు/బ్రేసెస్ (మెటల్) ఖర్చు ${price}. డాక్టర్ పరీక్షించిన తర్వాత ఖచ్చితమైన ప్లాన్ నిర్ణయిస్తారు. బ్రేసెస్‌పై 6 నెలల నో-కాస్ట్ ఈఎంఐ (No-cost EMI) కూడా ఉంది.`;
    } else if (lang === 'hi') {
      reply = `दांतों के ब्रेसिज़ (मेटल) का खर्च ${price} है। डॉक्टर जांच के बाद निर्णय लेते हैं। इस पर 6 महीने की नो-कॉस्ट ईएमआई सुविधा भी उपलब्ध है।`;
    }
    return {
      reply,
      status: 'answered',
      isEmergency: false,
      isMedicalAdviceQuery: false,
      isUnknown: false,
      isBooking: false,
      language: lang,
    };
  }

  // Check Filling
  if (
    lower.includes('filling') || lower.includes('fill') ||
    q.includes('ఫిల్లింగ్') || q.includes('పిప్పి పూడ్చడం') ||
    q.includes('फिलिंग')
  ) {
    const service = clinicData.services.find(s => s.name.toLowerCase().includes('filling'));
    const price = service?.price || 'Rs 1,500 to Rs 3,000';
    let reply = `Tooth filling is ${price} depending on the tooth and material.`;
    if (lang === 'te') {
      reply = `టూత్ ఫిల్లింగ్ ఖర్చు ${price} (పంటి స్థానం మరియు మెటీరియల్ ఆధారంగా ఉంటుంది).`;
    } else if (lang === 'hi') {
      reply = `टूथ फिलिंग का खर्च ${price} है (दांत और सामग्री पर निर्भर करता है)।`;
    }
    return {
      reply,
      status: 'answered',
      isEmergency: false,
      isMedicalAdviceQuery: false,
      isUnknown: false,
      isBooking: false,
      language: lang,
    };
  }

  // Check Implant
  if (lower.includes('implant') || q.includes('ఇంప్లాంట్') || q.includes('ఇంప్లాంట్లు') || q.includes('इंप्लांट')) {
    const service = clinicData.services.find(s => s.name.toLowerCase().includes('implant'));
    const price = service?.price || 'Rs 28,000 per tooth';
    let reply = `Dental implant is ${price} (crown cost is separate).`;
    if (lang === 'te') {
      reply = `డెంటల్ ఇంప్లాంట్ ఖర్చు ఒక పంటికి ${price} (క్రౌన్ ఖర్చు వేరుగా ఉంటుంది).`;
    } else if (lang === 'hi') {
      reply = `डेंटल इंप्लांट का खर्च प्रति दांत ${price} है (क्राउन की लागत अलग है)।`;
    }
    return {
      reply,
      status: 'answered',
      isEmergency: false,
      isMedicalAdviceQuery: false,
      isUnknown: false,
      isBooking: false,
      language: lang,
    };
  }

  // Check Whitening
  if (lower.includes('whiten') || lower.includes('whitening') || q.includes('వైట్నింగ్') || q.includes('తెల్లబడటం') || q.includes('व्हाइटनिंग')) {
    const service = clinicData.services.find(s => s.name.toLowerCase().includes('whitening'));
    const price = service?.price || 'Rs 8,000';
    let reply = `Teeth whitening is ${price} (duration: approx 60 minutes).`;
    if (lang === 'te') {
      reply = `టీత్ వైట్నింగ్ ఖర్చు ${price} (సుమారు 60 నిమిషాల సమయం పడుతుంది).`;
    } else if (lang === 'hi') {
      reply = `टीथ व्हाइटनिंग का खर्च ${price} है (समय: लगभग 60 मिनट)।`;
    }
    return {
      reply,
      status: 'answered',
      isEmergency: false,
      isMedicalAdviceQuery: false,
      isUnknown: false,
      isBooking: false,
      language: lang,
    };
  }

  // Check X-ray
  if (lower.includes('x-ray') || lower.includes('xray') || q.includes('ఎక్స్-రే') || q.includes('ఎక్స్రే') || q.includes('एक्सरे')) {
    const service = clinicData.services.find(s => s.name.toLowerCase().includes('x-ray'));
    const price = service?.price || 'Rs 300';
    let reply = `Single X-ray is ${price} (free if you already have one from the last 3 months).`;
    if (lang === 'te') {
      reply = `సింగిల్ ఎక్స్-రే ఖర్చు ${price} (గత 3 నెలల్లో తీసిన పాత ఎక్స్-రే మీ వద్ద ఉంటే ఉచితం).`;
    } else if (lang === 'hi') {
      reply = `सिंगल एक्स-रे की फीस ${price} है (यदि आपके पास पिछले 3 महीनों का एक्स-रे है तो निःशुल्क)।`;
    }
    return {
      reply,
      status: 'answered',
      isEmergency: false,
      isMedicalAdviceQuery: false,
      isUnknown: false,
      isBooking: false,
      language: lang,
    };
  }

  // 7. Doctors / Specialists Queries
  const doctorKeywords = [
    'doctor', 'dentist', 'specialist', 'child', 'children', 'pediatric', 'paediatric', 'orthodontist',
    'డాక్టర్', 'డాక్టర్లు', 'దంత వైద్యుడు', 'పిల్లల', 'పిల్లలు', 'స్నేహా రావు', 'మీరా నాయర్', 'ఇమ్రాన్ ఖురేషి',
    'डॉक्टर', 'डेंटिस्ट', 'बच्चों', 'दांतों के डॉक्टर'
  ];
  if (doctorKeywords.some(k => lower.includes(k) || q.includes(k))) {
    // Child specialist check
    if (
      lower.includes('child') || lower.includes('children') || lower.includes('kid') || lower.includes('pediatric') || lower.includes('paediatric') || lower.includes('14') ||
      q.includes('పిల్లలు') || q.includes('పిల్లల') || q.includes('స్నేహా') ||
      q.includes('बच्चों') || q.includes('बच्चे')
    ) {
      const doc = clinicData.doctors.find(d => d.role.toLowerCase().includes('paediatric') || d.role.toLowerCase().includes('children')) || {
        name: "Dr. Sneha Rao",
        role: "Paediatric dentist, children under 14",
        days: "Saturday only"
      };
      let reply = `${doc.name} sees children (${doc.role}) on ${doc.days}. A parent must be present.`;
      if (lang === 'te') {
        reply = `పిల్లల కోసం (${doc.role}): డాక్టర్ స్నేహా రావు (${doc.name}) గారు ${doc.days} (శనివారం మాత్రమే) అందుబాటులో ఉంటారు. తల్లిదండ్రులు తప్పనిసరిగా ఉండాలి.`;
      } else if (lang === 'hi') {
        reply = `बच्चों के लिए: डॉ. स्नेहा राव (${doc.name}) केवल शनिवार (${doc.days}) को उपलब्ध रहती हैं। माता-पिता का साथ होना अनिवार्य है।`;
      }
      return {
        reply,
        status: 'answered',
        isEmergency: false,
        isMedicalAdviceQuery: false,
        isUnknown: false,
        isBooking: false,
        language: lang,
      };
    }

    // Orthodontist check
    if (lower.includes('orthodontist') || lower.includes('align') || lower.includes('qureshi') || q.includes('ఆర్థోడాంటిస్ట్') || q.includes('ఇమ్రాన్')) {
      const doc = clinicData.doctors.find(d => d.name.toLowerCase().includes('imran') || d.role.toLowerCase().includes('orthodontist'));
      let reply = `${doc?.name || 'Dr. Imran Qureshi'} is our ${doc?.role || 'Orthodontist, braces and aligners'} available on ${doc?.days || 'Tuesday, Thursday, Saturday'}.`;
      if (lang === 'te') {
        reply = `డాక్టర్ ఇమ్రాన్ ఖురేషి (${doc?.name || 'Dr. Imran Qureshi'}): ${doc?.role || 'ఆర్థోడాంటిస్ట్, బ్రేసెస్ మరియు అలైన్ర్స్ నిపుణులు'}, ${doc?.days || 'మంగళవారం, గురువారం, శనివారం'} లలో అందుబాటులో ఉంటారు.`;
      }
      return {
        reply,
        status: 'answered',
        isEmergency: false,
        isMedicalAdviceQuery: false,
        isUnknown: false,
        isBooking: false,
        language: lang,
      };
    }

    // Lead dentist check
    if (lower.includes('lead') || lower.includes('meera') || lower.includes('nair') || q.includes('మీరా') || q.includes('నాయర్')) {
      const doc = clinicData.doctors.find(d => d.name.toLowerCase().includes('meera'));
      let reply = `${doc?.name || 'Dr. Meera Nair'} is our ${doc?.role || 'Lead dentist, root canals and fillings'} available on ${doc?.days || 'Monday to Saturday'}.`;
      if (lang === 'te') {
        reply = `డాక్టర్ మీరా నాయర్ (${doc?.name || 'Dr. Meera Nair'}): ${doc?.role || 'ప్రధాన దంతవైద్యురాలు, రూట్ కెనాల్స్ మరియు ఫిల్లింగ్స్ నిపుణులు'}, ${doc?.days || 'సోమవారం నుండి శనివారం వరకు'} అందుబాటులో ఉంటారు.`;
      }
      return {
        reply,
        status: 'answered',
        isEmergency: false,
        isMedicalAdviceQuery: false,
        isUnknown: false,
        isBooking: false,
        language: lang,
      };
    }

    // General doctor list
    if (lang === 'te') {
      const list = clinicData.doctors.map(d => `${d.name} (${d.role} - ${d.days})`).join("; ");
      return {
        reply: `బ్రైట్ రూట్స్ డెంటల్ వైద్యులు: ${list}.`,
        status: 'answered',
        isEmergency: false,
        isMedicalAdviceQuery: false,
        isUnknown: false,
        isBooking: false,
        language: lang,
      };
    } else {
      const docList = clinicData.doctors.map(d => `${d.name} (${d.role}, ${d.days})`).join("; ");
      return {
        reply: `Our doctors at Bright Roots Dental: ${docList}.`,
        status: 'answered',
        isEmergency: false,
        isMedicalAdviceQuery: false,
        isUnknown: false,
        isBooking: false,
        language: lang,
      };
    }
  }

  // 8. Insurance & Payment Policies
  const insuranceKeywords = [
    'insurance', 'niva bupa', 'star health', 'cashless', 'claim',
    'ఇన్సూరెన్స్', 'బీమా', 'క్యాష్‌లెస్', 'స్టార్ హెల్త్', 'నివా బూపా', 'క్లెయిమ్',
    'बीमा', 'इंश्योरेंस', 'कैशलेस'
  ];
  if (insuranceKeywords.some(k => lower.includes(k) || q.includes(k))) {
    const policy = clinicData.policies.insurance || "Cashless with Star Health and Niva Bupa. For other insurers we give a bill you can claim.";
    let reply = `Insurance policy: We offer ${policy}`;
    if (lang === 'te') {
      reply = `ఇన్సూరెన్స్ పాలసీ: స్టార్ హెల్త్ (Star Health) మరియు నివా బూపా (Niva Bupa) లతో మా వద్ద క్యాష్‌లెస్ (cashless) సదుపాయం ఉంది. ఇతర ఇన్సూరెన్స్‌లకు మీరు క్లెయిమ్ చేసుకోవడానికి బిల్లు అందజేస్తాము.`;
    } else if (lang === 'hi') {
      reply = `बीमा सुविधा: स्टार हेल्थ (Star Health) और निवा बूपा (Niva Bupa) के साथ कैशलेस सुविधा उपलब्ध है। अन्य बीमा के लिए हम बिल प्रदान करते हैं जिसे आप क्लेम कर सकते हैं।`;
    }
    return {
      reply,
      status: 'answered',
      isEmergency: false,
      isMedicalAdviceQuery: false,
      isUnknown: false,
      isBooking: false,
      language: lang,
    };
  }

  // Payment / EMI
  if (lower.includes('payment') || lower.includes('upi') || lower.includes('card') || lower.includes('cash') || lower.includes('emi') || q.includes('ఈఎంఐ') || q.includes('చెల్లింపు') || q.includes('ईएमआई')) {
    let reply = `Payment methods: ${clinicData.policies.payment} We also provide ${clinicData.policies.emi}`;
    if (lang === 'te') {
      reply = `చెల్లింపు విధానాలు: యూపీఐ (UPI), డెబిట్ మరియు క్రెడిట్ కార్డులు, మరియు నగదు (Cash). బ్రేసెస్ మరియు ఇంప్లాంట్‌లపై 6 నెలల నో-కాస్ట్ ఈఎంఐ (No-cost EMI) కూడా ఉంది.`;
    }
    return {
      reply,
      status: 'answered',
      isEmergency: false,
      isMedicalAdviceQuery: false,
      isUnknown: false,
      isBooking: false,
      language: lang,
    };
  }

  // 9. Location, Address, Parking
  const locationKeywords = [
    'where', 'address', 'location', 'landmark', 'road', 'banjara',
    'ఎక్కడ', 'చిరునామా', 'లొకేషన్', 'ఎలా రావాలి', 'బంజారా హిల్స్', 'రోడ్ నం',
    'कहाँ', 'पता', 'स्थान', 'बंजारा'
  ];
  if (locationKeywords.some(k => lower.includes(k) || q.includes(k))) {
    let reply = `${clinicData.clinic.name} is located at ${clinicData.clinic.address} (${clinicData.clinic.landmark}). Phone: ${clinicData.clinic.phone}.`;
    if (lang === 'te') {
      reply = `క్లినిక్ చిరునామా: ${clinicData.clinic.name}, ${clinicData.clinic.address} (${clinicData.clinic.landmark}). ఫోన్: ${clinicData.clinic.phone}.`;
    } else if (lang === 'hi') {
      reply = `क्लीनिक का पता: ${clinicData.clinic.name}, ${clinicData.clinic.address} (${clinicData.clinic.landmark}). फोन: ${clinicData.clinic.phone}.`;
    }
    return {
      reply,
      status: 'answered',
      isEmergency: false,
      isMedicalAdviceQuery: false,
      isUnknown: false,
      isBooking: false,
      language: lang,
    };
  }

  if (lower.includes('parking') || lower.includes('car') || lower.includes('park') || q.includes('పార్కింగ్') || q.includes('కారు') || q.includes('पार्किंग')) {
    let reply = `Parking: ${clinicData.clinic.parking}.`;
    if (lang === 'te') {
      reply = `పార్కింగ్ సదుపాయం: క్లినిక్ స్టాంప్‌తో బేస్‌మెంట్‌లో 2 గంటల పాటు ఉచిత పార్కింగ్ లభిస్తుంది.`;
    }
    return {
      reply,
      status: 'answered',
      isEmergency: false,
      isMedicalAdviceQuery: false,
      isUnknown: false,
      isBooking: false,
      language: lang,
    };
  }

  // Cancellation policy
  if (lower.includes('cancel') || lower.includes('reschedule') || lower.includes('move') || q.includes('రద్దు') || q.includes('కాన్సిల్')) {
    let reply = `Appointment cancellation policy: ${clinicData.policies.appointments}`;
    if (lang === 'te') {
      reply = `అపాయింట్‌మెంట్ రద్దు పాలసీ: ${clinicData.policies.appointments}`;
    }
    return {
      reply,
      status: 'answered',
      isEmergency: false,
      isMedicalAdviceQuery: false,
      isUnknown: false,
      isBooking: false,
      language: lang,
    };
  }

  // 10. UNKNOWN QUERY: Not in clinic file! (e.g. "Do you do Invisalign?")
  let unknownReply = "I am not sure about this as it is not listed in our clinic file. I have opened a ticket for our front desk team, and someone will call back within 2 working hours.";
  if (lang === 'hi') {
    unknownReply = "मुझे इसकी निश्चित जानकारी नहीं है क्योंकि यह हमारी क्लिनिक फाइल में दर्ज नहीं है। मैंने हमारे फ्रंट डेस्क के लिए एक टिकट खोल दिया है, और कोई आपको 2 कार्य घंटों के भीतर कॉल करेगा।";
  } else if (lang === 'te') {
    unknownReply = "మా క్లినిక్ రికార్డులలో ఇది లేనందున నాకు ఖచ్చితంగా తెలియదు. నేను మా ఫ్రంట్ డెస్క్ కోసం టికెట్ తెరిచాను, 2 పని గంటల్లో ఎవరైనా మీకు కాల్ చేస్తారు.";
  }

  return {
    reply: unknownReply,
    status: 'needs human',
    isEmergency: false,
    isMedicalAdviceQuery: false,
    isUnknown: true,
    isBooking: false,
    language: lang,
  };
}
