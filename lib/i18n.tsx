import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { storage } from '@/lib/storage';

export type Lang = 'hi' | 'en';

const LANG_KEY = 'rider_lang';

/**
 * Every user-visible string in the app, Hindi first.
 *
 * Hindi is the default because riders are Hindi-first; English is the opt-out,
 * toggled from the login screen and the home header. Hindi copy is written the
 * way riders actually speak — Devanagari with the English loanwords they
 * already use (KYC, document, update) rather than forced Sanskritised
 * translations nobody says out loud.
 *
 * Interpolation: {name} placeholders, filled from the vars argument of t().
 */
const S = {
  // ── common ────────────────────────────────────────────────────────────────
  'common.loading': { hi: 'लोड हो रहा है…', en: 'Loading…' },
  'common.retry': { hi: 'फिर कोशिश करें', en: 'Try again' },
  'common.cancel': { hi: 'रहने दें', en: 'Cancel' },
  'common.yes': { hi: 'हाँ', en: 'Yes' },
  'common.no': { hi: 'नहीं', en: 'No' },
  'common.logout': { hi: 'लॉगआउट', en: 'Logout' },
  'common.logoutConfirm': { hi: 'लॉगआउट करें?', en: 'Log out?' },
  'common.continue': { hi: 'आगे बढ़ें', en: 'Continue' },
  'common.submit': { hi: 'भेजें', en: 'Submit' },
  'common.close': { hi: 'बंद करें', en: 'Close' },
  'common.somethingWrong': { hi: 'कुछ गड़बड़ हो गई', en: 'Something went wrong' },
  'common.noInternet': { hi: 'इंटरनेट नहीं चल रहा', en: 'No internet connection' },

  // ── language toggle ───────────────────────────────────────────────────────
  'lang.hindi': { hi: 'हिंदी', en: 'हिंदी' },
  'lang.english': { hi: 'English', en: 'English' },
  'lang.label': { hi: 'भाषा', en: 'Language' },

  // ── login ─────────────────────────────────────────────────────────────────
  'login.title': { hi: 'MOVEGRID Rider', en: 'MOVEGRID Rider' },
  'login.subtitle': {
    hi: 'अपना mobile number डालें — OTP आएगा',
    en: 'Enter your mobile number — we’ll send an OTP',
  },
  'login.mobileLabel': { hi: 'Mobile number', en: 'Mobile number' },
  'login.sendOtp': { hi: 'OTP भेजें', en: 'Send OTP' },
  'login.otpLabel': { hi: 'OTP डालें', en: 'Enter OTP' },
  'login.otpSentTo': { hi: '{mobile} पर OTP भेजा गया', en: 'OTP sent to {mobile}' },
  'login.verify': { hi: 'Verify करें', en: 'Verify' },
  'login.changeNumber': { hi: 'नंबर बदलें', en: 'Change number' },
  'login.invalidMobile': { hi: 'पूरा 10 अंक का नंबर डालें', en: 'Enter a full 10-digit number' },
  'login.invalidOtp': { hi: 'OTP गलत है', en: 'That OTP is not right' },
  'login.tagline': { hi: 'आपकी गाड़ी, आपका हिसाब', en: 'Your scooter, your account' },
  'login.sessionExpired': {
    hi: 'Session खत्म हो गया — दोबारा लॉगिन करें',
    en: 'Your session ended — please log in again',
  },
  'login.newAccount': {
    hi: '✨ इस number से नया account बनेगा — OTP के बाद KYC पूरा करें',
    en: '✨ A new account will be created for this number — complete KYC after the OTP',
  },
  'login.testerPick': {
    hi: '🧪 Tester mode — किस rider की app देखनी है?',
    en: '🧪 Tester mode — whose app do you want to see?',
  },

  // ── city step ─────────────────────────────────────────────────────────────
  'city.title': { hi: 'आप किस शहर में हैं?', en: 'Which city are you in?' },
  'city.subtitle': {
    hi: 'इससे हम आपको सही hub दिखाएँगे',
    en: 'So we can show you the right hub',
  },
  'city.comingSoon': {
    hi: 'बाकी शहरों में MOVEGRID जल्द आ रहा है',
    en: 'MOVEGRID is coming to more cities soon',
  },
  'city.saveFailed': { hi: 'शहर save नहीं हो पाया', en: 'Could not save your city' },

  // ── home: onboarding tracker ──────────────────────────────────────────────
  'home.greeting': { hi: 'नमस्ते, {name}', en: 'Hello, {name}' },
  'onb.accountCreated': { hi: 'Account बन गया', en: 'Account created' },
  'onb.completeKyc': { hi: 'KYC पूरा करें', en: 'Complete your KYC' },
  'onb.completeKycSub': { hi: 'नाम, पता और documents', en: 'Name, address and documents' },
  'onb.kycDone': { hi: 'Documents जमा हो गए', en: 'Documents submitted' },
  'onb.verification': { hi: 'Verification', en: 'Verification' },
  'onb.verificationWaiting': {
    hi: 'टीम check कर रही है — आम तौर पर उसी दिन',
    en: 'Our team is checking — usually the same day',
  },
  'onb.verificationDone': { hi: 'Documents verify हो गए', en: 'Documents verified' },
  'onb.verificationLater': { hi: 'KYC के बाद', en: 'After KYC' },
  'onb.visitHub': { hi: 'Hub आएँ — गाड़ी तैयार', en: 'Come to the hub — your scooter is ready' },
  'onb.visitHubLater': { hi: 'Verification के बाद', en: 'After verification' },
  'onb.startKyc': { hi: 'KYC शुरू करें', en: 'Start KYC' },
  'onb.readyMessage': {
    hi: 'Documents verify हो गए! {hub} hub आकर अपनी गाड़ी ले जाएँ. साथ लाएँ: original Aadhaar.',
    en: 'Documents verified! Come to {hub} hub to collect your scooter. Bring your original Aadhaar.',
  },

  // ── home: KYC-pending hub card ────────────────────────────────────────────
  'hub.pendingTitle': { hi: 'आपका KYC बाकी है', en: 'Your KYC is pending' },
  'hub.pendingBody': {
    hi: 'Hub आकर KYC करा लें — 10 मिनट लगते हैं. या नीचे से खुद कर लें.',
    en: 'Come to the hub and we’ll do your KYC — it takes 10 minutes. Or do it yourself below.',
  },
  'hub.yourHub': { hi: 'आपका hub', en: 'Your hub' },
  'hub.openMaps': { hi: 'Map पर देखें', en: 'Open in Maps' },
  'hub.call': { hi: '{name} को call करें', en: 'Call {name}' },
  'hub.callGeneric': { hi: 'Hub पर call करें', en: 'Call the hub' },
  'hub.selfKyc': { hi: 'मैं खुद KYC करूँगा', en: 'I’ll do my KYC myself' },
  'hub.viewScooters': { hi: 'हमारी scooters देखें', en: 'See our scooters' },
  'hub.noneYet': {
    hi: 'अभी hub तय नहीं हुआ',
    en: 'No hub set yet',
  },

  // ── scooters ──────────────────────────────────────────────────────────────
  'scooters.title': { hi: 'हमारी scooters', en: 'Our scooters' },
  'scooters.subtitle': {
    hi: 'Rent हफ्ते के हिसाब से, पहले जमा करना होता है',
    en: 'Rent is weekly, paid in advance',
  },
  'scooters.perDay': { hi: '/दिन', en: '/day' },
  'scooters.perWeek': { hi: '/हफ्ता', en: '/week' },
  'scooters.want': { hi: 'मुझे यह चाहिए', en: 'I want this one' },
  'scooters.wanted': { hi: 'आपने यह चुना है ✓', en: 'You chose this ✓' },
  'scooters.changeChoice': { hi: 'बदलें', en: 'Change' },
  'scooters.highSpeed': {
    hi: 'High-speed — इसके लिए DL और PAN जरूरी है',
    en: 'High-speed — needs your DL and PAN',
  },
  'scooters.savedToast': {
    hi: 'टीम को बता दिया गया. गाड़ी मिलने की गारंटी नहीं — stock पर निर्भर है.',
    en: 'We’ve told the team. Not a guarantee — it depends on stock.',
  },
  'scooters.note': {
    hi: 'यह सिर्फ आपकी पसंद है. गाड़ी hub पर stock के हिसाब से मिलेगी.',
    en: 'This is your preference only. The actual scooter depends on stock at the hub.',
  },

  // ── tickets ───────────────────────────────────────────────────────────────
  'ticket.fab': { hi: 'मदद चाहिए', en: 'Need help' },
  'ticket.title': { hi: 'अपनी बात लिखें', en: 'Tell us what’s wrong' },
  'ticket.placeholder': {
    hi: 'क्या दिक्कत है? जितना बता सकें लिखें.',
    en: 'What’s the problem? Tell us as much as you can.',
  },
  'ticket.addPhoto': { hi: 'Photo लगाएँ', en: 'Add a photo' },
  'ticket.addVideo': { hi: 'Video लगाएँ (10 सेकंड)', en: 'Add a video (10 sec)' },
  'ticket.remove': { hi: 'हटाएँ', en: 'Remove' },
  'ticket.send': { hi: 'भेजें', en: 'Send' },
  'ticket.sent': { hi: 'भेज दिया गया — टीम देख रही है', en: 'Sent — the team is on it' },
  'ticket.empty': { hi: 'कुछ लिखें', en: 'Write something first' },
  'ticket.mine': { hi: 'आपकी बातें', en: 'Your messages' },
  'ticket.statusOpen': { hi: 'टीम देख रही है', en: 'With the team' },
  'ticket.statusResolved': { hi: 'हो गया', en: 'Resolved' },
  'ticket.reply': { hi: 'टीम का जवाब', en: 'Team’s reply' },
  'ticket.uploadFailed': {
    hi: 'File upload नहीं हो पाई — बिना file भी भेज सकते हैं',
    en: 'Upload failed — you can still send without it',
  },

  // ── rent / my rent ────────────────────────────────────────────────────────
  'rent.outstanding': { hi: 'बकाया', en: 'Outstanding' },
  'rent.allPaid': { hi: 'कोई बकाया नहीं', en: 'All paid up' },
  'rent.dueDate': { hi: 'Due date', en: 'Due date' },
  'rent.nextDue': { hi: 'अगला due date', en: 'Next due' },
  'rent.payNow': { hi: 'अभी भुगतान करें', en: 'Pay now' },
  'rent.paidThrough': { hi: 'कब तक paid', en: 'Paid through' },
  'rent.dailyRate': { hi: 'रोज़ का rent', en: 'Daily rate' },
  'rent.creditBalance': { hi: 'Credit बचा हुआ', en: 'Credit balance' },
  'rent.creditAdjusted': { hi: '{amount} credit adjust हुआ', en: '{amount} credit adjusted' },
  'rent.claimInReview': {
    hi: '{amount} का payment review में है — verify होते ही यहाँ adjust हो जाएगा.',
    en: '{amount} payment is under review — it’ll adjust here once verified.',
  },
  'rent.yourScooter': { hi: 'आपकी गाड़ी', en: 'Your scooter' },
  'rent.since': { hi: 'आपके पास कब से', en: 'With you since' },
  'rent.lastPayment': { hi: 'पिछला payment', en: 'Last payment' },

  // ── documents ─────────────────────────────────────────────────────────────
  'docs.title': { hi: 'Documents', en: 'Documents' },
  'docs.verifyPending': { hi: 'verify बाकी', en: 'awaiting check' },
  'docs.readyHighSpeed': { hi: 'High-speed गाड़ी के लिए तैयार ✓', en: 'Ready for a high-speed scooter ✓' },
  'docs.needHighSpeed': {
    hi: 'High-speed गाड़ी के लिए PAN + DL upload करें',
    en: 'Upload PAN + DL for a high-speed scooter',
  },
  'docs.panPhoto': { hi: 'PAN card photo', en: 'PAN card photo' },
  'docs.dlTitle': { hi: 'Driving Licence', en: 'Driving Licence' },
  'docs.dlFront': { hi: 'DL front photo', en: 'DL front photo' },
  'docs.dlBack': { hi: 'DL back photo (जरूरी नहीं)', en: 'DL back photo (optional)' },
  'docs.submit': { hi: 'जमा करें', en: 'Submit' },
  'docs.uploading': { hi: 'Upload हो रहा है…', en: 'Uploading…' },
  'docs.saved': { hi: 'Documents जमा हो गए — टीम verify करेगी', en: 'Documents submitted — the team will verify' },
  'docs.failed': { hi: 'Submit नहीं हो पाया — फिर कोशिश करें', en: 'Submit failed — try again' },
  'docs.note': {
    hi: 'दोनों section भरना जरूरी नहीं — जो add करना है सिर्फ वही भरें (number + photo साथ में).',
    en: 'You don’t have to fill both — just the one you’re adding (number and photo together).',
  },
  'docs.intro': {
    hi: 'High-speed गाड़ी के लिए PAN और DL जरूरी है. यहाँ upload करें — टीम verify करेगी, फिर आप high-speed ले सकते हैं. जो section update नहीं करना, उसे खाली छोड़ दें.',
    en: 'A high-speed scooter needs your PAN and DL. Upload them here — the team will verify, then high-speed opens up. Leave any section blank if you don’t want to change it.',
  },

  // ── tabs ──────────────────────────────────────────────────────────────────
  'tab.home': { hi: 'होम', en: 'Home' },
  'tab.ledger': { hi: 'मेरा खाता', en: 'My account' },

  // ── OTA update gate ───────────────────────────────────────────────────────
  'ota.title': { hi: 'नया update आया है', en: 'An update is ready' },
  'ota.body': {
    hi: 'App का नया version तैयार है — नए features और fixes के साथ.',
    en: 'A new version of the app is ready — new features and fixes.',
  },
  'ota.downloading': {
    hi: 'Update हो रहा है… app खुद restart होगा',
    en: 'Updating… the app will restart itself',
  },
  'ota.now': { hi: 'अभी update करें', en: 'Update now' },
  'ota.later': { hi: 'बाद में', en: 'Later' },

  // ── ledger ────────────────────────────────────────────────────────────────
  'ledger.title': { hi: 'मेरा खाता', en: 'My account' },
  'ledger.weeks': { hi: 'हफ्ते का हिसाब', en: 'Week by week' },
  'ledger.payments': { hi: 'आपके payments', en: 'Your payments' },
  'ledger.totalPaid': { hi: 'कुल जमा', en: 'Total paid' },
  'ledger.week': { hi: 'हफ्ता {n}', en: 'Week {n}' },
  'ledger.noPayments': { hi: 'अभी कोई payment नहीं', en: 'No payments yet' },
  'ledger.noAssignment': {
    hi: 'अभी कोई गाड़ी नहीं है — हिसाब गाड़ी मिलने के बाद दिखेगा',
    en: 'No scooter yet — your account opens once you have one',
  },
  'ledger.statusCollected': { hi: 'जमा ✓', en: 'Paid ✓' },
  'ledger.statusPartial': { hi: 'आधा जमा', en: 'Part paid' },
  'ledger.statusOverdue': { hi: 'बकाया', en: 'Overdue' },
  'ledger.statusPending': { hi: 'बाकी', en: 'Due' },
  'ledger.loading': { hi: 'खाता लोड हो रहा है…', en: 'Loading your account…' },
  'ledger.tabPayments': { hi: 'Payments', en: 'Payments' },
  'ledger.tabWeeks': { hi: 'हफ़्ते', en: 'Weeks' },
  'ledger.claimReview': { hi: 'Review में', en: 'Under review' },
  'ledger.claimRejected': { hi: 'Reject हुआ', en: 'Rejected' },
  'ledger.rentFor': { hi: '{from} – {to} का किराया', en: 'Rent for {from} – {to}' },
  'ledger.noWeeks': { hi: 'अभी कोई हफ़्ता नहीं', en: 'No weeks yet' },
  'ledger.due': { hi: 'due {date}', en: 'due {date}' },

  // ── pay ───────────────────────────────────────────────────────────────────
  'pay.title': { hi: 'Payment भेजें', en: 'Send a payment' },
  'pay.amount': { hi: 'कितना भेजा?', en: 'How much did you pay?' },
  'pay.utr': { hi: 'UTR / reference number', en: 'UTR / reference number' },
  'pay.utrHint': { hi: 'UPI app में मिलेगा (जरूरी नहीं)', en: 'From your UPI app (optional)' },
  'pay.screenshot': { hi: 'Payment का screenshot', en: 'Payment screenshot' },
  'pay.screenshotHint': {
    hi: 'बिना screenshot के claim verify नहीं हो पाएगा',
    en: 'Without a screenshot we can’t verify the payment',
  },
  'pay.submit': { hi: 'Claim भेजें', en: 'Send claim' },
  'pay.sent': {
    hi: 'भेज दिया गया — टीम verify करके आपके खाते में जोड़ देगी',
    en: 'Sent — the team will verify and credit your account',
  },
  'pay.needAmount': { hi: 'रकम डालें', en: 'Enter the amount' },
  'pay.needScreenshot': { hi: 'Screenshot लगाएँ', en: 'Add a screenshot' },
  'pay.howTo': {
    hi: 'किसी भी UPI app से भेजें, फिर screenshot यहाँ लगाएँ.',
    en: 'Pay from any UPI app, then attach the screenshot here.',
  },
  'pay.screenTitle': { hi: 'भुगतान करें', en: 'Make a payment' },
  'pay.amountLabel': { hi: 'कितना भुगतान किया? ₹', en: 'Amount paid ₹' },
  'pay.daysPreview': { hi: '≈ {days} दिन का किराया', en: '≈ {days} days of rent' },
  'pay.step1': { hi: '1 · किसी भी UPI app से pay करें', en: '1 · Pay from any UPI app' },
  'pay.step1Sub': {
    hi: 'GPay, PhonePe, Paytm — जो भी आप use करते हैं. अपने hub incharge के number पर भेजें.',
    en: 'GPay, PhonePe, Paytm — whichever you use. Send it to your hub incharge’s number.',
  },
  'pay.step2': { hi: '2 · Screenshot upload करें', en: '2 · Upload the screenshot' },
  'pay.pickScreenshot': { hi: 'Payment का screenshot चुनें', en: 'Choose the payment screenshot' },
  'pay.changeScreenshot': { hi: 'Screenshot बदलें', en: 'Change screenshot' },
  'pay.utrPlaceholder': {
    hi: 'UTR / transaction number (जरूरी नहीं)',
    en: 'UTR / transaction number (optional)',
  },
  'pay.submitting': { hi: 'Submit हो रहा है…', en: 'Submitting…' },
  'pay.submitForVerification': { hi: 'Verification के लिए भेजें', en: 'Submit for verification' },
  'pay.submitFailed': { hi: 'Submit नहीं हो पाया — फिर कोशिश करें', en: 'Submit failed — try again' },
  'pay.footnote': {
    hi: 'टीम verify करेगी, तब तक यह "review में" दिखेगा. गलत screenshot पर claim reject हो सकता है.',
    en: 'It stays “under review” until the team verifies it. A wrong screenshot can get the claim rejected.',
  },
  'pay.doneTitle': { hi: 'Payment submit हो गया ✓', en: 'Payment submitted ✓' },
  'pay.doneSub': {
    hi: '{amount} का claim review में है.\nटीम verify करेगी — आम तौर पर 2 घंटे के अंदर. Verify होते ही आपके खाते में दिख जाएगा.',
    en: 'Your {amount} claim is under review.\nThe team will verify it — usually within 2 hours. It’ll show in your account as soon as it clears.',
  },
  'pay.ok': { hi: 'ठीक है', en: 'Got it' },

  // ── KYC wizard ────────────────────────────────────────────────────────────
  'kyc.screenTitle': { hi: 'KYC पूरा करें', en: 'Complete your KYC' },
  'kyc.step': { hi: 'Step {n} / 3', en: 'Step {n} / 3' },
  'kyc.next': { hi: 'आगे बढ़ें', en: 'Next' },
  'kyc.back': { hi: 'वापस', en: 'Back' },
  'kyc.submit': { hi: 'KYC जमा करें', en: 'Submit KYC' },
  'kyc.uploading': { hi: 'Upload हो रहा है…', en: 'Uploading…' },

  'kyc.s1Title': { hi: 'आपकी जानकारी', en: 'About you' },
  'kyc.name': { hi: 'पूरा नाम *', en: 'Full name *' },
  'kyc.namePlaceholder': { hi: 'जैसा Aadhaar पर है', en: 'As printed on your Aadhaar' },
  'kyc.currentAddress': { hi: 'अभी का पता *', en: 'Current address *' },
  'kyc.addressPlaceholder': { hi: 'मकान नं., गली, area, शहर', en: 'House no, street, area, city' },
  'kyc.sameAddress': { hi: 'स्थायी पता भी यही है', en: 'Permanent address is the same' },
  'kyc.permanentAddress': { hi: 'स्थायी पता', en: 'Permanent address' },
  'kyc.permanentPlaceholder': { hi: 'गाँव / शहर का पता', en: 'Village / hometown address' },
  'kyc.work': { hi: 'काम (जरूरी नहीं)', en: 'Work (optional)' },
  'kyc.whichScooter': { hi: 'कौन सी गाड़ी चाहिए? *', en: 'Which type of scooter? *' },
  'kyc.lowSpeed': { hi: 'Low speed', en: 'Low speed' },
  'kyc.lowSpeedSub': { hi: 'DL की जरूरत नहीं', en: 'No DL needed' },
  'kyc.highSpeed': { hi: 'High speed', en: 'High speed' },
  'kyc.highSpeedSub': { hi: 'PAN + DL जरूरी', en: 'PAN + DL required' },

  'kyc.s2Title': { hi: 'Reference और बैंक', en: 'References and bank' },
  'kyc.famName': { hi: 'परिवार से reference — नाम *', en: 'Family reference — name *' },
  'kyc.famNamePlaceholder': { hi: 'पिता / भाई / रिश्तेदार', en: 'Father / brother / relative' },
  'kyc.famMobile': { hi: 'Reference मोबाइल *', en: 'Reference mobile *' },
  'kyc.localName': { hi: 'Local reference — नाम (जरूरी नहीं)', en: 'Local reference — name (optional)' },
  'kyc.localNamePlaceholder': { hi: 'यहाँ का दोस्त / जानकार', en: 'A friend or contact nearby' },
  'kyc.localMobile': { hi: 'Local reference मोबाइल', en: 'Local reference mobile' },
  'kyc.tenDigits': { hi: '10 अंक का नंबर', en: '10-digit number' },
  'kyc.bank': { hi: 'बैंक का नाम *', en: 'Bank name *' },
  'kyc.ifsc': { hi: 'IFSC code *', en: 'IFSC code *' },
  'kyc.account': { hi: 'Account number *', en: 'Account number *' },
  'kyc.accountPlaceholder': { hi: 'खाता नंबर', en: 'Account number' },

  'kyc.s3Title': { hi: 'Documents', en: 'Documents' },
  'kyc.aadhaar': { hi: 'Aadhaar number *', en: 'Aadhaar number *' },
  'kyc.aadhaarPlaceholder': { hi: '12 अंक', en: '12 digits' },
  'kyc.aadhaarFront': { hi: 'Aadhaar front photo', en: 'Aadhaar front photo' },
  'kyc.aadhaarBack': { hi: 'Aadhaar back photo', en: 'Aadhaar back photo' },
  'kyc.selfie': { hi: 'आपकी photo (selfie)', en: 'Your photo (selfie)' },
  'kyc.docsHigh': {
    hi: 'High-speed गाड़ी के लिए PAN और DL जरूरी है:',
    en: 'A high-speed scooter needs your PAN and DL:',
  },
  'kyc.docsLow': {
    hi: 'PAN / DL अभी जरूरी नहीं है (low-speed):',
    en: 'PAN / DL are optional for now (low-speed):',
  },
  'kyc.panPhoto': { hi: 'PAN photo', en: 'PAN photo' },
  'kyc.dlNumber': { hi: 'DL number', en: 'DL number' },
  'kyc.dlFront': { hi: 'DL front photo', en: 'DL front photo' },
  'kyc.dlBack': { hi: 'DL back photo', en: 'DL back photo' },
} as const;

export type StringKey = keyof typeof S;

type Vars = Record<string, string | number>;

function translate(key: StringKey, lang: Lang, vars?: Vars): string {
  const entry = S[key];
  let out: string = entry ? entry[lang] : key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) out = out.split(`{${k}}`).join(String(v));
  }
  return out;
}

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: StringKey, vars?: Vars) => string;
  /** True until the saved choice has been read — screens can render regardless. */
  loading: boolean;
};

const LangContext = createContext<Ctx | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('hi');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    storage
      .get(LANG_KEY)
      .then((saved) => {
        if (alive && (saved === 'hi' || saved === 'en')) setLangState(saved);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  // Persist, but flip the UI first — the toggle must feel instant even if the
  // write is slow, and a failed write only costs the choice on next launch.
  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    void storage.set(LANG_KEY, l);
  }, []);

  const value = useMemo<Ctx>(
    () => ({ lang, setLang, loading, t: (key, vars) => translate(key, lang, vars) }),
    [lang, setLang, loading]
  );

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang(): Ctx {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useLang must be used inside LanguageProvider');
  return ctx;
}
