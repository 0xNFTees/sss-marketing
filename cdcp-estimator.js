/*
 * cdcp-estimator.js -- 3-step appointment estimator (CDCP / RCSD vs provincial fee guide).
 * Usage: mountCdcpEstimator(rootEl, "fr"|"en", "QC")
 * Data: window.CDCP_PROVINCES[code] = {label, guide, procedures:[...], packages:[...]}
 * Math (per line): covered = isCovered ? min(grid * tierPct, dentistFee) : 0 ; you pay = fee - covered
 */
(function(){
"use strict";
var TIERS=[
 {pct:1, fr:"Moins de 70 000 $",en:"Under $70,000",tf:"Couverture RCSD à 100 %",te:"100% CDCP coverage"},
 {pct:.6,fr:"70 000 $ – 79 999 $",en:"$70,000 – $79,999",tf:"Couverture RCSD à 60 %",te:"60% CDCP coverage"},
 {pct:.4,fr:"80 000 $ – 89 999 $",en:"$80,000 – $89,999",tf:"Couverture RCSD à 40 %",te:"40% CDCP coverage"},
 {pct:0, fr:"90 000 $ et plus",en:"$90,000 and over",tf:"Non admissible au RCSD",te:"Not eligible for CDCP"}];
var PK=[
 {id:"new",ico:"🧼",items:[["01103",1],["02102",1],["11112",1],["12101",1]],
  fr:["Nouveau patient : examen et nettoyage","Bilan complet de la bouche, radiographies de diagnostic et nettoyage professionnel approfondi."],
  en:["New patient: exam and cleaning","A full oral checkup, diagnostic X-rays and a thorough professional cleaning."]},
 {id:"emerg",ico:"🚨",items:[["01205",1],["02102",1]],
  fr:["Urgence / mal de dent","Évaluation d’urgence et radiographie pour trouver la cause de la douleur."],
  en:["Emergency / toothache","Initial emergency assessment and an X-ray to find the cause of the pain."],
  nf:"Une visite d’urgence commence par un examen et une radiographie. Si un traitement immédiat est nécessaire (obturation, canal ou extraction), des frais s’ajoutent.",
  ne:"Emergency visits start with an exam and an X-ray. If immediate treatment is needed (filling, root canal or extraction), additional costs apply."},
 {id:"recall",ico:"🦷",items:[["01202",1],["11112",1]],
  fr:["Rappel et nettoyage (patient existant)","Votre examen et nettoyage de routine aux 6 ou 12 mois."],
  en:["Routine recall and cleaning","Your regular 6 or 12-month checkup and cleaning."]},
 {id:"filling",ico:"🩹",items:[["23311",1]],
  fr:["Réparation d’une carie","Une dent brisée ou une carie, réparée avec une obturation de la couleur de la dent."],
  en:["Cavity repair","A broken tooth or a cavity, repaired with a tooth-colored filling."],
  nf:"Estimation pour une obturation en composite sur une molaire (1 surface). L’examen n’est pas inclus.",
  ne:"Estimate for one posterior composite filling (1 surface). The exam is not included."},
 {id:"major",ico:"😁",items:[["51101",1]],
  fr:["Prothèse ou grosse restauration","Remplacer des dents manquantes (prothèse complète, une arcade). Préautorisation RCSD requise."],
  en:["Denture or major restoration","Replacing missing teeth (complete denture, one arch). Requires CDCP pre-authorization."],
  nf:"Les frais de laboratoire sont facturés en sus.",ne:"Lab fees are billed extra."}];
var T={
 fr:{title:"Estimez votre rendez-vous",s:"Étape {n} sur 3",q1:"Quel type de rendez-vous vous faut-il ?",q2:"Quel est le revenu net de votre ménage ?",q3:"Estimation du coût de votre rendez-vous",
  back:"Retour",again:"Recommencer",std:"Tarif standard du dentiste (ACDQ 2026)",cov:"Le RCSD couvre",oop:"Votre part estimée",
  why:"Pourquoi pas 0 $ ? ",whyT:"La plupart des dentistes québécois facturent selon le guide de tarifs de l’ACDQ. Le RCSD verse des montants fixes du gouvernement. Vous payez seulement la différence.",
  inel:"À ce revenu, vous n’êtes pas admissible au RCSD : le tarif complet est à votre charge.",
  pre:"Préautorisation du RCSD requise.",lab:"Frais de laboratoire en sus.",excl:"Non couvert par le RCSD.",
  disc:"Estimation seulement. Chaque clinique fixe ses propres tarifs. Les limites annuelles et les frais de laboratoire ne sont pas inclus. Confirmez avec votre clinique.",
  soon:"Un plan de traitement de plusieurs pages ? Le mode détaillé ligne par ligne s’en vient.",cta:"Parler à la clinique",href:"/#contact"},
 en:{title:"Estimate your appointment",s:"Step {n} of 3",q1:"What kind of appointment do you need?",q2:"What is your household’s net income?",q3:"Estimated appointment cost",
  back:"Back",again:"Start over",std:"Standard dentist charge (ACDQ 2026)",cov:"CDCP covers",oop:"Your estimated share",
  why:"Why isn’t it $0? ",whyT:"Most Quebec dentists charge standard provincial fee guide rates (ACDQ). CDCP pays fixed government amounts. You only pay the difference.",
  inel:"At this income you are not eligible for CDCP: the full fee is yours to pay.",
  pre:"CDCP pre-authorization required.",lab:"Lab fee billed extra.",excl:"Not covered by CDCP.",
  disc:"Estimate only. Each clinic sets its own fees. Annual limits and lab fees are not included. Confirm with your clinic.",
  soon:"Have a multi-page treatment plan from your dentist? A detailed line-item mode is coming soon.",cta:"Talk to the clinic",href:"/#contact"}};
function el(t,c,h){var e=document.createElement(t);if(c)e.className=c;if(h!=null)e.innerHTML=h;return e}
window.mountCdcpEstimator=function(root,lang,prov){
 lang=lang==="en"?"en":"fr";var L=T[lang],P=(window.CDCP_PROVINCES||{})[prov||"QC"];if(!P){root.textContent="";return}
 var byCode={};P.procedures.forEach(function(p){byCode[p.code]=p});
 var nf=new Intl.NumberFormat(lang==="fr"?"fr-CA":"en-CA",{style:"currency",currency:"CAD",minimumFractionDigits:2});
 var reduce=window.matchMedia&&matchMedia("(prefers-reduced-motion:reduce)").matches;
 var st={step:1,pk:null,tier:null};
 root.innerHTML="";root.className="est";
 var head=el("div","est-head"),bar=el("div","est-track",'<div class="est-fill"></div>'),lab=el("div","est-steplabel"),body=el("div","est-body");
 root.appendChild(bar);root.appendChild(lab);root.appendChild(body);
 function calc(){var pk=PK[st.pk],tp=TIERS[st.tier].pct,fee=0,cov=0,pre=false,labf=false,excl=false;
  pk.items.forEach(function(it){var p=byCode[it[0]];if(!p)return;var q=it[1];fee+=p.acdqFee2026*q;
   var c=p.isCoveredByCDCP?Math.min(p.cdcpGridFee2026*tp,p.acdqFee2026):0;cov+=c*q;
   if(p.preAuthRequired)pre=true;if(p.hasLabFee)labf=true;if(!p.isCoveredByCDCP)excl=true});
  return {fee:fee,cov:cov,oop:fee-cov,pre:pre,lab:labf,excl:excl}}
 function go(n){st.step=n;render(true)}
 function render(animate){
  lab.innerHTML='<span>'+L.s.replace("{n}",st.step)+'</span>';
  bar.firstChild.style.width=(st.step/3*100)+"%";
  var s=el("div","est-step"+(animate&&!reduce?" in":""));
  if(st.step>1){var b=el("button","est-back","← "+L.back);b.type="button";b.addEventListener("click",function(){go(st.step-1)});s.appendChild(b)}
  if(st.step===1){s.appendChild(el("h3","est-q",L.q1));var g=el("div","est-grid");
   PK.forEach(function(p,i){var c=el("button","est-card",'<span class="est-ico" aria-hidden="true">'+p.ico+'</span><b>'+p[lang][0]+'</b><span>'+p[lang][1]+"</span>");c.type="button";
    c.addEventListener("click",function(){st.pk=i;go(2)});g.appendChild(c)});s.appendChild(g);
   var pkn=el("p","est-soon",L.soon);s.appendChild(pkn)}
  if(st.step===2){s.appendChild(el("h3","est-q",L.q2));var g2=el("div","est-tiers");
   TIERS.forEach(function(t,i){var c=el("button","est-tier"+(i===3?" na":""),"<b>"+t[lang]+"</b><span>"+(lang==="fr"?t.tf:t.te)+"</span>");c.type="button";
    c.addEventListener("click",function(){st.tier=i;go(3)});g2.appendChild(c)});s.appendChild(g2)}
  if(st.step===3){var pk=PK[st.pk],r=calc();s.appendChild(el("h3","est-q",L.q3));
   s.appendChild(el("p","est-pkname",pk.ico+" "+pk[lang][0]));
   var rc=el("div","est-receipt");rc.setAttribute("aria-live","polite");
   rc.innerHTML='<div class="r"><span>'+L.std+'</span><b data-k="fee"></b></div><div class="r"><span>'+L.cov+'</span><b data-k="cov"></b></div><div class="r tot"><span>'+L.oop+'</span><b data-k="oop"></b></div>';
   s.appendChild(rc);
   [["fee",r.fee],["cov",-r.cov],["oop",r.oop]].forEach(function(x){var n=rc.querySelector('[data-k='+x[0]+']');
    if(reduce){n.textContent=(x[1]<0?"− ":"")+nf.format(Math.abs(x[1]));return}
    var t0=performance.now();(function f(t){var k=Math.min(1,(t-t0)/450),e=1-Math.pow(1-k,3),v=x[1]*e;n.textContent=(v<0?"− ":"")+nf.format(Math.abs(v));if(k<1)requestAnimationFrame(f)})(t0)});
   var notes="";
   if(TIERS[st.tier].pct===0)notes+='<p class="est-n warn">'+L.inel+"</p>";
   var x=pk[lang==="fr"?"nf":"ne"];if(x)notes+='<p class="est-n">ℹ️ '+x+"</p>";
   if(r.pre)notes+='<p class="est-n">'+L.pre+"</p>";if(r.lab&&pk.id!=="major")notes+='<p class="est-n">'+L.lab+"</p>";if(r.excl)notes+='<p class="est-n warn">'+L.excl+"</p>";
   s.appendChild(el("div","est-notes",notes));
   s.appendChild(el("div","est-why","<b>"+L.why+"</b>"+L.whyT));
   s.appendChild(el("p","est-disc",L.disc));
   var row=el("div","est-actions"),a=el("a","est-cta",L.cta);a.href=L.href;var rs=el("button","est-back",L.again);rs.type="button";rs.addEventListener("click",function(){st.pk=null;st.tier=null;go(1)});
   row.appendChild(a);row.appendChild(rs);s.appendChild(row)}
  body.innerHTML="";body.appendChild(s);
  var f=s.querySelector("button,a");if(animate&&f&&st.step>1)try{f.focus({preventScroll:true})}catch(e){}}
 render(false);
 return {calc:calc,state:st};
};
})();
