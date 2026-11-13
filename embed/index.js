/*!
 * <cdcp-calculator> — white-label CDCP (Canadian Dental Care Plan) eligibility & co-pay estimator.
 * Zero dependencies. Shadow DOM (open). Safe to paste into any CMS.
 * © SSS Marketing — sss.marketing
 *
 * Usage:
 *   <script src="https://sss.marketing/embed/index.js" defer></script>
 *   <cdcp-calculator
 *     data-clinic-name="Maple Valley Dental"
 *     data-primary-color="#0F766E"
 *     data-booking-url="https://example.com/book"
 *     data-phone="+1 555 555 5555"
 *     data-lang="en"            en | fr
 *     data-province="ON">       QC ON BC AB NS NB PE MB SK NL YT NT NU
 *   </cdcp-calculator>
 *   Optional: data-analytics="off" stops the anonymous usage counts for that clinic.
 *
 * Figures: 2026 provincial fee guides vs the federal CDCP Dental Benefit Grid,
 * per-visit bundles supplied by SSS (sss.marketing). Estimates, not quotes.
 */
(function () {
  "use strict";
  if (typeof window === "undefined" || !("customElements" in window)) return;
  if (window.customElements.get("cdcp-calculator")) return;

  /* ---------- CDCP engine ---------- */

  // Adjusted family net income (CRA line 23600) → share of the CDCP grid the plan pays.
  var TIER_PCT = { under70: 1, band70: 0.6, band80: 0.4, over90: 0 };

  // Per-visit bundles: f = provincial fee-guide total, g = CDCP grid total (2026).
  // QC totals are the sum of the same ACDQ procedure codes used on sss.marketing
  // (new: 01103+02102+11112+12101, recall: 01202+11112, emerg: 01205+02102).
  var BUNDLES = {
    QC: { new: { f: 344,    g: 268    }, recall: { f: 218,    g: 178    }, emerg: { f: 136, g: 91  } },
    ON: { new: { f: 423,    g: 342    }, recall: { f: 240,    g: 190    }, emerg: { f: 148, g: 102 } },
    BC: { new: { f: 418,    g: 326.1  }, recall: { f: 187.9,  g: 182.54 }, emerg: { f: 137, g: 80.43 } },
    AB: { new: { f: 466.1,  g: 421.52 }, recall: { f: 255.55, g: 244.56 }, emerg: { f: 191.15, g: 162.2 } },
    NS: { new: { f: 296,    g: 278    }, recall: { f: 155,    g: 173    }, emerg: { f: 148, g: 100 } },
    NB: { new: { f: 348,    g: 296    }, recall: { f: 171,    g: 157.5  }, emerg: { f: 140, g: 94  } },
    PE: { new: { f: 334,    g: 288    }, recall: { f: 161,    g: 154    }, emerg: { f: 142, g: 96  } },
    MB: { new: { f: 346.91, g: 295.09 }, recall: { f: 188.17, g: 165.14 }, emerg: { f: 130, g: 92  } },
    SK: { new: { f: 321,    g: 278    }, recall: { f: 151.8,  g: 142    }, emerg: { f: 113, g: 90  } },
    NL: { new: { f: 383.92, g: 314    }, recall: { f: 214.21, g: 188    }, emerg: { f: 145, g: 100 } },
    YT: { new: { f: 462,    g: 382    }, recall: { f: 226,    g: 202    }, emerg: { f: 162, g: 124 } },
    NT: { new: { f: 509,    g: 422    }, recall: { f: 252,    g: 220    }, emerg: { f: 176, g: 134 } },
    NU: { new: { f: 544,    g: 454    }, recall: { f: 270,    g: 234    }, emerg: { f: 190, g: 146 } }
  };
  var PROVS = ["QC","ON","BC","AB","NS","NB","PE","MB","SK","NL","YT","NT","NU"];
  var GUIDE = { QC:"ACDQ", ON:"ODA", BC:"BCDA", AB:"ADA", NS:"NSDA", NB:"NBDS", PE:"DAPEI", MB:"MDA", SK:"CDSS", NL:"NLDA", YT:"", NT:"", NU:"" };

  // covered = min(grid × tier, fee); patient = fee − covered
  //         = co-pay (grid × (1 − tier)) + fee-guide gap (max(0, fee − grid)).
  function estimate(province, visit, tierId) {
    var b = (BUNDLES[province] || BUNDLES.ON)[visit];
    var t = TIER_PCT[tierId] || 0;
    var covered = Math.round(Math.min(b.g * t, b.f) * 100) / 100;
    var patient = Math.round((b.f - covered) * 100) / 100;
    var copay = Math.round(Math.min(b.g * (1 - t), b.f) * 100) / 100;
    var gap = Math.round(Math.max(b.f - b.g, 0) * 100) / 100;
    return { fee: b.f, grid: b.g, covered: covered, patient: patient, copay: copay, gap: gap, tier: t };
  }

  /* ---------- strings ---------- */

  var STR = {
    en: {
      title: "Canadian Dental Care Plan",
      subtitle: "Check your eligibility and estimate your out-of-pocket cost in under a minute.",
      defaultClinic: "Our Dental Clinic",
      qOf: function (a, b) { return "Question " + a + " of " + b; },
      back: "Back",
      restart: "Start over",
      q1: "Do you (or a family member) have access to private dental insurance?",
      q1hint: "Through an employer, a private plan, or a health spending account.",
      q1yes: "Yes, I have private coverage",
      q1no: "No private coverage",
      q2: "Are you a Canadian resident for tax purposes?",
      q2yes: "Yes",
      q2no: "No",
      q3: "What was your adjusted family net income on your last tax return?",
      q3hint: "Line 23600 of your CRA Notice of Assessment.",
      q3a: "Under $70,000", q3aH: "CDCP pays 100% of its grid",
      q3b: "$70,000 – $79,999", q3bH: "CDCP pays 60% — you co-pay 40%",
      q3c: "$80,000 – $89,999", q3cH: "CDCP pays 40% — you co-pay 60%",
      q3d: "$90,000 or more", q3dH: "Not eligible",
      q4: "Have you (and your spouse or partner, if applicable) filed last year's tax return?",
      q4yes: "Yes, filed",
      q4no: "Not yet",
      badgeIns: "Private insurance", badgeNo: "Not eligible", badgeTax: "Tax return required",
      outIns: "Private insurance means CDCP is not open to you — and that's good news.",
      outInsBody: "The CDCP is only for people without access to private dental coverage. Your plan covers care right away: no application, no waiting period, no card to wait for.",
      outRes: "CDCP requires Canadian tax residency.",
      outResBody: "You must be a Canadian resident for tax purposes to apply. If your residency status changes, come back and re-check any time.",
      outInc: "Above $90,000 family income, CDCP coverage is 0%.",
      outIncBody: "Federal coverage stops at $90,000 in adjusted family net income. Ask us about membership plans and flexible payment options instead.",
      outTax: "One step left: file your tax return.",
      outTaxBody: "Health Canada verifies income through the CRA, so last year's return must be filed before you apply. Once it's filed, you can apply right away.",
      okBadge: "Eligible based on your answers",
      okTitle: function (p) { return "You qualify for up to " + p + "% CDCP coverage."; },
      estProv: "Province or territory",
      estVisit: "Appointment type",
      vNew: "First visit (exam, X-rays, cleaning)",
      vRecall: "Existing patient (exam + cleaning)",
      vEmerg: "Emergency (exam + X-ray)",
      youPay: "Your estimated share",
      ofFee: function (m) { return "of a " + m + " visit"; },
      barCdcp: "CDCP pays",
      barYou: "You pay",
      rowFee: "Typical clinic fee",
      rowCdcp: "CDCP pays",
      rowCopay: function (p) { return "Co-pay — " + p + "% of the grid"; },
      rowGap: "Fee-guide gap",
      rowYou: "Your estimated share",
      gapWhy: "CDCP pays by the federal CDCP Dental Benefit Grid, not your province's dentist fee guide. When the clinic fee is above the grid, that difference is yours on top of the co-pay. Ask for a written estimate before treatment.",
      estNote: function (guide) { return "Estimate from the " + (guide ? guide + " 2026 fee guide" : "2026 territorial fee rates") + " vs the CDCP grid — not a quote."; },
      nextSteps: "Your next steps",
      applyT: "Apply for your CDCP card",
      applyS: "Takes about 10 minutes on canada.ca. The card arrives in 4–8 weeks.",
      applyCta: "Apply on canada.ca",
      renewT: "Renew every year, before June 1",
      renewS: "Coverage runs July 1 to June 30. It does not renew on its own.",
      renewSteps: ["File your tax return", "Receive your Notice of Assessment", "Renew by June 1"],
      renewWarn: "Miss the deadline and coverage ends June 30. Care received during the gap is not reimbursed, so you pay the full fee at the front desk.",
      renewHow: "Renew in My Service Canada Account or call 1‑833‑537‑4342. Renewing is always free.",
      renewMember: "Already a CDCP member? The same rule applies every year: file your taxes, then renew before June 1, or coverage ends June 30.",
      bookT: function (c) { return "Book at " + c; },
      bookS: "Booking 6–8 weeks out lines your visit up with your card's arrival.",
      ctaBook: "Book an appointment",
      ctaCall: function (n) { return "Call " + n; },
      provNames: { QC:"Quebec", ON:"Ontario", BC:"British Columbia", AB:"Alberta", NS:"Nova Scotia", NB:"New Brunswick", PE:"Prince Edward Island", MB:"Manitoba", SK:"Saskatchewan", NL:"Newfoundland and Labrador", YT:"Yukon", NT:"Northwest Territories", NU:"Nunavut" },
      money: function (n) { return "$" + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ","); },
      money0: function (n) { var r = Math.round(n); return "$" + String(r).replace(/\B(?=(\d{3})+(?!\d))/g, ","); },
      powered: "Powered by SSS Marketing",
      poweredHover: "Get this calculator for your clinic"
    },
    fr: {
      title: "Régime canadien de soins dentaires",
      subtitle: "Vérifiez votre admissibilité et estimez votre part en moins d'une minute.",
      defaultClinic: "Notre clinique dentaire",
      qOf: function (a, b) { return "Question " + a + " sur " + b; },
      back: "Retour",
      restart: "Recommencer",
      q1: "Avez-vous (ou un membre de votre famille) accès à une assurance dentaire privée ?",
      q1hint: "Par un employeur, un régime privé ou un compte de gestion santé.",
      q1yes: "Oui, j'ai une couverture privée",
      q1no: "Aucune couverture privée",
      q2: "Êtes-vous résident canadien aux fins de l'impôt ?",
      q2yes: "Oui",
      q2no: "Non",
      q3: "Quel était votre revenu familial net rajusté sur votre dernière déclaration ?",
      q3hint: "Ligne 23600 de votre avis de cotisation de l'ARC.",
      q3a: "Moins de 70 000 $", q3aH: "Le RCSD paie 100 % de sa grille",
      q3b: "70 000 $ – 79 999 $", q3bH: "Le RCSD paie 60 % — quote-part de 40 %",
      q3c: "80 000 $ – 89 999 $", q3cH: "Le RCSD paie 40 % — quote-part de 60 %",
      q3d: "90 000 $ ou plus", q3dH: "Non admissible",
      q4: "Avez-vous (et votre conjoint·e, le cas échéant) produit votre déclaration d'impôts de l'an dernier ?",
      q4yes: "Oui, produite",
      q4no: "Pas encore",
      badgeIns: "Assurance privée", badgeNo: "Non admissible", badgeTax: "Déclaration requise",
      outIns: "Une assurance privée écarte le RCSD — et c'est une bonne nouvelle.",
      outInsBody: "Le RCSD s'adresse uniquement aux personnes sans couverture dentaire privée. Votre régime couvre les soins dès maintenant : sans demande, sans délai, sans carte à attendre.",
      outRes: "Le RCSD exige la résidence fiscale canadienne.",
      outResBody: "Vous devez être résident canadien aux fins de l'impôt pour faire une demande. Si votre statut change, revenez vérifier en tout temps.",
      outInc: "Au-delà de 90 000 $ de revenu familial, la couverture RCSD est de 0 %.",
      outIncBody: "La couverture fédérale s'arrête à 90 000 $ de revenu familial net rajusté. Parlez-nous de nos plans de financement.",
      outTax: "Une étape restante : produire votre déclaration d'impôts.",
      outTaxBody: "Santé Canada vérifie le revenu auprès de l'ARC : la déclaration de l'an dernier doit être produite avant la demande. Une fois produite, vous pouvez faire la demande immédiatement.",
      okBadge: "Admissible selon vos réponses",
      okTitle: function (p) { return "Vous êtes admissible à une couverture RCSD pouvant atteindre " + p + " %."; },
      estProv: "Province ou territoire",
      estVisit: "Type de rendez-vous",
      vNew: "Première visite (examen, radiographies, nettoyage)",
      vRecall: "Patient actuel (examen + nettoyage)",
      vEmerg: "Urgence (examen + radiographie)",
      youPay: "Votre part estimée",
      ofFee: function (m) { return "pour une visite de " + m; },
      barCdcp: "Versé par le RCSD",
      barYou: "Votre part",
      rowFee: "Honoraires typiques de la clinique",
      rowCdcp: "Versé par le RCSD",
      rowCopay: function (p) { return "Quote-part — " + p + " % de la grille"; },
      rowGap: "Écart du guide tarifaire",
      rowYou: "Votre part estimée",
      gapWhy: "Le RCSD paie selon la grille fédérale du RCSD, pas selon le guide tarifaire des dentistes de votre province. Quand les honoraires dépassent la grille, la différence s'ajoute à votre quote-part. Demandez une estimation écrite avant un traitement.",
      estNote: function (guide) { return "Estimation selon le guide " + (guide ? guide + " 2026" : "des tarifs territoriaux 2026") + " et la grille du RCSD — pas une soumission."; },
      nextSteps: "Vos prochaines étapes",
      applyT: "Demandez votre carte RCSD",
      applyS: "Environ 10 minutes sur canada.ca. La carte arrive en 4 à 8 semaines.",
      applyCta: "Faire la demande sur canada.ca",
      renewT: "Renouvelez chaque année, avant le 1er juin",
      renewS: "La couverture va du 1er juillet au 30 juin. Elle ne se renouvelle pas toute seule.",
      renewSteps: ["Produisez votre déclaration d'impôts", "Recevez votre avis de cotisation", "Renouvelez avant le 1er juin"],
      renewWarn: "Sans renouvellement, la couverture prend fin le 30 juin. Les soins reçus pendant l'interruption ne sont pas remboursés : vous payez le plein tarif à la réception.",
      renewHow: "Renouvelez dans Mon dossier Service Canada ou au 1‑833‑537‑4342. Le renouvellement est toujours gratuit.",
      renewMember: "Déjà membre du RCSD ? La règle s'applique chaque année : produisez vos impôts, puis renouvelez avant le 1er juin, sinon la couverture prend fin le 30 juin.",
      bookT: function (c) { return "Réservez chez " + c; },
      bookS: "Réserver dans 6 à 8 semaines aligne votre visite avec la réception de votre carte.",
      ctaBook: "Prendre rendez-vous",
      ctaCall: function (n) { return "Appeler " + n; },
      provNames: { QC:"Québec", ON:"Ontario", BC:"Colombie-Britannique", AB:"Alberta", NS:"Nouvelle-Écosse", NB:"Nouveau-Brunswick", PE:"Île-du-Prince-Édouard", MB:"Manitoba", SK:"Saskatchewan", NL:"Terre-Neuve-et-Labrador", YT:"Yukon", NT:"Territoires du Nord-Ouest", NU:"Nunavut" },
      money: function (n) { return n.toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " $"; },
      money0: function (n) { var r = Math.round(n); return String(r).replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " $"; },
      powered: "Propulsé par SSS Marketing",
      poweredHover: "Obtenez ce calculateur pour votre clinique"
    }
  };
  var APPLY_URL = {
    en: "https://www.canada.ca/en/services/benefits/dental/dental-care-plan/apply.html",
    fr: "https://www.canada.ca/fr/services/prestations/dentaire/regime-soins-dentaires/demande.html"
  };
  var SSS_URL = "https://sss.marketing?utm_source=cdcp_widget&utm_medium=embed&utm_campaign=powered_by";

  /* ---------- color helpers (white-label theming) ---------- */

  function hexToRgb(hex) {
    var m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(hex || "").trim());
    if (!m) return null;
    var h = m[1];
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  function mix(rgb, target, amt) { return rgb.map(function (c, i) { return Math.round(c + (target[i] - c) * amt); }); }
  function css(rgb) { return "rgb(" + rgb.join(",") + ")"; }
  function luma(rgb) { return (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255; }

  /* ---------- styles (fully scoped inside the shadow root) ---------- */
  // Document styles can override :host at normal importance, so typography lives on .card
  // (inner shadow nodes are untouchable from outside; only inherited properties cross in).

  var SHEET = "" +
    ":host{all:initial;display:block;contain:content;-webkit-text-size-adjust:100%}" +
    "*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}" +
    "button{font:inherit;background:none;border:0;cursor:pointer;color:inherit}" +
    "select{font:inherit}" +
    '.card{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;font-weight:400;letter-spacing:normal;text-transform:none;text-align:left;' +
      "position:relative;max-width:33rem;margin:0 auto;background:var(--paper);color:var(--ink);border:1px solid var(--line);border-radius:16px;overflow:hidden;box-shadow:0 1px 2px rgba(22,33,31,.05),0 12px 32px rgba(22,33,31,.07)}" +
    /* header */
    ".hd{padding:20px 24px 16px;border-bottom:1px solid var(--line)}" +
    ".hd-row{display:flex;justify-content:space-between;align-items:baseline;gap:12px}" +
    ".plan{font-size:12px;font-weight:650;color:var(--pd)}" +
    ".clinic{font-size:12.5px;font-weight:600;color:var(--mut);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:48%}" +
    ".hd h2{font-size:18px;line-height:1.35;font-weight:700;margin-top:7px;letter-spacing:-.01em}" +
    /* body + screen swap */
    ".body{padding:20px 24px 20px}" +
    "@keyframes cdcpIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}" +
    ".screen{animation:cdcpIn .16s ease-out}" +
    /* step dots */
    ".steps{display:flex;align-items:center;gap:6px;margin-bottom:6px}" +
    ".steps .n{font-size:12px;color:var(--mut);margin-right:auto}" +
    ".dot{width:18px;height:4px;border-radius:2px;background:var(--line)}" +
    ".dot.on{background:var(--p)}" +
    /* questions */
    "fieldset{border:0}" +
    "legend{font-size:16px;line-height:1.4;font-weight:650;margin:10px 0 4px;letter-spacing:-.005em}" +
    ".hint{font-size:12.5px;color:var(--mut);margin-bottom:14px}" +
    ".nohint{margin-bottom:14px}" +
    ".opt{display:flex;align-items:center;gap:12px;width:100%;min-height:52px;text-align:left;padding:13px 15px;margin-bottom:9px;border:1.5px solid var(--line);border-radius:11px;background:var(--paper);transition:border-color .12s,background .12s,transform .06s}" +
    ".opt:hover{border-color:var(--p)}" +
    ".opt:active{transform:scale(.985)}" +
    ".opt:focus-visible,select:focus-visible,.cta:focus-visible,.ghost:focus-visible,.sss:focus-visible{outline:2.5px solid var(--p);outline-offset:2px}" +
    ".opt .tick{flex:none;width:19px;height:19px;border-radius:50%;border:1.5px solid #c6cfcd}" +
    ".opt b{display:block;font-weight:600;font-size:14.5px}" +
    ".opt small{display:block;font-size:12.5px;color:var(--mut);font-weight:400;margin-top:1px}" +
    ".opt[aria-checked=true]{border-color:var(--p);background:var(--tint)}" +
    ".opt[aria-checked=true] .tick{border-color:var(--p);background:var(--p);box-shadow:inset 0 0 0 3.5px var(--paper)}" +
    ".nav{display:flex;justify-content:space-between;align-items:center;margin-top:4px;min-height:34px}" +
    ".ghost{min-height:44px;padding:8px 12px;margin-left:-12px;font-size:13px;font-weight:600;color:var(--pd);border-radius:9px}" +
    ".ghost:hover{background:var(--tint)}" +
    /* outcomes */
    ".pill{display:inline-block;font-size:12px;font-weight:650;padding:4px 11px;border-radius:999px;margin:4px 0 12px}" +
    ".pill.ok{background:var(--tint);color:var(--pd)}" +
    ".pill.no{background:#faecec;color:#8f3232}" +
    ".pill.warn{background:#faf3e4;color:#7d5a1c}" +
    "h3{font-size:19px;line-height:1.3;font-weight:700;letter-spacing:-.01em;margin-bottom:8px}" +
    ".note{font-size:13.5px;color:var(--mut);margin-bottom:4px}" +
    /* result: figure + coverage bar */
    ".fig{margin:14px 0 6px}" +
    ".fig .lbl{font-size:12.5px;font-weight:600;color:var(--mut)}" +
    ".fig .amt{font-size:36px;font-weight:800;letter-spacing:-.02em;font-variant-numeric:tabular-nums;line-height:1.15;color:var(--ink)}" +
    ".fig .amt em{font-style:normal;font-size:14px;font-weight:500;color:var(--mut);letter-spacing:0;margin-left:6px}" +
    ".covbar{display:flex;height:10px;border-radius:5px;overflow:hidden;background:var(--line);margin:10px 0 7px}" +
    ".covbar i{display:block;height:100%}" +
    ".covbar .c1{background:var(--p)}" +
    ".covbar .c2{background:#c9d4d1}" +
    ".covkey{display:flex;justify-content:space-between;font-size:12px;color:var(--mut);margin-bottom:14px}" +
    ".covkey b{color:var(--ink);font-weight:650;font-variant-numeric:tabular-nums}" +
    ".covkey .k1::before,.covkey .k2::before{content:\"\";display:inline-block;width:8px;height:8px;border-radius:2px;margin-right:5px;vertical-align:0}" +
    ".covkey .k1::before{background:var(--p)}" +
    ".covkey .k2::before{background:#c9d4d1}" +
    /* selectors + ledger */
    ".sel{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:2px 0 14px}" +
    "@media(max-width:430px){.sel{grid-template-columns:1fr}}" +
    "label{display:block;font-size:12px;font-weight:600;color:var(--mut);margin-bottom:4px}" +
    "select{width:100%;min-height:44px;padding:9px 10px;border:1.5px solid var(--line);border-radius:9px;background:var(--paper);color:var(--ink)}" +
    ".ledger{border:1px solid var(--line);border-radius:12px;padding:4px 14px;background:var(--wash)}" +
    "table{width:100%;border-collapse:collapse;font-size:13.5px}" +
    "td{padding:9px 0;vertical-align:baseline}" +
    "tr+tr td{border-top:1px solid var(--line)}" +
    "td:last-child{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap;font-weight:650}" +
    "tr.cdcp td:last-child{color:var(--pd)}" +
    "tr.you td{font-weight:800}" +
    "tr.you td:first-child{font-weight:700}" +
    ".fine{font-size:12px;line-height:1.55;color:var(--mut);margin-top:11px}" +
    /* next-step action cards */
    ".nx{font-size:12.5px;font-weight:650;color:var(--mut);margin:18px 0 8px}" +
    ".act{border:1px solid var(--line);border-radius:12px;padding:14px 15px;margin-bottom:10px}" +
    ".act b{display:block;font-size:14.5px;font-weight:700;margin-bottom:2px}" +
    ".act p{font-size:12.5px;color:var(--mut);margin-bottom:11px}" +
    ".renew{background:var(--tint);border-color:color-mix(in srgb,var(--p) 28%,var(--line))}" +
    ".renew-h{display:flex;align-items:center;gap:8px;margin-bottom:2px}" +
    ".renew-h svg{width:16px;height:16px;flex:none;color:var(--pd)}" +
    ".renew-h b{margin:0}" +
    ".renew ol{list-style:none;display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:10px 0 11px;counter-reset:rs}" +
    ".renew li{counter-increment:rs;font-size:12px;font-weight:600;line-height:1.35;background:var(--paper);border:1px solid var(--line);border-radius:9px;padding:8px 9px}" +
    ".renew li::before{content:counter(rs);display:block;font-size:11px;font-weight:800;color:var(--pd);margin-bottom:2px;font-variant-numeric:tabular-nums}" +
    "@media(max-width:400px){.renew ol{grid-template-columns:1fr}}" +
    ".renew .warn{color:var(--ink);font-weight:550}" +
    ".renew .how{margin-bottom:0}" +
    ".ctas{display:flex;flex-wrap:wrap;gap:9px}" +
    ".cta{display:inline-flex;align-items:center;justify-content:center;min-height:46px;padding:11px 18px;border-radius:10px;font-size:14px;font-weight:650;text-decoration:none;text-align:center;flex:1 1 auto}" +
    ".cta.p{background:var(--p);color:var(--onp)}" +
    ".cta.p:hover{background:var(--pd)}" +
    ".cta.s{border:1.5px solid var(--p);color:var(--pd);background:var(--paper)}" +
    ".cta.s:hover{background:var(--tint)}" +
    /* footer + powered-by badge */
    ".ft{display:flex;justify-content:center;padding:12px 24px 14px;border-top:1px solid var(--line);background:var(--wash)}" +
    ".sss{display:inline-flex;align-items:center;gap:6px;font-size:11.5px;font-weight:550;color:#64748b;text-decoration:none;padding:5px 11px;border:1px solid var(--line);border-radius:999px;background:var(--paper)}" +
    ".sss svg{width:11px;height:11px;flex:none}" +
    ".sss .alt{display:none}" +
    ".sss:hover{color:var(--pd);border-color:var(--p)}" +
    ".sss:hover .base{display:none}" +
    ".sss:hover .alt{display:inline}" +
    "@media(prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}";

  var SEAL = '<svg viewBox="0 0 12 12" aria-hidden="true" fill="none"><path d="M6 .8 10.4 2.6v3C10.4 8.5 8.6 10.4 6 11.2 3.4 10.4 1.6 8.5 1.6 5.6v-3L6 .8Z" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round"/><path d="M4.1 6l1.3 1.3 2.5-2.6" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  /* ---------- anonymous usage counts ---------- */
  // Counts views, starts, results (tier or reason only), and booking / call / apply clicks per clinic site.
  // No cookies, no answers, nothing that identifies a patient. Off with data-analytics="off".
  var TRACK_URL = "https://zikfxleqejynrwelgpbc.supabase.co/functions/v1/collect";
  function pageOf() {
    // Inside the iframe shell (frame.html) the clinic's page is the referrer.
    try {
      if (window.top !== window && document.referrer) {
        var r = new URL(document.referrer);
        return { h: r.hostname, u: r.pathname };
      }
    } catch (e) {}
    return { h: location.hostname, u: location.pathname };
  }
  function noTrack(node) {
    if ((node.getAttribute("data-analytics") || "").toLowerCase() === "off") return true;
    if (navigator.webdriver) return true;
    try { if (localStorage.getItem("sss_notrack")) return true; } catch (e) {}
    return false;
  }
  function beacon(payload) {
    var body = JSON.stringify(payload);
    try {
      if (navigator.sendBeacon && navigator.sendBeacon(TRACK_URL, body)) return;
    } catch (e) {}
    try { fetch(TRACK_URL, { method: "POST", body: body, keepalive: true, mode: "no-cors" }); } catch (e) {}
  }

  /* ---------- component ---------- */

  function CdcpCalculator() {
    return Reflect.construct(HTMLElement, [], CdcpCalculator);
  }
  CdcpCalculator.prototype = Object.create(HTMLElement.prototype, { constructor: { value: CdcpCalculator } });
  Object.setPrototypeOf(CdcpCalculator, HTMLElement);

  CdcpCalculator.prototype.connectedCallback = function () {
    if (this._root) return;
    this._root = this.attachShadow({ mode: "open" });
    var lang = (this.getAttribute("data-lang") || "en").toLowerCase() === "fr" ? "fr" : "en";
    var provAttr = (this.getAttribute("data-province") || "").toUpperCase();
    this._cfg = {
      lang: lang,
      clinic: this.getAttribute("data-clinic-name") || STR[lang].defaultClinic,
      booking: this.getAttribute("data-booking-url") || "",
      phone: this.getAttribute("data-phone") || "",
      province: PROVS.indexOf(provAttr) >= 0 ? provAttr : (lang === "fr" ? "QC" : "ON")
    };
    this._state = { step: 0, ins: null, res: null, inc: null, filed: null, visit: "new", province: this._cfg.province };

    var rgb = hexToRgb(this.getAttribute("data-primary-color")) || hexToRgb("#0F766E");
    var dark = mix(rgb, [10, 18, 16], 0.28);
    var tint = mix(rgb, [255, 255, 255], 0.93);
    var onP = luma(rgb) > 0.6 ? "#16211f" : "#ffffff";
    var vars = ":host{--p:" + css(rgb) + ";--pd:" + css(dark) + ";--tint:" + css(tint) +
      ";--onp:" + onP + ";--ink:#16211f;--mut:#5e6b68;--paper:#ffffff;--wash:#f7f9f8;--line:#e3e8e6}";

    var style = document.createElement("style");
    style.textContent = vars + SHEET;
    this._root.appendChild(style);
    this._mount = document.createElement("div");
    this._root.appendChild(this._mount);
    this._noTrack = noTrack(this);
    this._render();
    this._watchView();
  };

  CdcpCalculator.prototype._t = function (name, outcome) {
    if (this._noTrack) return;
    var pg = pageOf();
    beacon({ k: "calc", n: name, h: pg.h, u: pg.u, c: this._cfg.clinic, lg: this._cfg.lang,
             p: this._state.province, o: outcome || null });
  };

  // One "view" per page load, when at least half the calculator is on screen.
  CdcpCalculator.prototype._watchView = function () {
    var self = this;
    if (this._noTrack) return;
    if (!("IntersectionObserver" in window)) { this._t("view"); return; }
    var io = new IntersectionObserver(function (entries) {
      if (entries.some(function (e) { return e.isIntersecting; })) {
        io.disconnect();
        self._t("view");
      }
    }, { threshold: 0.5 });
    io.observe(this);
  };

  CdcpCalculator.prototype._el = function (tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };

  CdcpCalculator.prototype._render = function () {
    var self = this, S = this._state, T = STR[this._cfg.lang], el = this._el.bind(this);
    this._mount.textContent = "";

    var card = el("div", "card");
    var hd = el("div", "hd");
    var row = el("div", "hd-row");
    row.appendChild(el("span", "plan", T.title));
    row.appendChild(el("span", "clinic", this._cfg.clinic));
    hd.appendChild(row);
    hd.appendChild(el("h2", null, T.subtitle));
    card.appendChild(hd);

    var body = el("div", "body");
    card.appendChild(body);
    var screen = el("div", "screen");
    body.appendChild(screen);

    var QUESTIONS = [
      { key: "ins",   q: T.q1, hint: T.q1hint, opts: [["yes", T.q1yes], ["no", T.q1no]] },
      { key: "res",   q: T.q2, opts: [["yes", T.q2yes], ["no", T.q2no]] },
      { key: "inc",   q: T.q3, hint: T.q3hint, opts: [["under70", T.q3a, T.q3aH], ["band70", T.q3b, T.q3bH], ["band80", T.q3c, T.q3cH], ["over90", T.q3d, T.q3dH]] },
      { key: "filed", q: T.q4, opts: [["yes", T.q4yes], ["no", T.q4no]] }
    ];

    function outcome() {
      if (S.ins === "yes") return "insurance";
      if (S.res === "no") return "residency";
      if (S.inc === "over90") return "income";
      if (S.filed === "no") return "tax";
      if (S.ins === "no" && S.res === "yes" && S.inc && S.filed === "yes") return "qualified";
      return null;
    }
    var done = outcome();
    if (done && !S.counted) {
      S.counted = true;
      this._t("result", done === "qualified" ? "q_" + S.inc : done);
    }

    if (!done && S.step < QUESTIONS.length) {
      this._question(screen, QUESTIONS, S.step);
    } else if (done && done !== "qualified") {
      var map = {
        insurance: { pill: "no",   label: T.badgeIns, h: T.outIns, p: T.outInsBody, book: true },
        residency: { pill: "no",   label: T.badgeNo,  h: T.outRes, p: T.outResBody, book: false },
        income:    { pill: "no",   label: T.badgeNo,  h: T.outInc, p: T.outIncBody, book: true },
        tax:       { pill: "warn", label: T.badgeTax, h: T.outTax, p: T.outTaxBody, book: true }
      };
      var d = map[done];
      screen.appendChild(el("span", "pill " + d.pill, d.label));
      screen.appendChild(el("h3", null, d.h));
      screen.appendChild(el("p", "note", d.p));
      if (done === "tax") {
        var acts = el("div", "ctas");
        acts.style.marginTop = "14px";
        var fileA = el("a", "cta s", T.applyCta);
        fileA.href = APPLY_URL[this._cfg.lang];
        fileA.target = "_blank"; fileA.rel = "noopener noreferrer";
        fileA.addEventListener("click", function () { self._t("apply"); });
        acts.appendChild(fileA);
        screen.appendChild(acts);
        var rm = el("p", "fine", T.renewMember);
        rm.style.marginTop = "14px";
        screen.appendChild(rm);
      }
      if (d.book) screen.appendChild(this._clinicActions(true));
      screen.appendChild(this._restart());
    } else if (done === "qualified") {
      this._result(screen);
    }

    var ft = el("div", "ft");
    var badge = el("a", "sss");
    badge.href = SSS_URL;
    badge.target = "_blank"; badge.rel = "noopener noreferrer";
    badge.setAttribute("aria-label", T.powered);
    badge.innerHTML = SEAL;
    var b1 = el("span", "base", T.powered);
    var b2 = el("span", "alt", T.poweredHover);
    badge.appendChild(b1); badge.appendChild(b2);
    ft.appendChild(badge);
    card.appendChild(ft);

    this._mount.appendChild(card);
    // Let a host shell (iframe resizer) know the layout changed.
    try { this.dispatchEvent(new CustomEvent("cdcp-rendered", { bubbles: true })); } catch (e) {}
  };

  CdcpCalculator.prototype._question = function (screen, QUESTIONS, idx) {
    var self = this, S = this._state, T = STR[this._cfg.lang], el = this._el.bind(this);
    var def = QUESTIONS[idx];

    var steps = el("div", "steps");
    steps.appendChild(el("span", "n", T.qOf(idx + 1, QUESTIONS.length)));
    for (var i = 0; i < QUESTIONS.length; i++) steps.appendChild(el("span", "dot" + (i <= idx ? " on" : "")));
    screen.appendChild(steps);

    var fs = el("fieldset");
    fs.setAttribute("role", "radiogroup");
    fs.setAttribute("aria-label", def.q);
    fs.appendChild(el("legend", null, def.q));
    fs.appendChild(def.hint ? el("p", "hint", def.hint) : el("div", "nohint"));
    def.opts.forEach(function (o) {
      var b = el("button", "opt");
      b.type = "button";
      b.setAttribute("role", "radio");
      b.setAttribute("aria-checked", S[def.key] === o[0] ? "true" : "false");
      b.appendChild(el("span", "tick"));
      var w = el("span");
      w.appendChild(el("b", null, o[1]));
      if (o[2]) w.appendChild(el("small", null, o[2]));
      b.appendChild(w);
      b.addEventListener("click", function () {
        if (!S.started) { S.started = true; self._t("start"); }
        S[def.key] = o[0];
        b.setAttribute("aria-checked", "true");
        setTimeout(function () { S.step += 1; self._render(); }, 110); // tap-to-advance with press feedback
      });
      fs.appendChild(b);
    });
    screen.appendChild(fs);

    var nav = el("div", "nav");
    if (idx > 0) {
      var back = el("button", "ghost", "← " + T.back);
      back.type = "button";
      back.addEventListener("click", function () {
        S.step -= 1;
        S[QUESTIONS[S.step].key] = null;
        self._render();
      });
      nav.appendChild(back);
    } else nav.appendChild(el("span"));
    screen.appendChild(nav);
  };

  CdcpCalculator.prototype._result = function (screen) {
    var self = this, S = this._state, T = STR[this._cfg.lang], el = this._el.bind(this);
    var pct = Math.round(TIER_PCT[S.inc] * 100);

    screen.appendChild(el("span", "pill ok", T.okBadge));
    screen.appendChild(el("h3", null, T.okTitle(pct)));

    var sel = el("div", "sel");
    var pw = el("div");
    var pl = el("label", null, T.estProv); pl.htmlFor = "cdcp-prov";
    var ps = el("select"); ps.id = "cdcp-prov";
    PROVS.forEach(function (k) {
      var o = el("option", null, T.provNames[k] + (GUIDE[k] ? " (" + GUIDE[k] + " 2026)" : " (2026)"));
      o.value = k; if (S.province === k) o.selected = true;
      ps.appendChild(o);
    });
    ps.addEventListener("change", function () { S.province = ps.value; self._render(); });
    pw.appendChild(pl); pw.appendChild(ps); sel.appendChild(pw);

    var vw = el("div");
    var vl = el("label", null, T.estVisit); vl.htmlFor = "cdcp-visit";
    var vs = el("select"); vs.id = "cdcp-visit";
    [["new", T.vNew], ["recall", T.vRecall], ["emerg", T.vEmerg]].forEach(function (v) {
      var o = el("option", null, v[1]); o.value = v[0];
      if (S.visit === v[0]) o.selected = true;
      vs.appendChild(o);
    });
    vs.addEventListener("change", function () { S.visit = vs.value; self._render(); });
    vw.appendChild(vl); vw.appendChild(vs); sel.appendChild(vw);
    screen.appendChild(sel);

    var e = estimate(S.province, S.visit, S.inc);

    var fig = el("div", "fig");
    fig.appendChild(el("div", "lbl", T.youPay));
    var amt = el("div", "amt", T.money(e.patient));
    var em = el("em", null, T.ofFee(T.money0(e.fee)));
    amt.appendChild(em);
    fig.appendChild(amt);
    screen.appendChild(fig);

    var bar = el("div", "covbar");
    var covPct = e.fee > 0 ? Math.max(0, Math.min(100, e.covered / e.fee * 100)) : 0;
    var c1 = el("i", "c1"); c1.style.width = covPct.toFixed(1) + "%";
    var c2 = el("i", "c2"); c2.style.width = (100 - covPct).toFixed(1) + "%";
    bar.appendChild(c1); bar.appendChild(c2);
    bar.setAttribute("role", "img");
    bar.setAttribute("aria-label", T.barCdcp + " " + T.money(e.covered) + " — " + T.barYou + " " + T.money(e.patient));
    screen.appendChild(bar);

    var key = el("div", "covkey");
    var k1 = el("span", "k1", T.barCdcp + " ");
    k1.appendChild(el("b", null, T.money(e.covered)));
    var k2 = el("span", "k2", T.barYou + " ");
    k2.appendChild(el("b", null, T.money(e.patient)));
    key.appendChild(k1); key.appendChild(k2);
    screen.appendChild(key);

    var ledger = el("div", "ledger");
    var tb = el("table");
    function trow(cls, a, b) {
      var tr = el("tr", cls || null);
      tr.appendChild(el("td", null, a));
      tr.appendChild(el("td", null, b));
      tb.appendChild(tr);
    }
    trow(null, T.rowFee, T.money(e.fee));
    trow("cdcp", T.rowCdcp, "− " + T.money(e.covered));
    if (e.tier < 1) trow(null, T.rowCopay(Math.round((1 - e.tier) * 100)), T.money(e.copay));
    trow(null, T.rowGap, T.money(e.gap));
    trow("you", T.rowYou, T.money(e.patient));
    ledger.appendChild(tb);
    screen.appendChild(ledger);
    screen.appendChild(el("p", "fine", T.gapWhy + " " + T.estNote(GUIDE[S.province])));

    screen.appendChild(el("p", "nx", T.nextSteps));
    var a1 = el("div", "act");
    a1.appendChild(el("b", null, T.applyT));
    a1.appendChild(el("p", null, T.applyS));
    var w1 = el("div", "ctas");
    var apply = el("a", "cta s", T.applyCta);
    apply.href = APPLY_URL[this._cfg.lang];
    apply.target = "_blank"; apply.rel = "noopener noreferrer";
    apply.addEventListener("click", function () { self._t("apply"); });
    w1.appendChild(apply);
    a1.appendChild(w1);
    screen.appendChild(a1);
    screen.appendChild(this._clinicActions(false));
    screen.appendChild(this._renewCard());
    screen.appendChild(this._restart());
  };

  // Annual renewal: the second-year "you forgot to renew" problem, explained before it happens.
  CdcpCalculator.prototype._renewCard = function () {
    var T = STR[this._cfg.lang], el = this._el.bind(this);
    var card = el("div", "act renew");
    var h = el("div", "renew-h");
    h.innerHTML = '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><rect x="2" y="3" width="12" height="11" rx="2" stroke="currentColor" stroke-width="1.4"/><path d="M2 6.5h12M5.5 1.5v3M10.5 1.5v3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M6 10l1.4 1.4L10.2 8.6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    h.appendChild(el("b", null, T.renewT));
    card.appendChild(h);
    card.appendChild(el("p", null, T.renewS));
    var ol = el("ol");
    ol.setAttribute("aria-label", T.renewT);
    T.renewSteps.forEach(function (s) { ol.appendChild(el("li", null, s)); });
    card.appendChild(ol);
    card.appendChild(el("p", "warn", T.renewWarn));
    card.appendChild(el("p", "how", T.renewHow));
    return card;
  };

  // The clinic conversion card: name, booking button, click-to-call.
  CdcpCalculator.prototype._clinicActions = function (standalone) {
    var self = this, T = STR[this._cfg.lang], el = this._el.bind(this);
    var act = el("div", "act");
    if (standalone) act.style.marginTop = "16px";
    act.appendChild(el("b", null, T.bookT(this._cfg.clinic)));
    if (!standalone) act.appendChild(el("p", null, T.bookS));
    var wrap = el("div", "ctas");
    if (this._cfg.booking) {
      var a = el("a", "cta p", T.ctaBook);
      a.href = this._cfg.booking;
      a.target = "_blank"; a.rel = "noopener noreferrer";
      a.addEventListener("click", function () { self._t("book"); });
      wrap.appendChild(a);
    }
    if (this._cfg.phone) {
      var tel = el("a", "cta " + (this._cfg.booking ? "s" : "p"), T.ctaCall(this._cfg.phone));
      tel.href = "tel:" + this._cfg.phone.replace(/[^\d+]/g, "");
      tel.addEventListener("click", function () { self._t("call"); });
      wrap.appendChild(tel);
    }
    if (!wrap.children.length) return el("span");
    act.appendChild(wrap);
    return act;
  };

  CdcpCalculator.prototype._restart = function () {
    var self = this, T = STR[this._cfg.lang];
    var nav = this._el("div", "nav");
    var b = this._el("button", "ghost", "↺ " + T.restart);
    b.type = "button";
    b.addEventListener("click", function () {
      self._state = { step: 0, ins: null, res: null, inc: null, filed: null, visit: "new", province: self._cfg.province };
      self._render();
    });
    nav.appendChild(b);
    return nav;
  };

  window.customElements.define("cdcp-calculator", CdcpCalculator);
})();
