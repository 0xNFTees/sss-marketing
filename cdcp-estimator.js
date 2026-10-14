/*
 * cdcp-estimator.js -- 3-step appointment estimator (CDCP / RCSD vs provincial fee guide).
 * Usage: mountCdcpEstimator(rootEl, "fr"|"en", "QC", {bookingUrl})
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
 fr:{label:"Estimation du coût du rendez-vous",appt:"Rendez-vous",inc:"Revenu net du ménage",res:"Votre part estimée",std:"Tarif standard (ACDQ 2026)",paid:"Versé par le RCSD",grid:"{n}\u00a0% de la grille du RCSD",noelig:"Non admissible",incl:"Inclus",
  why:"Pourquoi pas 0 $ ? La plupart des dentistes facturent selon le guide de l’ACDQ, alors que le RCSD verse des montants fixes. Vous payez la différence.",
  cvg:"Couverture RCSD",inel:"Non admissible au RCSD à ce revenu : tarif complet.",
  pre:"Préautorisation du RCSD requise.",lab:"Frais de laboratoire en sus.",excl:"Non couvert par le RCSD.",
  disc:"Estimation seulement. Chaque clinique fixe ses tarifs. Limites annuelles et frais de laboratoire non inclus.",cta:"Parler à la clinique",href:"/#contact",
  short:["< 70 k","70–79 k","80–89 k","90 k +"]},
 en:{label:"Appointment cost estimate",appt:"Appointment",inc:"Net household income",res:"Your estimated share",std:"Standard fee (ACDQ 2026)",paid:"Paid by CDCP",grid:"{n}% of the CDCP fee schedule",noelig:"Not eligible",incl:"Includes",
  why:"Why not $0? Most dentists charge the ACDQ fee guide, while CDCP pays fixed amounts. You pay the difference.",
  cvg:"CDCP coverage",inel:"Not eligible for CDCP at this income: full fee.",
  pre:"CDCP pre-authorization required.",lab:"Lab fee billed extra.",excl:"Not covered by CDCP.",
  disc:"Estimate only. Each clinic sets its own fees. Annual limits and lab fees not included.",cta:"Talk to the clinic",href:"/#contact",
  short:["< 70k","70–79k","80–89k","90k +"]}};
function el(t,c,h){var e=document.createElement(t);if(c)e.className=c;if(h!=null)e.innerHTML=h;return e}
var uid=0;
window.mountCdcpEstimator=function(root,lang,prov,opts){
 if(!root)return;opts=opts||{};
 lang=lang==="en"?"en":"fr";var L=T[lang],P=(window.CDCP_PROVINCES||{})[prov||"QC"];if(!P){root.className="cdcp cdcp-est est-err";root.setAttribute("role","alert");root.textContent=lang==="en"?"Fee data is unavailable. Please contact the clinic for an estimate.":"Les tarifs sont indisponibles. Communiquez avec la clinique pour une estimation.";return}
 var byCode={};P.procedures.forEach(function(p){byCode[p.code]=p});
 var nf=new Intl.NumberFormat(lang==="fr"?"fr-CA":"en-CA",{style:"currency",currency:"CAD",minimumFractionDigits:2});
 var reduce=window.matchMedia&&matchMedia("(prefers-reduced-motion:reduce)").matches;
 var st={pk:0,tier:0},id=++uid,shown=0;
 root.innerHTML="";root.className="cdcp cdcp-est";root.setAttribute("role","group");root.setAttribute("aria-label",L.label);
 var grid=el("div","est-grid"),ctl=el("div","est-ctl"),sum=el("div","est-sum"),det=el("div","est-det");grid.appendChild(ctl);grid.appendChild(sum);grid.appendChild(det);root.appendChild(grid);
 // appointment radios
 var f1=el("fieldset","est-fs",'<legend>'+L.appt+'</legend>'),list=el("div","est-list");
 PK.forEach(function(p,i){var tot=0;p.items.forEach(function(it){tot+=byCode[it[0]].acdqFee2026*it[1]});
  var lb=el("label","est-opt",'<input type="radio" name="ea'+id+'" '+(i===0?"checked":"")+'><span class="est-t">'+p[lang][0]+'</span><span class="est-f">'+nf.format(tot)+'</span>');
  lb.firstChild.addEventListener("change",function(){st.pk=i;update()});list.appendChild(lb)});
 f1.appendChild(list);ctl.appendChild(f1);
 // income segmented
 var f2=el("fieldset","est-fs",'<legend>'+L.inc+'</legend>'),seg=el("div","est-seg");
 TIERS.forEach(function(t,i){var lb=el("label","est-segopt",'<input type="radio" name="ei'+id+'" '+(i===0?"checked":"")+' aria-label="'+t[lang]+'"><span>'+L.short[i]+"</span>");
  lb.firstChild.addEventListener("change",function(){st.tier=i;update()});seg.appendChild(lb)});
 f2.appendChild(seg);ctl.appendChild(f2);
 // output: summary (sticks to the bottom on narrow screens) + breakdown
 sum.innerHTML='<div class="est-lbl">'+L.res+'</div><div class="est-big" aria-hidden="true"></div><span class="est-sr" role="status"></span><div class="est-bar" aria-hidden="true"><i></i></div>';
 det.innerHTML='<dl class="est-dl"><div><dt>'+L.std+'</dt><dd data-k="fee"></dd></div><div><dt>'+L.paid+'<small class="est-tier"></small></dt><dd data-k="cov"></dd></div></dl>'+
  '<p class="est-incl"></p><p class="est-n"></p><p class="est-why">'+L.why+'</p><div class="est-foot"><span>'+L.disc+'</span><a href="'+String(opts.bookingUrl||L.href).replace(/"/g,"&quot;")+'">'+L.cta+'</a></div>';
 var big=sum.querySelector(".est-big"),sr=sum.querySelector(".est-sr"),barI=sum.querySelector(".est-bar i"),kF=det.querySelector('[data-k=fee]'),kC=det.querySelector('[data-k=cov]'),tierEl=det.querySelector(".est-tier"),incl=det.querySelector(".est-incl"),nn=det.querySelector(".est-n"),why=det.querySelector(".est-why");
 function calc(){var pk=PK[st.pk],tp=TIERS[st.tier].pct,fee=0,cov=0,pre=false,labf=false,excl=false;
  pk.items.forEach(function(it){var p=byCode[it[0]];if(!p)return;var q=it[1];fee+=p.acdqFee2026*q;
   var c=p.isCoveredByCDCP?Math.min(p.cdcpGridFee2026*tp,p.acdqFee2026):0;c=Math.round(c*100)/100;cov+=c*q;
   if(p.preAuthRequired)pre=true;if(p.hasLabFee)labf=true;if(!p.isCoveredByCDCP)excl=true});
  return {fee:fee,cov:cov,oop:fee-cov,pre:pre,lab:labf,excl:excl}}
 var raf=0;
 function roll(to){cancelAnimationFrame(raf);sr.textContent=nf.format(to);
  if(reduce||shown===to){big.textContent=nf.format(to);shown=to;return}
  var from=shown,t0=performance.now();(function f(t){var k=Math.min(1,(t-t0)/280),e=1-Math.pow(1-k,3);shown=from+(to-from)*e;big.textContent=nf.format(shown);if(k<1)raf=requestAnimationFrame(f);else{shown=to;big.textContent=nf.format(to)}})(t0)}
 function update(){var r=calc(),pk=PK[st.pk],t=TIERS[st.tier];
  roll(r.oop);kF.textContent=nf.format(r.fee);kC.textContent=r.cov?"\u2212\u00a0"+nf.format(r.cov):nf.format(0);tierEl.textContent=t.pct?L.grid.replace("{n}",Math.round(t.pct*100)):L.noelig;why.hidden=!(r.cov>0&&r.oop>0);
  barI.style.width=(r.fee?r.cov/r.fee*100:0)+"%";
  incl.innerHTML="<b>"+L.incl+"</b> : "+pk[lang][1];
  var n=[];if(t.pct===0)n.push(L.inel);var x=pk[lang==="fr"?"nf":"ne"];if(x)n.push(x);if(r.pre)n.push(L.pre);if(r.lab&&pk.id!=="major")n.push(L.lab);if(r.excl)n.push(L.excl);
  nn.innerHTML=n.join(" ");nn.hidden=!n.length}
 update();
 return {calc:calc,state:st};
};
})();
