/**
 * CdcpSingleBoxWidget -- the CDCP / RCSD coverage estimator as a React component.
 *
 * Self-contained: engine, FR/EN copy and component in this one file. Same rules, wording and links as the
 * dependency-free widget (cdcp-embed.js). Requires React 18+, Tailwind CSS v4 (container-query variants,
 * default palette for `text-amber-300`), framer-motion 11+, lucide-react.
 * Usage: <CdcpSingleBoxWidget lang="fr" clinicName="..." procedures={fees} bookingUrl="/#contact" phone="..." email="..." />
 * Theming: --cw-* custom properties or the `theme` prop (primary, accent, radius, ink, paper, tint, line, good, panel, ...).
 *
 * One fixed-width card; every screen replaces the previous one inside the same frame (nothing stacks): three setup questions,
 * the appointment picker, then the same card turns into the dark result dashboard. See README.md for theming.
 */

import {
  useCallback, useEffect, useId, useMemo, useRef, useState, type CSSProperties, type ReactNode,
} from "react";
import { AnimatePresence, animate, motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, Calendar, ChevronDown, ChevronLeft, ChevronRight, CircleCheck, Clock, FileText, Info, Mail, Pencil, Phone, ShieldCheck, Sparkles, Siren, User, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";


/* ================================================================================================ engine (eligibility + estimate) */
export type IncomeKey = "under70" | "band70" | "band80" | "over90";
export type YesNo = "yes" | "no";
export type VisitId = "new" | "recall" | "emerg";
export type Step = "ins" | "inc" | "filed";

export interface Answers { ins: YesNo | null; inc: IncomeKey | null; filed: YesNo | null; appt: VisitId | null }
export const EMPTY_ANSWERS: Answers = { ins: null, inc: null, filed: null, appt: null };

export interface Procedure {
  code: string;
  acdqFee2026: number;
  cdcpGridFee2026: number;
  isCoveredByCDCP: boolean;
  preAuthRequired?: boolean;
  hasLabFee?: boolean;
}

export const INCOME_KEYS: readonly IncomeKey[] = ["under70", "band70", "band80", "over90"];
export const TIER_PCT: Record<IncomeKey, number> = { under70: 1, band70: 0.6, band80: 0.4, over90: 0 };
export const VISITS: readonly { id: VisitId; items: readonly (readonly [string, number])[] }[] = [
  { id: "new", items: [["01103", 1], ["02102", 1], ["11112", 1], ["12101", 1]] },
  { id: "recall", items: [["01202", 1], ["11112", 1]] },
  { id: "emerg", items: [["01205", 1], ["02102", 1]] },
];

export type Outcome = "pending" | "insurance" | "income" | "tax" | "qualified" | "unconfirmed";

/** The questions that decide eligibility, in order. The visit type is not one of them. */
export function requiredSteps(a: Answers): Step[] {
  const r: Step[] = ["ins"];
  if (a.ins === "no") { r.push("inc"); if (a.inc !== "over90") r.push("filed"); }
  return r;
}
export function firstUnanswered(a: Answers): Step | null {
  for (const k of requiredSteps(a)) if (!a[k]) return k;
  return null;
}
export function outcome(a: Answers): Outcome {
  if (a.ins === "yes") return "insurance";
  if (a.ins !== "no" || !a.inc) return "pending";
  if (a.inc === "over90") return "income";
  if (a.filed === "no") return "tax";
  if (a.filed === "yes") return "qualified";
  return "unconfirmed";
}

export interface Estimate {
  visit: VisitId;
  bad: boolean;       // a needed fee is missing or invalid: show "estimate unavailable"
  fee: number; covered: number; patient: number;
  known: boolean;     // false while the income tier is unknown: covered is 0 and means "not yet known"
  tierPct: number | null;
  preAuth: boolean; lab: boolean; excluded: boolean;
}
const valid = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0;
const cents = (n: number) => Math.round(n * 100) / 100;

export function estimate(a: Answers, byCode: ReadonlyMap<string, Procedure> | null): Estimate | null {
  const visit = VISITS.find((v) => v.id === a.appt);
  if (!visit || !byCode) return null;
  const known = a.ins === "no" && !!a.inc;
  const tp = known && a.inc ? TIER_PCT[a.inc] ?? 0 : null;
  let fee = 0, cov = 0, pre = false, lab = false, excl = false;
  for (const [code, qty] of visit.items) {
    const c = byCode.get(code);
    if (!c || !valid(c.acdqFee2026) || !valid(c.cdcpGridFee2026))
      return { visit: visit.id, bad: true, fee: 0, covered: 0, patient: 0, known, tierPct: tp, preAuth: false, lab: false, excluded: false };
    fee += c.acdqFee2026 * qty;
    const x = known && c.isCoveredByCDCP ? cents(Math.min(c.cdcpGridFee2026 * (tp ?? 0), c.acdqFee2026)) : 0;
    cov += x * qty;
    if (c.preAuthRequired) pre = true;
    if (c.hasLabFee) lab = true;
    if (!c.isCoveredByCDCP) excl = true;
  }
  fee = cents(fee); cov = cents(cov);
  return { visit: visit.id, bad: false, fee, covered: cov, patient: cents(fee - cov), known, tierPct: tp, preAuth: pre, lab, excluded: excl };
}

export const indexProcedures = (list: readonly Procedure[] | undefined) =>
  list ? new Map(list.map((p) => [p.code, p] as const)) : null;

/* ================================================================================================ copy (FR / EN) */
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
    "step2Cta": "Step 2: Book your appointment",
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
    "step2Cta": "Étape 2 : Réserver votre rendez-vous",
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
  "pickPrompt": "Sélectionnez un type de rendez-vous pour estimer votre reste à payer.",
  "pickAbove": "Sélectionnez un rendez-vous ci-dessus pour calculer votre reste à payer estimé.",
  "lockCta": "Sélectionnez un rendez-vous pour débloquer la réservation",
  "chipIns": { "yes": "Assuré", "no": "Non-assuré" },
  "chipFiled": { "yes": "Impôts : oui", "no": "Impôts : pas encore" },
  "applyLink": "Étape 1 : Faire la demande d’adhésion au RCSD (Santé Canada)",
  "applySub": "La carte RCSD arrive en 4 à 8 semaines.",
  "bookSub": "Réserver dans 6 à 8 semaines aligne votre visite avec la réception de votre carte.",
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
    "Examen complet, radiographies diagnostiques, nettoyage de 30 min, fluorure"
   ],
   "recall": [
    "Rappel et nettoyage",
    "Examen périodique, nettoyage de 30 min"
   ],
   "emerg": [
    "Urgence, mal de dent",
    "Examen d’urgence, radiographie",
    "Un traitement immédiat (obturation, canal, extraction) s’ajoute au tarif."
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
  "pickPrompt": "Select an appointment type to estimate your out-of-pocket cost.",
  "pickAbove": "Select an appointment above to calculate your estimated out-of-pocket cost.",
  "lockCta": "Select an appointment to unlock booking",
  "chipIns": { "yes": "Insured", "no": "Uninsured" },
  "chipFiled": { "yes": "Taxes filed", "no": "Taxes not filed yet" },
  "applyLink": "Step 1: Apply for CDCP membership (Health Canada)",
  "applySub": "Your CDCP card arrives in 4 to 8 weeks.",
  "bookSub": "Booking 6 to 8 weeks out lines your visit up with your card’s arrival.",
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
    "Complete exam, diagnostic X-rays, 30-minute cleaning, fluoride"
   ],
   "recall": [
    "Recall and cleaning",
    "Periodic exam, 30-minute cleaning"
   ],
   "emerg": [
    "Emergency, toothache",
    "Emergency exam, X-ray",
    "Immediate treatment (filling, root canal, extraction) is extra."
      ]
  }
 }
} as const;
export type Labels = (typeof LABELS)[Lang];
export type Ui = (typeof UI)[Lang];

/* ------------------------------------------------------------------------------------------------ public API */
export interface CalculatorTheme {
  primary?: string; accent?: string; radius?: string; ink?: string; paper?: string; tint?: string; line?: string;
  good?: string; bad?: string; warn?: string; panel?: string; onPanel?: string; font?: string; display?: string;
}
export interface EmbeddableDentalCalculatorProps {
  lang?: Lang;
  /** Shown in the card header: "Calculateur dentaire · {clinicName}". */
  clinicName?: string;
  /** Fee data (the `procedures` array of cdcp-estimator-data.js). Without it the tool is eligibility-only. */
  procedures?: readonly Procedure[];
  bookingUrl?: string;
  phone?: string;
  email?: string;
  insurers?: readonly string[];
  /** Inline brand tokens; the same values can be set as --cw-* custom properties from the host's CSS instead. */
  theme?: CalculatorTheme;
  /** Height of a fixed host header, so the pinned figure sits below it. */
  stickyTop?: number | string;
  defaultAnswers?: Partial<Answers>;
  className?: string;
  onChange?: (s: { answers: Answers; outcome: Outcome; estimate: Estimate | null }) => void;
}

/* ------------------------------------------------------------------------------------------------ helpers */
const HEADER = { fr: "Calculateur dentaire", en: "Dental calculator" } as const;
const nb = (s: string) => s.replace(/(\d) (?=\d)/g, "$1 ").replace(/ (%|\$)/g, " $1");
const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ink)]";

function withBookingParams(url: string, params: Record<string, string>) {
  try {
    const u = new URL(url, typeof window === "undefined" ? "https://example.invalid" : window.location.origin);
    Object.entries(params).forEach(([k, v]) => u.searchParams.set(k, v));
    return u.toString();
  } catch { return url; }
}
const weeksIso = (w: number) => { const d = new Date(); d.setDate(d.getDate() + w * 7); return d.toISOString().slice(0, 10); };

function themeVars(t: CalculatorTheme | undefined, sticky: number | string | undefined): CSSProperties {
  const v: Record<string, string> = {
    "--p": "var(--cw-primary, var(--cdcp-brand, #1c1812))", "--a": "var(--cw-accent, var(--cdcp-accent, #b5835a))",
    "--r": "var(--cw-radius, 1.5rem)", "--ink": "var(--cw-ink, var(--cdcp-ink, #1c1812))",
    "--paper": "var(--cw-paper, var(--cdcp-paper, #ffffff))", "--tint": "var(--cw-tint, var(--cdcp-tint, #f3f1ea))",
    "--line": "var(--cw-line, var(--cdcp-line, #d8d4c8))", "--good": "var(--cw-good, var(--cdcp-good, #2f6b35))",
    "--bad": "var(--cw-bad, var(--cdcp-bad, #b3261e))", "--warn": "var(--cw-warn, var(--cdcp-warn, #8a4f1c))",
    "--panel": "var(--cw-panel, var(--ink))", "--onpanel": "var(--cw-on-panel, var(--paper))",
    "--edge": "color-mix(in srgb, var(--ink) 48%, var(--paper))",
    "--good-on-panel": "color-mix(in srgb, var(--good) 40%, #ffffff)",
    "--stick": typeof sticky === "number" ? `${sticky}px` : sticky ?? "var(--cw-sticky-top, 0px)",
    fontFamily: "var(--cw-font, var(--cdcp-font, inherit))",
  };
  if (t) {
    const map: [keyof CalculatorTheme, string][] = [["primary", "--cw-primary"], ["accent", "--cw-accent"], ["radius", "--cw-radius"],
      ["ink", "--cw-ink"], ["paper", "--cw-paper"], ["tint", "--cw-tint"], ["line", "--cw-line"], ["good", "--cw-good"],
      ["bad", "--cw-bad"], ["warn", "--cw-warn"], ["panel", "--cw-panel"], ["onPanel", "--cw-on-panel"], ["font", "--cw-font"], ["display", "--cw-display"]];
    map.forEach(([k, name]) => { if (t[k]) v[name] = t[k] as string; });
  }
  return v as CSSProperties;
}

/** Counts up from zero when the result is revealed. No motion when the user prefers none. */
function CountUp({ value, lang, reduce, className }: { value: number; lang: Lang; reduce: boolean | null; className?: string }) {
  const [v, setV] = useState(reduce ? value : 0);
  useEffect(() => {
    if (reduce) { setV(value); return; }
    const c = animate(0, value, { duration: 0.7, ease: "easeOut", onUpdate: (x) => setV(Math.round(x * 100) / 100), onComplete: () => setV(value) });
    return () => c.stop();
  }, [value, reduce]);
  return <Money value={v} lang={lang} className={className} />;
}

/** Animates the card's height to its content, so a screen swap resizes the frame instead of jumping. */
function AutoHeight({ children, reduce }: { children: ReactNode; reduce?: boolean | null }) {
  const ref = useRef<HTMLDivElement>(null);
  const [h, setH] = useState<number | "auto">("auto");
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setH(el.offsetHeight));
    ro.observe(el); setH(el.offsetHeight);
    return () => ro.disconnect();
  }, []);
  return (
    <motion.div initial={false} animate={{ height: h }} transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 32 }} style={{ overflow: "hidden" }}>
      <div ref={ref}>{children}</div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------------------------------------ small parts */
function Money({ value, lang, className = "" }: { value: number; lang: Lang; className?: string }) {
  const parts = useMemo(() => new Intl.NumberFormat(lang === "fr" ? "fr-CA" : "en-CA", { style: "currency", currency: "CAD", minimumFractionDigits: 2 }).formatToParts(value), [value, lang]);
  return (
    <span className={`whitespace-nowrap tabular-nums ${className}`}>
      {parts.map((p, i) =>
        p.type === "decimal" || p.type === "fraction" ? <span key={i} className="text-[.45em] font-semibold">{p.value}</span>
        : p.type === "currency" ? <span key={i} className="align-[.4em] text-[.42em] font-semibold">{p.value}</span>
        : p.type === "literal" ? <span key={i} className="text-[.42em]">{p.value}</span>
        : <span key={i}>{p.value}</span>)}
    </span>
  );
}
const plain = (n: number, lang: Lang) => new Intl.NumberFormat(lang === "fr" ? "fr-CA" : "en-CA", { style: "currency", currency: "CAD" }).format(n);

function Dots({ n, t, label }: { n: number; t: number; label: string }) {
  return (
    <div role="progressbar" aria-label={label} aria-valuemin={1} aria-valuemax={t} aria-valuenow={n} className="flex items-center gap-2">
      {Array.from({ length: t }, (_, i) => (
        <span key={i} className={`size-2 rounded-full transition-all duration-200 ${i === n - 1 ? "w-5 bg-[var(--ink)]" : i < n - 1 ? "bg-[var(--ink)]" : "bg-[var(--line)]"}`} />
      ))}
    </div>
  );
}

interface Option<V extends string> { value: V; label: string; hint?: string; aria?: string; icon?: LucideIcon }
/** A radio group drawn as selectable cards. Native radios stay underneath (invisible, full-card hit area) so arrows, Space and screen readers work. */
const VISIT_ICON: Record<VisitId, LucideIcon> = { new: Sparkles, recall: Calendar, emerg: Siren };

function Choice<V extends string>(props: {
  name: string; legend: string; hint?: string; options: readonly Option<V>[]; value: V | null; onChange: (v: V) => void;
  onPointer: (isPointer: boolean) => void; columns?: 1 | 2; invalid?: boolean; reduce?: boolean | null;
}) {
  const { name, legend, hint, options, value, onChange, onPointer, columns = 1, invalid, reduce } = props;
  return (
    <div role="radiogroup" aria-labelledby={`${name}-lg`} className="min-w-0">
      <div id={`${name}-lg`} className="mb-3 w-full">
        <span className="block font-sans text-xl font-medium leading-tight tracking-tight opacity-90">{legend}</span>
        {hint && <span className="mt-0.5 block text-[13px] leading-snug opacity-75">{hint}</span>}
      </div>
      <div className={`grid gap-2.5 ${columns === 2 ? "@md:grid-cols-2" : ""}`}>
        {options.map((o) => {
          const on = value === o.value;
          return (
            <label key={o.value} onPointerDown={() => onPointer(true)} onKeyDown={() => onPointer(false)}
              className={`relative flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border-2 p-4 text-[var(--ink)] transition-all duration-200 ease-out
                hover:border-[color-mix(in_srgb,var(--p)_40%,transparent)] active:scale-[0.98] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--ink)]
                forced-colors:has-[:checked]:border-[Highlight] motion-reduce:transition-none motion-reduce:active:scale-100
                ${on ? `${invalid ? "border-[var(--bad)] ring-[var(--bad)]" : "border-[var(--p)] ring-[var(--p)]"} bg-[var(--tint)] ring-1 shadow-[0_8px_20px_-12px_rgb(0_0_0/.45)]` : "border-transparent bg-[color-mix(in_srgb,var(--ink)_6%,var(--paper))]"}`}>
              <input type="radio" name={name} value={o.value} checked={on} aria-label={o.aria ?? (o.hint ? `${o.label}. ${o.hint}` : o.label)}
                onChange={() => onChange(o.value)} className="absolute inset-0 z-10 size-full cursor-pointer opacity-0" />
              {o.icon && (
                <span aria-hidden className={`grid size-10 shrink-0 place-items-center rounded-full transition-colors duration-200 ${on ? "bg-[var(--p)] text-[var(--paper)]" : "bg-[var(--paper)] text-[var(--p)]"}`}>
                  <o.icon className="size-5" strokeWidth={2} />
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-medium leading-snug tracking-tight">{o.label}</span>
                {o.hint && <span className="mt-0.5 block text-[13px] leading-snug opacity-75">{o.hint}</span>}
              </span>
              <AnimatePresence initial={false}>
                {on && (
                  <motion.span aria-hidden key="ok" className="shrink-0 text-[var(--p)]"
                    initial={{ scale: reduce ? 1 : 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: reduce ? 1 : 0.4, opacity: 0 }}
                    transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 520, damping: 24 }}>
                    <CircleCheck className="size-6" strokeWidth={2.25} />
                  </motion.span>
                )}
              </AnimatePresence>
            </label>
          );
        })}
      </div>
    </div>
  );
}

/** Primary: one full-width, high-contrast hero button. Secondary: a quiet text link, never a second button. */
function CtaLink({ href, children, external, variant = "primary" }: { href: string; children: ReactNode; external?: boolean; variant?: "primary" | "secondary" }) {
  const ext = external ? { target: "_blank", rel: "noopener noreferrer" } : {};
  return variant === "primary" ? (
    <a href={href} {...ext}
      className={`flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-[var(--paper)] px-5 py-4 text-base font-bold leading-tight text-[var(--ink)] shadow-[0_10px_24px_-12px_rgb(0_0_0/.6)] transition-all duration-150 hover:scale-[1.01] hover:brightness-95 active:scale-[0.99] motion-reduce:transition-none motion-reduce:transform-none ${FOCUS}`}>
      {children}{external ? <ArrowUpRight className="size-5" aria-hidden /> : <ChevronRight className="size-5" aria-hidden />}
    </a>
  ) : (
    <a href={href} {...ext}
      className={`mx-auto flex min-h-11 w-fit max-w-full items-center rounded-lg px-2 text-center text-[13px] font-medium leading-snug opacity-80 transition hover:opacity-100 ${FOCUS}`}>
      <span>{external && typeof children === "string" && children.includes(" ")
        ? <><span className="underline decoration-white/40 underline-offset-4">{children.slice(0, children.lastIndexOf(" "))}</span>{" "}<span className="whitespace-nowrap"><span className="underline decoration-white/40 underline-offset-4">{children.slice(children.lastIndexOf(" ") + 1)}</span><ArrowUpRight className="ml-1 inline size-3.5 align-[-2px]" aria-hidden /></span></>
        : <span className="underline decoration-white/40 underline-offset-4">{children}</span>}</span>
    </a>
  );
}

function Drawer({ title, children, reduce }: { title: string; children: ReactNode; reduce?: boolean | null }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div className="rounded-2xl border border-white/15 bg-white/5">
      <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)}
        className={`flex min-h-11 w-full cursor-pointer items-center justify-between gap-3 rounded-2xl px-4 py-2 text-left text-[13px] font-semibold ${FOCUS}`}>
        <span className="flex items-center gap-2"><Info className="size-4" aria-hidden />{title}</span>
        <ChevronDown className={`size-4 transition-transform duration-200 motion-reduce:transition-none ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div id={id} key="body" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 360, damping: 38 }} className="overflow-hidden">
            <div className="space-y-3 px-4 pb-4 text-[13px] leading-relaxed">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------------------------------------ main component */
type Screen = Step | "appt" | "result";
const ORDER: Record<Screen, number> = { ins: 0, inc: 1, filed: 2, appt: 3, result: 4 };

export function CdcpSingleBoxWidget({
  lang = "fr", clinicName, procedures, bookingUrl = "/#contact", phone, email, insurers, theme, stickyTop,
  defaultAnswers, className = "", onChange,
}: EmbeddableDentalCalculatorProps) {
  const L = LABELS[lang], U = UI[lang], uid = useId(), reduce = useReducedMotion();
  const byCode = useMemo(() => indexProcedures(procedures), [procedures]);
  const hasFees = !!byCode;
  const [a, setA] = useState<Answers>({ ...EMPTY_ANSWERS, ...defaultAnswers });
  const [cur, setCur] = useState<Step | null>(null);
  const root = useRef<HTMLElement>(null), stage = useRef<HTMLDivElement>(null);
  const pointer = useRef(false), advance = useRef<ReturnType<typeof setTimeout>>(undefined);
  const last = useRef(0), dir = useRef(1);

  const steps = requiredSteps(a);
  const view: Step | null = cur && steps.includes(cur) ? cur : firstUnanswered(a);
  const oc = outcome(a);
  const est = useMemo(() => (oc === "insurance" ? null : estimate(a, byCode)), [a, oc, byCode]);
  const showFigure = !!est && !est.bad && est.known;
  const needAppt = hasFees && oc !== "insurance";
  const screen: Screen = view ?? (needAppt && !a.appt ? "appt" : "result");
  const dark = screen === "result";
  if (ORDER[screen] !== last.current) { dir.current = ORDER[screen] > last.current ? 1 : -1; last.current = ORDER[screen]; }

  useEffect(() => { onChange?.({ answers: a, outcome: oc, estimate: est }); }, [a, oc, est, onChange]);
  useEffect(() => () => clearTimeout(advance.current), []);
  // a new screen: keyboard users land on its first control, and the card is brought back into view if it was scrolled off
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) { mounted.current = true; return; }
    if (!pointer.current) stage.current?.querySelector<HTMLElement>("[data-autofocus], input:checked, input, button")?.focus({ preventScroll: true });
    const r = root.current?.getBoundingClientRect();
    if (r && r.top < 0) root.current?.scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" });
  }, [screen, reduce]);

  const set = useCallback(<K extends keyof Answers>(k: K, v: Answers[K]) => {
    setA((p) => ({ ...p, [k]: v }));
    if (k === "appt") return;
    setCur(k); // hold the question: keyboard users move on with "Continuer"; pointer users auto-advance
    clearTimeout(advance.current);
    if (pointer.current) advance.current = setTimeout(() => setCur(null), 140);
  }, []);
  const clear = () => { setA(EMPTY_ANSWERS); setCur(null); pointer.current = false; };
  const goBack = () => {
    pointer.current = false;
    if (view) { const i = steps.indexOf(view); if (i > 0) setCur(steps[i - 1]); return; }
    if (screen === "result" && needAppt) { setA((p) => ({ ...p, appt: null })); return; }
    setCur(steps[steps.length - 1]);
  };
  const canBack = view ? steps.indexOf(view) > 0 : true;

  /* ----- copy for the current outcome ----- */
  const R = L.results;
  const tier = a.inc === "under70" ? "100" : a.inc === "band70" ? "60" : a.inc === "band80" ? "40" : null;
  const head: { title: string; detail: string | null; tone: "good" | "bad" | "warn" | "neutral"; label: string } = (() => {
    switch (oc) {
      case "insurance": return { title: R.branchInsurance.headline, detail: R.branchInsurance.microCopy, tone: "good", label: U.st.insurance };
      case "income": return { title: R.branchIncome.headline, detail: R.branchIncome.microCopy, tone: "bad", label: U.st.income };
      case "tax": return { title: R.branchTaxFiling.headline, detail: R.branchTaxFiling.microCopy, tone: "warn", label: U.st.tax };
      case "qualified": return { title: nb(R[`tier${tier}Badge` as "tier100Badge"]), detail: null, tone: "good", label: U.st.qualified };
      case "unconfirmed": return { title: nb(U.tierUnconfirmed.replace("{n}", String(tier === "100" ? 100 : tier))), detail: null, tone: "warn", label: U.st.unconfirmed };
      default: return { title: U.pendH, detail: U.pendS, tone: "neutral", label: U.st.none };
    }
  })();
  const book = (extra: Record<string, string>) => withBookingParams(bookingUrl, { utm_source: "cdcp-calculator", ...extra });
  const announce = screen !== "result" ? "" : `${head.title}${showFigure && est ? `. ${U.cost} ${plain(est.fee, lang)}, ${U.paid} ${plain(est.covered, lang)}. ${U.share} ${plain(est.patient, lang)}` : ""}`;

  /* ----- setup screens ----- */
  const yn = (k: "ins" | "filed"): Option<YesNo>[] => {
    const s = k === "ins" ? L.step1 : L.step3;
    return k === "ins"
      ? [{ value: "yes", label: s.yes, icon: ShieldCheck }, { value: "no", label: s.no, icon: User }]
      : [{ value: "yes", label: s.yes, icon: FileText }, { value: "no", label: s.no, icon: Clock }];
  };
  const incomeOptions: Option<IncomeKey>[] = INCOME_KEYS.map((k) => ({ value: k, label: nb(L.step2[k]), icon: Wallet }));
  const visitOptions: Option<VisitId>[] = VISITS.map((v) => ({ value: v.id, label: U.pk[v.id][0], hint: U.pk[v.id][1], icon: VISIT_ICON[v.id] }));
  const answerText = (k: Step): string | null =>
    k === "ins" ? (a.ins ? (a.ins === "yes" ? L.step1.yes : L.step1.no) : null)
    : k === "inc" ? (a.inc ? nb(L.step2[a.inc]) : null) : a.filed ? (a.filed === "yes" ? L.step3.yes : L.step3.no) : null;
  const stepLabel = (k: Step) => (k === "ins" ? U.ins : k === "inc" ? U.inc : U.filed);
  const chip = (bare: boolean) => (
      <div role="group" aria-label={U.yours} className={`flex flex-wrap items-center rounded-2xl bg-[var(--paper)] py-0.5 pl-0.5 pr-0 text-xs font-semibold @md:pl-1 @md:text-[13px] ${bare ? "" : "border border-[var(--line)]"}`}>
        {steps.map((k, i) => {
          const Icon = k === "ins" ? User : k === "inc" ? Wallet : FileText;
          const text = k === "ins" ? U.chipIns[a.ins === "yes" ? "yes" : "no"] : k === "inc" ? nb(L.step2[a.inc as IncomeKey]) : U.chipFiled[a.filed === "yes" ? "yes" : "no"];
          return (
            <span key={k} className="inline-flex items-center">
              {i > 0 && <span aria-hidden className="opacity-40">•</span>}
              <button type="button" onClick={() => { pointer.current = false; setCur(k); }} aria-label={`${U.edit} : ${stepLabel(k)}, ${answerText(k)}`}
                className={`inline-flex min-h-11 items-center gap-1.5 rounded-lg px-1 transition hover:bg-[var(--tint)] @md:px-1.5 ${FOCUS}`}>
                <Icon className="hidden size-4 shrink-0 opacity-70 @md:block" aria-hidden /><span>{text}</span>
              </button>
            </span>
          );
        })}
        <button type="button" onClick={() => { pointer.current = false; setCur(steps[0]); }} aria-label={U.edit}
          className={`ml-auto inline-flex min-h-11 items-center rounded-lg px-1.5 text-xs font-semibold @md:underline @md:px-1.5 @md:text-[13px] decoration-[var(--a)] decoration-2 underline-offset-4 hover:decoration-[var(--ink)] ${FOCUS}`}><span className="hidden @md:inline">{U.edit}</span><Pencil className="size-4 @md:hidden" aria-hidden /></button>
      </div>
  );

  const onPointer = (p: boolean) => (pointer.current = p);

  /* ----- result dashboard ----- */
  const coveredPct = est && est.fee > 0 ? Math.max(0, Math.min(100, (est.covered / est.fee) * 100)) : 0;
  const notes: { tone: "bad" | "warn"; text: string }[] = [];
  if (est && !est.bad) {
    const x = (U.pk[est.visit] as readonly string[])[2];
    if (x) notes.push({ tone: "bad", text: x });
    if (est.known && est.preAuth && est.covered) notes.push({ tone: "warn", text: U.pre });
    if (est.lab) notes.push({ tone: "bad", text: U.lab });
    if (est.excluded) notes.push({ tone: "bad", text: U.excl });
  }
  const phoneHref = phone ? `tel:${phone.replace(/[^\d+]/g, "")}` : null;
  const pill = `inline-flex min-h-11 items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--tint)] px-3.5 font-semibold text-[var(--ink)] transition hover:border-[var(--p)] hover:bg-[var(--paper)] ${FOCUS}`;
  const frontDesk = (phone || email) && (
    <div className="rounded-xl border border-l-[3px] border-[var(--line)] border-l-[var(--a)] bg-[var(--paper)] px-4 py-3 text-sm leading-relaxed text-[var(--ink)]">
      <p className="font-semibold">{L.skipPrompt}</p>
      <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1.5">
        {phoneHref && <a href={phoneHref} className={pill}><Phone className="size-4" aria-hidden />{L.skipCall}</a>}
        {phoneHref && email ? <span>{L.skipOr}</span> : null}
        {email && <a href={`mailto:${email}`} className={pill}><Mail className="size-4" aria-hidden />{phone ? L.skipMail : L.skipMail[0].toUpperCase() + L.skipMail.slice(1)}</a>}
        <span>{phone && !email ? L.skipTailCall : L.skipTail}</span>
      </p>
    </div>
  );
  const ctaNode = (
    <div className="space-y-1">
      {oc === "insurance" && <CtaLink href={book({ branch: "insurance" })}>{R.branchInsurance.primaryCta}</CtaLink>}
      {oc === "income" && <CtaLink href={book({ branch: "income" })}>{R.branchIncome.primaryCta}</CtaLink>}
      {oc === "unconfirmed" && <CtaLink href={book({ branch: "unconfirmed" })}>{R.branchIncome.primaryCta}</CtaLink>}
      {oc === "tax" && (<>
        <CtaLink href={L.craMyAccountUrl} external>{R.branchTaxFiling.primaryCta}</CtaLink>
        <CtaLink variant="secondary" href={book({ branch: "tax-filing", suggestedDate: weeksIso(4) })}>{R.branchTaxFiling.secondaryCta}</CtaLink></>)}
      {oc === "qualified" && (<>
        <div className="space-y-1.5 pb-3">
          <a href={L.cdcpApplyUrl} target="_blank" rel="noopener noreferrer"
            className={`flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-white/30 px-4 py-3 text-center text-sm font-semibold leading-snug transition-all duration-150 hover:border-white/60 hover:bg-white/10 active:scale-[0.99] motion-reduce:transition-none motion-reduce:transform-none ${FOCUS}`}>
            <span>{U.applyLink}</span><ArrowUpRight className="size-4 shrink-0" aria-hidden />
          </a>
          <p className="px-1 text-center text-xs leading-snug opacity-80">{U.applySub}</p>
        </div>
        <CtaLink href={book({ branch: "qualified", cdcpTier: tier ?? "", suggestedDate: weeksIso(7) })}>{R.branchQualified.step2Cta}</CtaLink>
        <p className="px-1 pt-2 text-center text-xs leading-snug opacity-80">{U.bookSub}</p></>)}
    </div>
  );
  const covers = est && est.tierPct && (est.covered > 0 || !est.excluded);

  const resultScreen = (
    <motion.div key="result" initial={{ opacity: 0, scale: reduce ? 1 : 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: reduce ? 1 : 0.96 }}
      transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 300, damping: 25 }} className="space-y-5 px-6 pb-6 pt-3">
      <div className="space-y-3">
        <p className="inline-flex items-center gap-2 rounded-full border border-white/25 px-3 py-1 text-xs font-semibold">
          <span className={head.tone === "good" ? "text-[var(--good-on-panel)]" : head.tone === "bad" ? "text-[#ffb4ab]" : "text-[#ffd8a8]"}>
            {head.tone === "good" ? <ShieldCheck className="size-4" aria-hidden /> : <Info className="size-4" aria-hidden />}</span>{head.label}
        </p>
        <h2 data-autofocus tabIndex={-1} className="font-sans text-[1.35rem] font-medium leading-tight tracking-tight text-balance outline-none">{head.title}</h2>
        {head.detail && <p className="text-[13px] leading-relaxed opacity-85">{head.detail}</p>}
      </div>

      {needAppt && showFigure && est && (
        <div className="space-y-3">
          <div>
            <p className="text-[13px] font-semibold">{U.share}</p>
            <p aria-hidden className="mt-1 font-[family-name:var(--cw-display,var(--cdcp-display,inherit))] text-6xl font-black leading-none tracking-tight"><motion.span className="inline-block" initial={{ opacity: 0, y: reduce ? 0 : 10 }} animate={{ opacity: 1, y: 0 }}
                transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 300, damping: 20 }}>
                <CountUp value={est.patient} lang={lang} reduce={reduce} />
              </motion.span></p>
          </div>
          {est.fee > 0 && (<>
            <div aria-hidden className="flex h-2.5 overflow-hidden rounded-full bg-[var(--onpanel)]/90">
              <motion.div className="h-full bg-[var(--good-on-panel)]" initial={{ width: 0 }} animate={{ width: `${coveredPct}%` }} transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 120, damping: 24, delay: 0.15 }} />
            </div>
            <dl className="grid grid-cols-2 divide-x divide-white/20 text-[13px] tabular-nums">
              <div className="pr-3"><dt className="opacity-75">{U.cost}</dt><dd className="mt-0.5 text-base font-bold">{plain(est.fee, lang)}</dd></div>
              <div className="pl-4"><dt className="opacity-75">{U.paid}</dt><dd className="mt-0.5 text-base font-bold">{est.covered ? "− " : ""}{plain(est.covered, lang)}</dd></div>
            </dl>
            <p className="text-xs leading-snug opacity-75">{nb(covers ? U.grid.replace("{n}", String(Math.round((est.tierPct ?? 0) * 100))) : est.tierPct ? U.noCover : U.noelig)} · {U.estNote}</p>
          </>)}
        </div>
      )}
      {est?.bad && <p className="text-[15px] leading-snug text-amber-300">{U.unavailable}</p>}

      {ctaNode}
      {oc === "tax" && showFigure && <p className="text-xs opacity-80">{U.whenIssued}</p>}
      {oc === "unconfirmed" && showFigure && <p className="text-xs opacity-80">{U.ifQualify}</p>}
      {showFigure && est && est.fee > 0 && est.patient === 0 && <p className="text-xs opacity-80">{U.full}</p>}

      {est && !est.bad && (
        <div className="space-y-1 text-[13px] leading-relaxed">
          <p><b>{U.incl}</b>{lang === "fr" ? " : " : ": "}{U.pk[est.visit][1]}</p>
          {notes.map((n) => <p key={n.text} className="text-amber-300">{n.text}</p>)}
        </div>
      )}

      {(oc === "qualified" || oc === "unconfirmed" || (est && !est.bad)) && (
        <Drawer reduce={reduce} title={R.billingNoticeHeading}>
          {(oc === "qualified" || oc === "unconfirmed") && <p className="border-l-2 border-[var(--a)] pl-3"><b>{R.billingNoticeHeading}.</b> {R.billingNoticeBody}</p>}
          {(oc === "qualified" || oc === "unconfirmed") && <p className="opacity-85">{U.ramq}</p>}
          {est && !est.bad && <p className="opacity-85">{U.disc}</p>}
          {oc === "qualified" && <p className="opacity-85">{R.sourceNote}</p>}
          {(oc === "qualified" || oc === "unconfirmed") && ([["standard", R.coverageMatrix.standard], ["major", R.coverageMatrix.major], ["excluded", R.coverageMatrix.excluded]] as const).map(([k, m]) => (
            <details key={k} className="rounded-xl border border-white/15 px-3 py-2" open={k === "standard"}>
              <summary className={`cursor-pointer text-[13px] font-semibold ${FOCUS}`}>{m.title} <span className="font-normal opacity-75">· {m.subtitle}</span></summary>
              <ul className="mt-2 list-disc space-y-1 pl-5">{m.services.map((x) => <li key={x}>{x}</li>)}</ul>
              <p className="mt-2 text-xs opacity-80">{m.note}</p>
            </details>
          ))}
        </Drawer>
      )}
      {oc === "insurance" && !!insurers?.length && <Drawer reduce={reduce} title={U.insurers}><p>{insurers.join(" · ")}</p></Drawer>}
      {frontDesk}
      <button type="button" onClick={clear} className={`inline-flex min-h-11 items-center text-[13px] font-semibold underline underline-offset-4 opacity-80 hover:opacity-100 ${FOCUS}`}>{U.clear}</button>
    </motion.div>
  );

  const slide = {
    enter: (d: number) => ({ x: reduce ? 0 : d * 40, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: reduce ? 0 : -d * 40, opacity: 0 }),
  };
  const slideT = reduce ? { duration: 0 } : { type: "spring" as const, stiffness: 380, damping: 36 };

  const body = screen === "result" ? resultScreen : (
    <motion.div key={screen} custom={dir.current} variants={slide} initial="enter" animate="center" exit="exit" transition={slideT} className="px-6 pb-6 pt-3">
      {view && (<>
        {view === "ins" && <Choice name={`${uid}ins`} legend={U.ins} hint={U.insI} options={yn("ins")} value={a.ins} onChange={(v) => set("ins", v)} onPointer={onPointer} reduce={reduce} />}
        {view === "inc" && <Choice name={`${uid}inc`} legend={U.inc} hint={U.incI} options={incomeOptions} value={a.inc} onChange={(v) => set("inc", v)} onPointer={onPointer} reduce={reduce} columns={2} />}
        {view === "filed" && <Choice name={`${uid}filed`} legend={U.filed} hint={U.filedI} options={yn("filed")} value={a.filed} onChange={(v) => set("filed", v)} onPointer={onPointer} reduce={reduce} />}
        {a[view] && cur === view && (
          <div className="mt-3 flex justify-end">
            <button type="button" onClick={() => setCur(null)} className={`inline-flex min-h-11 items-center gap-1 rounded-xl border border-[var(--ink)] px-4 text-[13px] font-semibold transition hover:bg-[var(--ink)] hover:text-[var(--paper)] ${FOCUS}`}>{U.cont}<ChevronRight className="size-4" aria-hidden /></button>
          </div>
        )}
      </>)}
      {screen === "appt" && <><div className="mb-4">{chip(false)}</div><Choice name={`${uid}appt`} legend={U.appt} options={visitOptions} value={a.appt} onChange={(v) => set("appt", v)} onPointer={onPointer} reduce={reduce} /></>}
    </motion.div>
  );

  const stepN = view ? steps.indexOf(view) + 1 : steps.length;
  return (
    <section ref={root} aria-label={U.label} style={themeVars(theme, stickyTop)}
      className={`@container mx-auto w-full max-w-lg overflow-hidden rounded-3xl border shadow-2xl transition-colors duration-500 motion-reduce:transition-none ${dark ? "border-white/10 bg-[var(--panel)] text-[var(--onpanel)]" : "border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"} ${className}`}>
      <div role="status" className="sr-only">{announce}</div>
      <AutoHeight reduce={reduce}>
        <div className="px-6 pt-4">
          <p className="truncate text-[11px] font-semibold uppercase tracking-wider opacity-60">{HEADER[lang]}{clinicName ? ` • ${clinicName}` : ""}</p>
        </div>
        <div className="flex min-h-11 items-center justify-between gap-3 px-4 pt-1">
          {canBack
            ? <button type="button" onClick={goBack} aria-label={L.back} className={`inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-[13px] font-semibold ${dark ? "hover:bg-white/10" : "hover:bg-[var(--tint)]"} ${FOCUS}`}><ChevronLeft className="size-5" aria-hidden /><span>{L.back}</span></button>
            : <span />}
          {view && <Dots n={stepN} t={steps.length} label={(a.ins ? U.qn : U.qn.replace(/ (sur|of) \{t\}/, "")).replace("{n}", String(stepN)).replace("{t}", String(steps.length))} />}
        </div>
        <div ref={stage}>
          <AnimatePresence mode="wait" initial={false} custom={dir.current}>{body}</AnimatePresence>
        </div>
      </AutoHeight>
    </section>
  );
}

export { CdcpSingleBoxWidget as EmbeddableDentalCalculator };
export default CdcpSingleBoxWidget;
