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
 * Usage: mountCdcpQuiz(rootEl, "en" | "fr") -- call once each time the
 * host page wants a fresh quiz mounted into an empty container element.
 * Calling it again on a fresh container (e.g. after a language switch)
 * starts the quiz over at step 1, same as the standalone pages' own
 * "Run it again" behavior.
 */
(function(){
  "use strict";

  var CDCP_LABELS = {
    "en": {"stepLabel": "Step {current} of {total}", "back": "Back", "retake": "Run it again", "skipPrompt": "Prefer to skip straight to the point?", "skipBook": "Book a 30-min audit", "bookingUrl": "/#contact", "cdcpApplyUrl": "https://www.canada.ca/en/services/benefits/dental/dental-care-plan/apply.html", "craMyAccountUrl": "https://www.canada.ca/en/revenue-agency/services/e-services/digital-services-individuals/account-individuals.html", "step1": {"question": "Do you (or a family member) currently have access to private dental insurance — through an employer, a private plan, or a health spending account?", "yes": "Yes, I have private coverage", "no": "No private coverage"}, "step2": {"question": "What was your adjusted family net income on your last tax return?", "under70": "Under $70,000", "under70Hint": "up to 100% covered", "band70": "$70,000–$79,999", "band70Hint": "up to 60% covered", "band80": "$80,000–$89,999", "band80Hint": "up to 40% covered", "over90": "$90,000 or more", "over90Hint": "not eligible"}, "step3": {"question": "Have you (and your spouse or partner, if applicable) filed a Canadian tax return for the previous year?", "yes": "Yes, filed", "no": "Not yet"}, "step4": {"question": "Who are you checking eligibility for?", "senior": "Senior, 65+", "child": "Child under 18", "dtc": "Adult with a valid Disability Tax Credit", "adult": "Adult, 18–64"}, "results": {"tier100Badge": "Qualifies for up to 100% CDCP coverage", "tier60Badge": "Qualifies for up to 60% CDCP coverage", "tier40Badge": "Qualifies for up to 40% CDCP coverage", "childRamqNote": "In Quebec, RAMQ already covers basic dental care for children under 10 — CDCP fills the gap for kids 10 and up.", "tierRingCaption": "Your coverage tier", "coverageMatrix": {"heading": "Coverage & Authorization Matrix", "standard": {"title": "Standard Covered Care", "subtitle": "No prior approval required", "services": ["Diagnostic exams", "Digital X-rays", "Standard cleaning / scaling (up to annual limits)", "Basic fillings", "Simple extractions"], "note": "Covered directly under standard CDCP fee guidelines."}, "major": {"title": "Major Services", "subtitle": "Requires clinical pre-authorization (predetermination)", "services": ["Porcelain crowns (and cores/posts)", "Complete & partial dentures", "Root canal retreatment", "Additional periodontal scaling (beyond annual limits)"], "note": "Important: Major restorative treatments (crowns, dentures) require a formal electronic Predetermination Request. Our clinical team will submit your diagnostic treatment plan directly to Sun Life / CDCP for approval prior to initiating care."}, "excluded": {"title": "Strictly Excluded Services", "subtitle": "Out-of-pocket or private insurance only", "services": ["Nightguards / bruxism appliances", "Teeth whitening", "Cosmetic veneers", "Elective orthodontics / Invisalign", "Dental implants"], "note": "The CDCP does not cover occlusal nightguards, cosmetic procedures, elective alignment, or dental implants. Optional private payment plans or direct insurance billing are available for these treatments."}}, "sourceNote": "Coverage tiers reflect the federal CDCP fee schedule on canada.ca. Verified 2026-09-15.", "billingNoticeHeading": "Billing Transparency Notice", "billingNoticeBody": "Your coverage tier applies to CDCP's own fee schedule, not necessarily your dentist's actual charges. If a provider's fee for a service is higher than CDCP's set rate, you're responsible for that difference — separate from your tier's regular co-payment. Ask for a written treatment estimate before any procedure so you know your full out-of-pocket cost.", "branchInsurance": {"headline": "Great news! You don't need to wait for government coverage.", "banner": "Fully Covered by Your Existing Insurance Plan", "microCopy": "Since you already have private coverage, you can access immediate care without government application delays or waiting periods.", "primaryCta": "Book Your Appointment Now", "insurersNote": "On your own site, this panel shows the insurers your clinic accepts — for example:", "insurers": ["Sun Life", "Manulife", "Canada Life", "Green Shield Canada"]}, "branchIncome": {"headline": "You're not eligible for CDCP, but you still have affordable care options.", "banner": "Standard Care & Flexible Payment Options Available", "microCopy": "While government coverage caps at $90,000 in household income, our clinic offers direct-to-patient membership plans, flexible payment arrangements, and a transparent fee guide.", "primaryCta": "Book a New Patient Exam & Consultation"}, "branchTaxFiling": {"headline": "You're 1 step away from accessing CDCP coverage!", "banner": "Action Required: Complete Your Tax Return to Access CDCP", "microCopy": "Health Canada requires an up-to-date tax filing with the CRA to verify your household income. Once you file, you can apply right away.", "primaryCta": "File or Check Your Status on Canada.ca", "secondaryCta": "Pre-Book Your Appointment for Next Month"}, "branchQualified": {"headline": "Verification Complete — You Qualify for CDCP Coverage", "step1Title": "Step 1 — Apply for Your CDCP Card", "step1Body": "Applications are processed through Health Canada, in partnership with Sun Life.", "step1Cta": "Open CDCP Application Portal", "step2Title": "Step 2 — Book While You Wait", "step2MicroCopy": "Application Timeline Notice: CDCP cards and welcome packages typically arrive within 4 to 8 weeks. Booking a visit 6 to 8 weeks out helps ensure your appointment lines up with your card's arrival.", "step2Cta": "Book Your Future CDCP Appointment", "step3Title": "Step 3 — Get Help If You Need It", "step3Cta": "Contact Our Front Desk"}}},
    "fr": {"stepLabel": "Étape {current} sur {total}", "back": "Retour", "retake": "Recommencer", "skipPrompt": "Vous préférez aller droit au but?", "skipBook": "Réserver un audit de 30 min", "bookingUrl": "/#contact", "cdcpApplyUrl": "https://www.canada.ca/fr/services/prestations/dentaire/regime-soins-dentaires/demande.html", "craMyAccountUrl": "https://www.canada.ca/fr/agence-revenu/services/services-electroniques/services-electroniques-particuliers/dossier-particuliers.html", "step1": {"question": "Vous (ou un membre de votre famille) avez-vous actuellement accès à une assurance dentaire privée — par un employeur, un régime privé ou un compte de gestion santé?", "yes": "Oui, j'ai une couverture privée", "no": "Aucune couverture privée"}, "step2": {"question": "Quel était votre revenu familial net rajusté sur votre dernière déclaration de revenus?", "under70": "Moins de 70 000 $", "under70Hint": "jusqu'à 100 % couvert", "band70": "70 000 $ à 79 999 $", "band70Hint": "jusqu'à 60 % couvert", "band80": "80 000 $ à 89 999 $", "band80Hint": "jusqu'à 40 % couvert", "over90": "90 000 $ ou plus", "over90Hint": "non admissible"}, "step3": {"question": "Avez-vous (et votre conjoint(e), le cas échéant) produit une déclaration de revenus canadienne pour l'année précédente?", "yes": "Oui, produite", "no": "Pas encore"}, "step4": {"question": "Pour qui vérifiez-vous l'admissibilité?", "senior": "Aîné(e), 65 ans ou plus", "child": "Enfant de moins de 18 ans", "dtc": "Adulte détenant un crédit d'impôt pour personnes handicapées valide", "adult": "Adulte, 18 à 64 ans"}, "results": {"tier100Badge": "Admissible à une couverture RCSD pouvant atteindre 100 %", "tier60Badge": "Admissible à une couverture RCSD pouvant atteindre 60 %", "tier40Badge": "Admissible à une couverture RCSD pouvant atteindre 40 %", "childRamqNote": "Au Québec, la RAMQ couvre déjà les soins dentaires de base pour les enfants de moins de 10 ans — le RCSD prend le relais pour les enfants de 10 ans et plus.", "tierRingCaption": "Votre palier de couverture", "coverageMatrix": {"heading": "Matrice de couverture et d'autorisation", "standard": {"title": "Soins standards couverts", "subtitle": "Aucune approbation préalable requise", "services": ["Examens diagnostiques", "Radiographies numériques", "Nettoyage / détartrage standard (jusqu'aux limites annuelles)", "Plombages de base", "Extractions simples"], "note": "Couvert directement selon la grille tarifaire standard du RCSD."}, "major": {"title": "Services majeurs", "subtitle": "Nécessite une autorisation préalable (prédétermination)", "services": ["Couronnes en porcelaine (et tenons/moignons)", "Prothèses complètes et partielles", "Retraitement de canal", "Détartrage parodontal additionnel (au-delà des limites annuelles)"], "note": "Important : Les traitements de restauration majeurs (couronnes, prothèses) nécessitent une Demande d'autorisation préalable électronique. Notre équipe clinique soumettra votre plan de traitement diagnostique directement à la Sun Life / au RCSD pour approbation avant de débuter les soins."}, "excluded": {"title": "Services strictement exclus", "subtitle": "À payer directement ou par assurance privée", "services": ["Plaques occlusales / dispositifs contre le bruxisme", "Blanchiment des dents", "Facettes esthétiques", "Orthodontie élective / Invisalign", "Implants dentaires"], "note": "Le RCSD ne couvre pas les plaques occlusales, les soins esthétiques, l'orthodontie élective ni les implants dentaires. Des options de paiement privé ou de facturation directe à l'assurance sont disponibles pour ces traitements."}}, "sourceNote": "Les paliers de couverture reflètent la grille tarifaire fédérale du RCSD publiée sur canada.ca. Vérifié le 2026-09-15.", "billingNoticeHeading": "Avis de transparence tarifaire", "billingNoticeBody": "Votre palier de couverture s'applique à la grille tarifaire propre au RCSD, et non nécessairement aux tarifs réels de votre dentiste. Si les honoraires exigés par un fournisseur pour un service dépassent le tarif établi par le RCSD, vous devrez payer cette différence, en plus de la quote-part habituelle liée à votre palier. Demandez une estimation écrite du traitement avant toute intervention afin de connaître l'ensemble des frais à votre charge.", "branchInsurance": {"headline": "Bonne nouvelle : vous n'avez pas à attendre la couverture gouvernementale.", "banner": "Entièrement couvert par votre assurance actuelle", "microCopy": "Puisque vous avez déjà une couverture privée, vous pouvez accéder à des soins immédiatement, sans délai de demande ni période d'attente gouvernementale.", "primaryCta": "Prendre rendez-vous maintenant", "insurersNote": "Sur votre propre site, ce module afficherait les assureurs acceptés par votre clinique — par exemple :", "insurers": ["Sun Life", "Manuvie", "Canada Vie", "Croix Bleue"]}, "branchIncome": {"headline": "Vous n'êtes pas admissible au RCSD, mais des options de soins abordables restent disponibles.", "banner": "Soins standards et options de paiement flexibles", "microCopy": "La couverture gouvernementale s'arrête à 90 000 $ de revenu familial, mais notre clinique offre des forfaits d'adhésion directs, des ententes de paiement flexibles et une grille tarifaire transparente.", "primaryCta": "Prendre rendez-vous pour un nouvel examen"}, "branchTaxFiling": {"headline": "Vous n'êtes qu'à une étape du RCSD !", "banner": "Action requise : produisez votre déclaration de revenus pour accéder au RCSD", "microCopy": "Santé Canada exige une déclaration de revenus à jour auprès de l'ARC pour vérifier votre revenu familial. Une fois celle-ci produite, vous pourrez faire une demande immédiatement.", "primaryCta": "Produire ou vérifier votre dossier sur Canada.ca", "secondaryCta": "Réserver votre rendez-vous pour le mois prochain"}, "branchQualified": {"headline": "Vérification terminée — Vous êtes admissible à la couverture RCSD", "step1Title": "Étape 1 — Faites la demande de votre carte RCSD", "step1Body": "Les demandes sont traitées par Santé Canada, en partenariat avec la Sun Life.", "step1Cta": "Ouvrir le portail de demande RCSD", "step2Title": "Étape 2 — Réservez pendant l'attente", "step2MicroCopy": "Avis sur les délais de traitement : la carte RCSD et la trousse de bienvenue arrivent généralement par la poste dans un délai de 4 à 8 semaines. Réserver votre visite dans 6 à 8 semaines permet d'aligner votre rendez-vous avec la réception de votre carte.", "step2Cta": "Réserver votre futur rendez-vous RCSD", "step3Title": "Étape 3 — Besoin d'aide ?", "step3Cta": "Contactez notre réception"}}}
  };

  function mountCdcpQuiz(root, lang){
    var L = (lang === "fr") ? CDCP_LABELS.fr : CDCP_LABELS.en;
  if(!root) return;

  var REDUCE_MOTION = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  var EASE = "cubic-bezier(0.22,1,0.36,1)";
  var STEP_DURATION = REDUCE_MOTION ? 1 : 320;
  var SELECT_PAUSE = REDUCE_MOTION ? 0 : 200;
  var COUNT_DURATION = REDUCE_MOTION ? 1 : 900;

  var INCOME_TIER = {under70:"100",band70:"60",band80:"40"};
  var TIER_RING_COLOR = {"100":"var(--good)","60":"var(--tan)","40":"var(--tan)"};
  var state = {step:1, answers:{privateInsurance:null,income:null,taxFiling:null,status:null}, result:null};
  var direction = 1; // +1 forward (slide in from right), -1 back

  function esc(s){var d=document.createElement("div");d.textContent=s;return d.innerHTML;}

  /** Appends context params to a booking URL so it's traceable which branch
   *  a visitor converted from -- mirrors dental-clinic-template's
   *  withBookingParams() exactly, except the base is a relative in-page
   *  anchor (L.bookingUrl === "/#contact") rather than an absolute clinic
   *  URL, so it needs an explicit base to parse against. Never applied to
   *  an outbound canada.ca link -- decorating a government URL with our own
   *  tracking params isn't ours to do. */
  function withBookingParams(url,params){
    try{
      var u=new URL(url,window.location.origin);
      Object.keys(params).forEach(function(k){u.searchParams.set(k,params[k]);});
      return u.toString();
    }catch(e){return url;}
  }

  /** ISO yyyy-mm-dd `weeks` from today -- same "pre-book N weeks out" intent
   *  as the template's addWeeksIso(), passed as a suggestedDate param. */
  function addWeeksIso(weeks){
    var d=new Date();d.setDate(d.getDate()+weeks*7);
    return d.toISOString().slice(0,10);
  }

  /** The colored status box every branch leads with. Three tones (see
   *  .tone-positive/.tone-neutral/.tone-warning in CSS), deliberately
   *  distinct from each other and from the qualified branch's own tier
   *  badge so "you have insurance" can never read as "you qualified." */
  function resultBanner(icon,text,tone){
    var d=document.createElement('div');
    d.className='result-badge tone-'+tone;
    d.innerHTML='<span class="result-badge-icon">'+icon+'</span><span class="result-badge-text">'+esc(text)+'</span>';
    return d;
  }

  function resultHeadline(text){
    var h=document.createElement('h3');h.className='result-headline';h.textContent=text;
    return h;
  }

  /** One button style for every branch's calls-to-action -- primary (solid
   *  ink, tan on hover) or secondary (outline), matching .cta-nav's idiom
   *  elsewhere on the page. `external` adds target=_blank + rel=noopener
   *  plus a trailing arrow that signals "this leaves the site." */
  function ctaLink(href,icon,label,opts){
    opts=opts||{};
    var a=document.createElement('a');
    a.href=href;
    a.className='cta-btn '+(opts.variant==='secondary'?'cta-btn-secondary':'cta-btn-primary');
    if(opts.external){a.target='_blank';a.rel='noopener noreferrer';}
    a.innerHTML='<span class="cta-btn-icon" aria-hidden="true">'+icon+'</span><span>'+esc(label)+'</span>'+
      (opts.external?'<span class="cta-ext" aria-hidden="true">&#8599;</span>':'');
    return a;
  }

  function ctaRow(){var d=document.createElement('div');d.className='cta-row';return d;}

  /** Billing-transparency disclosure for the qualified branch -- CDCP's
   *  tier percentages are coverage against the federal CDCP fee schedule,
   *  not a guarantee against what a dentist actually charges. Verified
   *  directly against canada.ca's own "Examples of co-payments and
   *  additional charges" factsheet: a provider's fee above CDCP's set rate
   *  is billed to the patient directly, separate from the tier co-payment
   *  itself. Mirrors dental-clinic-template's BillingTransparencyNotice --
   *  same verified content, same placement (right after the coverage ring,
   *  before the apply/book funnel), styled in this page's own idiom. */
  function billingNotice(heading,body){
    var d=document.createElement('div');d.className='billing-notice';
    d.innerHTML='<div class=\\"billing-notice-heading\\">'+esc(heading)+'</div><div class=\\"billing-notice-body\\">'+esc(body)+'</div>';
    return d;
  }

  /** One accordion row of the Coverage & Authorization Matrix. `tone`
   *  drives the icon color (standard/major/excluded); `groupName` is the
   *  shared <details name> that makes the three rows mutually exclusive.
   *  `data` is {title,subtitle,services[],note}. Mirrors dental-clinic-
   *  template's CoverageMatrixItem: same three tiers, same copy verbatim,
   *  same corrected "Root canal retreatment" labeling (not "complex root
   *  canals" -- only retreatment needs predetermination) and the same
   *  explicit Dental implants exclusion. */
  function coverageMatrixItem(tone,icon,groupName,data,openByDefault){
    var d=document.createElement('details');
    d.className='matrix-item tone-'+tone;
    d.name=groupName;
    if(openByDefault)d.open=true;
    var summary=document.createElement('summary');
    summary.innerHTML=
      '<span class=\\"matrix-item-icon\\" aria-hidden=\\"true\\">'+icon+'</span>'+
      '<span class=\\"matrix-item-head\\"><span class=\\"matrix-item-title\\">'+esc(data.title)+'</span>'+
      '<span class=\\"matrix-item-subtitle\\">'+esc(data.subtitle)+'</span></span>'+
      '<span class=\\"matrix-item-chevron\\" aria-hidden=\\"true\\">+</span>';
    d.appendChild(summary);
    var body=document.createElement('div');body.className='matrix-item-body';
    body.innerHTML='<ul>'+data.services.map(function(s){return '<li>'+esc(s)+'</li>';}).join('')+'</ul>'+
      '<p class=\\"matrix-item-note\\">'+esc(data.note)+'</p>';
    d.appendChild(body);
    return d;
  }

  /** Three-tier replacement for the old flat covered/excluded list --
   *  standard (no approval) / major (requires predetermination) / strictly
   *  excluded, single-open, standard open by default since it's the most
   *  immediately reassuring tier for a visitor who just qualified. */
  function coverageMatrix(m){
    var wrap=document.createElement('div');wrap.className='matrix';
    var heading=document.createElement('div');heading.className='result-col-label';heading.textContent=m.heading;
    wrap.appendChild(heading);
    wrap.appendChild(coverageMatrixItem('standard','&#10003;','coverage-matrix',m.standard,true));
    wrap.appendChild(coverageMatrixItem('major','&#9888;','coverage-matrix',m.major,false));
    wrap.appendChild(coverageMatrixItem('excluded','&#10007;','coverage-matrix',m.excluded,false));
    return wrap;
  }

  /** Numbered card for the qualified branch's 3-step apply -> book -> get
   *  help funnel -- the actual conversion sequence, so it gets more visual
   *  weight than a plain paragraph. bodyChildren is an array of nodes. */
  function stepCard(number,title,bodyChildren){
    var d=document.createElement('div');d.className='step-card';
    d.innerHTML='<div class="step-card-head"><span class="step-num">'+number+'</span><span class="step-title">'+esc(title)+'</span></div>';
    var body=document.createElement('div');body.className='step-body';
    bodyChildren.forEach(function(node){body.appendChild(node);});
    d.appendChild(body);
    return d;
  }

  function textNode(tag,className,text){
    var el=document.createElement(tag);if(className)el.className=className;el.textContent=text;return el;
  }

  function retakeButtonEl(){
    var btn=document.createElement('button');
    btn.type='button';btn.className='result-retake';btn.id='quizRetake';
    btn.innerHTML='&#8635; '+esc(L.retake);
    btn.addEventListener('click',function(){
      direction=1;
      state={step:1,answers:{privateInsurance:null,income:null,taxFiling:null,status:null},result:null};
      renderStep();
    });
    return btn;
  }

  /** Branch A -- has private insurance. Reframed as good news, not a
   *  rejection: "you don't need CDCP, you can book today." Insurer pills
   *  are illustrative on this demo page (no real clinic/roster behind
   *  sss.marketing itself) -- on a client's own site this list is swapped
   *  in from their real accepted-insurer config, same as the React build's
   *  optional acceptedInsuranceProviders prop. Text only, never logos: no
   *  licensed assets exist, and lifting real companies' marks without
   *  permission is a trademark risk -- same doctrine as the template. */
  function buildBranchInsurance(target){
    var R=L.results.branchInsurance;
    target.appendChild(resultHeadline(R.headline));
    target.appendChild(resultBanner('&#128737;',R.banner,'positive'));
    target.appendChild(textNode('p','result-msg',R.microCopy));

    var row=ctaRow();
    var bookHref=withBookingParams(L.bookingUrl,{branch:'insurance',utm_source:'cdcp-calculator'});
    row.appendChild(ctaLink(bookHref,'&#128197;',R.primaryCta));
    target.appendChild(row);

    if(R.insurers && R.insurers.length){
      target.appendChild(textNode('p','insurer-note',R.insurersNote));
      var pills=document.createElement('div');pills.className='insurer-pills';
      R.insurers.forEach(function(name){pills.appendChild(textNode('span','insurer-pill',name));});
      target.appendChild(pills);
    }

    target.appendChild(retakeButtonEl());
  }

  /** Branch B -- ineligible on income (>$90,000). Still "you're welcome
   *  here" with a booking path, not a dead end. */
  function buildBranchIncome(target){
    var R=L.results.branchIncome;
    target.appendChild(resultHeadline(R.headline));
    target.appendChild(resultBanner('&#128179;',R.banner,'neutral'));
    target.appendChild(textNode('p','result-msg',R.microCopy));

    var row=ctaRow();
    var bookHref=withBookingParams(L.bookingUrl,{branch:'income',utm_source:'cdcp-calculator'});
    row.appendChild(ctaLink(bookHref,'&#128197;',R.primaryCta));
    target.appendChild(row);

    target.appendChild(retakeButtonEl());
  }

  /** Branch C -- hasn't filed taxes yet. The only branch with an external
   *  (government) link, and the only one where the "internal" CTA is a
   *  pre-book rather than a book-now, since there's nothing to confirm yet. */
  function buildBranchTaxFiling(target){
    var R=L.results.branchTaxFiling;
    target.appendChild(resultHeadline(R.headline));
    target.appendChild(resultBanner('&#9888;',R.banner,'warning'));
    target.appendChild(textNode('p','result-msg',R.microCopy));

    var row=ctaRow();
    row.appendChild(ctaLink(L.craMyAccountUrl,'&#128196;',R.primaryCta,{external:true}));
    var preBookHref=withBookingParams(L.bookingUrl,{branch:'tax-filing',utm_source:'cdcp-calculator',suggestedDate:addWeeksIso(4)});
    row.appendChild(ctaLink(preBookHref,'&#128197;',R.secondaryCta,{variant:'secondary'}));
    target.appendChild(row);

    target.appendChild(retakeButtonEl());
  }

  /** Branch D -- qualified. Keeps the pulsing tier badge, animated coverage
   *  ring and covered/excluded reference lists, and adds the 3-step
   *  conversion funnel: apply -> pre-book using the 4-to-8-week processing
   *  window -> get help. Funnel sits above the reference material -- the
   *  funnel is what converts, the coverage detail is for after. */
  function buildBranchQualified(target,r){
    var R=L.results.branchQualified;
    var badgeText=L.results['tier'+r.tier+'Badge'];
    // Zero emoji: all three tiers now share the same plain checkmark glyph
    // instead of tier100 alone getting a party-popper pictograph -- matches
    // dental-clinic-template's TIER_ICON, where every tier already renders
    // through the same restrained icon system.
    var icon='&#10003;';

    target.appendChild(resultHeadline(R.headline));

    var badge=document.createElement('div');
    badge.className='result-badge tier'+r.tier+' pulsing';
    badge.innerHTML='<span class="result-badge-icon">'+icon+'</span><span class="result-badge-text">'+esc(badgeText)+'</span>';
    target.appendChild(badge);

    if(r.status==='child' && L.results.childRamqNote){
      target.appendChild(textNode('p','result-msg',L.results.childRamqNote));
    }

    var ringRow=document.createElement('div');ringRow.className='ring-row';
    ringRow.appendChild(coverageRing(Number(r.tier),TIER_RING_COLOR[r.tier]));
    var caption=document.createElement('span');caption.className='ring-caption';caption.textContent=L.results.tierRingCaption;
    ringRow.appendChild(caption);
    target.appendChild(ringRow);

    target.appendChild(billingNotice(L.results.billingNoticeHeading,L.results.billingNoticeBody));

    var step1Row=ctaRow();
    step1Row.appendChild(ctaLink(L.cdcpApplyUrl,'&#128196;',R.step1Cta,{external:true}));
    target.appendChild(stepCard(1,R.step1Title,[textNode('p',null,R.step1Body),step1Row]));

    var futureBookHref=withBookingParams(L.bookingUrl,{branch:'qualified',cdcpTier:r.tier,utm_source:'cdcp-calculator',suggestedDate:addWeeksIso(7)});
    var step2Row=ctaRow();
    step2Row.appendChild(ctaLink(futureBookHref,'&#128197;',R.step2Cta));
    target.appendChild(stepCard(2,R.step2Title,[textNode('p',null,R.step2MicroCopy),step2Row]));

    var step3Row=ctaRow();
    step3Row.appendChild(ctaLink(withBookingParams(L.bookingUrl,{branch:'qualified-help',utm_source:'cdcp-calculator'}),'&#9993;',R.step3Cta));
    target.appendChild(stepCard(3,R.step3Title,[step3Row]));

    target.appendChild(coverageMatrix(L.results.coverageMatrix));

    target.appendChild(textNode('div','result-source',L.results.sourceNote));
    target.appendChild(retakeButtonEl());
  }

  /** rAF-driven numeric tween (framer-motion's standalone `animate()`, by
   *  hand -- no dependency to pull in for one easing curve). Cubic
   *  ease-out approximates EASE closely enough for a 60-90 unit count-up. */
  function animateNumber(from,to,duration,onUpdate){
    if(duration<=1){onUpdate(to);return;}
    var start=null;
    function tick(ts){
      if(start===null)start=ts;
      var p=Math.min((ts-start)/duration,1);
      var eased=1-Math.pow(1-p,3);
      onUpdate(from+(to-from)*eased);
      if(p<1)window.requestAnimationFrame(tick);
    }
    window.requestAnimationFrame(tick);
  }

  function coverageRing(percent,colorVar){
    var wrap=document.createElement('div');wrap.className='ring-wrap';
    var C=2*Math.PI*26;
    wrap.innerHTML=
      '<svg width="64" height="64" viewBox="0 0 64 64" class="ring-svg" aria-hidden="true">'+
        '<circle cx="32" cy="32" r="26" stroke-width="6" fill="none" class="ring-track"></circle>'+
        '<circle cx="32" cy="32" r="26" stroke-width="6" fill="none" class="ring-fill" stroke="'+colorVar+'" '+
          'stroke-dasharray="'+C+'" stroke-dashoffset="'+C+'"></circle>'+
      '</svg><span class="ring-label">0%</span>';
    var fillEl=wrap.querySelector('.ring-fill');
    var labelEl=wrap.querySelector('.ring-label');
    animateNumber(0,percent,COUNT_DURATION,function(v){
      labelEl.textContent=Math.round(v)+'%';
      fillEl.setAttribute('stroke-dashoffset',C-(v/100)*C);
    });
    return wrap;
  }

  /** role="radiogroup" + roving tabindex (arrow keys move focus, native
   *  button Enter/Space activates), the "~200ms select pulse, then
   *  advance" micro-UX, and a whole-group disable once one option is
   *  pending so a second click mid-pulse can't double-fire. Mirrors
   *  OptionGroup/OptionCard in dental-clinic-template's CDCPCalculator.tsx. */
  function buildOptions(container,question,options){
    container.className='quiz-opts';
    container.setAttribute('role','radiogroup');
    container.setAttribute('aria-label',question);
    var buttons=[];
    var pending=false;
    var focusIdx=0;

    options.forEach(function(opt,idx){
      var b=document.createElement('button');
      b.type='button';b.className='opt-btn';
      b.setAttribute('role','radio');
      b.setAttribute('aria-checked','false');
      b.tabIndex=idx===0?0:-1;
      b.innerHTML=
        '<span class="opt-label-wrap"><span>'+esc(opt.label)+'</span>'+
        (opt.hint?'<span class="opt-hint">'+esc(opt.hint)+'</span>':'')+'</span>'+
        '<span class="opt-arrow" aria-hidden="true">&#8594;</span>'+
        '<span class="opt-check" aria-hidden="true">&#10003;</span>';
      b.addEventListener('click',function(){
        if(pending)return;
        pending=true;
        buttons.forEach(function(other){
          other.disabled=true;
          if(other===b){other.classList.add('selected');other.setAttribute('aria-checked','true');}
          else other.classList.add('dimmed');
        });
        window.setTimeout(function(){opt.onSelect();},SELECT_PAUSE);
      });
      b.addEventListener('focus',function(){
        focusIdx=idx;
        buttons.forEach(function(x,i){x.tabIndex=i===idx?0:-1;});
      });
      buttons.push(b);
      container.appendChild(b);
    });

    container.addEventListener('keydown',function(e){
      var count=buttons.length;if(!count)return;
      var next=null;
      if(e.key==='ArrowDown'||e.key==='ArrowRight')next=(focusIdx+1)%count;
      else if(e.key==='ArrowUp'||e.key==='ArrowLeft')next=(focusIdx-1+count)%count;
      else if(e.key==='Home')next=0;
      else if(e.key==='End')next=count-1;
      if(next!==null){e.preventDefault();focusIdx=next;buttons[next].focus();}
    });
  }

  function buildQuestionPanel(target,question,options){
    var head=document.createElement('div');head.className='quiz-q';
    head.innerHTML='<span class="quiz-q-icon">?</span><span>'+esc(question)+'</span>';
    target.appendChild(head);
    var opts=document.createElement('div');
    buildOptions(opts,question,options);
    target.appendChild(opts);
  }

  /** Four mutually exclusive branches, not three-plus-a-flag -- dispatches
   *  on r.branch exactly like dental-clinic-template's discriminated
   *  CalculatorResult union. Only "qualified" carries tier/status. */
  function buildResultPanel(target,r){
    if(r.branch==='insurance'){buildBranchInsurance(target);}
    else if(r.branch==='income'){buildBranchIncome(target);}
    else if(r.branch==='tax-filing'){buildBranchTaxFiling(target);}
    else{buildBranchQualified(target,r);}
  }

  function buildStepContent(target){
    if(!state.result && state.step===1){
      buildQuestionPanel(target,L.step1.question,[
        {label:L.step1.yes,onSelect:function(){
          state.answers.privateInsurance="yes";direction=1;
          state.result={branch:"insurance"};renderStep();
        }},
        {label:L.step1.no,onSelect:function(){
          state.answers.privateInsurance="no";direction=1;state.step=2;renderStep();
        }},
      ]);
      var skip=document.createElement('div');skip.className='quiz-skip';
      skip.innerHTML=L.skipPrompt+' <a href="'+L.bookingUrl+'">'+L.skipBook+'</a>';
      target.appendChild(skip);
    }

    if(!state.result && state.step===2){
      buildQuestionPanel(target,L.step2.question,
        [["under70","under70Hint"],["band70","band70Hint"],["band80","band80Hint"],["over90","over90Hint"]].map(function(pair){
          return {label:L.step2[pair[0]],hint:L.step2[pair[1]],onSelect:function(){
            state.answers.income=pair[0];direction=1;
            if(pair[0]==="over90"){state.result={branch:"income"};renderStep();return;}
            state.step=3;renderStep();
          }};
        })
      );
    }

    // Step 3 short-circuits straight to the tax-filing branch on "not yet
    // filed" -- deliberately skips step 4 entirely, same behavior change
    // as dental-clinic-template's CDCPCalculator.tsx handleStep3 (a filed
    // return is required before a tier can even be discussed, so there's
    // nothing for step 4 to refine yet).
    if(!state.result && state.step===3){
      buildQuestionPanel(target,L.step3.question,[
        {label:L.step3.yes,onSelect:function(){state.answers.taxFiling="yes";direction=1;state.step=4;renderStep();}},
        {label:L.step3.no,onSelect:function(){
          state.answers.taxFiling="no";direction=1;
          state.result={branch:"tax-filing"};renderStep();
        }},
      ]);
    }

    // Reached only when taxFiling==="yes" (step 3's "no" short-circuits
    // above), so income is guaranteed to be one of under70/band70/band80
    // here (over90 short-circuited in step 2) -- the tier is always
    // resolvable, no more bolted-on needsToFile flag.
    if(!state.result && state.step===4){
      buildQuestionPanel(target,L.step4.question,
        ["senior","child","dtc","adult"].map(function(key){
          return {label:L.step4[key],onSelect:function(){
            state.answers.status=key;direction=1;
            state.result={branch:"qualified",tier:INCOME_TIER[state.answers.income],status:key};
            renderStep();
          }};
        })
      );
    }

    if(state.result){
      buildResultPanel(target,state.result);
    }
  }

  function renderHead(){
    var existing=document.getElementById('quizHead');
    if(state.result){
      if(existing)existing.remove();
      return;
    }
    var html=
      '<div class="quiz-track"><div class="quiz-fill" style="width:'+(state.step/4*100)+'%"></div></div>'+
      '<div class="quiz-steplabel"><span>'+L.stepLabel.replace('{current}',state.step).replace('{total}','4')+'</span>'+
      (state.step>1?'<button type="button" class="quiz-back" id="quizBack">&#8592; '+esc(L.back)+'</button>':'')+'</div>';
    var head=existing;
    if(!head){
      head=document.createElement('div');head.id='quizHead';
      root.insertBefore(head,root.firstChild);
    }
    head.innerHTML=html;
    var backBtn=document.getElementById('quizBack');
    if(backBtn)backBtn.addEventListener('click',function(){
      direction=-1;state.step=Math.max(1,state.step-1);renderStep();
    });
  }

  /** Hand-rolled version of Framer Motion's AnimatePresence(mode="popLayout")
   *  + an outer `layout`-animated wrapper: slide+fade (or scale+fade for the
   *  results reveal) between the outgoing and incoming panel, while the
   *  viewport's own height tweens between the two measured heights instead
   *  of jumping -- same "zero layout shift between a 2-option and a
   *  4-option step" requirement, solved with the Web Animations API instead
   *  of a framework runtime. */
  function transitionSwap(){
    var viewport=document.getElementById('quizViewport');
    var isResult=!!state.result;
    var oldEl=viewport.firstElementChild;

    var newEl=document.createElement('div');
    buildStepContent(newEl);

    var oldHeight=oldEl?oldEl.getBoundingClientRect().height:0;

    newEl.style.visibility='hidden';
    newEl.style.position='absolute';
    newEl.style.left='0';newEl.style.right='0';newEl.style.top='0';
    viewport.appendChild(newEl);
    var newHeight=newEl.getBoundingClientRect().height;
    viewport.removeChild(newEl);
    newEl.style.visibility='';newEl.style.position='';newEl.style.left='';newEl.style.right='';newEl.style.top='';

    if(!oldEl || STEP_DURATION<=1){
      viewport.innerHTML='';
      viewport.appendChild(newEl);
      return;
    }

    viewport.style.position='relative';
    viewport.style.overflow='hidden';
    viewport.style.height=oldHeight+'px';

    oldEl.style.position='absolute';oldEl.style.left='0';oldEl.style.right='0';oldEl.style.top='0';
    var exitFrames=isResult
      ?[{opacity:1,transform:'scale(1)'},{opacity:0,transform:'scale(0.97)'}]
      :[{opacity:1,transform:'translateX(0)'},{opacity:0,transform:'translateX('+(direction>=0?-24:24)+'px)'}];
    var exitAnim=oldEl.animate(exitFrames,{duration:STEP_DURATION,easing:EASE,fill:'forwards'});

    newEl.style.opacity='0';
    viewport.appendChild(newEl);
    var enterFrames=isResult
      ?[{opacity:0,transform:'scale(0.95)'},{opacity:1,transform:'scale(1)'}]
      :[{opacity:0,transform:'translateX('+(direction>=0?24:-24)+'px)'},{opacity:1,transform:'translateX(0)'}];
    newEl.animate(enterFrames,{duration:STEP_DURATION,easing:EASE,fill:'forwards'});

    viewport.animate([{height:oldHeight+'px'},{height:newHeight+'px'}],{duration:STEP_DURATION,easing:EASE}).finished
      .catch(function(){})
      .then(function(){viewport.style.height='';viewport.style.overflow='';});

    exitAnim.finished.catch(function(){}).then(function(){
      if(oldEl.parentNode)oldEl.parentNode.removeChild(oldEl);
    });
  }

  function renderStep(){
    renderHead();
    transitionSwap();
  }

  if(!document.getElementById('quizViewport')){
    var vp=document.createElement('div');vp.id='quizViewport';vp.className='quiz-viewport';
    root.appendChild(vp);
  }
  renderStep();

  }

  window.mountCdcpQuiz = mountCdcpQuiz;
})();
