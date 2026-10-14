/*
 * cdcp-embed.js -- Embeddable CDCP/RCSD eligibility calculator.
 *
 * Extracted verbatim (same branching logic, same EN/FR compliance copy,
 * same federal URLs) from claude/sss-pages-build.py, the source that
 * generates the live sss.marketing/cdcp/ and /rcsd/ pages. This file does
 * NOT change any eligibility logic, coverage tiers, disclaimers, or links --
 * it only adapts the quiz's mount point from a hardcoded #quizRoot lookup
 * to an explicit mountCdcpQuiz(root, lang) call so the same component can
 * be embedded inside a drawer on other pages.
 *
 * Usage: mountCdcpQuiz(rootEl, "en" | "fr", opts) -- call once each time the
 * host page wants a fresh quiz mounted into an empty container element.
 * Calling it again on a fresh container (e.g. after a language switch)
 * starts the quiz over at step 1, same as the standalone pages' own
 * "Run it again" behavior.
 */
(function(){
  "use strict";

  var CDCP_LABELS = {
    "en": {"stepLabel": "Step {current} of {total}", "back": "Back", "retake": "Run it again", "skipPrompt": "Prefer to skip straight to the point?", "skipBook": "Book a 30-min audit", "bookingUrl": "/#contact", "cdcpApplyUrl": "https://www.canada.ca/en/services/benefits/dental/dental-care-plan/apply.html", "craMyAccountUrl": "https://www.canada.ca/en/revenue-agency/services/e-services/digital-services-individuals/account-individuals.html", "step1": {"question": "Do you (or a family member) currently have access to private dental insurance — through an employer, a private plan, or a health spending account?", "yes": "Yes, I have private coverage", "no": "No private coverage"}, "step2": {"question": "What was your adjusted family net income on your last tax return?", "under70": "Under $70,000", "under70Hint": "up to 100% covered", "band70": "$70,000–$79,999", "band70Hint": "up to 60% covered", "band80": "$80,000–$89,999", "band80Hint": "up to 40% covered", "over90": "$90,000 or more", "over90Hint": "not eligible"}, "step3": {"question": "Have you (and your spouse or partner, if applicable) filed a Canadian tax return for the previous year?", "yes": "Yes, filed", "no": "Not yet"}, "step4": {"question": "Who are you checking eligibility for?", "senior": "Senior, 65+", "child": "Child under 18", "dtc": "Adult with a valid Disability Tax Credit", "adult": "Adult, 18–64"}, "results": {"tier100Badge": "Qualifies for up to 100% CDCP coverage", "tier60Badge": "Qualifies for up to 60% CDCP coverage", "tier40Badge": "Qualifies for up to 40% CDCP coverage", "childRamqNote": "In Quebec, RAMQ already covers basic dental care for children under 10 — CDCP fills the gap for kids 10 and up.", "tierRingCaption": "Your coverage tier", "coverageMatrix": {"heading": "Coverage & Authorization Matrix", "standard": {"title": "Standard Covered Care", "subtitle": "No prior approval required", "services": ["Diagnostic exams", "Digital X-rays", "Standard cleaning / scaling (up to annual limits)", "Basic fillings", "Simple extractions"], "note": "Covered directly under standard CDCP fee guidelines."}, "major": {"title": "Major Services", "subtitle": "Requires clinical pre-authorization (predetermination)", "services": ["Porcelain crowns (and cores/posts)", "Complete & partial dentures", "Root canal retreatment", "Additional periodontal scaling (beyond annual limits)"], "note": "Important: Major restorative treatments (crowns, dentures) require a formal electronic Predetermination Request. Our clinical team will submit your diagnostic treatment plan directly to Sun Life / CDCP for approval prior to initiating care."}, "excluded": {"title": "Strictly Excluded Services", "subtitle": "Out-of-pocket or private insurance only", "services": ["Nightguards / bruxism appliances", "Teeth whitening", "Cosmetic veneers", "Elective orthodontics / Invisalign", "Dental implants"], "note": "The CDCP does not cover occlusal nightguards, cosmetic procedures, elective alignment, or dental implants. Optional private payment plans or direct insurance billing are available for these treatments."}}, "sourceNote": "Coverage tiers reflect the federal CDCP fee schedule on canada.ca. Verified 2026-09-15.", "billingNoticeHeading": "Billing Transparency Notice", "billingNoticeBody": "Your coverage tier applies to CDCP's own fee schedule, not necessarily your dentist's actual charges. If a provider's fee for a service is higher than CDCP's set rate, you're responsible for that difference — separate from your tier's regular co-payment. Ask for a written treatment estimate before any procedure so you know your full out-of-pocket cost.", "branchInsurance": {"headline": "You can book now. There is no need to wait for CDCP.", "banner": "Your private plan applies", "microCopy": "Since you already have private coverage, you can access immediate care without government application delays or waiting periods.", "primaryCta": "Book Your Appointment Now", "insurersNote": "On your own site, this panel shows the insurers your clinic accepts — for example:", "insurers": ["Sun Life", "Manulife", "Canada Life", "Green Shield Canada"]}, "branchIncome": {"headline": "You are not eligible for CDCP at this income.", "banner": "Standard care and payment options available", "microCopy": "While government coverage caps at $90,000 in household income, our clinic offers direct-to-patient membership plans, flexible payment arrangements, and a transparent fee guide.", "primaryCta": "Book a New Patient Exam & Consultation"}, "branchTaxFiling": {"headline": "One step left before you can apply.", "banner": "File your tax return to apply for CDCP", "microCopy": "Health Canada requires an up-to-date tax filing with the CRA to verify your household income. Once you file, you can apply right away.", "primaryCta": "File or Check Your Status on Canada.ca", "secondaryCta": "Pre-Book Your Appointment for Next Month"}, "branchQualified": {"headline": "Verification Complete — You Qualify for CDCP Coverage", "step1Title": "Step 1 — Apply for Your CDCP Card", "step1Body": "Applications are processed through Health Canada, in partnership with Sun Life.", "step1Cta": "Open CDCP Application Portal", "step2Title": "Step 2 — Book While You Wait", "step2MicroCopy": "Application Timeline Notice: CDCP cards and welcome packages typically arrive within 4 to 8 weeks. Booking a visit 6 to 8 weeks out helps ensure your appointment lines up with your card's arrival.", "step2Cta": "Book Your Future CDCP Appointment", "step3Title": "Step 3 — Get Help If You Need It", "step3Cta": "Contact Our Front Desk"}}},
    "fr": {"stepLabel": "Étape {current} sur {total}", "back": "Retour", "retake": "Recommencer", "skipPrompt": "Vous préférez aller droit au but?", "skipBook": "Réserver un audit de 30 min", "bookingUrl": "/#contact", "cdcpApplyUrl": "https://www.canada.ca/fr/services/prestations/dentaire/regime-soins-dentaires/demande.html", "craMyAccountUrl": "https://www.canada.ca/fr/agence-revenu/services/services-electroniques/services-electroniques-particuliers/dossier-particuliers.html", "step1": {"question": "Vous (ou un membre de votre famille) avez-vous actuellement accès à une assurance dentaire privée — par un employeur, un régime privé ou un compte de gestion santé?", "yes": "Oui, j'ai une couverture privée", "no": "Aucune couverture privée"}, "step2": {"question": "Quel était votre revenu familial net rajusté sur votre dernière déclaration de revenus?", "under70": "Moins de 70 000 $", "under70Hint": "jusqu'à 100 % couvert", "band70": "70 000 $ à 79 999 $", "band70Hint": "jusqu'à 60 % couvert", "band80": "80 000 $ à 89 999 $", "band80Hint": "jusqu'à 40 % couvert", "over90": "90 000 $ ou plus", "over90Hint": "non admissible"}, "step3": {"question": "Avez-vous (et votre conjoint(e), le cas échéant) produit une déclaration de revenus canadienne pour l'année précédente?", "yes": "Oui, produite", "no": "Pas encore"}, "step4": {"question": "Pour qui vérifiez-vous l'admissibilité?", "senior": "Aîné(e), 65 ans ou plus", "child": "Enfant de moins de 18 ans", "dtc": "Adulte détenant un crédit d'impôt pour personnes handicapées valide", "adult": "Adulte, 18 à 64 ans"}, "results": {"tier100Badge": "Admissible à une couverture RCSD pouvant atteindre 100 %", "tier60Badge": "Admissible à une couverture RCSD pouvant atteindre 60 %", "tier40Badge": "Admissible à une couverture RCSD pouvant atteindre 40 %", "childRamqNote": "Au Québec, la RAMQ couvre déjà les soins dentaires de base pour les enfants de moins de 10 ans — le RCSD prend le relais pour les enfants de 10 ans et plus.", "tierRingCaption": "Votre palier de couverture", "coverageMatrix": {"heading": "Matrice de couverture et d'autorisation", "standard": {"title": "Soins standards couverts", "subtitle": "Aucune approbation préalable requise", "services": ["Examens diagnostiques", "Radiographies numériques", "Nettoyage / détartrage standard (jusqu'aux limites annuelles)", "Plombages de base", "Extractions simples"], "note": "Couvert directement selon la grille tarifaire standard du RCSD."}, "major": {"title": "Services majeurs", "subtitle": "Nécessite une autorisation préalable (prédétermination)", "services": ["Couronnes en porcelaine (et tenons/moignons)", "Prothèses complètes et partielles", "Retraitement de canal", "Détartrage parodontal additionnel (au-delà des limites annuelles)"], "note": "Important : Les traitements de restauration majeurs (couronnes, prothèses) nécessitent une Demande d'autorisation préalable électronique. Notre équipe clinique soumettra votre plan de traitement diagnostique directement à la Sun Life / au RCSD pour approbation avant de débuter les soins."}, "excluded": {"title": "Services strictement exclus", "subtitle": "À payer directement ou par assurance privée", "services": ["Plaques occlusales / dispositifs contre le bruxisme", "Blanchiment des dents", "Facettes esthétiques", "Orthodontie élective / Invisalign", "Implants dentaires"], "note": "Le RCSD ne couvre pas les plaques occlusales, les soins esthétiques, l'orthodontie élective ni les implants dentaires. Des options de paiement privé ou de facturation directe à l'assurance sont disponibles pour ces traitements."}}, "sourceNote": "Les paliers de couverture reflètent la grille tarifaire fédérale du RCSD publiée sur canada.ca. Vérifié le 2026-09-15.", "billingNoticeHeading": "Avis de transparence tarifaire", "billingNoticeBody": "Votre palier de couverture s'applique à la grille tarifaire propre au RCSD, et non nécessairement aux tarifs réels de votre dentiste. Si les honoraires exigés par un fournisseur pour un service dépassent le tarif établi par le RCSD, vous devrez payer cette différence, en plus de la quote-part habituelle liée à votre palier. Demandez une estimation écrite du traitement avant toute intervention afin de connaître l'ensemble des frais à votre charge.", "branchInsurance": {"headline": "Vous pouvez réserver maintenant. Pas besoin d'attendre le RCSD.", "banner": "Votre assurance privée s'applique", "microCopy": "Puisque vous avez déjà une couverture privée, vous pouvez accéder à des soins immédiatement, sans délai de demande ni période d'attente gouvernementale.", "primaryCta": "Prendre rendez-vous maintenant", "insurersNote": "Sur votre propre site, ce module afficherait les assureurs acceptés par votre clinique — par exemple :", "insurers": ["Sun Life", "Manuvie", "Canada Vie", "Croix Bleue"]}, "branchIncome": {"headline": "Vous n'êtes pas admissible au RCSD à ce revenu.", "banner": "Soins standards et options de paiement offerts", "microCopy": "La couverture gouvernementale s'arrête à 90 000 $ de revenu familial, mais notre clinique offre des forfaits d'adhésion directs, des ententes de paiement flexibles et une grille tarifaire transparente.", "primaryCta": "Prendre rendez-vous pour un nouvel examen"}, "branchTaxFiling": {"headline": "Il reste une étape avant de faire votre demande.", "banner": "Produisez votre déclaration de revenus pour faire la demande au RCSD", "microCopy": "Santé Canada exige une déclaration de revenus à jour auprès de l'ARC pour vérifier votre revenu familial. Une fois celle-ci produite, vous pourrez faire une demande immédiatement.", "primaryCta": "Produire ou vérifier votre dossier sur Canada.ca", "secondaryCta": "Réserver votre rendez-vous pour le mois prochain"}, "branchQualified": {"headline": "Vérification terminée — Vous êtes admissible à la couverture RCSD", "step1Title": "Étape 1 — Faites la demande de votre carte RCSD", "step1Body": "Les demandes sont traitées par Santé Canada, en partenariat avec la Sun Life.", "step1Cta": "Ouvrir le portail de demande RCSD", "step2Title": "Étape 2 — Réservez pendant l'attente", "step2MicroCopy": "Avis sur les délais de traitement : la carte RCSD et la trousse de bienvenue arrivent généralement par la poste dans un délai de 4 à 8 semaines. Réserver votre visite dans 6 à 8 semaines permet d'aligner votre rendez-vous avec la réception de votre carte.", "step2Cta": "Réserver votre futur rendez-vous RCSD", "step3Title": "Étape 3 — Besoin d'aide ?", "step3Cta": "Contactez notre réception"}}}
  };

  /* Live single-panel calculator. Controls on one side, result on the other;
     every valid change recalculates immediately. Eligibility logic is the
     original branching, evaluated continuously instead of step by step:
       private insurance -> insurance branch
       income >= 90k     -> income branch
       return not filed  -> tax-filing branch
       else              -> qualified, tier from income band            */
  var UI = {
    fr: {label:"Admissibilité au RCSD", insurers:"Assureurs acceptés par la clinique :", ins:"Assurance privée", yes:"Oui", no:"Non", inc:"Revenu familial net", incShort:["< 70 k","70–79 k","80–89 k","90 k +"],
         filed:"Déclaration de revenus produite", notYet:"Pas encore", who:"Pour qui", pendH:"Indiquez votre revenu familial.",
         pendP:"Le résultat s’affiche dès que la tranche est choisie.", matrix:"Soins couverts, autorisation et exclusions"},
    en: {label:"CDCP eligibility", insurers:"Insurers accepted by the clinic:", ins:"Private insurance", yes:"Yes", no:"No", inc:"Net family income", incShort:["< 70k","70–79k","80–89k","90k+"],
         filed:"Tax return filed", notYet:"Not yet", who:"Who is it for", pendH:"Select your family income.",
         pendP:"The result appears as soon as a band is selected.", matrix:"Covered care, authorization and exclusions"}
  };
  var INCOME_KEYS = ["under70","band70","band80","over90"];
  var INCOME_TIER = {under70:"100",band70:"60",band80:"40"};
  var TIER_RING_COLOR = {"100":"var(--c-good)","60":"var(--c-accent)","40":"var(--c-accent)"};
  var STATUS_KEYS = ["adult","senior","child","dtc"];
  var REDUCE_MOTION = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  var RING_MS = REDUCE_MOTION ? 1 : 450;
  var uid = 0;

  function esc(s){var d=document.createElement("div");d.textContent=s;return d.innerHTML;}
  function node(tag,cls,html){var e=document.createElement(tag);if(cls)e.className=cls;if(html!=null)e.innerHTML=html;return e;}
  function textNode(tag,cls,text){var e=document.createElement(tag);if(cls)e.className=cls;e.textContent=text;return e;}

  /* Booking links carry the branch so conversions stay traceable. Never
     applied to canada.ca links. */
  function withBookingParams(url,params){
    try{var u=new URL(url,window.location.origin);Object.keys(params).forEach(function(k){u.searchParams.set(k,params[k]);});return u.toString();}
    catch(e){return url;}
  }
  function addWeeksIso(weeks){var d=new Date();d.setDate(d.getDate()+weeks*7);return d.toISOString().slice(0,10);}

  function ctaLink(href,label,opts){
    opts=opts||{};
    var a=node("a","cq-cta-btn "+(opts.variant==="secondary"?"cq-cta-btn-secondary":"cq-cta-btn-primary"));
    a.href=href;
    if(opts.external){a.target="_blank";a.rel="noopener noreferrer";}
    a.innerHTML="<span>"+esc(label)+"</span>"+(opts.external?'<span class="cq-cta-ext" aria-hidden="true">&#8599;</span>':"");
    return a;
  }
  function ctaRow(){return node("div","cq-cta-row");}
  function headline(text){return textNode("h3","cq-result-headline",text);}
  function tone(text,t){return node("div","cq-result-badge cq-tone-"+t,'<span class="cq-result-badge-text">'+esc(text)+"</span>");}

  function animateNumber(from,to,duration,onUpdate){
    if(duration<=1){onUpdate(to);return;}
    var start=null;
    function tick(ts){if(start===null)start=ts;var p=Math.min((ts-start)/duration,1),e=1-Math.pow(1-p,3);onUpdate(from+(to-from)*e);if(p<1)requestAnimationFrame(tick);}
    requestAnimationFrame(tick);
  }
  function coverageRing(percent,color){
    var wrap=node("div","cq-ring-wrap"),C=2*Math.PI*26;
    wrap.innerHTML='<svg width="56" height="56" viewBox="0 0 64 64" class="cq-ring-svg" aria-hidden="true">'+
      '<circle cx="32" cy="32" r="26" stroke-width="6" fill="none" class="cq-ring-track"></circle>'+
      '<circle cx="32" cy="32" r="26" stroke-width="6" fill="none" class="cq-ring-fill" stroke="'+color+'" stroke-dasharray="'+C+'" stroke-dashoffset="'+C+'"></circle>'+
      '</svg><span class="cq-ring-label">0%</span>';
    var f=wrap.querySelector(".cq-ring-fill"),l=wrap.querySelector(".cq-ring-label");
    animateNumber(0,percent,RING_MS,function(v){l.textContent=Math.round(v)+"%";f.setAttribute("stroke-dashoffset",C-(v/100)*C);});
    return wrap;
  }

  function billingNotice(h,b){
    return node("div","cq-billing-notice",'<div class="cq-billing-notice-heading">'+esc(h)+'</div><div class="cq-billing-notice-body">'+esc(b)+"</div>");
  }
  function matrixItem(t,icon,data,open){
    var d=node("details","cq-matrix-item cq-tone-"+t);d.name="matrix";if(open)d.open=true;
    d.innerHTML='<summary><span class="cq-matrix-item-icon" aria-hidden="true">'+icon+'</span><span class="cq-matrix-item-head"><span class="cq-matrix-item-title">'+esc(data.title)+
      '</span><span class="cq-matrix-item-subtitle">'+esc(data.subtitle)+'</span></span><span class="cq-matrix-item-chevron" aria-hidden="true">+</span></summary>'+
      '<div class="cq-matrix-item-body"><ul>'+data.services.map(function(s){return "<li>"+esc(s)+"</li>";}).join("")+'</ul><p class="cq-matrix-item-note">'+esc(data.note)+"</p></div>";
    return d;
  }
  function coverageMatrix(m,label){
    var wrap=node("details","cq-matrix-all"),sum=node("summary",null,'<span>'+esc(label)+'</span><span class="cq-matrix-item-chevron" aria-hidden="true">+</span>');
    wrap.appendChild(sum);
    var inner=node("div","cq-matrix");
    inner.appendChild(matrixItem("standard","&#10003;",m.standard,true));
    inner.appendChild(matrixItem("major","!",m.major,false));
    inner.appendChild(matrixItem("excluded","&#215;",m.excluded,false));
    wrap.appendChild(inner);
    return wrap;
  }
  function stepRow(n,title,body,cta){
    var d=node("div","cq-step-card");
    d.appendChild(node("span","cq-step-num",String(n)));
    var c=node("div","cq-step-main");
    c.appendChild(textNode("div","cq-step-title",title));
    if(body)c.appendChild(textNode("p","cq-step-text",body));
    if(cta)c.appendChild(cta);
    d.appendChild(c);
    return d;
  }

  function mountCdcpQuiz(root,lang,opts){
    if(!root)return;
    opts=opts||{};
    lang=lang==="fr"?"fr":"en";
    var L=CDCP_LABELS[lang],U=UI[lang],id=++uid;
    var BOOK=opts.bookingUrl||L.bookingUrl;
    var A={ins:"no",inc:null,filed:"yes",who:"adult"};

    root.innerHTML="";root.className="cdcp cq";
    root.setAttribute("role","group");root.setAttribute("aria-label",U.label);
    var grid=node("div","cq-grid"),ctl=node("div","cq-ctl"),out=node("div","cq-out");
    out.setAttribute("aria-live","polite");
    grid.appendChild(ctl);grid.appendChild(out);root.appendChild(grid);

    var rows={};
    function seg(key,label,options,aria){
      var fs=node("fieldset","cq-row");fs.appendChild(node("legend",null,esc(label)));
      var s=node("div","cq-seg cq-seg-"+options.length);
      options.forEach(function(o){
        var lb=node("label","cq-opt",'<input type="radio" name="cq'+id+key+'" value="'+o.v+'"'+(A[key]===o.v?" checked":"")+
          ' aria-label="'+esc(o.aria||o.t)+'"><span>'+esc(o.t)+"</span>");
        lb.firstChild.addEventListener("change",function(){A[key]=o.v;update();});
        s.appendChild(lb);
      });
      fs.appendChild(s);ctl.appendChild(fs);rows[key]=fs;return fs;
    }
    seg("ins",U.ins,[{v:"yes",t:U.yes,aria:L.step1.yes},{v:"no",t:U.no,aria:L.step1.no}]);
    var incRow=seg("inc",U.inc,INCOME_KEYS.map(function(k,i){return {v:k,t:U.incShort[i],aria:L.step2[k]};}));
    var hint=node("p","cq-hint");hint.textContent=" ";incRow.appendChild(hint);
    seg("filed",U.filed,[{v:"yes",t:U.yes,aria:L.step3.yes},{v:"no",t:U.notYet,aria:L.step3.no}]);
    var wr=node("fieldset","cq-row");wr.appendChild(node("legend",null,esc(U.who)));
    var sel=node("select","cq-select");sel.id="cqw"+id;sel.setAttribute("aria-label",L.step4.question);
    STATUS_KEYS.forEach(function(k){var o=document.createElement("option");o.value=k;o.textContent=L.step4[k];sel.appendChild(o);});
    sel.value=A.who;sel.addEventListener("change",function(){A.who=sel.value;update();});
    wr.appendChild(sel);ctl.appendChild(wr);rows.who=wr;
    if(opts.demo)ctl.appendChild(node("p","cq-skip",esc(L.skipPrompt)+' <a href="'+esc(BOOK)+'">'+esc(L.skipBook)+"</a>"));

    function resolve(){
      if(A.ins==="yes")return {branch:"insurance"};
      if(!A.inc)return {branch:"pending"};
      if(A.inc==="over90")return {branch:"income"};
      if(A.filed==="no")return {branch:"tax-filing"};
      return {branch:"qualified",tier:INCOME_TIER[A.inc],status:A.who};
    }
    function setDisabled(fs,off){fs.disabled=off;fs.classList.toggle("cq-off",off);}

    function buildInsurance(t){
      var R=L.results.branchInsurance;
      t.appendChild(headline(R.headline));t.appendChild(tone(R.banner,"positive"));
      t.appendChild(textNode("p","cq-result-msg",R.microCopy));
      var row=ctaRow();row.appendChild(ctaLink(withBookingParams(BOOK,{branch:"insurance",utm_source:"cdcp-calculator"}),R.primaryCta));t.appendChild(row);
      var list=Array.isArray(opts.insurers)?opts.insurers:(opts.demo?R.insurers:null);
      if(list&&list.length){
        t.appendChild(textNode("p","cq-insurer-note",Array.isArray(opts.insurers)?U.insurers:R.insurersNote));
        var p=node("div","cq-insurer-pills");list.forEach(function(n){p.appendChild(textNode("span","cq-insurer-pill",String(n)));});t.appendChild(p);
      }
    }
    function buildIncome(t){
      var R=L.results.branchIncome;
      t.appendChild(headline(R.headline));t.appendChild(tone(R.banner,"neutral"));
      t.appendChild(textNode("p","cq-result-msg",R.microCopy));
      var row=ctaRow();row.appendChild(ctaLink(withBookingParams(BOOK,{branch:"income",utm_source:"cdcp-calculator"}),R.primaryCta));t.appendChild(row);
    }
    function buildTax(t){
      var R=L.results.branchTaxFiling;
      t.appendChild(headline(R.headline));t.appendChild(tone(R.banner,"warning"));
      t.appendChild(textNode("p","cq-result-msg",R.microCopy));
      var row=ctaRow();
      row.appendChild(ctaLink(L.craMyAccountUrl,R.primaryCta,{external:true}));
      row.appendChild(ctaLink(withBookingParams(BOOK,{branch:"tax-filing",utm_source:"cdcp-calculator",suggestedDate:addWeeksIso(4)}),R.secondaryCta,{variant:"secondary"}));
      t.appendChild(row);
    }
    function buildPending(t){
      t.appendChild(headline(U.pendH));t.appendChild(textNode("p","cq-result-msg",U.pendP));
    }
    function buildQualified(t,r){
      var R=L.results.branchQualified,pct=Number(r.tier);
      t.appendChild(textNode("div","cq-kicker",R.headline));
      var hero=node("div","cq-hero");
      hero.appendChild(coverageRing(pct,TIER_RING_COLOR[r.tier]));
      hero.appendChild(node("div","cq-hero-t",'<div class="cq-hero-h">'+esc(L.results["tier"+r.tier+"Badge"].replace(/ %/g,"\u00a0%"))+'</div><div class="cq-hero-s">'+esc(L.results.tierRingCaption)+"</div>"));
      t.appendChild(hero);
      if(r.status==="child"&&L.results.childRamqNote)t.appendChild(textNode("p","cq-result-msg",L.results.childRamqNote));
      t.appendChild(billingNotice(L.results.billingNoticeHeading,L.results.billingNoticeBody));
      var steps=node("div","cq-steps");
      steps.appendChild(stepRow(1,R.step1Title.replace(/^[^—-]*[—-]\s*/,""),R.step1Body,ctaLink(L.cdcpApplyUrl,R.step1Cta,{external:true})));
      steps.appendChild(stepRow(2,R.step2Title.replace(/^[^—-]*[—-]\s*/,""),R.step2MicroCopy,
        ctaLink(withBookingParams(BOOK,{branch:"qualified",cdcpTier:r.tier,utm_source:"cdcp-calculator",suggestedDate:addWeeksIso(7)}),R.step2Cta)));
      steps.appendChild(stepRow(3,R.step3Title.replace(/^[^—-]*[—-]\s*/,""),null,
        ctaLink(withBookingParams(BOOK,{branch:"qualified-help",utm_source:"cdcp-calculator"}),R.step3Cta,{variant:"secondary"})));
      t.appendChild(steps);
      t.appendChild(coverageMatrix(L.results.coverageMatrix,U.matrix));
      t.appendChild(textNode("div","cq-result-source",L.results.sourceNote));
    }

    var lastKey=null;
    function update(){
      var r=resolve();
      // Dependent controls are disabled (not hidden) so the layout never jumps.
      var insYes=A.ins==="yes",over=A.inc==="over90";
      setDisabled(rows.inc,insYes);
      setDisabled(rows.filed,insYes||over);
      setDisabled(rows.who,insYes||over||A.filed==="no");
      var tier=A.inc&&A.inc!=="over90"?L.step2[A.inc+"Hint"]||"":"";
      if(A.inc==="over90")tier=L.step2.over90Hint;
      hint.textContent=A.inc&&!insYes?tier:" ";
      var key=[r.branch,r.tier||"",r.status||""].join("|");
      if(key===lastKey)return;
      lastKey=key;
      var t=node("div","cq-res");
      if(r.branch==="insurance")buildInsurance(t);
      else if(r.branch==="income")buildIncome(t);
      else if(r.branch==="tax-filing")buildTax(t);
      else if(r.branch==="pending")buildPending(t);
      else buildQualified(t,r);
      out.innerHTML="";out.appendChild(t);
    }
    update();
    return {state:A,resolve:resolve};
  }

  window.mountCdcpQuiz = mountCdcpQuiz;
})();
