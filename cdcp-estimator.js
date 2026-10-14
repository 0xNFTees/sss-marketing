/*
 * cdcp-estimator.js -- 3-step appointment estimator (CDCP / RCSD vs provincial fee guide).
 * Usage: mountCdcpEstimator(rootEl, "fr"|"en", "QC")
 * Data: window.CDCP_PROVINCES[code] = {label, guide, procedures:[...], packages:[...]}

 */
(function(){
"use strict";
var TIERS=[
 {pct:1, fr:"Moins de 70 000 $",en:"Under $70,000",tf:"Couverture RCSD à 100 %",te:"100% CDCP coverage"},
 {pct:.6,fr:"70 000 $ – 79 999 $",en:"$70,000 – $79,999",tf:"Couverture RCSD à 60 %",te:"60% CDCP coverage"},
 {pct:.4,fr:"80 000 $ – 89 999 $",en:"$80,000 – $89,999",tf:"Couverture RCSD à 40 %",te:"40% CDCP coverage"},
 {pct:0, fr:"90 000 $ et plus",en:"$90,000 and over",tf:"Non admissible au RCSD",te:"Not eligible for CDCP"}];
var PK=[
 {id:"new",items:[["01103",1],["02102",1],["11112",1],["12101",1]],
  fr:["Nouveau patient","Examen complet, 2 radiographies, nettoyage de 30 min, fluorure"],
  en:["New patient","Complete exam, 2 X-rays, 30-minute cleaning, fluoride"]},
 {id:"recall",items:[["01202",1],["11112",1]],
  fr:["Rappel et nettoyage","Examen périodique, nettoyage de 30 min"],
  en:["Recall and cleaning","Periodic exam, 30-minute cleaning"]},
 {id:"emerg",items:[["01205",1],["02102",1]],
  fr:["Urgence, mal de dent","Examen d’urgence, radiographie"],
  en:["Emergency, toothache","Emergency exam, X-ray"],
  nf:"Un traitement immédiat (obturation, canal, extraction) s’ajoute au tarif.",
  ne:"Immediate treatment (filling, root canal, extraction) is extra."},
 {id:"filling",items:[["23311",1]],
  fr:["Carie, obturation","Obturation en composite sur une molaire (1 surface)"],
  en:["Cavity, filling","Composite filling on a molar (1 surface)"],
  nf:"L’examen n’est pas inclus.",ne:"The exam is not included."},
 {id:"major",items:[["51101",1]],
  fr:["Prothèse complète","Prothèse complète standard, une arcade"],
  en:["Complete denture","Standard complete denture, one arch"],
  nf:"Frais de laboratoire en sus.",ne:"Lab fees billed extra."}];
var T={
 fr:{appt:"Rendez-vous",inc:"Revenu net du ménage",res:"Votre part estimée",std:"Tarif standard (ACDQ 2026)",cov:"Le RCSD couvre",incl:"Inclus",
  why:"Pourquoi pas 0 $ ? La plupart des dentistes facturent selon le guide de l’ACDQ, alors que le RCSD verse des montants fixes. Vous payez la différence.",
  cvg:"Couverture RCSD",inel:"Non admissible au RCSD à ce revenu : tarif complet.",
  pre:"Préautorisation du RCSD requise.",lab:"Frais de laboratoire en sus.",excl:"Non couvert par le RCSD.",
  disc:"Estimation seulement. Chaque clinique fixe ses tarifs. Limites annuelles et frais de laboratoire non inclus.",cta:"Parler à la clinique",href:"/#contact",
  short:["< 70 k","70–79 k","80–89 k","90 k +"]},
 en:{appt:"Appointment",inc:"Net household income",res:"Your estimated share",std:"Standard fee (ACDQ 2026)",cov:"CDCP covers",incl:"Includes",
  why:"Why not $0? Most dentists charge the ACDQ fee guide, while CDCP pays fixed amounts. You pay the difference.",
  cvg:"CDCP coverage",inel:"Not eligible for CDCP at this income: full fee.",
  pre:"CDCP pre-authorization required.",lab:"Lab fee billed extra.",excl:"Not covered by CDCP.",
  disc:"Estimate only. Each clinic sets its own fees. Annual limits and lab fees not included.",cta:"Talk to the clinic",href:"/#contact",
  short:["< 70k","70–79k","80–89k","90k +"]}};
function el(t,c,h){var e=document.createElement(t);if(c)e.className=c;if(h!=null)e.innerHTML=h;return e}
var uid=0;
window.mountCdcpEstimator=function(root,lang,prov){
 lang=lang==="en"?"en":"fr";var L=T[lang],P=(window.CDCP_PROVINCES||{})[prov||"QC"];if(!P){root.className="est-err";root.setAttribute("role","alert");root.textContent=lang==="en"?"Fee data is unavailable. Please contact the clinic for an estimate.":"Les tarifs sont indisponibles. Communiquez avec la clinique pour une estimation.";return}
 var byCode={};P.procedures.forEach(function(p){byCode[p.code]=p});
 var nf=new Intl.NumberFormat(lang==="fr"?"fr-CA":"en-CA",{style:"currency",currency:"CAD",minimumFractionDigits:2});
 var reduce=window.matchMedia&&matchMedia("(prefers-reduced-motion:reduce)").matches;
 var st={pk:0,tier:0},id=++uid,shown=0;
 root.innerHTML="";root.className="est";
 var ctl=el("div","est-ctl"),out=el("div","est-out");root.appendChild(ctl);root.appendChild(out);
 // appointment radios
 var f1=el("fieldset","est-fs",'<legend>'+L.appt+'</legend>'),list=el("div","est-list");
 PK.forEach(function(p,i){var tot=0;p.items.forEach(function(it){tot+=byCode[it[0]].acdqFee2026*it[1]});
  var lb=el("label","est-opt",'<input type="radio" name="ea'+id+'" '+(i===0?"checked":"")+'><span class="t">'+p[lang][0]+'</span><span class="f">'+nf.format(tot)+'</span>');
  lb.firstChild.addEventListener("change",function(){st.pk=i;update()});list.appendChild(lb)});
 f1.appendChild(list);ctl.appendChild(f1);
 // income segmented
 var f2=el("fieldset","est-fs",'<legend>'+L.inc+'</legend>'),seg=el("div","est-seg");
 TIERS.forEach(function(t,i){var lb=el("label","est-segopt",'<input type="radio" name="ei'+id+'" '+(i===0?"checked":"")+' aria-label="'+t[lang]+'"><span>'+L.short[i]+"</span>");
  lb.firstChild.addEventListener("change",function(){st.tier=i;update()});seg.appendChild(lb)});
 f2.appendChild(seg);ctl.appendChild(f2);
 // output
 out.innerHTML='<div class="est-lbl">'+L.res+'</div><div class="est-big" aria-live="polite"></div><div class="est-bar" aria-hidden="true"><i></i></div>'+
  '<dl class="est-dl"><div><dt>'+L.std+'</dt><dd data-k="fee"></dd></div><div><dt>'+L.cov+' <span class="pct"></span></dt><dd data-k="cov"></dd></div></dl>'+
  '<p class="est-incl"></p><p class="est-n"></p><p class="est-why">'+L.why+'</p><div class="est-foot"><span>'+L.disc+'</span><a href="'+L.href+'">'+L.cta+'</a></div>';
 var big=out.querySelector(".est-big"),barI=out.querySelector(".est-bar i"),kF=out.querySelector('[data-k=fee]'),kC=out.querySelector('[data-k=cov]'),pc=out.querySelector(".pct"),incl=out.querySelector(".est-incl"),nn=out.querySelector(".est-n");
 function calc(){var pk=PK[st.pk],tp=TIERS[st.tier].pct,fee=0,cov=0,pre=false,labf=false,excl=false;
  pk.items.forEach(function(it){var p=byCode[it[0]];if(!p)return;var q=it[1];fee+=p.acdqFee2026*q;
   var c=p.isCoveredByCDCP?Math.min(p.cdcpGridFee2026*tp,p.acdqFee2026):0;cov+=c*q;
   if(p.preAuthRequired)pre=true;if(p.hasLabFee)labf=true;if(!p.isCoveredByCDCP)excl=true});
  return {fee:fee,cov:cov,oop:fee-cov,pre:pre,lab:labf,excl:excl}}
 function roll(to){if(reduce){big.textContent=nf.format(to);shown=to;return}
  var from=shown,t0=performance.now();(function f(t){var k=Math.min(1,(t-t0)/280),e=1-Math.pow(1-k,3);big.textContent=nf.format(from+(to-from)*e);if(k<1)requestAnimationFrame(f);else shown=to})(t0)}
 function update(){var r=calc(),pk=PK[st.pk],t=TIERS[st.tier];
  roll(r.oop);kF.textContent=nf.format(r.fee);kC.textContent="\u2212\u00a0"+nf.format(r.cov);pc.textContent=t.pct?"("+Math.round(t.pct*100)+"\u00a0%)":"";
  barI.style.width=(r.fee?r.cov/r.fee*100:0)+"%";
  incl.innerHTML="<b>"+L.incl+"</b> : "+pk[lang][1];
  var n=[];if(t.pct===0)n.push(L.inel);var x=pk[lang==="fr"?"nf":"ne"];if(x)n.push(x);if(r.pre)n.push(L.pre);if(r.lab&&pk.id!=="major")n.push(L.lab);if(r.excl)n.push(L.excl);
  nn.innerHTML=n.join(" ");nn.hidden=!n.length}
 update();
 return {calc:calc,state:st};
};
})();
