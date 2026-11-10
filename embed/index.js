/*!
 * <cdcp-calculator> — white-label CDCP (Canadian Dental Care Plan) eligibility & co-pay estimator.
 * Zero dependencies. Shadow DOM (open). Safe to paste into any CMS.
 *
 * Usage:
 *   <script src="https://YOUR-DOMAIN/index.js" defer></script>
 *   <cdcp-calculator
 *     data-clinic-name="Maple Valley Dental"
 *     data-primary-color="#0F766E"
 *     data-booking-url="https://example.com/book"
 *     data-phone="+1 555 555 5555"
 *     data-lang="en"            <!-- en | fr -->
 *     data-province="ON">       <!-- QC ON BC AB NS NB PE MB SK NL YT NT NU -->
 *   </cdcp-calculator>
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
  var TIERS = [
    { id: "under70", pct: 1.0 },
    { id: "band70",  pct: 0.6 },
    { id: "band80",  pct: 0.4 },
    { id: "over90",  pct: 0.0 }
  ];
  var TIER_PCT = { under70: 1, band70: 0.6, band80: 0.4, over90: 0 };

  // Per-visit bundles: f = provincial fee-guide total, g = CDCP grid total (2026).
  // QC totals are the sum of the same procedure codes used on sss.marketing
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

  // covered = min(grid × tier, fee); patient = fee − covered.
  // Shown to the patient as: co-pay (grid × (1 − tier)) + fee-guide gap (fee − grid).
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
      stepOf: function (a, b) { return "Question " + a + " of " + b; },
      back: "Back",
      restart: "Start over",
      next: "Continue",
      q1: "Do you (or a family member) have access to private dental insurance — through an employer, a private plan, or a health spending account?",
      q1yes: "Yes, I have private coverage",
      q1no: "No private coverage",
      q2: "Are you a Canadian resident for tax purposes?",
      q2yes: "Yes",
      q2no: "No",
      q3: "What was your adjusted family net income on your last tax return (CRA line 23600)?",
      q3a: "Under $70,000", q3aH: "CDCP pays 100% of its grid",
      q3b: "$70,000 – $79,999", q3bH: "CDCP pays 60% — 40% co-pay",
      q3c: "$80,000 – $89,999", q3cH: "CDCP pays 40% — 60% co-pay",
      q3d: "$90,000 or more", q3dH: "Not eligible",
      q4: "Have you (and your spouse or partner, if applicable) filed last year's Canadian tax return?",
      q4yes: "Yes, filed",
      q4no: "Not yet",
      badgeIns: "Private insurance", badgeNo: "Not eligible", badgeTax: "Tax return required",
      outIns: "Private insurance means CDCP is not available to you.",
      outInsBody: "The CDCP is only for people without access to private dental coverage. The good news: your plan covers care right away — no application, no waiting period.",
      outRes: "CDCP requires Canadian tax residency.",
      outResBody: "You must be a Canadian resident for tax purposes to apply. If your residency status changes, you can re-check your eligibility any time.",
      outInc: "At $90,000+ family income, CDCP coverage is 0%.",
      outIncBody: "Government coverage stops at $90,000 in adjusted family net income. Many clinics offer membership plans and flexible payment options — ask us.",
      outTax: "One step left: file your tax return.",
      outTaxBody: "Health Canada verifies your income through the CRA, so last year's return must be filed before you can apply. Once it is filed, you can apply right away.",
      okBadge: "Eligible based on your answers",
      okTitle: function (p) { return "You qualify for CDCP coverage of up to " + p + "% of the federal grid."; },
      estHead: "Estimate your share of a visit",
      estProv: "Province or territory",
      estVisit: "Appointment type",
      vNew: "New patient exam & cleaning",
      vRecall: "Recall exam & cleaning",
      vEmerg: "Emergency exam & X-ray",
      rowFee: "Typical clinic fee",
      rowCdcp: "CDCP pays",
      rowCopay: function (p) { return "Your co-pay (" + p + "% of the grid)"; },
      rowGap: "Fee-guide gap (balance billing)",
      rowYou: "Your estimated share",
      gapWhy: "Why a gap? CDCP pays by the federal CDCP Dental Benefit Grid, not your province's dentist fee guide. When the clinic fee is above the grid, that difference is yours on top of the co-pay. Always ask for a written estimate before treatment.",
      estNote: function (guide) { return "Estimate from the " + (guide ? guide + " 2026 fee guide" : "2026 territorial fee rates") + " vs the CDCP grid — not a quote."; },
      ctaBook: "Book an appointment",
      ctaCall: function (n) { return "Call " + n; },
      ctaApply: "Apply for CDCP on canada.ca",
      applySub: "Your CDCP card arrives in 4 to 8 weeks — booking ahead lines your visit up with it.",
      provNames: { QC:"Quebec", ON:"Ontario", BC:"British Columbia", AB:"Alberta", NS:"Nova Scotia", NB:"New Brunswick", PE:"Prince Edward Island", MB:"Manitoba", SK:"Saskatchewan", NL:"Newfoundland and Labrador", YT:"Yukon", NT:"Northwest Territories", NU:"Nunavut" },
      money: function (n) { return "$" + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ","); },
      poweredBy: "CDCP estimator"
    },
    fr: {
      title: "Régime canadien de soins dentaires",
      subtitle: "Vérifiez votre admissibilité et estimez votre part en moins d'une minute.",
      stepOf: function (a, b) { return "Question " + a + " sur " + b; },
      back: "Retour",
      restart: "Recommencer",
      next: "Continuer",
      q1: "Avez-vous (ou un membre de votre famille) accès à une assurance dentaire privée — par un employeur, un régime privé ou un compte de gestion santé ?",
      q1yes: "Oui, j'ai une couverture privée",
      q1no: "Aucune couverture privée",
      q2: "Êtes-vous résident canadien aux fins de l'impôt ?",
      q2yes: "Oui",
      q2no: "Non",
      q3: "Quel était votre revenu familial net rajusté sur votre dernière déclaration (ligne 23600 de l'ARC) ?",
      q3a: "Moins de 70 000 $", q3aH: "Le RCSD paie 100 % de sa grille",
      q3b: "70 000 $ – 79 999 $", q3bH: "Le RCSD paie 60 % — quote-part de 40 %",
      q3c: "80 000 $ – 89 999 $", q3cH: "Le RCSD paie 40 % — quote-part de 60 %",
      q3d: "90 000 $ ou plus", q3dH: "Non admissible",
      q4: "Avez-vous (et votre conjoint·e, le cas échéant) produit votre déclaration d'impôts de l'an dernier ?",
      q4yes: "Oui, produite",
      q4no: "Pas encore",
      badgeIns: "Assurance privée", badgeNo: "Non admissible", badgeTax: "Déclaration requise",
      outIns: "Une assurance privée rend le RCSD inaccessible.",
      outInsBody: "Le RCSD s'adresse uniquement aux personnes sans couverture dentaire privée. La bonne nouvelle : votre régime couvre les soins dès maintenant — sans demande ni délai d'attente.",
      outRes: "Le RCSD exige la résidence fiscale canadienne.",
      outResBody: "Vous devez être résident canadien aux fins de l'impôt pour faire une demande. Si votre statut change, vous pouvez revérifier votre admissibilité en tout temps.",
      outInc: "À 90 000 $ et plus de revenu familial, la couverture RCSD est de 0 %.",
      outIncBody: "La couverture gouvernementale s'arrête à 90 000 $ de revenu familial net rajusté. Plusieurs cliniques offrent des plans de financement — parlez-nous-en.",
      outTax: "Une étape restante : produire votre déclaration d'impôts.",
      outTaxBody: "Santé Canada vérifie votre revenu auprès de l'ARC : la déclaration de l'an dernier doit être produite avant la demande. Une fois produite, vous pouvez faire la demande immédiatement.",
      okBadge: "Admissible selon vos réponses",
      okTitle: function (p) { return "Vous êtes admissible à une couverture RCSD pouvant atteindre " + p + " % de la grille fédérale."; },
      estHead: "Estimez votre part d'une visite",
      estProv: "Province ou territoire",
      estVisit: "Type de rendez-vous",
      vNew: "Examen nouveau patient et nettoyage",
      vRecall: "Examen de rappel et nettoyage",
      vEmerg: "Examen d'urgence et radiographie",
      rowFee: "Honoraires typiques de la clinique",
      rowCdcp: "Versé par le RCSD",
      rowCopay: function (p) { return "Votre quote-part (" + p + " % de la grille)"; },
      rowGap: "Écart du guide tarifaire (facturation d'équilibre)",
      rowYou: "Votre part estimée",
      gapWhy: "Pourquoi un écart ? Le RCSD paie selon la grille fédérale du RCSD, pas selon le guide tarifaire des dentistes de votre province. Quand les honoraires dépassent la grille, la différence s'ajoute à votre quote-part. Demandez toujours une estimation écrite avant un traitement.",
      estNote: function (guide) { return "Estimation selon le guide " + (guide ? guide + " 2026" : "des tarifs territoriaux 2026") + " et la grille du RCSD — pas une soumission."; },
      ctaBook: "Prendre rendez-vous",
      ctaCall: function (n) { return "Appeler " + n; },
      ctaApply: "Faire la demande RCSD sur canada.ca",
      applySub: "La carte RCSD arrive en 4 à 8 semaines — réserver d'avance aligne votre visite avec sa réception.",
      provNames: { QC:"Québec", ON:"Ontario", BC:"Colombie-Britannique", AB:"Alberta", NS:"Nouvelle-Écosse", NB:"Nouveau-Brunswick", PE:"Île-du-Prince-Édouard", MB:"Manitoba", SK:"Saskatchewan", NL:"Terre-Neuve-et-Labrador", YT:"Yukon", NT:"Territoires du Nord-Ouest", NU:"Nunavut" },
      money: function (n) { return n.toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " $"; },
      poweredBy: "Estimateur RCSD"
    }
  };
  var APPLY_URL = {
    en: "https://www.canada.ca/en/services/benefits/dental/dental-care-plan/apply.html",
    fr: "https://www.canada.ca/fr/services/prestations/dentaire/regime-soins-dentaires/demande.html"
  };

  /* ---------- color helpers (white-label theming) ---------- */

  function hexToRgb(hex) {
    var m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(hex || "").trim());
    if (!m) return null;
    var h = m[1];
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  function mix(rgb, target, amt) {
    return rgb.map(function (c, i) { return Math.round(c + (target[i] - c) * amt); });
  }
  function css(rgb) { return "rgb(" + rgb.join(",") + ")"; }
  function luma(rgb) { return (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255; }

  /* ---------- styles (fully scoped inside the shadow root) ---------- */

  var SHEET =
    // Document styles can override :host at normal importance, so the font lives on .card (inner
    // shadow nodes are untouchable from outside; only inherited properties cross the boundary).
    ":host{all:initial;display:block;contain:content;-webkit-text-size-adjust:100%}" +
    "*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}" +
    '.card{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.45;font-weight:400;letter-spacing:normal;text-transform:none;text-align:left}' +
    "button{font:inherit;background:none;border:0;cursor:pointer;color:inherit}" +
    "select{font:inherit}" +
    ".card{position:relative;max-width:34rem;margin:0 auto;background:var(--paper);color:var(--ink);border:1px solid var(--line);border-radius:18px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,.08)}" +
    ".hd{padding:18px 22px 14px;border-bottom:1px solid var(--line)}" +
    ".hd-top{display:flex;justify-content:space-between;gap:12px;align-items:baseline}" +
    ".kicker{font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--p)}" +
    ".clinic{font-size:12px;color:var(--mut);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:45%}" +
    "h2{font-size:19px;font-weight:700;margin-top:6px}" +
    ".sub{font-size:13px;color:var(--mut);margin-top:4px}" +
    ".body{padding:20px 22px 22px}" +
    ".meta{display:flex;justify-content:space-between;align-items:center;font-size:12px;color:var(--mut);margin-bottom:10px}" +
    ".bar{height:4px;border-radius:2px;background:var(--line);overflow:hidden;margin-bottom:16px}" +
    ".bar i{display:block;height:100%;background:var(--p);transition:width .25s ease}" +
    "fieldset{border:0}" +
    "legend{font-size:16px;font-weight:650;margin-bottom:14px}" +
    ".opt{display:flex;align-items:center;justify-content:space-between;gap:10px;width:100%;min-height:52px;text-align:left;padding:13px 16px;margin-bottom:10px;border:1.5px solid var(--line);border-radius:12px;background:var(--paper);transition:border-color .12s,background .12s,transform .06s}" +
    ".opt:hover{border-color:var(--p)}" +
    ".opt:active{transform:scale(.985)}" +
    ".opt:focus-visible,select:focus-visible,.cta:focus-visible,.ghost:focus-visible{outline:2.5px solid var(--p);outline-offset:2px}" +
    ".opt b{font-weight:600;font-size:14.5px}" +
    ".opt small{display:block;font-size:12px;color:var(--mut);font-weight:400;margin-top:2px}" +
    ".opt .tick{flex:none;width:20px;height:20px;border-radius:50%;border:1.5px solid var(--line)}" +
    ".opt[aria-checked=true]{border-color:var(--p);background:var(--tint)}" +
    ".opt[aria-checked=true] .tick{border-color:var(--p);background:var(--p);box-shadow:inset 0 0 0 4px var(--paper)}" +
    ".nav{display:flex;justify-content:space-between;margin-top:6px}" +
    ".ghost{min-height:44px;padding:10px 14px;font-size:13px;font-weight:600;color:var(--p);border-radius:10px}" +
    ".ghost:hover{background:var(--tint)}" +
    ".badge{display:inline-block;font-size:12px;font-weight:700;padding:5px 12px;border-radius:999px;margin-bottom:12px}" +
    ".badge.ok{background:var(--tint);color:var(--pd)}" +
    ".badge.no{background:#fdecec;color:#9f2d2d}" +
    ".badge.warn{background:#fdf3e2;color:#8a5a14}" +
    "h3{font-size:18px;font-weight:700;margin-bottom:8px}" +
    ".note{font-size:13.5px;color:var(--mut);margin-bottom:16px}" +
    ".est{border:1px solid var(--line);border-radius:14px;padding:16px;margin:14px 0 16px}" +
    ".est h4{font-size:13px;font-weight:700;letter-spacing:.02em;margin-bottom:12px}" +
    ".sel{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px}" +
    "@media(max-width:420px){.sel{grid-template-columns:1fr}}" +
    "label{display:block;font-size:11px;font-weight:700;color:var(--mut);letter-spacing:.04em;text-transform:uppercase;margin-bottom:4px}" +
    "select{width:100%;min-height:44px;padding:9px 10px;border:1.5px solid var(--line);border-radius:10px;background:var(--paper);color:var(--ink)}" +
    "table{width:100%;border-collapse:collapse;font-size:13.5px}" +
    "td{padding:7px 0;vertical-align:top}" +
    "td:last-child{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap;font-weight:600}" +
    "tr.sep td{border-top:1px solid var(--line)}" +
    "tr.you td{border-top:2px solid var(--ink);font-size:16px;font-weight:800;padding-top:10px}" +
    "tr.cdcp td:last-child{color:var(--pd)}" +
    ".small{font-size:12px;color:var(--mut);margin-top:10px}" +
    ".ctas{display:flex;flex-direction:column;gap:10px;margin-top:16px}" +
    ".cta{display:flex;align-items:center;justify-content:center;min-height:50px;padding:13px 18px;border-radius:12px;font-size:15px;font-weight:700;text-decoration:none;text-align:center}" +
    ".cta.p{background:var(--p);color:var(--onp)}" +
    ".cta.p:hover{background:var(--pd)}" +
    ".cta.s{border:1.5px solid var(--p);color:var(--pd)}" +
    ".cta.s:hover{background:var(--tint)}" +
    ".apply-sub{font-size:12px;color:var(--mut);text-align:center;margin-top:8px}" +
    ".ft{padding:10px 22px;border-top:1px solid var(--line);display:flex;justify-content:space-between;font-size:11px;color:var(--mut)}" +
    "@media(prefers-reduced-motion:reduce){*{transition:none!important}}";

  /* ---------- component ---------- */

  function CdcpCalculator() {
    var self = Reflect.construct(HTMLElement, [], CdcpCalculator);
    return self;
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
      clinic: this.getAttribute("data-clinic-name") || "",
      booking: this.getAttribute("data-booking-url") || "",
      phone: this.getAttribute("data-phone") || "",
      province: PROVS.indexOf(provAttr) >= 0 ? provAttr : (lang === "fr" ? "QC" : "ON")
    };
    this._state = { step: 0, ins: null, res: null, inc: null, filed: null, visit: "new", province: this._cfg.province };

    // Theme from data-primary-color.
    var rgb = hexToRgb(this.getAttribute("data-primary-color")) || hexToRgb("#0F766E");
    var dark = mix(rgb, [0, 0, 0], 0.25);
    var tint = mix(rgb, [255, 255, 255], 0.92);
    var onP = luma(rgb) > 0.6 ? "#111518" : "#ffffff";
    var vars = ":host{--p:" + css(rgb) + ";--pd:" + css(dark) + ";--tint:" + css(tint) +
      ";--onp:" + onP + ";--ink:#1d2426;--mut:#5c6a6d;--paper:#ffffff;--line:#dfe6e6}";

    var style = document.createElement("style");
    style.textContent = vars + SHEET;
    this._root.appendChild(style);
    this._mount = document.createElement("div");
    this._root.appendChild(this._mount);
    this._render();
  };

  CdcpCalculator.prototype._el = function (tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };

  CdcpCalculator.prototype._render = function () {
    var self = this, S = this._state, T = STR[this._cfg.lang], el = this._el.bind(this);
    var mountEl = this._mount;
    mountEl.textContent = "";

    var card = el("div", "card");
    var hd = el("div", "hd");
    var top = el("div", "hd-top");
    top.appendChild(el("span", "kicker", T.title));
    if (this._cfg.clinic) top.appendChild(el("span", "clinic", this._cfg.clinic));
    hd.appendChild(top);
    hd.appendChild(el("h2", null, T.subtitle));
    card.appendChild(hd);

    var body = el("div", "body");
    card.appendChild(body);

    var QUESTIONS = [
      { key: "ins",   q: T.q1, opts: [["yes", T.q1yes], ["no", T.q1no]] },
      { key: "res",   q: T.q2, opts: [["yes", T.q2yes], ["no", T.q2no]] },
      { key: "inc",   q: T.q3, opts: [["under70", T.q3a, T.q3aH], ["band70", T.q3b, T.q3bH], ["band80", T.q3c, T.q3cH], ["over90", T.q3d, T.q3dH]] },
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

    if (!done && S.step < QUESTIONS.length) {
      var def = QUESTIONS[S.step];
      var meta = el("div", "meta");
      meta.appendChild(el("span", null, T.stepOf(S.step + 1, QUESTIONS.length)));
      body.appendChild(meta);
      var bar = el("div", "bar"); var fill = el("i");
      fill.style.width = Math.round((S.step) / QUESTIONS.length * 100) + "%";
      bar.appendChild(fill); body.appendChild(bar);

      var fs = el("fieldset");
      fs.setAttribute("role", "radiogroup");
      fs.setAttribute("aria-label", def.q);
      fs.appendChild(el("legend", null, def.q));
      def.opts.forEach(function (o) {
        var b = el("button", "opt");
        b.type = "button";
        b.setAttribute("role", "radio");
        b.setAttribute("aria-checked", S[def.key] === o[0] ? "true" : "false");
        var w = el("span");
        w.appendChild(el("b", null, o[1]));
        if (o[2]) w.appendChild(el("small", null, o[2]));
        b.appendChild(w);
        b.appendChild(el("span", "tick"));
        b.addEventListener("click", function () {
          S[def.key] = o[0];
          b.setAttribute("aria-checked", "true");
          // Tap-to-advance, with a beat of press feedback.
          setTimeout(function () { S.step += 1; self._render(); }, 120);
        });
        fs.appendChild(b);
      });
      body.appendChild(fs);

      var nav = el("div", "nav");
      if (S.step > 0) {
        var back = el("button", "ghost", "← " + T.back);
        back.type = "button";
        back.addEventListener("click", function () {
          S.step -= 1;
          S[QUESTIONS[S.step].key] = null;
          self._render();
        });
        nav.appendChild(back);
      } else nav.appendChild(el("span"));
      body.appendChild(nav);
    } else if (done && done !== "qualified") {
      var map = {
        insurance: { badge: "no",  label: T.badgeIns, h: T.outIns, p: T.outInsBody, book: true },
        residency: { badge: "no",  label: T.badgeNo,  h: T.outRes, p: T.outResBody, book: false },
        income:    { badge: "no",  label: T.badgeNo,  h: T.outInc, p: T.outIncBody, book: true },
        tax:       { badge: "warn", label: T.badgeTax, h: T.outTax, p: T.outTaxBody, book: true }
      };
      var d = map[done];
      body.appendChild(el("span", "badge " + d.badge, d.label));
      body.appendChild(el("h3", null, d.h));
      body.appendChild(el("p", "note", d.p));
      body.appendChild(this._ctas(d.book, false));
      body.appendChild(this._restart());
    } else if (done === "qualified") {
      var pct = Math.round(TIER_PCT[S.inc] * 100);
      body.appendChild(el("span", "badge ok", T.okBadge));
      body.appendChild(el("h3", null, T.okTitle(pct)));

      var est = el("div", "est");
      est.appendChild(el("h4", null, T.estHead));
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
      est.appendChild(sel);

      var e = estimate(S.province, S.visit, S.inc);
      var tb = el("table");
      function row(cls, a, b) {
        var tr = el("tr", cls || null);
        tr.appendChild(el("td", null, a));
        tr.appendChild(el("td", null, b));
        tb.appendChild(tr);
      }
      row(null, T.rowFee, T.money(e.fee));
      row("cdcp", T.rowCdcp, "− " + T.money(e.covered));
      if (e.tier < 1) row("sep", T.rowCopay(Math.round((1 - e.tier) * 100)), T.money(e.copay));
      row(e.tier < 1 ? null : "sep", T.rowGap, T.money(e.gap));
      row("you", T.rowYou, T.money(e.patient));
      est.appendChild(tb);
      est.appendChild(el("p", "small", T.gapWhy));
      est.appendChild(el("p", "small", T.estNote(GUIDE[S.province])));
      body.appendChild(est);

      var ctas = el("div", "ctas");
      var apply = el("a", "cta s", T.ctaApply);
      apply.href = APPLY_URL[this._cfg.lang];
      apply.target = "_blank"; apply.rel = "noopener noreferrer";
      ctas.appendChild(apply);
      body.appendChild(ctas);
      body.appendChild(el("p", "apply-sub", T.applySub));
      body.appendChild(this._ctas(true, true));
      body.appendChild(this._restart());
    }

    var ft = el("div", "ft");
    ft.appendChild(el("span", null, T.poweredBy + " · 2026"));
    ft.appendChild(el("span", null, this._cfg.clinic || ""));
    card.appendChild(ft);
    mountEl.appendChild(card);
  };

  CdcpCalculator.prototype._ctas = function (showBook, primary) {
    var T = STR[this._cfg.lang];
    var wrap = this._el("div", "ctas");
    if (showBook && this._cfg.booking) {
      var a = this._el("a", "cta p", T.ctaBook);
      a.href = this._cfg.booking;
      a.target = "_blank"; a.rel = "noopener noreferrer";
      wrap.appendChild(a);
    }
    if (this._cfg.phone) {
      var tel = this._el("a", "cta " + (showBook && this._cfg.booking ? "s" : "p"), T.ctaCall(this._cfg.phone));
      tel.href = "tel:" + this._cfg.phone.replace(/[^\d+]/g, "");
      wrap.appendChild(tel);
    }
    return wrap;
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
