/*
 * cdcp-embed.js -- embeddable CDCP/RCSD calculator: eligibility and estimated
 * patient cost from one set of answers.
 *
 * Usage: mountCdcpQuiz(rootEl, "en" | "fr", opts)
 *   opts.bookingUrl   booking link for every call to action (default "/#contact")
 *   opts.insurers     array of accepted insurers, shown with the private-insurance result
 *   opts.province     fee-data key, default "QC" (needs cdcp-estimator-data.js loaded; without
 *                     it the appointment input and cost estimate are omitted)
 *   opts.phone, opts.email  the clinic's front desk; shown as "Call or email our front desk" under the answers
 *   opts.demo         sss.marketing demo extras only (insurer examples; the front-desk line without links)
 * Calling it again on the same element (e.g. after a language switch) keeps the answers.
 * Eligibility rules, tiers, copy and federal URLs come from claude/sss-pages-build.py.
 */
(function(){
  "use strict";

  var CDCP_LABELS = {
    "en": {"stepLabel": "Step {current} of {total}", "back": "Back", "retake": "Run it again", "skipPrompt": "Prefer to skip straight to the point?", "skipCall": "Call", "skipMail": "email", "skipOr": " or ", "skipTail": " our front desk.", "skipTailCall": " our front desk.", "bookingUrl": "/#contact", "cdcpApplyUrl": "https://www.canada.ca/en/services/benefits/dental/dental-care-plan/apply.html", "craMyAccountUrl": "https://www.canada.ca/en/revenue-agency/services/e-services/digital-services-individuals/account-individuals.html", "step1": {"question": "Do you (or a family member) currently have access to private dental insurance — through an employer, a private plan, or a health spending account?", "yes": "Yes, I have private coverage", "no": "No private coverage"}, "step2": {"question": "What was your adjusted family net income on your last tax return?", "under70": "Under $70,000", "under70Hint": "up to 100% covered", "band70": "$70,000–$79,999", "band70Hint": "up to 60% covered", "band80": "$80,000–$89,999", "band80Hint": "up to 40% covered", "over90": "$90,000 or more", "over90Hint": "not eligible"}, "step3": {"question": "Have you (and your spouse or partner, if applicable) filed a Canadian tax return for the previous year?", "yes": "Yes, filed", "no": "Not yet"}, "step4": {"question": "Who are you checking eligibility for?", "senior": "Senior, 65+", "child": "Child under 18", "dtc": "Adult with a valid Disability Tax Credit", "adult": "Adult, 18–64"}, "results": {"tier100Badge": "Qualifies for up to 100% CDCP coverage", "tier60Badge": "Qualifies for up to 60% CDCP coverage", "tier40Badge": "Qualifies for up to 40% CDCP coverage", "childRamqNote": "In Quebec, RAMQ already covers basic dental care for children under 10 — CDCP fills the gap for kids 10 and up.", "tierRingCaption": "Your coverage tier", "coverageMatrix": {"heading": "Coverage & Authorization Matrix", "standard": {"title": "Standard Covered Care", "subtitle": "No prior approval required", "services": ["Diagnostic exams", "Digital X-rays", "Standard cleaning / scaling (up to annual limits)", "Basic fillings", "Simple extractions"], "note": "Covered directly under standard CDCP fee guidelines."}, "major": {"title": "Major Services", "subtitle": "Requires clinical pre-authorization (predetermination)", "services": ["Porcelain crowns (and cores/posts)", "Complete & partial dentures", "Root canal retreatment", "Additional periodontal scaling (beyond annual limits)"], "note": "Important: Major restorative treatments (crowns, dentures) require a formal electronic Predetermination Request. Our clinical team will submit your diagnostic treatment plan directly to Sun Life / CDCP for approval prior to initiating care."}, "excluded": {"title": "Strictly Excluded Services", "subtitle": "Out-of-pocket or private insurance only", "services": ["Nightguards / bruxism appliances", "Teeth whitening", "Cosmetic veneers", "Elective orthodontics / Invisalign", "Dental implants"], "note": "The CDCP does not cover occlusal nightguards, cosmetic procedures, elective alignment, or dental implants. Optional private payment plans or direct insurance billing are available for these treatments."}}, "sourceNote": "Coverage tiers reflect the federal CDCP fee schedule on canada.ca. Verified 2026-09-15.", "billingNoticeHeading": "Billing transparency notice", "billingNoticeBody": "Your tier applies to CDCP's fee schedule, not necessarily your dentist's charges. If a fee is above CDCP's rate, you pay the difference on top of your co-payment. Ask for a written estimate before any treatment.", "branchInsurance": {"headline": "You can book now. There is no need to wait for CDCP.", "banner": "Your private plan applies", "microCopy": "Your private plan covers care right away, with no government application or waiting period.", "primaryCta": "Book Your Appointment Now", "insurersNote": "On your own site, this panel shows the insurers your clinic accepts — for example:", "insurers": ["Sun Life", "Manulife", "Canada Life", "Green Shield Canada"]}, "branchIncome": {"headline": "You are not eligible for CDCP at this income.", "banner": "Standard care and payment options available", "microCopy": "Government coverage stops at $90,000 in household income. The clinic offers membership plans, flexible payment arrangements and a transparent fee guide.", "primaryCta": "Book a New Patient Exam & Consultation"}, "branchTaxFiling": {"headline": "One step left before you can apply.", "banner": "File your tax return to apply for CDCP", "microCopy": "The CRA needs your up-to-date tax return to verify your income. Once filed, you can apply.", "primaryCta": "File or Check Your Status on Canada.ca", "secondaryCta": "Pre-Book Your Appointment for Next Month"}, "branchQualified": {"headline": "Verification Complete — You Qualify for CDCP Coverage", "step1Title": "Step 1 — Apply for your CDCP card", "step1Body": "Processed by Health Canada, with Sun Life.", "step1Cta": "Open the CDCP application", "step2Title": "Step 2 — Book while you wait", "step2MicroCopy": "Your CDCP card arrives in 4 to 8 weeks. Booking 6 to 8 weeks out lines the visit up with it.", "step2Cta": "Book your appointment", "step3Title": "Step 3 — Need help?", "step3Cta": "Contact our front desk"}}},
    "fr": {"stepLabel": "Étape {current} sur {total}", "back": "Retour", "retake": "Recommencer", "skipPrompt": "Vous préférez aller droit au but?", "skipCall": "Appelez", "skipMail": "envoyez un courriel", "skipOr": " ou ", "skipTail": " à notre réception.", "skipTailCall": " notre réception.", "bookingUrl": "/#contact", "cdcpApplyUrl": "https://www.canada.ca/fr/services/prestations/dentaire/regime-soins-dentaires/demande.html", "craMyAccountUrl": "https://www.canada.ca/fr/agence-revenu/services/services-electroniques/services-electroniques-particuliers/dossier-particuliers.html", "step1": {"question": "Vous (ou un membre de votre famille) avez-vous actuellement accès à une assurance dentaire privée — par un employeur, un régime privé ou un compte de gestion santé?", "yes": "Oui, j'ai une couverture privée", "no": "Aucune couverture privée"}, "step2": {"question": "Quel était votre revenu familial net rajusté sur votre dernière déclaration d’impôts?", "under70": "Moins de 70 000 $", "under70Hint": "jusqu'à 100 % couvert", "band70": "70 000 $ à 79 999 $", "band70Hint": "jusqu'à 60 % couvert", "band80": "80 000 $ à 89 999 $", "band80Hint": "jusqu'à 40 % couvert", "over90": "90 000 $ ou plus", "over90Hint": "non admissible"}, "step3": {"question": "Avez-vous (et votre conjoint(e), le cas échéant) produit une déclaration d’impôts canadienne pour l'année précédente?", "yes": "Oui, produite", "no": "Pas encore"}, "step4": {"question": "Pour qui vérifiez-vous l'admissibilité?", "senior": "Aîné(e), 65 ans ou plus", "child": "Enfant de moins de 18 ans", "dtc": "Adulte détenant un crédit d'impôt pour personnes handicapées valide", "adult": "Adulte, 18 à 64 ans"}, "results": {"tier100Badge": "Admissible à une couverture RCSD pouvant atteindre 100 %", "tier60Badge": "Admissible à une couverture RCSD pouvant atteindre 60 %", "tier40Badge": "Admissible à une couverture RCSD pouvant atteindre 40 %", "childRamqNote": "Au Québec, la RAMQ couvre déjà les soins dentaires de base pour les enfants de moins de 10 ans — le RCSD prend le relais pour les enfants de 10 ans et plus.", "tierRingCaption": "Votre palier de couverture", "coverageMatrix": {"heading": "Matrice de couverture et d'autorisation", "standard": {"title": "Soins standards couverts", "subtitle": "Aucune approbation préalable requise", "services": ["Examens diagnostiques", "Radiographies numériques", "Nettoyage / détartrage standard (jusqu'aux limites annuelles)", "Plombages de base", "Extractions simples"], "note": "Couvert directement selon la grille tarifaire standard du RCSD."}, "major": {"title": "Services majeurs", "subtitle": "Nécessite une autorisation préalable (prédétermination)", "services": ["Couronnes en porcelaine (et tenons/moignons)", "Prothèses complètes et partielles", "Retraitement de canal", "Détartrage parodontal additionnel (au-delà des limites annuelles)"], "note": "Important : Les traitements de restauration majeurs (couronnes, prothèses) nécessitent une Demande d'autorisation préalable électronique. Notre équipe clinique soumettra votre plan de traitement diagnostique directement à la Sun Life / au RCSD pour approbation avant de débuter les soins."}, "excluded": {"title": "Services strictement exclus", "subtitle": "À payer directement ou par assurance privée", "services": ["Plaques occlusales / dispositifs contre le bruxisme", "Blanchiment des dents", "Facettes esthétiques", "Orthodontie élective / Invisalign", "Implants dentaires"], "note": "Le RCSD ne couvre pas les plaques occlusales, les soins esthétiques, l'orthodontie élective ni les implants dentaires. Des options de paiement privé ou de facturation directe à l'assurance sont disponibles pour ces traitements."}}, "sourceNote": "Les paliers de couverture reflètent la grille tarifaire fédérale du RCSD publiée sur canada.ca. Vérifié le 2026-09-15.", "billingNoticeHeading": "Avis de transparence tarifaire", "billingNoticeBody": "Votre palier s'applique à la grille du RCSD, pas forcément aux tarifs de votre dentiste. Si le tarif dépasse la grille, vous payez la différence en plus de votre quote-part. Demandez une estimation écrite avant tout traitement.", "branchInsurance": {"headline": "Vous pouvez réserver maintenant. Pas besoin d'attendre le RCSD.", "banner": "Votre assurance privée s'applique", "microCopy": "Votre régime privé couvre les soins tout de suite, sans demande ni délai gouvernemental.", "primaryCta": "Prendre rendez-vous maintenant", "insurersNote": "Sur votre propre site, ce module afficherait les assureurs acceptés par votre clinique — par exemple :", "insurers": ["Sun Life", "Manuvie", "Canada Vie", "Croix Bleue"]}, "branchIncome": {"headline": "Vous n'êtes pas admissible au RCSD à ce revenu.", "banner": "Soins standards et options de paiement offerts", "microCopy": "La couverture gouvernementale s'arrête à 90 000 $ de revenu familial. La clinique offre des forfaits d'adhésion, des ententes de paiement et une grille tarifaire transparente.", "primaryCta": "Prendre rendez-vous pour un nouvel examen"}, "branchTaxFiling": {"headline": "Il reste une étape avant de faire votre demande.", "banner": "Produisez votre déclaration d’impôts pour faire la demande au RCSD", "microCopy": "L'ARC doit avoir votre déclaration d’impôts à jour pour vérifier votre revenu. Une fois produite, vous pouvez faire la demande.", "primaryCta": "Produire ou vérifier votre dossier sur Canada.ca", "secondaryCta": "Réserver votre rendez-vous pour le mois prochain"}, "branchQualified": {"headline": "Vérification terminée — Vous êtes admissible à la couverture RCSD", "step1Title": "Étape 1 — Faites la demande de votre carte RCSD", "step1Body": "Demande traitée par Santé Canada, avec la Sun Life.", "step1Cta": "Ouvrir la demande RCSD", "step2Title": "Étape 2 — Réservez pendant l'attente", "step2MicroCopy": "La carte RCSD arrive en 4 à 8 semaines. Réserver dans 6 à 8 semaines aligne le rendez-vous avec sa réception.", "step2Cta": "Réserver votre rendez-vous", "step3Title": "Étape 3 — Besoin d'aide ?", "step3Cta": "Contactez notre réception"}}}
  };

  /* One calculator: eligibility and out-of-pocket cost from a single set of
     answers. Nothing is pre-selected. Every change recomputes immediately.

     Inputs:   ins (private insurance)  inc (income band)  filed (tax return)  appt (appointment)
     Outcome:  ins=yes            -> private plan applies (RCSD not relevant)
               inc=over90         -> not eligible; cost is the full standard fee
               filed=no           -> must file first; cost shown for when the card is issued
               otherwise          -> eligible; cost = standard fee - RCSD amount
     Cost per line is unchanged from the original model:
       covered = isCoveredByCDCP ? min(cdcpGridFee * tier%, acdqFee) : 0     you pay = acdqFee - covered  */
  var T = {
    fr: {label:"Admissibilité et coût au RCSD",
      clear:"Effacer les réponses", todo:"À indiquer", edit:"Modifier", yours:"Vos réponses", qn:"Question {n} sur {t}", cont:"Continuer",  sec:{calc:"Calcul de l’estimation",limits:"Limites de l’estimation",next:"Prochaine étape"}, bc:{based:"Selon vos réponses : ",and:" et ",noIns:"vous n’avez pas d’assurance dentaire privée",inc:"votre revenu familial net rajusté est de {r}",fy:"votre déclaration d’impôts est produite",fn:"votre déclaration d’impôts n’est pas encore produite"}, st:{none:"Aucune réponse",pending:"Incomplet",unconfirmed:"À confirmer",qualified:"Admissible selon vos réponses",income:"Non admissible",tax:"Déclaration requise",insurance:"Assurance privée"}, ins:"Assurance dentaire privée", insI:"Par un employeur, un régime privé ou un compte de gestion santé.", yes:"Oui", no:"Non", chipIns:{yes:"Assuré",no:"Non-assuré"}, applyLink:"Étape 1 : Faire la demande d’adhésion au RCSD (Santé Canada)",applySub:"La carte RCSD arrive en 4 à 8 semaines.",bookSub:"Réserver dans 6 à 8 semaines aligne votre visite avec la réception de votre carte.",step2:"Étape 2 : Réserver votre rendez-vous",bookNow:"Réserver votre rendez-vous",haveCard:"J’ai déjà ma carte RCSD",noCardYet:"Pas encore de carte ? Voir l’étape 1",save:"Vous économisez {n}", chipFiled:{yes:"Impôts : oui",no:"Impôts : pas encore"},
      inc:"Revenu familial net rajusté", incI:"Selon votre dernière déclaration d’impôts.", incShort:["< 70 k","70–79 k","80–89 k","90 k +"], incPct:["100 %","60 %","40 %","0 %"],
      filed:"Déclaration d’impôts produite", filedI:"Vous et votre conjoint(e), le cas échéant, pour l’année précédente.", notYet:"Pas encore",
      appt:"Type de rendez-vous", apptI:"", pick:"Choisir…",
      remain:"Il reste à indiquer :", pickVisit:"Choisissez un type de rendez-vous pour estimer votre part.", pendH:"Estimez votre part d’une visite.", pendS:"L’estimation tient compte du Régime canadien de soins dentaires (RCSD) et du guide tarifaire des dentistes du Québec (ACDQ).", prog:"Réponses : {n} sur {t}", estNote:"Estimation selon le guide tarifaire, pas une soumission.",
      share:"Votre part estimée", total:"Coût total", viewCalc:"Voir le calcul", cost:"Coût du traitement", std:"Guide tarifaire 2026 des dentistes du Québec (ACDQ)", paid:"Versé par le RCSD", noCover:"Service non couvert par le RCSD", full:"Entièrement couvert au tarif du guide.", ifQualify:"Si votre admissibilité est confirmée.", you:"Votre part", byAnswers:"selon vos réponses", grid:"{n} % de la grille du Régime canadien de soins dentaires", noelig:"Non admissible",
      incl:"Inclus", nopick:"Choisissez un rendez-vous pour voir votre part.", unavailable:"Estimation indisponible pour ce rendez-vous. Communiquez avec la clinique.",
      tierUnconfirmed:"Palier RCSD : jusqu’à {n} %. Confirmez votre déclaration d’impôts.", whenIssued:"Montant estimé une fois la carte RCSD reçue.",
      pre:"Préautorisation du RCSD requise.", lab:"Frais de laboratoire en sus.", excl:"Non couvert par le RCSD.",
      ramq:"Enfants de moins de 10 ans : la RAMQ couvre déjà les soins de base.",
      disc:"Estimation seulement. Chaque clinique fixe ses tarifs. Limites annuelles et frais de laboratoire non inclus.", matrix:"Soins couverts, autorisation et exclusions", insurers:"Assureurs acceptés par la clinique :",
      pk:{new:["Nouveau patient","Examen complet, radiographies diagnostiques, nettoyage, fluorure"],recall:["Rappel et nettoyage","Examen périodique, nettoyage"],
          emerg:["Urgence, mal de dent","Examen d’urgence, radiographie","Un traitement immédiat (obturation, canal, extraction) s’ajoute au tarif."],}},
    en: {label:"CDCP eligibility and cost",
      clear:"Clear answers", todo:"To answer", edit:"Edit", yours:"Your answers", qn:"Question {n} of {t}", cont:"Continue",  sec:{calc:"How the estimate is built",limits:"Limits of the estimate",next:"Next step"}, bc:{based:"Based on your answers: ",and:" and ",noIns:"you have no private dental insurance",inc:"your adjusted family net income is {r}",fy:"your tax return is filed",fn:"your tax return is not filed yet"}, st:{none:"No answers yet",pending:"Incomplete",unconfirmed:"To confirm",qualified:"Eligible based on your answers",income:"Not eligible",tax:"Return required",insurance:"Private insurance"}, ins:"Private dental insurance", insI:"Through an employer, a private plan or a health spending account.", yes:"Yes", no:"No", chipIns:{yes:"Insured",no:"Uninsured"}, applyLink:"Step 1: Apply for CDCP membership (Health Canada)",applySub:"Your CDCP card arrives in 4 to 8 weeks.",bookSub:"Booking 6 to 8 weeks out lines your visit up with your card’s arrival.",step2:"Step 2: Book your appointment",bookNow:"Book your appointment",haveCard:"I already have my CDCP card",noCardYet:"No card yet? Back to step 1",save:"You save {n}", chipFiled:{yes:"Taxes filed",no:"Taxes not filed yet"},
      inc:"Adjusted family net income", incI:"From your last tax return.", incShort:["< 70k","70–79k","80–89k","90k+"], incPct:["100%","60%","40%","0%"],
      filed:"Tax return filed", filedI:"You and your spouse or partner, if applicable, for the previous year.", notYet:"Not yet",
      appt:"Appointment type", apptI:"", pick:"Choose…",
      remain:"Still to answer:", pickVisit:"Choose an appointment type to estimate your share.", pendH:"Estimate your share of a visit.", pendS:"The estimate factors in the Canadian Dental Care Plan (CDCP) and the Quebec dentists' fee guide (ACDQ).", prog:"{n} of {t} answered", estNote:"Estimate from the fee guide, not a quote.",
      share:"Your estimated share", total:"Total cost", viewCalc:"See the calculation", cost:"Treatment cost", std:"Quebec dentists' 2026 fee guide (ACDQ)", paid:"Paid by CDCP", noCover:"Not a CDCP-covered service", full:"Fully covered at the guide price.", ifQualify:"If your eligibility is confirmed.", you:"Your share", byAnswers:"depends on your answers", grid:"{n}% of the Canadian Dental Care Plan fee schedule", noelig:"Not eligible",
      incl:"Includes", nopick:"Choose an appointment to see your share.", unavailable:"Estimate unavailable for this appointment. Please contact the clinic.",
      tierUnconfirmed:"CDCP tier: up to {n}%. Confirm your tax filing.", whenIssued:"Estimated amount once your CDCP card is issued.",
      pre:"CDCP pre-authorization required.", lab:"Lab fee billed extra.", excl:"Not covered by CDCP.",
      ramq:"Children under 10: RAMQ already covers basic care.",
      disc:"Estimate only. Each clinic sets its own fees. Annual limits and lab fees not included.", matrix:"Covered care, authorization and exclusions", insurers:"Insurers accepted by the clinic:",
      pk:{new:["New patient","Complete exam, diagnostic X-rays, cleaning, fluoride"],recall:["Recall and cleaning","Periodic exam, cleaning"],
          emerg:["Emergency, toothache","Emergency exam, X-ray","Immediate treatment (filling, root canal, extraction) is extra."],}}
  };
  var INCOME_KEYS = ["under70","band70","band80","over90"];
  var INCOME_TIER = {under70:"100",band70:"60",band80:"40"};
  var TIER_PCT = {under70:1,band70:.6,band80:.4,over90:0};
  var PK = [
    {id:"new",items:[["01103",1],["02102",1],["11112",1],["12101",1]]},
    {id:"recall",items:[["01202",1],["11112",1]]},
    {id:"emerg",items:[["01205",1],["02102",1]]}
  ];
  var REDUCE_MOTION = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  var uid = 0, SAVED = (typeof WeakMap==="function")?new WeakMap():null;

  function esc(s){var d=document.createElement("div");d.textContent=s;return d.innerHTML;}
  function node(tag,cls,html){var e=document.createElement(tag);if(cls)e.className=cls;if(html!=null)e.innerHTML=html;return e;}
  function textNode(tag,cls,text){var e=document.createElement(tag);if(cls)e.className=cls;e.textContent=text;return e;}
  function lcf(s){s=String(s);return s.charAt(0).toLowerCase()+s.slice(1);}
  function nb(s){return String(s).replace(/(\d) (?=\d)/g,"$1 ").replace(/ (%|\$)/g," $1");}
  function withBookingParams(url,params){
    try{var u=new URL(url,window.location.origin);Object.keys(params).forEach(function(k){u.searchParams.set(k,params[k]);});return u.toString();}
    catch(e){return url;}
  }
  function addWeeksIso(w){var d=new Date();d.setDate(d.getDate()+w*7);return d.toISOString().slice(0,10);}
  function ctaLink(href,label,opts){
    opts=opts||{};
    var a=node("a","cq-cta-btn "+(opts.variant==="secondary"?"cq-cta-btn-secondary":opts.variant==="outline"?"cq-cta-btn-outline":"cq-cta-btn-primary"));
    a.href=href;
    if(opts.external){a.target="_blank";a.rel="noopener noreferrer";}
    a.innerHTML="<span>"+esc(label)+"</span>"+(opts.external?'<span class="cq-cta-ext" aria-hidden="true">&#8599;</span>':"");
    return a;
  }
  function ctaRow(){return node("div","cq-cta-row");}
  function billingNotice(h,b){return node("p","cq-billing-notice",'<b>'+esc(h)+'.</b> '+esc(b));}
  function matrixItem(t,icon,data,open){
    var d=node("details","cq-matrix-item cq-tone-"+t);d.name="cq-matrix";if(open)d.open=true;
    d.innerHTML='<summary><span class="cq-matrix-item-head"><span class="cq-matrix-item-title">'+esc(data.title)+
      '</span><span class="cq-matrix-item-subtitle">'+esc(data.subtitle)+'</span></span><span class="cq-matrix-item-chevron" aria-hidden="true"></span></summary>'+
      '<div class="cq-matrix-item-body"><ul>'+data.services.map(function(s){return "<li>"+esc(s)+"</li>";}).join("")+'</ul><p class="cq-matrix-item-note">'+esc(data.note)+"</p></div>";
    return d;
  }
  function coverageMatrix(m,label){
    var wrap=node("details","cq-matrix-all");
    wrap.appendChild(node("summary",null,'<span>'+esc(label)+'</span><span class="cq-matrix-item-chevron" aria-hidden="true"></span>'));
    var inner=node("div","cq-matrix");
    inner.appendChild(matrixItem("standard","&#10003;",m.standard,true));
    inner.appendChild(matrixItem("major","!",m.major,false));
    inner.appendChild(matrixItem("excluded","&#215;",m.excluded,false));
    wrap.appendChild(inner);return wrap;
  }
  function accordion(title,nodes,meta){
    var d=node("details","cq-matrix-all cq-acc");
    d.appendChild(node("summary",null,'<span>'+esc(title)+'</span>'+(meta?'<span class="cq-acc-meta">'+esc(meta)+'</span>':'')+'<span class="cq-matrix-item-chevron" aria-hidden="true"></span>'));
    var b=node("div","cq-acc-body");nodes.forEach(function(n){b.appendChild(n);});d.appendChild(b);return d;
  }
  function stepRow(n,title,body,cta,stepLbl){
    var d=node("div","cq-step-card");var c=node("div","cq-step-main");c.appendChild(textNode("div","cq-step-lbl",stepLbl.replace("{current}",n).replace("{total}",2)));c.appendChild(textNode("div","cq-step-title",title));
    if(body)c.appendChild(textNode("p","cq-step-text",body));
    if(cta)c.appendChild(cta);d.appendChild(c);return d;
  }

  function mountCdcpQuiz(root,lang,opts){
    if(!root)return;
    opts=opts||{};
    lang=lang==="fr"?"fr":"en";
    var L=CDCP_LABELS[lang],U=T[lang],id=++uid,BOOK=opts.bookingUrl||L.bookingUrl;
    var nf=new Intl.NumberFormat(lang==="fr"?"fr-CA":"en-CA",{style:"currency",currency:"CAD",minimumFractionDigits:2});
    var DATA=(window.CDCP_PROVINCES||{})[opts.province||"QC"],byCode={};
    if(DATA&&DATA.procedures)DATA.procedures.forEach(function(p){byCode[p.code]=p;});else DATA=null;
    // The appointment input exists only when fee data is loaded; otherwise this is the eligibility-only tool.
    var A=(SAVED&&SAVED.get(root))||{ins:null,inc:null,filed:null,appt:null};
    if(!DATA)A.appt=null;

    root.innerHTML="";root.className="cdcp cq";
    root.setAttribute("role","group");root.setAttribute("aria-label",U.label);
    var grid=node("div","cq-grid"),ctl=node("div","cq-ctl"),sStatus=node("div","cq-status"),sSum=node("div","cq-sum"),sAct=node("div","cq-act"),sBrk=node("div","cq-brk"),sDet=node("div","cq-det"),sRest=node("div","cq-rest"),cin=node("div","cq-ctl-in");ctl.appendChild(cin);
    var sr=node("div","cq-sr");sr.setAttribute("role","status");
    [ctl,sStatus,sSum,sAct,sBrk,sDet,sRest].forEach(function(n){grid.appendChild(n);});root.appendChild(grid);root.appendChild(sr);


    /* Clinic theming guard: if a brand colour pair is unreadable, fall back to a readable one. */
    (function(){
      ["--c-on","--c-ink","--c-good","--c-bad"].forEach(function(p){root.style.removeProperty(p);});
      var cs=getComputedStyle(root);
      function rgb(v){if(!v)return null;var e=document.createElement("i");e.style.color=v;root.appendChild(e);var c=getComputedStyle(e).color;root.removeChild(e);
        var m=c.match(/\d+(\.\d+)?/g);return m&&m.length>=3?[+m[0],+m[1],+m[2]]:null;}
      function lum(c){var a=c.map(function(v){v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4);});return .2126*a[0]+.7152*a[1]+.0722*a[2];}
      function ratio(a,b){var x=lum(a),y=lum(b),h=Math.max(x,y),l=Math.min(x,y);return (h+.05)/(l+.05);}
      function best(bg){return ratio([255,255,255],bg)>=ratio([0,0,0],bg)?"#ffffff":"#111111";}
      function fix(fg,bg,prop,fallback){var f=rgb(cs.getPropertyValue(fg)),b=rgb(cs.getPropertyValue(bg));
        if(f&&b&&ratio(f,b)<4.5)root.style.setProperty(prop,fallback(b));}
      fix("--c-on","--c-brand","--c-on",best);       // button text on brand
      fix("--c-ink","--c-paper","--c-ink",best);     // body text on background
      fix("--c-good","--c-paper","--c-good",function(){return "#2f6b35";});
      fix("--c-bad","--c-paper","--c-bad",function(){return "#b3261e";});
    })();

    /* ---- answers: one stage that asks a question at a time, then becomes the summary ---- */
    var ORDER=["ins","inc","filed","appt"],cur=null,shownKey=null,ptr=false,kbd=false,advT=0,hold=false,lastScr=null,lastRank=0,haveCard=false;
    root.addEventListener("pointerdown",function(){ptr=true;kbd=false;},true);
    root.addEventListener("keydown",function(){ptr=false;kbd=true;},true);
    var srS=node("div","cq-sr");srS.setAttribute("role","status");root.appendChild(srS);
    function required(){var r=["ins"];if(A.ins==="no"){r.push("inc");if(A.inc!=="over90")r.push("filed");}return r;}   // the visit type is not a gate: it refines the estimate once the assessment is complete
    function autoStep(){var r=required();for(var i=0;i<r.length;i++)if(!A[r[i]])return r[i];return null;}
    function view(){return cur&&required().indexOf(cur)>=0?cur:autoStep();}
    function totalQ(){return A.ins==="yes"?1:(A.inc==="over90"?2:3);}
    function legend(fs,label,hint){fs.setAttribute("role","radiogroup");fs.setAttribute("aria-labelledby",id+"lg"+fs.getAttribute("data-k"));var lg=node("div","cq-legend",'<span>'+esc(label)+'</span>'+(hint?'<span class="cq-infl">'+esc(hint)+'</span>':''));lg.id=id+"lg"+fs.getAttribute("data-k");fs.appendChild(lg);}
    function optionsFor(k){
      if(k==="ins")return {label:U.ins,hint:U.insI,items:[{v:"yes",t:U.yes,aria:L.step1.yes,html:"<span>"+esc(U.yes)+"</span>"},{v:"no",t:U.no,aria:L.step1.no,html:"<span>"+esc(U.no)+"</span>"}]};
      if(k==="filed")return {label:U.filed,hint:U.filedI,items:[{v:"yes",t:U.yes,aria:L.step3.yes,html:"<span>"+esc(U.yes)+"</span>"},{v:"no",t:U.notYet,aria:L.step3.no,html:"<span>"+esc(U.notYet)+"</span>"}]};
      if(k==="inc")return {label:U.inc,hint:U.incI,items:INCOME_KEYS.map(function(x){return {v:x,t:L.step2[x],aria:L.step2[x],html:"<span>"+esc(nb(L.step2[x]))+"</span>"};})};
      return {label:U.appt,hint:U.apptI,items:PK.map(function(p){return {v:p.id,t:U.pk[p.id][0],aria:U.pk[p.id][0]+". "+U.pk[p.id][1],html:"<span>"+esc(U.pk[p.id][0])+"</span><small>"+esc(U.pk[p.id][1])+"</small>"};})};
    }
    function fieldset(k){
      var d=optionsFor(k),fs=node("div","cq-row cq-row-"+k);fs.setAttribute("data-k",k);legend(fs,d.label,d.hint);
      var s=node("div",k==="appt"?"cq-visit":"cq-seg cq-seg-"+d.items.length);
      d.items.forEach(function(o){
        var lb=node("label","cq-opt",'<input type="radio" name="cq'+id+k+'" value="'+o.v+'"'+(A[k]===o.v?" checked":"")+' aria-label="'+esc(o.aria||o.t)+'">'+o.html);
        lb.firstChild.addEventListener("click",function(){pick(k,o.v);});
        s.appendChild(lb);
      });
      fs.appendChild(s);return fs;
    }
    // an answer updates the statement at once; a pointer click then moves on, the keyboard stays until Continue
    function pick(k,v){
      A[k]=v;update();
      if(k==="appt"&&shownKey==="appt"){            // the appointment screen: choosing one reveals the result
        hold=!ptr;refreshNext();
        if(ptr){clearTimeout(advT);advT=setTimeout(function(){hold=false;renderCtl(false);},140);}
        return;
      }
      if(shownKey===k){
        refreshNext();
        if(ptr){clearTimeout(advT);advT=setTimeout(function(){cur=null;renderCtl(false);},140);}
      }
    }
    var nextBtn=null;
    function refreshNext(){if(nextBtn)nextBtn.disabled=!A[shownKey];}
    function goStep(k,focus){hold=false;cur=k;renderCtl(focus!==false);}
    var clearBtn=node("button","cq-clear",esc(U.clear));clearBtn.type="button";clearBtn.hidden=true;
    clearBtn.addEventListener("click",function(){
      Object.keys(A).forEach(function(k){A[k]=null;});cur=null;hold=false;haveCard=false;
      update();renderCtl("force");
    });
    function needAppt(){return !!DATA&&A.ins==="no";}
    // one screen at a time: a question, the appointment picker, then the result
    function screen(){if(view()!==null)return "q";return needAppt()&&(!A.appt||hold)?"appt":"result";}
    function chipText(k){return k==="ins"?U.chipIns[A.ins]:k==="inc"?U.incShort[INCOME_KEYS.indexOf(A.inc)]:U.chipFiled[A.filed];}
    function chip(){
      var w=node("div","cq-chip");w.setAttribute("role","group");w.setAttribute("aria-label",U.yours);
      required().forEach(function(k){
        if(!A[k])return;
        var b=node("button","cq-sumrow");b.type="button";b.setAttribute("data-k",k);
        b.setAttribute("aria-label",U.edit+" : "+optionsFor(k).label+", "+ansText(k));
        b.innerHTML='<span class="cq-sr-a">'+esc(chipText(k))+"</span>";
        b.addEventListener("click",function(){goStep(k,true);});w.appendChild(b);
      });
      var e=node("button","cq-sr-e",esc(U.edit));e.type="button";e.setAttribute("aria-label",U.edit);
      e.addEventListener("click",function(){goStep(required()[0],true);});w.appendChild(e);
      return w;
    }
    function backBar(onBack,extra){
      var h=node("div","cq-stg-h"),bk=node("button","cq-back",'<span aria-hidden="true">←</span> '+esc(L.back));bk.type="button";bk.addEventListener("click",onBack);h.appendChild(bk);
      if(extra)h.appendChild(extra);return h;
    }
    function contactCard(){
      if(!(opts.demo||opts.phone||opts.email))return null;
      // patient-facing: call or write the clinic directly, as an equal alternative to booking online. Links only for contacts the host supplies.
      var ph=opts.phone?String(opts.phone):"",em=opts.email?String(opts.email):"";
      if(!ph&&!em)return null;
      var d=node("div","cq-contact"),b=node("div","cq-contact-b");
      d.appendChild(textNode("p","cq-contact-q",L.skipPrompt));
      if(ph){var pa=node("a","cq-cta-btn cq-cta-btn-outline",esc(L.skipCall));pa.href="tel:"+ph.replace(/[^\d+]/g,"");b.appendChild(pa);}
      if(em){var ma=node("a","cq-cta-btn cq-cta-btn-outline",esc(L.skipMail.charAt(0).toUpperCase()+L.skipMail.slice(1)));ma.href="mailto:"+em;b.appendChild(ma);}
      d.appendChild(b);return d;
    }
    function continueBar(onNext,enabled){
      var ft=node("div","cq-stg-f");nextBtn=node("button","cq-next",esc(U.cont)+' <span aria-hidden="true">→</span>');nextBtn.type="button";nextBtn.disabled=!enabled;
      nextBtn.addEventListener("click",onNext);ft.appendChild(nextBtn);return ft;
    }
    function renderCtl(focus){
      clearTimeout(advT);var h0=root.offsetHeight;cin.innerHTML="";
      var sc=screen(),v=view(),r=required(),first=null;shownKey=null;nextBtn=null;
      if(sc==="q"){
        shownKey=v;
        var n=r.indexOf(v)+1,t=totalQ(),ticks="";
        for(var q=1;q<=t;q++)ticks+='<i'+(q<n?' class="on"':q===n?' class="cur"':"")+"></i>";
        var dots=node("span","cq-stg-n","<b>"+esc(U.qn.replace("{n}",n).replace("{t}",t))+'</b><span class="cq-ticks" aria-hidden="true">'+ticks+"</span>");
        var h=node("div","cq-stg-h");
        if(n>1){var bk=node("button","cq-back",'<span aria-hidden="true">←</span> '+esc(L.back));bk.type="button";bk.addEventListener("click",function(){goStep(r[n-2],true);});h.appendChild(bk);}
        h.appendChild(dots);cin.appendChild(h);
        first=fieldset(v);cin.appendChild(first);
        cin.appendChild(continueBar(function(){cur=null;renderCtl(true);},!!A[v]));
        srS.textContent=U.qn.replace("{n}",n).replace("{t}",t)+" : "+optionsFor(v).label;
      }else if(sc==="appt"){
        shownKey="appt";
        cin.appendChild(backBar(function(){goStep(r[r.length-1],true);}));
        cin.appendChild(chip());
        first=fieldset("appt");cin.appendChild(first);
        cin.appendChild(continueBar(function(){hold=false;renderCtl(true);},!!A.appt));
        srS.textContent=optionsFor("appt").label;
      }else{
        cin.appendChild(backBar(function(){if(needAppt()){hold=true;renderCtl(true);}else goStep(r[r.length-1],true);}));
        var cc=contactCard();if(cc)cin.appendChild(cc);
        cin.appendChild(clearBtn);
        srS.textContent="";
      }
      if(sc!=="result")cin.appendChild(node("span","cq-end"));
      clearBtn.hidden=!(A.ins||A.inc||A.filed||A.appt);
      root.setAttribute("data-view",sc==="q"?v:sc);
      // screen change: the frame resizes to its new content and the new screen slides (or, for the result, springs) in
      var rank=sc==="q"?r.indexOf(v):sc==="appt"?3:4,key=sc+(v||"");
      if(lastScr!==null&&lastScr!==key){
        var h1=root.offsetHeight;
        if(!REDUCE_MOTION&&h0&&h1!==h0&&root.animate)root.animate([{height:h0+"px"},{height:h1+"px"}],{duration:300,easing:"cubic-bezier(.2,.7,.2,1)"});
        enter(sc==="result"?"cq-reveal":rank>=lastRank?"cq-in-f":"cq-in-b");
      }
      lastScr=key;lastRank=rank;
      if(focus&&(kbd||focus==="force")){var f=cin.querySelector("input:checked")||cin.querySelector("input,button.cq-sumrow,button.cq-back");if(f)f.focus();}
    }
    function enter(c){grid.classList.remove("cq-in-f","cq-in-b","cq-reveal");void grid.offsetWidth;grid.classList.add(c);}

    /* ---- model ---- */
    function validFee(v){return typeof v==="number"&&isFinite(v)&&v>=0;}   // reject NaN, Infinity and negatives from bad data
    function cost(id){
      var p=null;PK.forEach(function(x){if(x.id===(id||A.appt))p=x;});
      if(!p||!DATA)return null;
      var fee=0,cov=0,pre=false,lab=false,excl=false,known=(A.ins==="no"&&!!A.inc),tp=known?(TIER_PCT[A.inc]||0):null;
      for(var i=0;i<p.items.length;i++){
        var c=byCode[p.items[i][0]],q=p.items[i][1];
        if(!c||!validFee(c.acdqFee2026)||!validFee(c.cdcpGridFee2026))return {pk:p,bad:true};   // never under-state a bill from missing data
        fee+=c.acdqFee2026*q;
        var x=(known&&c.isCoveredByCDCP)?Math.min(c.cdcpGridFee2026*tp,c.acdqFee2026):0;x=Math.round(x*100)/100;cov+=x*q;
        if(c.preAuthRequired)pre=true;if(c.hasLabFee)lab=true;if(!c.isCoveredByCDCP)excl=true;
      }
      fee=Math.round(fee*100)/100;cov=Math.round(cov*100)/100;
      return {pk:p,fee:fee,cov:cov,known:known,oop:Math.round((fee-cov)*100)/100,pre:pre,lab:lab,excl:excl,tp:tp};
    }
    function missing(){
      var m=[];
      if(!A.ins)m.push(U.ins);
      if(A.ins!=="yes"){
        if(!A.inc)m.push(U.inc);
        if(A.inc!=="over90"&&!A.filed)m.push(U.filed);
        if(DATA&&!A.appt)m.push(U.appt);
      }
      return m;
    }
    function outcome(){
      if(A.ins==="yes")return "insurance";
      if(A.ins!=="no"||!A.inc)return "pending";
      if(A.inc==="over90")return "income";
      if(A.filed==="no")return "tax";
      if(A.filed==="yes")return "qualified";
      return "unconfirmed";
    }

    /* ---- render ---- */
    function statusBlock(kind,title,detail,state){
      var d=node("div","cq-status-in cq-"+kind);
      if(state)d.appendChild(textNode("div","cq-pill",U.st[state==="pending"&&!(A.ins||A.inc||A.filed||A.appt)?"none":state]));
      d.appendChild(textNode("div","cq-status-title",title));
      if(detail)d.appendChild(textNode("p","cq-status-detail",detail));return d;
    }
    function insurersBlock(t,R){
      var list=Array.isArray(opts.insurers)?opts.insurers:(opts.demo?R.insurers:null);
      if(list&&list.length){
        t.appendChild(textNode("p","cq-insurer-note",Array.isArray(opts.insurers)?U.insurers:R.insurersNote));
        var p=node("div","cq-insurer-pills");list.forEach(function(n){p.appendChild(textNode("span","cq-insurer-pill",String(n)));});t.appendChild(p);
      }
    }
    var shown=0,raf=0,bigEl=null,last={oop:null,fee:null,cov:null,title:null,led:false,oc:null};
    function fade(el){el.classList.remove("cq-fade");void el.offsetWidth;el.classList.add("cq-fade");el.addEventListener("animationend",function f(){el.classList.remove("cq-fade");el.removeEventListener("animationend",f);});}
    // dollars large, cents small and baseline-aligned (decimal separator and fraction only; the currency sign keeps its place)
    function setBig(v){
      var h="";var ps=nf.formatToParts(v),lead=ps.length&&ps[0].type==="currency";
      ps.forEach(function(p){var c=(p.type==="decimal"||p.type==="fraction")?"cq-cents":p.type==="currency"?"cq-cur"+(lead?" cq-cur-lead":""):p.type==="literal"?"cq-sp":"";h+=c?'<span class="'+c+'">'+esc(p.value)+"</span>":esc(p.value);});
      bigEl.innerHTML=h;
    }
    function roll(to){shown=to;setBig(to);}
    // the empty figure keeps the shape of a real one (a dash where the dollars go), so the focal point never collapses
    function ghost(){var h="";nf.formatToParts(0).forEach(function(p){if(p.type==="integer")h+="\u2014";else if(p.type!=="decimal"&&p.type!=="fraction"&&p.type!=="group")h+=p.value;});return h;}
    function ansText(k){
      var v=A[k];if(!v)return null;
      if(k==="ins")return v==="yes"?U.yes:U.no;
      if(k==="inc")return nb(L.step2[v]);
      if(k==="filed")return v==="yes"?U.yes:U.notYet;
      return U.pk[v][0];
    }
    function renderSum(c,o){
      sSum.innerHTML="";
      sSum.hidden=false;
      var lbl=node("div","cq-lbl");lbl.appendChild(textNode("span",null,U.share));sSum.appendChild(lbl);
      bigEl=node("div","cq-big");bigEl.setAttribute("aria-hidden","true");sSum.appendChild(bigEl);
      if(c&&!c.bad&&c.known){
        roll(c.oop);root.style.setProperty("--cov",(c.fee?Math.max(0,Math.min(100,c.cov/c.fee*100)):0)+"%");
        if(last.oop!==null&&last.oop!==c.oop)bigEl.classList.add("cq-tick");last.oop=c.oop;
        var bar=node("div","cq-bar",'<i></i>');bar.setAttribute("aria-hidden","true");sSum.appendChild(bar);
      }else{
        bigEl.textContent=ghost();bigEl.classList.add("cq-big-empty");shown=0;last.oop=null;
        sSum.appendChild(textNode("p","cq-sum-note",c&&c.bad?U.unavailable:(DATA&&!A.appt?U.pickVisit:U.nopick)));
      }
    }
    function secLabel(k){return textNode("p","cq-sec",U.sec[k]);}
    function renderCostDetail(t,c,o){
      if(!c||c.bad)return;
      var tf=last.fee!==null&&last.fee!==c.fee,tc=last.cov!==null&&last.cov!==c.cov;last.fee=c.fee;last.cov=c.known?c.cov:null;
      var covers=c.known&&c.tp&&(c.cov>0||!c.excl),tierTxt=covers?U.grid.replace("{n}",Math.round(c.tp*100)):(c.tp?U.noCover:U.noelig);
      // the split is always visible: treatment cost | paid by the plan, then the caveat
      var split=node("dl","cq-split");
      split.appendChild(node("div",null,'<dt>'+esc(U.cost)+'</dt><dd'+(tf?' class="cq-tick"':'')+'>'+esc(nf.format(c.fee))+'</dd>'));
      split.appendChild(node("div",null,'<dt>'+esc(U.paid)+'</dt><dd class="'+(c.cov?"cq-good-t":"cq-dim")+(tc?" cq-tick":"")+'">'+(c.known?(c.cov?"− ":"")+esc(nf.format(c.cov)):esc(U.byAnswers))+'</dd>'));
      if(c.known&&c.cov>0)sBrk.appendChild(textNode("p","cq-save",U.save.replace("{n}",nf.format(c.cov))));
      sBrk.appendChild(split);
      sBrk.appendChild(textNode("p","cq-estnote",(c.known?nb(tierTxt)+" · ":"")+U.estNote));
      t.appendChild(secLabel("limits"));
      t.appendChild(node("p","cq-incl","<b>"+esc(U.incl)+"</b>"+(lang==="fr"?" : ":": ")+esc(U.pk[c.pk.id][1])));
      var notes=[];
      var x=U.pk[c.pk.id][2];if(x)notes.push(["bad",x]);
      if(c.known&&c.pre&&c.cov)notes.push(["warn",U.pre]);
      if(c.lab)notes.push(["bad",U.lab]);
      if(c.excl)notes.push(["bad",U.excl]);
      notes.forEach(function(n){t.appendChild(textNode("p","cq-note cq-"+n[0]+"-t",n[1]));});
    }
    var lastKey=null;
    function update(){
      var oc=outcome(),c=(oc==="insurance")?null:cost();
      if(SAVED)SAVED.set(root,A);
      clearBtn.hidden=!(A.ins||A.inc||A.filed||A.appt);
      var key=[oc,A.inc,A.filed,A.appt].join("|");
      var tier=INCOME_TIER[A.inc];
      var title="",detail="",kind="neutral";
      sRest.innerHTML="";sAct.innerHTML="";sStatus.innerHTML="";sBrk.innerHTML="";sDet.innerHTML="";
      if(oc==="pending"){
        var rem=missing();
        sStatus.appendChild(statusBlock("neutral",U.pendH,U.pendS,"pending"));
        if(DATA){renderSum(c,oc);}else{sSum.innerHTML="";sSum.hidden=true;}
        title=U.pendH;
        if(DATA&&c&&!c.bad)renderCostDetail(sDet,c,oc);
        var rp=ctaRow();rp.appendChild(ctaLink(withBookingParams(BOOK,{branch:"pending",utm_source:"cdcp-calculator"}),L.results.branchIncome.primaryCta,{variant:"secondary"}));sAct.appendChild(rp);
      }else if(oc==="insurance"){
        var R=L.results.branchInsurance;kind="good";title=R.headline;
        sStatus.appendChild(statusBlock("good",R.headline,R.microCopy,"insurance"));
        sSum.innerHTML="";sSum.hidden=true;
        var row=ctaRow();row.appendChild(ctaLink(withBookingParams(BOOK,{branch:"insurance",utm_source:"cdcp-calculator"}),R.primaryCta));sAct.appendChild(row);
        insurersBlock(sRest,R);
      }else{
        if(oc==="income"){var R2=L.results.branchIncome;title=R2.headline;sStatus.appendChild(statusBlock("bad",R2.headline,R2.microCopy,"income"));}
        else if(oc==="tax"){var R3=L.results.branchTaxFiling;title=R3.headline;sStatus.appendChild(statusBlock("warn",R3.headline,R3.microCopy,"tax"));}
        else if(oc==="qualified"){title=nb(L.results["tier"+tier+"Badge"]);sStatus.appendChild(statusBlock("good",title,"","qualified"));}
        else{title=U.tierUnconfirmed.replace("{n}",Math.round(TIER_PCT[A.inc]*100));sStatus.appendChild(statusBlock("warn",nb(title),"","unconfirmed"));}
        if(DATA)renderSum(c,oc);else{sSum.innerHTML="";sSum.hidden=true;}
        if(DATA&&c&&!c.bad&&c.known){
          if(oc==="tax")sSum.appendChild(textNode("p","cq-sum-note",U.whenIssued));
          else if(oc==="unconfirmed")sSum.appendChild(textNode("p","cq-sum-note",U.ifQualify));
          if(c.fee>0&&c.oop===0)sSum.appendChild(textNode("p","cq-sum-note",U.full));
        }
        renderCostDetail(sDet,c,oc);
        // calls to action
        if(oc==="income"){
          var r4=ctaRow();r4.appendChild(ctaLink(withBookingParams(BOOK,{branch:"income",utm_source:"cdcp-calculator"}),L.results.branchIncome.primaryCta));sAct.appendChild(r4);
        }else if(oc==="tax"){
          var R5=L.results.branchTaxFiling,r5=ctaRow();
          r5.appendChild(ctaLink(L.craMyAccountUrl,R5.primaryCta,{external:true}));
          r5.appendChild(ctaLink(withBookingParams(BOOK,{branch:"tax-filing",utm_source:"cdcp-calculator",suggestedDate:addWeeksIso(4)}),R5.secondaryCta,{variant:"secondary"}));
          sAct.appendChild(r5);
        }
        if(oc==="unconfirmed"){
          var ru=ctaRow();ru.appendChild(ctaLink(withBookingParams(BOOK,{branch:"unconfirmed",utm_source:"cdcp-calculator"}),L.results.branchIncome.primaryCta));sAct.appendChild(ru);
        }
        if(oc==="qualified"||oc==="unconfirmed"){
        }
        if(oc==="qualified"){
          var r6=ctaRow(),lk=function(label,on){var bt=node("button","cq-linkbtn",esc(label));bt.type="button";bt.addEventListener("click",function(){haveCard=on;update();var f=sAct.querySelector(on?".cq-cta-btn-primary":".cq-linkbtn");if(f)f.focus();});return bt;};
          if(haveCard){
            // already holds the card: book straight away, no suggested wait
            r6.appendChild(ctaLink(withBookingParams(BOOK,{branch:"qualified",cdcpTier:tier,utm_source:"cdcp-calculator",hasCard:"1"}),U.bookNow));
            r6.appendChild(lk(U.noCardYet,false));
          }else{
            // a two-step path: apply for the card, then book
            r6.appendChild(ctaLink(L.cdcpApplyUrl,U.applyLink,{external:true,variant:"outline"}));
            r6.appendChild(textNode("p","cq-cta-note",U.applySub));
            r6.appendChild(lk(U.haveCard,true));
            r6.appendChild(ctaLink(withBookingParams(BOOK,{branch:"qualified",cdcpTier:tier,utm_source:"cdcp-calculator",suggestedDate:addWeeksIso(7)}),U.step2));
            r6.appendChild(textNode("p","cq-cta-note",U.bookSub));
          }
          sAct.appendChild(r6);
        }
        var fine=[],tn=[];
        if(oc==="qualified"||oc==="unconfirmed")fine.push(U.ramq);
        if(c&&!c.bad)fine.push(U.disc);
        if(oc==="qualified")fine.push(L.results.sourceNote);
        if(oc==="qualified"||oc==="unconfirmed")tn.push(billingNotice(L.results.billingNoticeHeading,L.results.billingNoticeBody));
        if(fine.length)tn.push(textNode("p","cq-fine",fine.join(" ")));
        if(oc==="qualified")tn.push(coverageMatrix(L.results.coverageMatrix,U.matrix));
        // fine print lives in two drawers: the notice about fees and billing, then what is covered
        if(tn.length)sRest.appendChild(accordion(L.results.billingNoticeHeading,tn));
      }
      // one concise announcement per change (the animated number is aria-hidden)
      if(!sBrk.childNodes.length){last.fee=null;last.cov=null;}
      if(c&&c.bad)root.setAttribute("data-bad","1");else root.removeAttribute("data-bad");
            var hasLed=sBrk.childNodes.length>0;
      if(last.oc!==null&&last.oc!==oc){fade(sRest);if(sDet.childNodes.length)fade(sDet);}   // a different outcome: its next steps ease in
      if(hasLed&&!last.led){fade(sBrk);fade(sDet);}                                         // ledger appears once the appointment is chosen
      last.led=hasLed;last.oc=oc;
      var si=sStatus.firstChild;if(si&&last.title!==null&&last.title!==title)si.classList.add("cq-tick");last.title=title;
      var say=title+(c&&!c.bad&&c.known?". "+U.cost+" "+nf.format(c.fee)+", "+U.paid+" "+nf.format(c.cov)+". "+U.share+" "+nf.format(c.oop):"");
      if(key!==lastKey){sr.textContent=say;lastKey=key;}
      var sk=sStatus.firstChild,tm=sk&&/cq-(good|bad|warn)/.exec(sk.className);root.setAttribute("data-tone",tm?tm[1]:"neutral");
      root.setAttribute("data-state",oc);
      root.classList.toggle("cq-ledger",sBrk.childNodes.length>0);
    }
    update();renderCtl(false);
    // programmatic use (tests, host pages): set several answers at once and re-render
    function set(ans){Object.keys(ans||{}).forEach(function(k){if(k in A)A[k]=ans[k]||null;});cur=null;hold=false;lastScr=null;update();renderCtl(false);}
    return {state:A,outcome:outcome,cost:cost,view:view,set:set};
  }

  window.mountCdcpQuiz = mountCdcpQuiz;
})();
