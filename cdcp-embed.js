/*
 * cdcp-embed.js -- embeddable CDCP/RCSD calculator: eligibility and estimated
 * patient cost from one set of answers.
 *
 * Usage: mountCdcpQuiz(rootEl, "en" | "fr", opts)
 *   opts.bookingUrl   booking link for every call to action (default "/#contact")
 *   opts.insurers     array of accepted insurers, shown with the private-insurance result
 *   opts.province     fee-data key, default "QC" (needs cdcp-estimator-data.js loaded; without
 *                     it the appointment input and cost estimate are omitted)
 *   opts.demo         sss.marketing demo extras only
 * Calling it again on the same element (e.g. after a language switch) keeps the answers.
 * Eligibility rules, tiers, copy and federal URLs come from claude/sss-pages-build.py.
 */
(function(){
  "use strict";

  var CDCP_LABELS = {
    "en": {"stepLabel": "Step {current} of {total}", "back": "Back", "retake": "Run it again", "skipPrompt": "Prefer to skip straight to the point?", "skipBook": "Book a 30-min audit", "bookingUrl": "/#contact", "cdcpApplyUrl": "https://www.canada.ca/en/services/benefits/dental/dental-care-plan/apply.html", "craMyAccountUrl": "https://www.canada.ca/en/revenue-agency/services/e-services/digital-services-individuals/account-individuals.html", "step1": {"question": "Do you (or a family member) currently have access to private dental insurance — through an employer, a private plan, or a health spending account?", "yes": "Yes, I have private coverage", "no": "No private coverage"}, "step2": {"question": "What was your adjusted family net income on your last tax return?", "under70": "Under $70,000", "under70Hint": "up to 100% covered", "band70": "$70,000–$79,999", "band70Hint": "up to 60% covered", "band80": "$80,000–$89,999", "band80Hint": "up to 40% covered", "over90": "$90,000 or more", "over90Hint": "not eligible"}, "step3": {"question": "Have you (and your spouse or partner, if applicable) filed a Canadian tax return for the previous year?", "yes": "Yes, filed", "no": "Not yet"}, "step4": {"question": "Who are you checking eligibility for?", "senior": "Senior, 65+", "child": "Child under 18", "dtc": "Adult with a valid Disability Tax Credit", "adult": "Adult, 18–64"}, "results": {"tier100Badge": "Qualifies for up to 100% CDCP coverage", "tier60Badge": "Qualifies for up to 60% CDCP coverage", "tier40Badge": "Qualifies for up to 40% CDCP coverage", "childRamqNote": "In Quebec, RAMQ already covers basic dental care for children under 10 — CDCP fills the gap for kids 10 and up.", "tierRingCaption": "Your coverage tier", "coverageMatrix": {"heading": "Coverage & Authorization Matrix", "standard": {"title": "Standard Covered Care", "subtitle": "No prior approval required", "services": ["Diagnostic exams", "Digital X-rays", "Standard cleaning / scaling (up to annual limits)", "Basic fillings", "Simple extractions"], "note": "Covered directly under standard CDCP fee guidelines."}, "major": {"title": "Major Services", "subtitle": "Requires clinical pre-authorization (predetermination)", "services": ["Porcelain crowns (and cores/posts)", "Complete & partial dentures", "Root canal retreatment", "Additional periodontal scaling (beyond annual limits)"], "note": "Important: Major restorative treatments (crowns, dentures) require a formal electronic Predetermination Request. Our clinical team will submit your diagnostic treatment plan directly to Sun Life / CDCP for approval prior to initiating care."}, "excluded": {"title": "Strictly Excluded Services", "subtitle": "Out-of-pocket or private insurance only", "services": ["Nightguards / bruxism appliances", "Teeth whitening", "Cosmetic veneers", "Elective orthodontics / Invisalign", "Dental implants"], "note": "The CDCP does not cover occlusal nightguards, cosmetic procedures, elective alignment, or dental implants. Optional private payment plans or direct insurance billing are available for these treatments."}}, "sourceNote": "Coverage tiers reflect the federal CDCP fee schedule on canada.ca. Verified 2026-09-15.", "billingNoticeHeading": "Billing transparency notice", "billingNoticeBody": "Your tier applies to CDCP's fee schedule, not necessarily your dentist's charges. If a fee is above CDCP's rate, you pay the difference on top of your co-payment. Ask for a written estimate before any treatment.", "branchInsurance": {"headline": "You can book now. There is no need to wait for CDCP.", "banner": "Your private plan applies", "microCopy": "Your private plan covers care right away, with no government application or waiting period.", "primaryCta": "Book Your Appointment Now", "insurersNote": "On your own site, this panel shows the insurers your clinic accepts — for example:", "insurers": ["Sun Life", "Manulife", "Canada Life", "Green Shield Canada"]}, "branchIncome": {"headline": "You are not eligible for CDCP at this income.", "banner": "Standard care and payment options available", "microCopy": "Government coverage stops at $90,000 in household income. The clinic offers membership plans, flexible payment arrangements and a transparent fee guide.", "primaryCta": "Book a New Patient Exam & Consultation"}, "branchTaxFiling": {"headline": "One step left before you can apply.", "banner": "File your tax return to apply for CDCP", "microCopy": "The CRA needs your up-to-date tax return to verify your income. Once filed, you can apply.", "primaryCta": "File or Check Your Status on Canada.ca", "secondaryCta": "Pre-Book Your Appointment for Next Month"}, "branchQualified": {"headline": "Verification Complete — You Qualify for CDCP Coverage", "step1Title": "Step 1 — Apply for your CDCP card", "step1Body": "Processed by Health Canada, with Sun Life.", "step1Cta": "Open the CDCP application", "step2Title": "Step 2 — Book while you wait", "step2MicroCopy": "Your CDCP card arrives in 4 to 8 weeks. Booking 6 to 8 weeks out lines the visit up with it.", "step2Cta": "Book your CDCP appointment", "step3Title": "Step 3 — Need help?", "step3Cta": "Contact our front desk"}}},
    "fr": {"stepLabel": "Étape {current} sur {total}", "back": "Retour", "retake": "Recommencer", "skipPrompt": "Vous préférez aller droit au but?", "skipBook": "Réserver un audit de 30 min", "bookingUrl": "/#contact", "cdcpApplyUrl": "https://www.canada.ca/fr/services/prestations/dentaire/regime-soins-dentaires/demande.html", "craMyAccountUrl": "https://www.canada.ca/fr/agence-revenu/services/services-electroniques/services-electroniques-particuliers/dossier-particuliers.html", "step1": {"question": "Vous (ou un membre de votre famille) avez-vous actuellement accès à une assurance dentaire privée — par un employeur, un régime privé ou un compte de gestion santé?", "yes": "Oui, j'ai une couverture privée", "no": "Aucune couverture privée"}, "step2": {"question": "Quel était votre revenu familial net rajusté sur votre dernière déclaration de revenus?", "under70": "Moins de 70 000 $", "under70Hint": "jusqu'à 100 % couvert", "band70": "70 000 $ à 79 999 $", "band70Hint": "jusqu'à 60 % couvert", "band80": "80 000 $ à 89 999 $", "band80Hint": "jusqu'à 40 % couvert", "over90": "90 000 $ ou plus", "over90Hint": "non admissible"}, "step3": {"question": "Avez-vous (et votre conjoint(e), le cas échéant) produit une déclaration de revenus canadienne pour l'année précédente?", "yes": "Oui, produite", "no": "Pas encore"}, "step4": {"question": "Pour qui vérifiez-vous l'admissibilité?", "senior": "Aîné(e), 65 ans ou plus", "child": "Enfant de moins de 18 ans", "dtc": "Adulte détenant un crédit d'impôt pour personnes handicapées valide", "adult": "Adulte, 18 à 64 ans"}, "results": {"tier100Badge": "Admissible à une couverture RCSD pouvant atteindre 100 %", "tier60Badge": "Admissible à une couverture RCSD pouvant atteindre 60 %", "tier40Badge": "Admissible à une couverture RCSD pouvant atteindre 40 %", "childRamqNote": "Au Québec, la RAMQ couvre déjà les soins dentaires de base pour les enfants de moins de 10 ans — le RCSD prend le relais pour les enfants de 10 ans et plus.", "tierRingCaption": "Votre palier de couverture", "coverageMatrix": {"heading": "Matrice de couverture et d'autorisation", "standard": {"title": "Soins standards couverts", "subtitle": "Aucune approbation préalable requise", "services": ["Examens diagnostiques", "Radiographies numériques", "Nettoyage / détartrage standard (jusqu'aux limites annuelles)", "Plombages de base", "Extractions simples"], "note": "Couvert directement selon la grille tarifaire standard du RCSD."}, "major": {"title": "Services majeurs", "subtitle": "Nécessite une autorisation préalable (prédétermination)", "services": ["Couronnes en porcelaine (et tenons/moignons)", "Prothèses complètes et partielles", "Retraitement de canal", "Détartrage parodontal additionnel (au-delà des limites annuelles)"], "note": "Important : Les traitements de restauration majeurs (couronnes, prothèses) nécessitent une Demande d'autorisation préalable électronique. Notre équipe clinique soumettra votre plan de traitement diagnostique directement à la Sun Life / au RCSD pour approbation avant de débuter les soins."}, "excluded": {"title": "Services strictement exclus", "subtitle": "À payer directement ou par assurance privée", "services": ["Plaques occlusales / dispositifs contre le bruxisme", "Blanchiment des dents", "Facettes esthétiques", "Orthodontie élective / Invisalign", "Implants dentaires"], "note": "Le RCSD ne couvre pas les plaques occlusales, les soins esthétiques, l'orthodontie élective ni les implants dentaires. Des options de paiement privé ou de facturation directe à l'assurance sont disponibles pour ces traitements."}}, "sourceNote": "Les paliers de couverture reflètent la grille tarifaire fédérale du RCSD publiée sur canada.ca. Vérifié le 2026-09-15.", "billingNoticeHeading": "Avis de transparence tarifaire", "billingNoticeBody": "Votre palier s'applique à la grille du RCSD, pas forcément aux tarifs de votre dentiste. Si le tarif dépasse la grille, vous payez la différence en plus de votre quote-part. Demandez une estimation écrite avant tout traitement.", "branchInsurance": {"headline": "Vous pouvez réserver maintenant. Pas besoin d'attendre le RCSD.", "banner": "Votre assurance privée s'applique", "microCopy": "Votre régime privé couvre les soins tout de suite, sans demande ni délai gouvernemental.", "primaryCta": "Prendre rendez-vous maintenant", "insurersNote": "Sur votre propre site, ce module afficherait les assureurs acceptés par votre clinique — par exemple :", "insurers": ["Sun Life", "Manuvie", "Canada Vie", "Croix Bleue"]}, "branchIncome": {"headline": "Vous n'êtes pas admissible au RCSD à ce revenu.", "banner": "Soins standards et options de paiement offerts", "microCopy": "La couverture gouvernementale s'arrête à 90 000 $ de revenu familial. La clinique offre des forfaits d'adhésion, des ententes de paiement et une grille tarifaire transparente.", "primaryCta": "Prendre rendez-vous pour un nouvel examen"}, "branchTaxFiling": {"headline": "Il reste une étape avant de faire votre demande.", "banner": "Produisez votre déclaration de revenus pour faire la demande au RCSD", "microCopy": "L'ARC doit avoir votre déclaration de revenus à jour pour vérifier votre revenu. Une fois produite, vous pouvez faire la demande.", "primaryCta": "Produire ou vérifier votre dossier sur Canada.ca", "secondaryCta": "Réserver votre rendez-vous pour le mois prochain"}, "branchQualified": {"headline": "Vérification terminée — Vous êtes admissible à la couverture RCSD", "step1Title": "Étape 1 — Faites la demande de votre carte RCSD", "step1Body": "Demande traitée par Santé Canada, avec la Sun Life.", "step1Cta": "Ouvrir la demande RCSD", "step2Title": "Étape 2 — Réservez pendant l'attente", "step2MicroCopy": "La carte RCSD arrive en 4 à 8 semaines. Réserver dans 6 à 8 semaines aligne le rendez-vous avec sa réception.", "step2Cta": "Réserver votre rendez-vous RCSD", "step3Title": "Étape 3 — Besoin d'aide ?", "step3Cta": "Contactez notre réception"}}}
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
      ins:"Assurance privée", insI:"Le RCSD s’adresse aux personnes sans assurance", yes:"Oui", no:"Non",
      inc:"Revenu familial net", incI:"Détermine la part couverte", incShort:["< 70 k","70–79 k","80–89 k","90 k +"], incPct:["100 %","60 %","40 %","0 %"],
      filed:"Déclaration produite", filedI:"Requise pour demander", notYet:"Non",
      appt:"Rendez-vous", apptI:"Détermine le tarif du guide", pick:"Choisir…",
      remain:"Il reste à indiquer :", pendH:"Répondez pour voir votre estimation.",
      share:"Votre part estimée", cost:"Coût du traitement", std:"Guide tarifaire ACDQ 2026", paid:"Versé par le RCSD", noCover:"Service non couvert par le RCSD", full:"Entièrement couvert au tarif du guide.", ifQualify:"Si votre admissibilité est confirmée.", you:"Votre part", byAnswers:"selon vos réponses", grid:"{n} % de la grille du RCSD", noelig:"Non admissible",
      incl:"Inclus", nopick:"Choisissez un rendez-vous pour voir votre part.", unavailable:"Estimation indisponible pour ce rendez-vous. Communiquez avec la clinique.",
      tierUnconfirmed:"Palier RCSD : jusqu’à {n} %. Confirmez votre déclaration de revenus.", whenIssued:"Montant estimé une fois la carte RCSD reçue.",
      pre:"Préautorisation du RCSD requise.", lab:"Frais de laboratoire en sus.", excl:"Non couvert par le RCSD.",
      ramq:"Enfants de moins de 10 ans : la RAMQ couvre déjà les soins de base.",
      disc:"Estimation seulement. Chaque clinique fixe ses tarifs. Limites annuelles et frais de laboratoire non inclus.", matrix:"Soins couverts, autorisation et exclusions", insurers:"Assureurs acceptés par la clinique :",
      pk:{new:["Nouveau patient","Examen complet, 2 radiographies, nettoyage de 30 min, fluorure"],recall:["Rappel et nettoyage","Examen périodique, nettoyage de 30 min"],
          emerg:["Urgence, mal de dent","Examen d’urgence, radiographie","Un traitement immédiat (obturation, canal, extraction) s’ajoute au tarif."],
          filling:["Carie, obturation","Obturation en composite sur une molaire (1 surface)","L’examen n’est pas inclus."],major:["Prothèse complète","Prothèse complète standard, une arcade","Frais de laboratoire en sus."]}},
    en: {label:"CDCP eligibility and cost",
      ins:"Private insurance", insI:"CDCP is for people without insurance", yes:"Yes", no:"No",
      inc:"Net family income", incI:"Sets the share CDCP covers", incShort:["< 70k","70–79k","80–89k","90k+"], incPct:["100%","60%","40%","0%"],
      filed:"Tax return filed", filedI:"Required to apply", notYet:"Not yet",
      appt:"Appointment", apptI:"Sets the guide price", pick:"Choose…",
      remain:"Still to answer:", pendH:"Answer to see your estimate.",
      share:"Your estimated share", cost:"Treatment cost", std:"ACDQ 2026 price guide", paid:"Paid by CDCP", noCover:"Not a CDCP-covered service", full:"Fully covered at the guide price.", ifQualify:"If your eligibility is confirmed.", you:"Your share", byAnswers:"depends on your answers", grid:"{n}% of the CDCP fee schedule", noelig:"Not eligible",
      incl:"Includes", nopick:"Choose an appointment to see your share.", unavailable:"Estimate unavailable for this appointment. Please contact the clinic.",
      tierUnconfirmed:"CDCP tier: up to {n}%. Confirm your tax filing.", whenIssued:"Estimated amount once your CDCP card is issued.",
      pre:"CDCP pre-authorization required.", lab:"Lab fee billed extra.", excl:"Not covered by CDCP.",
      ramq:"Children under 10: RAMQ already covers basic care.",
      disc:"Estimate only. Each clinic sets its own fees. Annual limits and lab fees not included.", matrix:"Covered care, authorization and exclusions", insurers:"Insurers accepted by the clinic:",
      pk:{new:["New patient","Complete exam, 2 X-rays, 30-minute cleaning, fluoride"],recall:["Recall and cleaning","Periodic exam, 30-minute cleaning"],
          emerg:["Emergency, toothache","Emergency exam, X-ray","Immediate treatment (filling, root canal, extraction) is extra."],
          filling:["Cavity, filling","Composite filling on a molar (1 surface)","The exam is not included."],major:["Complete denture","Standard complete denture, one arch","Lab fees billed extra."]}}
  };
  var INCOME_KEYS = ["under70","band70","band80","over90"];
  var INCOME_TIER = {under70:"100",band70:"60",band80:"40"};
  var TIER_PCT = {under70:1,band70:.6,band80:.4,over90:0};
  var PK = [
    {id:"new",items:[["01103",1],["02102",1],["11112",1],["12101",1]]},
    {id:"recall",items:[["01202",1],["11112",1]]},
    {id:"emerg",items:[["01205",1],["02102",1]]},
    {id:"filling",items:[["23311",1]]},
    {id:"major",items:[["51101",1]]}
  ];
  var REDUCE_MOTION = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  var uid = 0, SAVED = (typeof WeakMap==="function")?new WeakMap():null;

  function esc(s){var d=document.createElement("div");d.textContent=s;return d.innerHTML;}
  function node(tag,cls,html){var e=document.createElement(tag);if(cls)e.className=cls;if(html!=null)e.innerHTML=html;return e;}
  function textNode(tag,cls,text){var e=document.createElement(tag);if(cls)e.className=cls;e.textContent=text;return e;}
  function nb(s){return String(s).replace(/ %/g," %");}
  function withBookingParams(url,params){
    try{var u=new URL(url,window.location.origin);Object.keys(params).forEach(function(k){u.searchParams.set(k,params[k]);});return u.toString();}
    catch(e){return url;}
  }
  function addWeeksIso(w){var d=new Date();d.setDate(d.getDate()+w*7);return d.toISOString().slice(0,10);}
  function ctaLink(href,label,opts){
    opts=opts||{};
    var a=node("a","cq-cta-btn "+(opts.variant==="secondary"?"cq-cta-btn-secondary":"cq-cta-btn-primary"));
    a.href=href;
    if(opts.external){a.target="_blank";a.rel="noopener noreferrer";}
    a.innerHTML="<span>"+esc(label)+"</span>"+(opts.external?'<span class="cq-cta-ext" aria-hidden="true">&#8599;</span>':"");
    return a;
  }
  function ctaRow(){return node("div","cq-cta-row");}
  function billingNotice(h,b){return node("p","cq-billing-notice",'<b>'+esc(h)+'.</b> '+esc(b));}
  function matrixItem(t,icon,data,open){
    var d=node("details","cq-matrix-item cq-tone-"+t);d.name="cq-matrix";if(open)d.open=true;
    d.innerHTML='<summary><span class="cq-matrix-item-icon" aria-hidden="true">'+icon+'</span><span class="cq-matrix-item-head"><span class="cq-matrix-item-title">'+esc(data.title)+
      '</span><span class="cq-matrix-item-subtitle">'+esc(data.subtitle)+'</span></span><span class="cq-matrix-item-chevron" aria-hidden="true">+</span></summary>'+
      '<div class="cq-matrix-item-body"><ul>'+data.services.map(function(s){return "<li>"+esc(s)+"</li>";}).join("")+'</ul><p class="cq-matrix-item-note">'+esc(data.note)+"</p></div>";
    return d;
  }
  function coverageMatrix(m,label){
    var wrap=node("details","cq-matrix-all");
    wrap.appendChild(node("summary",null,'<span>'+esc(label)+'</span><span class="cq-matrix-item-chevron" aria-hidden="true">+</span>'));
    var inner=node("div","cq-matrix");
    inner.appendChild(matrixItem("standard","&#10003;",m.standard,true));
    inner.appendChild(matrixItem("major","!",m.major,false));
    inner.appendChild(matrixItem("excluded","&#215;",m.excluded,false));
    wrap.appendChild(inner);return wrap;
  }
  function stepRow(n,title,body,cta){
    var d=node("div","cq-step-card");var c=node("div","cq-step-main");c.appendChild(node("div","cq-step-title",'<span class="cq-step-num">'+n+"</span>"+esc(title)));
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
    var grid=node("div","cq-grid"),ctl=node("div","cq-ctl"),sStatus=node("div","cq-status"),sSum=node("div","cq-sum"),sBrk=node("div","cq-brk"),sDet=node("div","cq-det"),sRest=node("div","cq-rest");
    var sr=node("div","cq-sr");sr.setAttribute("role","status");
    [ctl,sStatus,sSum,sBrk,sDet,sRest].forEach(function(n){grid.appendChild(n);});root.appendChild(grid);root.appendChild(sr);


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

    var rows={};
    function legend(fs,label){fs.appendChild(node("legend",null,'<span>'+esc(label)+'</span>'));}
    function seg(key,label,infl,options){
      var fs=node("fieldset","cq-row"+(options.length===4?" cq-row-wide":""));legend(fs,label,infl);
      var s=node("div","cq-seg cq-seg-"+options.length);
      options.forEach(function(o){
        var lb=node("label","cq-opt",'<input type="radio" name="cq'+id+key+'" value="'+o.v+'"'+(A[key]===o.v?" checked":"")+' aria-label="'+esc(o.aria||o.t)+'">'+o.html);
        lb.firstChild.addEventListener("change",function(){A[key]=o.v;update();});
        s.appendChild(lb);
      });
      fs.appendChild(s);ctl.appendChild(fs);rows[key]=fs;
    }
    seg("ins",U.ins,U.insI,[{v:"yes",t:U.yes,aria:L.step1.yes,html:"<span>"+esc(U.yes)+"</span>"},{v:"no",t:U.no,aria:L.step1.no,html:"<span>"+esc(U.no)+"</span>"}]);
    seg("filed",U.filed,U.filedI,[{v:"yes",t:U.yes,aria:L.step3.yes,html:"<span>"+esc(U.yes)+"</span>"},{v:"no",t:U.notYet,aria:L.step3.no,html:"<span>"+esc(U.notYet)+"</span>"}]);
    seg("inc",U.inc,U.incI,INCOME_KEYS.map(function(k,i){return {v:k,t:U.incShort[i],aria:L.step2[k]+", "+L.step2[k+"Hint"],
      html:"<span>"+esc(nb(U.incShort[i]).replace(/ /g," "))+'</span><small>'+esc(nb(U.incPct[i]))+"</small>"};}));
    if(DATA){
      var fs=node("fieldset","cq-row cq-row-wide");legend(fs,U.appt,U.apptI);
      var sel=node("select","cq-select");sel.setAttribute("autocomplete","off");sel.setAttribute("aria-label",U.appt);
      sel.appendChild(new Option(U.pick,""));
      PK.forEach(function(p,i){var f=pkFee(p);var o=new Option(U.pk[p.id][0],p.id);sel.appendChild(o);});
      sel.value=A.appt||"";
      sel.addEventListener("change",function(){A.appt=sel.value||null;update();});
      fs.appendChild(sel);ctl.appendChild(fs);rows.appt=fs;
    }
    if(opts.demo)ctl.appendChild(node("p","cq-skip",esc(L.skipPrompt)+' <a href="'+esc(BOOK)+'">'+esc(L.skipBook)+"</a>"));

    /* ---- model ---- */
    function validFee(v){return typeof v==="number"&&isFinite(v)&&v>=0;}   // reject NaN, Infinity and negatives from bad data
    function pkFee(p){var t=0;for(var i=0;i<p.items.length;i++){var c=byCode[p.items[i][0]];if(!c||!validFee(c.acdqFee2026))return null;t+=c.acdqFee2026*p.items[i][1];}return t;}
    function cost(){
      var p=null;PK.forEach(function(x){if(x.id===A.appt)p=x;});
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
    function statusBlock(kind,title,detail){
      var d=node("div","cq-status-in cq-"+kind);d.appendChild(textNode("div","cq-status-title",title));
      if(detail)d.appendChild(textNode("p","cq-status-detail",detail));return d;
    }
    function insurersBlock(t,R){
      var list=Array.isArray(opts.insurers)?opts.insurers:(opts.demo?R.insurers:null);
      if(list&&list.length){
        t.appendChild(textNode("p","cq-insurer-note",Array.isArray(opts.insurers)?U.insurers:R.insurersNote));
        var p=node("div","cq-insurer-pills");list.forEach(function(n){p.appendChild(textNode("span","cq-insurer-pill",String(n)));});t.appendChild(p);
      }
    }
    var shown=0,raf=0,bigEl=null;
    // dollars large, cents small and baseline-aligned (decimal separator and fraction only; the currency sign keeps its place)
    function setBig(v){
      var h="";nf.formatToParts(v).forEach(function(p){h+=(p.type==="decimal"||p.type==="fraction")?'<span class="cq-cents">'+esc(p.value)+"</span>":esc(p.value);});
      bigEl.innerHTML=h;
    }
    function roll(to){shown=to;setBig(to);}
    function renderSum(c,o){
      sSum.innerHTML="";
      sSum.hidden=false;
      var lbl=textNode("div","cq-lbl",U.share);sSum.appendChild(lbl);
      bigEl=node("div","cq-big");bigEl.setAttribute("aria-hidden","true");sSum.appendChild(bigEl);
      if(c&&!c.bad&&c.known){
        roll(c.oop);sSum.style.setProperty("--cov",(c.fee?Math.max(0,Math.min(100,c.cov/c.fee*100)):0)+"%");
        
      }else{
        bigEl.textContent="—";bigEl.classList.add("cq-big-empty");shown=0;
        var rem=missing();sSum.appendChild(textNode("p","cq-sum-note",c&&c.bad?U.unavailable:(rem.length?U.remain+" "+rem.join(", ")+".":U.nopick)));
      }
    }
    function renderCostDetail(t,c,o){
      if(!c||c.bad)return;
      var rowsH='<div><dt>'+esc(U.cost)+'<small class="cq-mute">'+esc(U.std)+'</small></dt><dd>'+esc(nf.format(c.fee))+'</dd></div>';
      if(c.known){
        var covers=c.tp&&(c.cov>0||!c.excl),tierTxt=covers?U.grid.replace("{n}",Math.round(c.tp*100)):(c.tp?U.noCover:U.noelig);
        rowsH+='<div><dt>'+esc(U.paid)+'<small class="'+(covers?"cq-good-t":"cq-bad-t")+'">'+esc(nb(tierTxt))+'</small></dt><dd class="'+(c.cov?"cq-good-t":"")+'">'+(c.cov?"− ":"")+esc(nf.format(c.cov))+'</dd></div>';
      }else rowsH+='<div><dt>'+esc(U.paid)+'</dt><dd class="cq-dim">'+esc(U.byAnswers)+'</dd></div>';
      sBrk.appendChild(node("dl","cq-dl",rowsH));
      t.appendChild(node("p","cq-incl","<b>"+esc(U.incl)+"</b>"+(lang==="fr"?" : ":": ")+esc(U.pk[c.pk.id][1])));
      var notes=[];
      var x=U.pk[c.pk.id][2];if(x)notes.push(["bad",x]);
      if(c.known&&c.pre&&c.cov)notes.push(["warn",U.pre]);
      if(c.lab&&c.pk.id!=="major")notes.push(["bad",U.lab]);
      if(c.excl)notes.push(["bad",U.excl]);
      notes.forEach(function(n){t.appendChild(textNode("p","cq-note cq-"+n[0]+"-t",n[1]));});
    }
    var lastKey=null;
    function update(){
      var oc=outcome(),c=(oc==="insurance")?null:cost();
      // disable what no longer matters (kept, not hidden, so the layout never jumps)
      function off(fs,v){if(!fs)return;fs.disabled=v;fs.classList.toggle("cq-off",v);}
      off(rows.inc,A.ins==="yes");off(rows.filed,A.ins==="yes"||A.inc==="over90");off(rows.appt,A.ins==="yes");
      Object.keys(rows).forEach(function(k){rows[k].setAttribute("data-done",A[k]?"1":"0");});
      if(SAVED)SAVED.set(root,A);

      var key=[oc,A.inc,A.filed,A.appt].join("|");
      var tier=INCOME_TIER[A.inc];
      var title="",detail="",kind="neutral";
      sRest.innerHTML="";sStatus.innerHTML="";sBrk.innerHTML="";sDet.innerHTML="";
      if(oc==="pending"){
        var rem=missing();
        sStatus.appendChild(statusBlock("neutral",U.pendH,DATA?"":U.remain+" "+rem.join(", ")+"."));
        if(DATA){renderSum(c,oc);}else{sSum.innerHTML="";sSum.hidden=true;}
        title=U.pendH;
        if(DATA&&c&&!c.bad)renderCostDetail(sDet,c,oc);
        var rp=ctaRow();rp.appendChild(ctaLink(withBookingParams(BOOK,{branch:"pending",utm_source:"cdcp-calculator"}),L.results.branchIncome.primaryCta));sRest.appendChild(rp);
      }else if(oc==="insurance"){
        var R=L.results.branchInsurance;kind="good";title=R.headline;
        sStatus.appendChild(statusBlock("good",R.headline,R.microCopy));
        sSum.innerHTML="";sSum.hidden=true;
        var row=ctaRow();row.appendChild(ctaLink(withBookingParams(BOOK,{branch:"insurance",utm_source:"cdcp-calculator"}),R.primaryCta));sRest.appendChild(row);
        insurersBlock(sRest,R);
      }else{
        if(oc==="income"){var R2=L.results.branchIncome;title=R2.headline;sStatus.appendChild(statusBlock("bad",R2.headline,R2.microCopy));}
        else if(oc==="tax"){var R3=L.results.branchTaxFiling;title=R3.headline;sStatus.appendChild(statusBlock("bad",R3.headline,R3.microCopy));}
        else if(oc==="qualified"){title=nb(L.results["tier"+tier+"Badge"]);sStatus.appendChild(statusBlock("good",title));}
        else{title=U.tierUnconfirmed.replace("{n}",Math.round(TIER_PCT[A.inc]*100));sStatus.appendChild(statusBlock("neutral",nb(title)));}
        if(DATA)renderSum(c,oc);else{sSum.innerHTML="";sSum.hidden=true;}
        if(DATA&&c&&!c.bad&&c.known){
          if(oc==="tax")sSum.appendChild(textNode("p","cq-sum-note",U.whenIssued));
          else if(oc==="unconfirmed")sSum.appendChild(textNode("p","cq-sum-note",U.ifQualify));
          if(c.fee>0&&c.oop===0)sSum.appendChild(textNode("p","cq-sum-note",U.full));
        }
        renderCostDetail(sDet,c,oc);
        // calls to action
        if(oc==="income"){
          var r4=ctaRow();r4.appendChild(ctaLink(withBookingParams(BOOK,{branch:"income",utm_source:"cdcp-calculator"}),L.results.branchIncome.primaryCta));sRest.appendChild(r4);
        }else if(oc==="tax"){
          var R5=L.results.branchTaxFiling,r5=ctaRow();
          r5.appendChild(ctaLink(L.craMyAccountUrl,R5.primaryCta,{external:true}));
          r5.appendChild(ctaLink(withBookingParams(BOOK,{branch:"tax-filing",utm_source:"cdcp-calculator",suggestedDate:addWeeksIso(4)}),R5.secondaryCta,{variant:"secondary"}));
          sRest.appendChild(r5);
        }
        if(oc==="unconfirmed"){
          var ru=ctaRow();ru.appendChild(ctaLink(withBookingParams(BOOK,{branch:"unconfirmed",utm_source:"cdcp-calculator"}),L.results.branchIncome.primaryCta));sRest.appendChild(ru);
        }
        if(oc==="qualified"||oc==="unconfirmed"){
          sDet.appendChild(billingNotice(L.results.billingNoticeHeading,L.results.billingNoticeBody));
        }
        if(oc==="qualified"){
          var R6=L.results.branchQualified,steps=node("div","cq-steps");
          function strip(x){return x.replace(/^[^—-]*[—-]\s*/,"");}
          steps.appendChild(stepRow(1,strip(R6.step1Title),R6.step1Body,ctaLink(L.cdcpApplyUrl,R6.step1Cta,{external:true,variant:"secondary"})));
          steps.appendChild(stepRow(2,strip(R6.step2Title),R6.step2MicroCopy,ctaLink(withBookingParams(BOOK,{branch:"qualified",cdcpTier:tier,utm_source:"cdcp-calculator",suggestedDate:addWeeksIso(7)}),R6.step2Cta)));
          sRest.appendChild(steps);
          var help=node("p","cq-help");help.appendChild(document.createTextNode(strip(R6.step3Title)+" "));
          var ha=node("a",null);ha.href=withBookingParams(BOOK,{branch:"qualified-help",utm_source:"cdcp-calculator"});ha.textContent=R6.step3Cta;help.appendChild(ha);sRest.appendChild(help);
          sRest.appendChild(coverageMatrix(L.results.coverageMatrix,U.matrix));
        }
        var fine=[];
        if(oc==="qualified"||oc==="unconfirmed")fine.push(U.ramq);
        if(c&&!c.bad)fine.push(U.disc);
        if(oc==="qualified")fine.push(L.results.sourceNote);
        if(fine.length)sRest.appendChild(textNode("p","cq-fine",fine.join(" ")));
      }
      // one concise announcement per change (the animated number is aria-hidden)
      var say=title+(c&&!c.bad&&c.known?". "+U.cost+" "+nf.format(c.fee)+", "+U.paid+" "+nf.format(c.cov)+". "+U.share+" "+nf.format(c.oop):"");
      if(key!==lastKey){sr.textContent=say;lastKey=key;}
      root.setAttribute("data-state",oc);
      root.classList.toggle("cq-ledger",sBrk.childNodes.length>0);
    }
    update();
    return {state:A,outcome:outcome,cost:cost};
  }

  window.mountCdcpQuiz = mountCdcpQuiz;
})();
