/* Generated from cdcp-embed.js (CDCP_LABELS and T). The French wording is the reviewed source of truth:
   change it in one place, regenerate, and both implementations stay identical. */
export type Lang = "fr" | "en";
export const LABELS = {
 "en": {
  "stepLabel": "Step {current} of {total}",
  "back": "Back",
  "retake": "Run it again",
  "skipPrompt": "Prefer to skip straight to the point?",
  "skipCall": "Call",
  "skipMail": "email",
  "skipOr": " or ",
  "skipTail": " our front desk.",
  "skipTailCall": " our front desk.",
  "bookingUrl": "/#contact",
  "cdcpApplyUrl": "https://www.canada.ca/en/services/benefits/dental/dental-care-plan/apply.html",
  "craMyAccountUrl": "https://www.canada.ca/en/revenue-agency/services/e-services/digital-services-individuals/account-individuals.html",
  "step1": {
   "question": "Do you (or a family member) currently have access to private dental insurance — through an employer, a private plan, or a health spending account?",
   "yes": "Yes, I have private coverage",
   "no": "No private coverage"
  },
  "step2": {
   "question": "What was your adjusted family net income on your last tax return?",
   "under70": "Under $70,000",
   "under70Hint": "up to 100% covered",
   "band70": "$70,000–$79,999",
   "band70Hint": "up to 60% covered",
   "band80": "$80,000–$89,999",
   "band80Hint": "up to 40% covered",
   "over90": "$90,000 or more",
   "over90Hint": "not eligible"
  },
  "step3": {
   "question": "Have you (and your spouse or partner, if applicable) filed a Canadian tax return for the previous year?",
   "yes": "Yes, filed",
   "no": "Not yet"
  },
  "step4": {
   "question": "Who are you checking eligibility for?",
   "senior": "Senior, 65+",
   "child": "Child under 18",
   "dtc": "Adult with a valid Disability Tax Credit",
   "adult": "Adult, 18–64"
  },
  "results": {
   "tier100Badge": "Qualifies for up to 100% CDCP coverage",
   "tier60Badge": "Qualifies for up to 60% CDCP coverage",
   "tier40Badge": "Qualifies for up to 40% CDCP coverage",
   "childRamqNote": "In Quebec, RAMQ already covers basic dental care for children under 10 — CDCP fills the gap for kids 10 and up.",
   "tierRingCaption": "Your coverage tier",
   "coverageMatrix": {
    "heading": "Coverage & Authorization Matrix",
    "standard": {
     "title": "Standard Covered Care",
     "subtitle": "No prior approval required",
     "services": [
      "Diagnostic exams",
      "Digital X-rays",
      "Standard cleaning / scaling (up to annual limits)",
      "Basic fillings",
      "Simple extractions"
     ],
     "note": "Covered directly under standard CDCP fee guidelines."
    },
    "major": {
     "title": "Major Services",
     "subtitle": "Requires clinical pre-authorization (predetermination)",
     "services": [
      "Porcelain crowns (and cores/posts)",
      "Complete & partial dentures",
      "Root canal retreatment",
      "Additional periodontal scaling (beyond annual limits)"
     ],
     "note": "Important: Major restorative treatments (crowns, dentures) require a formal electronic Predetermination Request. Our clinical team will submit your diagnostic treatment plan directly to Sun Life / CDCP for approval prior to initiating care."
    },
    "excluded": {
     "title": "Strictly Excluded Services",
     "subtitle": "Out-of-pocket or private insurance only",
     "services": [
      "Nightguards / bruxism appliances",
      "Teeth whitening",
      "Cosmetic veneers",
      "Elective orthodontics / Invisalign",
      "Dental implants"
     ],
     "note": "The CDCP does not cover occlusal nightguards, cosmetic procedures, elective alignment, or dental implants. Optional private payment plans or direct insurance billing are available for these treatments."
    }
   },
   "sourceNote": "Coverage tiers reflect the federal CDCP fee schedule on canada.ca. Verified 2026-09-15.",
   "billingNoticeHeading": "Billing transparency notice",
   "billingNoticeBody": "Your tier applies to CDCP's fee schedule, not necessarily your dentist's charges. If a fee is above CDCP's rate, you pay the difference on top of your co-payment. Ask for a written estimate before any treatment.",
   "branchInsurance": {
    "headline": "You can book now. There is no need to wait for CDCP.",
    "banner": "Your private plan applies",
    "microCopy": "Your private plan covers care right away, with no government application or waiting period.",
    "primaryCta": "Book Your Appointment Now",
    "insurersNote": "On your own site, this panel shows the insurers your clinic accepts — for example:",
    "insurers": [
     "Sun Life",
     "Manulife",
     "Canada Life",
     "Green Shield Canada"
    ]
   },
   "branchIncome": {
    "headline": "You are not eligible for CDCP at this income.",
    "banner": "Standard care and payment options available",
    "microCopy": "Government coverage stops at $90,000 in household income. The clinic offers membership plans, flexible payment arrangements and a transparent fee guide.",
    "primaryCta": "Book a New Patient Exam & Consultation"
   },
   "branchTaxFiling": {
    "headline": "One step left before you can apply.",
    "banner": "File your tax return to apply for CDCP",
    "microCopy": "The CRA needs your up-to-date tax return to verify your income. Once filed, you can apply.",
    "primaryCta": "File or Check Your Status on Canada.ca",
    "secondaryCta": "Pre-Book Your Appointment for Next Month"
   },
   "branchQualified": {
    "headline": "Verification Complete — You Qualify for CDCP Coverage",
    "step1Title": "Step 1 — Apply for your CDCP card",
    "step1Body": "Processed by Health Canada, with Sun Life.",
    "step1Cta": "Open the CDCP application",
    "step2Title": "Step 2 — Book while you wait",
    "step2MicroCopy": "Your CDCP card arrives in 4 to 8 weeks. Booking 6 to 8 weeks out lines the visit up with it.",
    "step2Cta": "Book your appointment",
    "step3Title": "Step 3 — Need help?",
    "step3Cta": "Contact our front desk"
   }
  }
 },
 "fr": {
  "stepLabel": "Étape {current} sur {total}",
  "back": "Retour",
  "retake": "Recommencer",
  "skipPrompt": "Vous préférez aller droit au but?",
  "skipCall": "Appelez",
  "skipMail": "envoyez un courriel",
  "skipOr": " ou ",
  "skipTail": " à notre réception.",
  "skipTailCall": " notre réception.",
  "bookingUrl": "/#contact",
  "cdcpApplyUrl": "https://www.canada.ca/fr/services/prestations/dentaire/regime-soins-dentaires/demande.html",
  "craMyAccountUrl": "https://www.canada.ca/fr/agence-revenu/services/services-electroniques/services-electroniques-particuliers/dossier-particuliers.html",
  "step1": {
   "question": "Vous (ou un membre de votre famille) avez-vous actuellement accès à une assurance dentaire privée — par un employeur, un régime privé ou un compte de gestion santé?",
   "yes": "Oui, j'ai une couverture privée",
   "no": "Aucune couverture privée"
  },
  "step2": {
   "question": "Quel était votre revenu familial net rajusté sur votre dernière déclaration d’impôts?",
   "under70": "Moins de 70 000 $",
   "under70Hint": "jusqu'à 100 % couvert",
   "band70": "70 000 $ à 79 999 $",
   "band70Hint": "jusqu'à 60 % couvert",
   "band80": "80 000 $ à 89 999 $",
   "band80Hint": "jusqu'à 40 % couvert",
   "over90": "90 000 $ ou plus",
   "over90Hint": "non admissible"
  },
  "step3": {
   "question": "Avez-vous (et votre conjoint(e), le cas échéant) produit une déclaration d’impôts canadienne pour l'année précédente?",
   "yes": "Oui, produite",
   "no": "Pas encore"
  },
  "step4": {
   "question": "Pour qui vérifiez-vous l'admissibilité?",
   "senior": "Aîné(e), 65 ans ou plus",
   "child": "Enfant de moins de 18 ans",
   "dtc": "Adulte détenant un crédit d'impôt pour personnes handicapées valide",
   "adult": "Adulte, 18 à 64 ans"
  },
  "results": {
   "tier100Badge": "Admissible à une couverture RCSD pouvant atteindre 100 %",
   "tier60Badge": "Admissible à une couverture RCSD pouvant atteindre 60 %",
   "tier40Badge": "Admissible à une couverture RCSD pouvant atteindre 40 %",
   "childRamqNote": "Au Québec, la RAMQ couvre déjà les soins dentaires de base pour les enfants de moins de 10 ans — le RCSD prend le relais pour les enfants de 10 ans et plus.",
   "tierRingCaption": "Votre palier de couverture",
   "coverageMatrix": {
    "heading": "Matrice de couverture et d'autorisation",
    "standard": {
     "title": "Soins standards couverts",
     "subtitle": "Aucune approbation préalable requise",
     "services": [
      "Examens diagnostiques",
      "Radiographies numériques",
      "Nettoyage / détartrage standard (jusqu'aux limites annuelles)",
      "Plombages de base",
      "Extractions simples"
     ],
     "note": "Couvert directement selon la grille tarifaire standard du RCSD."
    },
    "major": {
     "title": "Services majeurs",
     "subtitle": "Nécessite une autorisation préalable (prédétermination)",
     "services": [
      "Couronnes en porcelaine (et tenons/moignons)",
      "Prothèses complètes et partielles",
      "Retraitement de canal",
      "Détartrage parodontal additionnel (au-delà des limites annuelles)"
     ],
     "note": "Important : Les traitements de restauration majeurs (couronnes, prothèses) nécessitent une Demande d'autorisation préalable électronique. Notre équipe clinique soumettra votre plan de traitement diagnostique directement à la Sun Life / au RCSD pour approbation avant de débuter les soins."
    },
    "excluded": {
     "title": "Services strictement exclus",
     "subtitle": "À payer directement ou par assurance privée",
     "services": [
      "Plaques occlusales / dispositifs contre le bruxisme",
      "Blanchiment des dents",
      "Facettes esthétiques",
      "Orthodontie élective / Invisalign",
      "Implants dentaires"
     ],
     "note": "Le RCSD ne couvre pas les plaques occlusales, les soins esthétiques, l'orthodontie élective ni les implants dentaires. Des options de paiement privé ou de facturation directe à l'assurance sont disponibles pour ces traitements."
    }
   },
   "sourceNote": "Les paliers de couverture reflètent la grille tarifaire fédérale du RCSD publiée sur canada.ca. Vérifié le 2026-09-15.",
   "billingNoticeHeading": "Avis de transparence tarifaire",
   "billingNoticeBody": "Votre palier s'applique à la grille du RCSD, pas forcément aux tarifs de votre dentiste. Si le tarif dépasse la grille, vous payez la différence en plus de votre quote-part. Demandez une estimation écrite avant tout traitement.",
   "branchInsurance": {
    "headline": "Vous pouvez réserver maintenant. Pas besoin d'attendre le RCSD.",
    "banner": "Votre assurance privée s'applique",
    "microCopy": "Votre régime privé couvre les soins tout de suite, sans demande ni délai gouvernemental.",
    "primaryCta": "Prendre rendez-vous maintenant",
    "insurersNote": "Sur votre propre site, ce module afficherait les assureurs acceptés par votre clinique — par exemple :",
    "insurers": [
     "Sun Life",
     "Manuvie",
     "Canada Vie",
     "Croix Bleue"
    ]
   },
   "branchIncome": {
    "headline": "Vous n'êtes pas admissible au RCSD à ce revenu.",
    "banner": "Soins standards et options de paiement offerts",
    "microCopy": "La couverture gouvernementale s'arrête à 90 000 $ de revenu familial. La clinique offre des forfaits d'adhésion, des ententes de paiement et une grille tarifaire transparente.",
    "primaryCta": "Prendre rendez-vous pour un nouvel examen"
   },
   "branchTaxFiling": {
    "headline": "Il reste une étape avant de faire votre demande.",
    "banner": "Produisez votre déclaration d’impôts pour faire la demande au RCSD",
    "microCopy": "L'ARC doit avoir votre déclaration d’impôts à jour pour vérifier votre revenu. Une fois produite, vous pouvez faire la demande.",
    "primaryCta": "Produire ou vérifier votre dossier sur Canada.ca",
    "secondaryCta": "Réserver votre rendez-vous pour le mois prochain"
   },
   "branchQualified": {
    "headline": "Vérification terminée — Vous êtes admissible à la couverture RCSD",
    "step1Title": "Étape 1 — Faites la demande de votre carte RCSD",
    "step1Body": "Demande traitée par Santé Canada, avec la Sun Life.",
    "step1Cta": "Ouvrir la demande RCSD",
    "step2Title": "Étape 2 — Réservez pendant l'attente",
    "step2MicroCopy": "La carte RCSD arrive en 4 à 8 semaines. Réserver dans 6 à 8 semaines aligne le rendez-vous avec sa réception.",
    "step2Cta": "Réserver votre rendez-vous",
    "step3Title": "Étape 3 — Besoin d'aide ?",
    "step3Cta": "Contactez notre réception"
   }
  }
 }
} as const;
export const UI = {
 "fr": {
  "label": "Admissibilité et coût au RCSD",
  "clear": "Effacer les réponses",
  "todo": "À indiquer",
  "edit": "Modifier",
  "yours": "Vos réponses",
  "qn": "Question {n} sur {t}",
  "cont": "Continuer",
  "sec": {
   "calc": "Calcul de l’estimation",
   "limits": "Limites de l’estimation",
   "next": "Prochaine étape"
  },
  "bc": {
   "based": "Selon vos réponses : ",
   "and": " et ",
   "noIns": "vous n’avez pas d’assurance dentaire privée",
   "inc": "votre revenu familial net rajusté est de {r}",
   "fy": "votre déclaration d’impôts est produite",
   "fn": "votre déclaration d’impôts n’est pas encore produite"
  },
  "st": {
   "none": "Aucune réponse",
   "pending": "Incomplet",
   "unconfirmed": "À confirmer",
   "qualified": "Admissible selon vos réponses",
   "income": "Non admissible",
   "tax": "Déclaration requise",
   "insurance": "Assurance privée"
  },
  "ins": "Assurance dentaire privée",
  "insI": "Par un employeur, un régime privé ou un compte de gestion santé.",
  "yes": "Oui",
  "no": "Non",
  "inc": "Revenu familial net rajusté",
  "incI": "Selon votre dernière déclaration d’impôts.",
  "incShort": [
   "< 70 k",
   "70–79 k",
   "80–89 k",
   "90 k +"
  ],
  "incPct": [
   "100 %",
   "60 %",
   "40 %",
   "0 %"
  ],
  "filed": "Déclaration d’impôts produite",
  "filedI": "Vous et votre conjoint(e), le cas échéant, pour l’année précédente.",
  "notYet": "Pas encore",
  "appt": "Type de rendez-vous",
  "apptI": "",
  "pick": "Choisir…",
  "remain": "Il reste à indiquer :",
  "pickVisit": "Choisissez un type de rendez-vous pour estimer votre part.",
  "pendH": "Estimez votre part d’une visite.",
  "pendS": "L’estimation tient compte du Régime canadien de soins dentaires (RCSD) et du guide tarifaire des dentistes du Québec (ACDQ).",
  "prog": "Réponses : {n} sur {t}",
  "estNote": "Estimation selon le guide tarifaire, pas une soumission.",
  "share": "Votre part estimée",
    "total": "Coût total",
    "viewCalc": "Voir le calcul",
  "cost": "Coût du traitement",
  "std": "Guide tarifaire 2026 des dentistes du Québec (ACDQ)",
  "paid": "Versé par le RCSD",
  "noCover": "Service non couvert par le RCSD",
  "full": "Entièrement couvert au tarif du guide.",
  "ifQualify": "Si votre admissibilité est confirmée.",
  "you": "Votre part",
  "byAnswers": "selon vos réponses",
  "grid": "{n} % de la grille du Régime canadien de soins dentaires",
  "noelig": "Non admissible",
  "incl": "Inclus",
  "nopick": "Choisissez un rendez-vous pour voir votre part.",
  "unavailable": "Estimation indisponible pour ce rendez-vous. Communiquez avec la clinique.",
  "tierUnconfirmed": "Palier RCSD : jusqu’à {n} %. Confirmez votre déclaration d’impôts.",
  "whenIssued": "Montant estimé une fois la carte RCSD reçue.",
  "pre": "Préautorisation du RCSD requise.",
  "lab": "Frais de laboratoire en sus.",
  "excl": "Non couvert par le RCSD.",
  "ramq": "Enfants de moins de 10 ans : la RAMQ couvre déjà les soins de base.",
  "disc": "Estimation seulement. Chaque clinique fixe ses tarifs. Limites annuelles et frais de laboratoire non inclus.",
  "matrix": "Soins couverts, autorisation et exclusions",
  "insurers": "Assureurs acceptés par la clinique :",
  "pk": {
   "new": [
    "Nouveau patient",
    "Examen complet, 2 radiographies, nettoyage de 30 min, fluorure"
   ],
   "recall": [
    "Rappel et nettoyage",
    "Examen périodique, nettoyage de 30 min"
   ],
   "emerg": [
    "Urgence, mal de dent",
    "Examen d’urgence, radiographie",
    "Un traitement immédiat (obturation, canal, extraction) s’ajoute au tarif."
   ],
   "filling": [
    "Carie, obturation",
    "Obturation en composite sur une molaire (1 surface)",
    "L’examen n’est pas inclus."
   ],
   "major": [
    "Prothèse complète",
    "Prothèse complète standard, une arcade",
    "Frais de laboratoire en sus."
   ]
  }
 },
 "en": {
  "label": "CDCP eligibility and cost",
  "clear": "Clear answers",
  "todo": "To answer",
  "edit": "Edit",
  "yours": "Your answers",
  "qn": "Question {n} of {t}",
  "cont": "Continue",
  "sec": {
   "calc": "How the estimate is built",
   "limits": "Limits of the estimate",
   "next": "Next step"
  },
  "bc": {
   "based": "Based on your answers: ",
   "and": " and ",
   "noIns": "you have no private dental insurance",
   "inc": "your adjusted family net income is {r}",
   "fy": "your tax return is filed",
   "fn": "your tax return is not filed yet"
  },
  "st": {
   "none": "No answers yet",
   "pending": "Incomplete",
   "unconfirmed": "To confirm",
   "qualified": "Eligible based on your answers",
   "income": "Not eligible",
   "tax": "Return required",
   "insurance": "Private insurance"
  },
  "ins": "Private dental insurance",
  "insI": "Through an employer, a private plan or a health spending account.",
  "yes": "Yes",
  "no": "No",
  "inc": "Adjusted family net income",
  "incI": "From your last tax return.",
  "incShort": [
   "< 70k",
   "70–79k",
   "80–89k",
   "90k+"
  ],
  "incPct": [
   "100%",
   "60%",
   "40%",
   "0%"
  ],
  "filed": "Tax return filed",
  "filedI": "You and your spouse or partner, if applicable, for the previous year.",
  "notYet": "Not yet",
  "appt": "Appointment type",
  "apptI": "",
  "pick": "Choose…",
  "remain": "Still to answer:",
  "pickVisit": "Choose an appointment type to estimate your share.",
  "pendH": "Estimate your share of a visit.",
  "pendS": "The estimate factors in the Canadian Dental Care Plan (CDCP) and the Quebec dentists' fee guide (ACDQ).",
  "prog": "{n} of {t} answered",
  "estNote": "Estimate from the fee guide, not a quote.",
  "share": "Your estimated share",
    "total": "Total cost",
    "viewCalc": "See the calculation",
  "cost": "Treatment cost",
  "std": "Quebec dentists' 2026 fee guide (ACDQ)",
  "paid": "Paid by CDCP",
  "noCover": "Not a CDCP-covered service",
  "full": "Fully covered at the guide price.",
  "ifQualify": "If your eligibility is confirmed.",
  "you": "Your share",
  "byAnswers": "depends on your answers",
  "grid": "{n}% of the Canadian Dental Care Plan fee schedule",
  "noelig": "Not eligible",
  "incl": "Includes",
  "nopick": "Choose an appointment to see your share.",
  "unavailable": "Estimate unavailable for this appointment. Please contact the clinic.",
  "tierUnconfirmed": "CDCP tier: up to {n}%. Confirm your tax filing.",
  "whenIssued": "Estimated amount once your CDCP card is issued.",
  "pre": "CDCP pre-authorization required.",
  "lab": "Lab fee billed extra.",
  "excl": "Not covered by CDCP.",
  "ramq": "Children under 10: RAMQ already covers basic care.",
  "disc": "Estimate only. Each clinic sets its own fees. Annual limits and lab fees not included.",
  "matrix": "Covered care, authorization and exclusions",
  "insurers": "Insurers accepted by the clinic:",
  "pk": {
   "new": [
    "New patient",
    "Complete exam, 2 X-rays, 30-minute cleaning, fluoride"
   ],
   "recall": [
    "Recall and cleaning",
    "Periodic exam, 30-minute cleaning"
   ],
   "emerg": [
    "Emergency, toothache",
    "Emergency exam, X-ray",
    "Immediate treatment (filling, root canal, extraction) is extra."
   ],
   "filling": [
    "Cavity, filling",
    "Composite filling on a molar (1 surface)",
    "The exam is not included."
   ],
   "major": [
    "Complete denture",
    "Standard complete denture, one arch",
    "Lab fees billed extra."
   ]
  }
 }
} as const;
export type Labels = (typeof LABELS)[Lang];
export type Ui = (typeof UI)[Lang];
