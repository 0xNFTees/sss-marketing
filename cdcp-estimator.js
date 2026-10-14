/*
 * cdcp-estimator.js -- CDCP / RCSD out-of-pocket estimator (province-agnostic).
 * Usage: mountCdcpEstimator(rootEl, "fr"|"en", "QC")
 * Data: window.CDCP_PROVINCES[code] = {label, guide, procedures:[...]}  (see cdcp-estimator-data.js)
 * Math: covered = isCovered ? min(grid * tierPct, dentistFee) : 0 ; you pay = dentistFee - covered
 */
(function(){
"use strict";
var TIERS=[
 {id:"t0",pct:1,  fr:"Moins de 70 000 $",en:"Under $70,000"},
 {id:"t1",pct:.6, fr:"70 000 $ – 79 999 $",en:"$70,000 – $79,999"},
 {id:"t2",pct:.4, fr:"80 000 $ – 89 999 $",en:"$80,000 – $89,999"},
 {id:"t3",pct:0,  fr:"90 000 $ et plus",en:"$90,000 and over"}];
var CATS={Diagnostic:["Diagnostic","Diagnostic"],Preventive:["Préventif","Preventive"],Restorative:["Restauration","Restorative"],Endodontics:["Endodontie","Endodontics"],Periodontics:["Parodontie","Periodontics"],Prosthodontics:["Prothèses","Prosthodontics"],"Oral Surgery":["Chirurgie","Oral surgery"]};
var T={
 fr:{title:"Estimez votre part",lead:"Revenu familial net, puis les soins prévus. Vous voyez ce que le RCSD couvre et ce qu’il reste à payer.",income:"Revenu familial net",proc:"Soins",all:"Tous",qty:"Quantité",add:"Ajouter",sub:"Retirer",
  fee:"Tarif suggéré",cdcp:"RCSD paie",you:"Vous payez",total:"Total estimé",fees:"Tarifs suggérés",covers:"Couvert par le RCSD",oop:"À votre charge",empty:"Choisissez au moins un soin pour voir l’estimation.",
  pre:"Préautorisation",lab:"Frais de laboratoire en sus",excl:"Non couvert par le RCSD",inel:"À ce niveau de revenu, vous n’êtes pas admissible au RCSD : le tarif complet est à votre charge.",
  cap:"Tarif du RCSD supérieur au tarif suggéré : couverture plafonnée au tarif.",
  disc:"Estimation seulement. Les tarifs suggérés ACDQ 2026 et les montants de la grille RCSD servent de base ; chaque clinique fixe ses propres tarifs. Les frais de laboratoire, les limites annuelles et les préautorisations ne sont pas inclus dans le total. Confirmez avec votre clinique.",
  cta:"Parler à la clinique",ctaHref:"/#contact"},
 en:{title:"Estimate your share",lead:"Net family income, then the planned treatment. See what CDCP covers and what you still pay.",income:"Net family income",proc:"Treatments",all:"All",qty:"Quantity",add:"Add",sub:"Remove",
  fee:"Suggested fee",cdcp:"CDCP pays",you:"You pay",total:"Estimated total",fees:"Suggested fees",covers:"Covered by CDCP",oop:"Your out-of-pocket",empty:"Pick at least one treatment to see the estimate.",
  pre:"Pre-authorization",lab:"Lab fee billed extra",excl:"Not covered by CDCP",inel:"At this income level you are not eligible for CDCP: the full fee is yours to pay.",
  cap:"CDCP grid is above the suggested fee: coverage capped at the fee.",
  disc:"Estimate only. ACDQ 2026 suggested fees and the CDCP grid amounts are the basis; each clinic sets its own fees. Lab fees, annual limits and pre-authorizations are not included in the total. Confirm with your clinic.",
  cta:"Talk to the clinic",ctaHref:"/#contact"}};
function el(t,c,h){var e=document.createElement(t);if(c)e.className=c;if(h!=null)e.innerHTML=h;return e}
window.mountCdcpEstimator=function(root,lang,prov){
 lang=lang==="en"?"en":"fr";var L=T[lang],P=(window.CDCP_PROVINCES||{})[prov||"QC"];
 if(!P){root.textContent="";return}
 var nf=new Intl.NumberFormat(lang==="fr"?"fr-CA":"en-CA",{style:"currency",currency:"CAD",minimumFractionDigits:2});
 var reduce=window.matchMedia&&matchMedia("(prefers-reduced-motion:reduce)").matches;
 var st={tier:0,cat:"all",qty:{}};root.innerHTML="";root.classList.add("est");
 var title=el("h3","est-title",L.title),lead=el("p","est-lead",L.lead);root.appendChild(title);root.appendChild(lead);
 // income
 var inc=el("fieldset","est-fs");inc.appendChild(el("legend","est-leg",L.income));var tw=el("div","est-pills");
 var gname="est-inc-"+Math.random().toString(36).slice(2,7);
 TIERS.forEach(function(t,i){var lab=el("label","est-pill");
  lab.innerHTML='<input type="radio" name="'+gname+'" '+(i===0?"checked":"")+'><span>'+t[lang]+"</span>";
  lab.firstChild.addEventListener("change",function(){st.tier=i;update()});tw.appendChild(lab)});
 inc.appendChild(tw);root.appendChild(inc);
 // categories
 var cf=el("fieldset","est-fs");cf.appendChild(el("legend","est-leg",L.proc));var cw=el("div","est-cats");
 var cats=[["all",L.all]];P.procedures.forEach(function(p){if(!cats.some(function(c){return c[0]===p.category}))cats.push([p.category,CATS[p.category]?CATS[p.category][lang==="fr"?0:1]:p.category])});
 cats.forEach(function(c){var b=el("button","est-cat",c[1]);b.type="button";b.setAttribute("aria-pressed",c[0]==="all"?"true":"false");
  b.addEventListener("click",function(){st.cat=c[0];Array.prototype.forEach.call(cw.children,function(x){x.setAttribute("aria-pressed","false")});b.setAttribute("aria-pressed","true");filter()});cw.appendChild(b)});
 cf.appendChild(cw);root.appendChild(cf);
 // rows
 var list=el("ul","est-list"),rows={};
 P.procedures.forEach(function(p){
  var li=el("li","est-row");li.dataset.cat=p.category;
  var badges="";if(p.preAuthRequired)badges+='<span class="est-b">'+L.pre+"</span>";if(p.hasLabFee)badges+='<span class="est-b">'+L.lab+"</span>";if(!p.isCoveredByCDCP)badges+='<span class="est-b warn">'+L.excl+"</span>";
  li.innerHTML='<div class="est-info"><b>'+(lang==="fr"?p.nameFr:p.nameEn)+'</b><span class="est-code">'+p.code+"</span><div class=\"est-badges\">"+badges+'</div></div><div class="est-fee"><small>'+L.fee+"</small>"+nf.format(p.acdqFee2026)+'</div><div class="est-step"><button type="button" aria-label="'+L.sub+'" disabled>−</button><output aria-label="'+L.qty+'">0</output><button type="button" aria-label="'+L.add+'">+</button></div>';
  var bs=li.querySelectorAll("button"),out=li.querySelector("output");
  function set(n){n=Math.max(0,Math.min(9,n));st.qty[p.code]=n;out.textContent=n;bs[0].disabled=n===0;li.classList.toggle("on",n>0);update()}
  bs[0].addEventListener("click",function(){set((st.qty[p.code]||0)-1)});bs[1].addEventListener("click",function(){set((st.qty[p.code]||0)+1)});
  rows[p.code]=li;list.appendChild(li)});
 root.appendChild(list);
 function filter(){P.procedures.forEach(function(p){rows[p.code].hidden=!(st.cat==="all"||st.cat===p.category)})}
 // results
 var res=el("div","est-res");res.setAttribute("aria-live","polite");root.appendChild(res);
 var disc=el("p","est-disc",L.disc);root.appendChild(disc);
 var cta=el("a","est-cta",L.cta);cta.href=L.ctaHref;root.appendChild(cta);
 var shown={fees:0,cov:0,oop:0};
 function calc(){var items=[],f=0,c=0,capped=false;
  P.procedures.forEach(function(p){var n=st.qty[p.code]||0;if(!n)return;
   var raw=p.isCoveredByCDCP?p.cdcpGridFee2026*TIERS[st.tier].pct:0,cov=Math.min(raw,p.acdqFee2026);if(raw>p.acdqFee2026)capped=true;
   items.push({p:p,n:n,fee:p.acdqFee2026*n,cov:cov*n,pay:(p.acdqFee2026-cov)*n});f+=p.acdqFee2026*n;c+=cov*n});
  return {items:items,fees:f,cov:c,oop:f-c,capped:capped}}
 function anim(node,key,to){if(reduce){node.textContent=nf.format(to);shown[key]=to;return}
  var from=shown[key],t0=performance.now();(function s(t){var k=Math.min(1,(t-t0)/350),e=1-Math.pow(1-k,3);node.textContent=nf.format(from+(to-from)*e);if(k<1)requestAnimationFrame(s);else shown[key]=to})(t0)}
 function update(){var r=calc();
  if(!r.items.length){res.innerHTML='<p class="est-empty">'+L.empty+"</p>";shown={fees:0,cov:0,oop:0};return}
  var h='<table class="est-t"><thead><tr><th></th><th>'+L.fee+"</th><th>"+L.cdcp+"</th><th>"+L.you+"</th></tr></thead><tbody>";
  r.items.forEach(function(i){h+="<tr><td>"+(lang==="fr"?i.p.nameFr:i.p.nameEn)+(i.n>1?" × "+i.n:"")+"</td><td>"+nf.format(i.fee)+"</td><td>"+nf.format(i.cov)+"</td><td>"+nf.format(i.pay)+"</td></tr>"});
  h+='</tbody></table><div class="est-tot"><div><small>'+L.fees+'</small><span data-k="fees"></span></div><div><small>'+L.covers+'</small><span data-k="cov"></span></div><div class="big"><small>'+L.oop+'</small><span data-k="oop"></span></div></div>';
  if(TIERS[st.tier].pct===0)h+='<p class="est-note warn">'+L.inel+"</p>";
  if(r.capped&&TIERS[st.tier].pct>0)h+='<p class="est-note">'+L.cap+"</p>";
  res.innerHTML=h;
  anim(res.querySelector('[data-k=fees]'),"fees",r.fees);anim(res.querySelector('[data-k=cov]'),"cov",r.cov);anim(res.querySelector('[data-k=oop]'),"oop",r.oop)}
 update();
 return {calc:calc,state:st};
};
})();
