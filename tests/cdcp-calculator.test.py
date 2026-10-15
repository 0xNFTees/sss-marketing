"""
Engine + UI tests for cdcp-embed.js. Run from the repo root:
    python3 -m http.server 8123 &      # serve the site
    python3 tests/cdcp-calculator.test.py
Needs: pip install playwright (+ chromium). Exit code 1 on any failure.

Scope: only rules the calculator implements (CDCP tier % of the CDCP grid, capped at the ACDQ fee,
rounded per line to the cent; ACDQ guide = sum of line fees). There is no deductible, annual
maximum or private-plan percentage in the engine, so none is tested.
"""
import json, sys, math
from decimal import Decimal, ROUND_HALF_UP
from playwright.sync_api import sync_playwright

BASE = "http://localhost:8123"
PK = {"new":["01103","02102","11112","12101"],"recall":["01202","11112"],"emerg":["01205","02102"]}
TIER = {"under70":Decimal("1"),"band70":Decimal("0.6"),"band80":Decimal("0.4"),"over90":Decimal("0")}
fails=[];n=0
def ok(name,cond,detail=""):
    global n;n+=1
    if not cond: fails.append(f"{name} {detail}");print("FAIL",name,detail)

def d(x): return Decimal(str(x))
def c2(x): return x.quantize(Decimal("0.01"),rounding=ROUND_HALF_UP)

def expected(proc, pkid, inc, ins="no"):
    """Independent decimal model of the documented rule."""
    fee=cov=Decimal(0);covd=Decimal(0)
    for code in PK[pkid]:
        p=proc[code]; fee+=d(p["acdqFee2026"])
        if ins=="no" and p["isCoveredByCDCP"]:
            covd+=c2(min(d(p["cdcpGridFee2026"])*TIER[inc],d(p["acdqFee2026"])))
    return c2(fee),covd,c2(fee)-covd

def mk1(over):
    """one effective line: recall package with 01202 neutralised, `over` applied to 11112"""
    return mk({"01202":{"acdqFee2026":0,"cdcpGridFee2026":0},"11112":over})

def mk(codes_over=None, base=None):
    base=base or {}
    procs=[]
    for pk in PK.values():
        for code in pk:
            if code in [x["code"] for x in procs]: continue
            procs.append({"code":code,"acdqFee2026":100,"cdcpGridFee2026":80,"preAuthRequired":False,"hasLabFee":False,"isCoveredByCDCP":True})
    for p in procs:
        p.update((codes_over or {}).get(p["code"],{}))
        for k,v in list(p.items()):
            if v=="__DEL__": del p[k]
    return procs

JS = """([procs,answers])=>{
  window.CDCP_PROVINCES={QC:{procedures:procs}};
  const el=document.createElement('div');document.body.appendChild(el);
  const m=window.mountCdcpQuiz(el,'en',{});
  Object.assign(m.state,answers);
  const c=m.cost();
  el.querySelectorAll('details').forEach(d=>d.open=true);
  return {c, text:el.innerText};
}"""

def run(pg,procs,answers): return pg.evaluate(JS,[procs,answers])
JSUI = """([procs,ans])=>{
  window.CDCP_PROVINCES={QC:{procedures:procs}};
  const el=document.createElement('div');document.body.appendChild(el);
  const m=window.mountCdcpQuiz(el,'en',{});m.set(ans);
  el.querySelectorAll('details').forEach(d=>d.open=true);
  return {text:el.textContent.replace(/\s+/g,' ')};
}"""
def run_ui(pg,procs,answers): return pg.evaluate(JSUI,[procs,answers])

with sync_playwright() as p:
    b=p.chromium.launch();pg=b.new_page();errs=[];pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.goto(BASE+"/123/");pg.wait_for_timeout(300)

    # 1. tiers x packages on synthetic data with awkward cents
    procs=mk({"01103":{"acdqFee2026":124.5,"cdcpGridFee2026":84.33},"02102":{"acdqFee2026":52.05,"cdcpGridFee2026":36.17},
              "11112":{"acdqFee2026":130.99,"cdcpGridFee2026":99.99},"12101":{"acdqFee2026":19.99,"cdcpGridFee2026":33.33}})
    pm={x["code"]:x for x in procs}
    for pk in PK:
        for inc in TIER:
            r=run(pg,procs,{"ins":"no","inc":inc,"filed":"yes","appt":pk})["c"]
            fee,cov,oop=expected(pm,pk,inc)
            ok(f"tier {pk}/{inc}",abs(d(r["fee"])-fee)<Decimal("0.001") and abs(d(r["cov"])-covd if False else d(r["cov"])-cov)<Decimal("0.001") and abs(d(r["oop"])-oop)<Decimal("0.001"),str((r,fee,cov,oop)))
    # 2. cap at ACDQ fee: grid above fee never pays more than the fee
    r=run(pg,mk1({"acdqFee2026":50,"cdcpGridFee2026":100}),{"ins":"no","inc":"under70","filed":"yes","appt":"recall"})["c"]
    ok("cap at ACDQ fee (100% tier)",r["cov"]==50 and r["oop"]==0,str(r))
    r=run(pg,mk1({"acdqFee2026":50,"cdcpGridFee2026":100}),{"ins":"no","inc":"band70","filed":"yes","appt":"recall"})["c"]
    ok("cap at ACDQ fee (60% of 100 = 60 > 50)",r["cov"]==50 and r["oop"]==0,str(r))
    # 3. zero values
    z=mk1({"acdqFee2026":0,"cdcpGridFee2026":0})
    r=run(pg,z,{"ins":"no","inc":"under70","filed":"yes","appt":"recall"})
    ok("zero fee/zero grid",r["c"]["fee"]==0 and r["c"]["cov"]==0 and r["c"]["oop"]==0 and "NaN" not in r["text"],str(r))
    r=run(pg,mk1({"cdcpGridFee2026":0}),{"ins":"no","inc":"under70","filed":"yes","appt":"recall"})["c"]
    ok("zero grid, positive fee: patient pays all",r["cov"]==0 and r["oop"]==100,str(r))
    # 4. rounding: line coverage rounded to the cent, never above the fee, patient share = fee - coverage
    r=run(pg,mk1({"acdqFee2026":100,"cdcpGridFee2026":33.33}),{"ins":"no","inc":"band70","filed":"yes","appt":"recall"})["c"]
    ok("rounding 33.33*0.6=19.998 -> 20.00",r["cov"]==20 and r["oop"]==80,str(r))
    r=run(pg,mk1({"acdqFee2026":100,"cdcpGridFee2026":10.01}),{"ins":"no","inc":"band80","filed":"yes","appt":"recall"})["c"]
    ok("rounding 10.01*0.4=4.004 -> 4.00",r["cov"]==4 and r["oop"]==96,str(r))
    # 5. non-covered / pre-auth / lab flags and multi-line totals
    r=run(pg,mk({"01103":{"isCoveredByCDCP":False},"02102":{"preAuthRequired":True},"11112":{"hasLabFee":True}}),{"ins":"no","inc":"under70","filed":"yes","appt":"new"})["c"]
    ok("flags + excluded line",r["excl"] and r["pre"] and r["lab"] and r["fee"]==400 and r["cov"]==240 and r["oop"]==160,str(r))
    # 6. income over 90k or ineligible state: coverage 0, patient pays full guide price
    r=run(pg,mk(),{"ins":"no","inc":"over90","filed":"yes","appt":"new"})["c"]
    ok("over90 pays full fee",r["cov"]==0 and r["oop"]==r["fee"]==400,str(r))
    # 7. no appointment / unknown appointment
    ok("no appointment -> null",run(pg,mk(),{"ins":"no","inc":"under70","appt":None})["c"] is None)
    ok("unknown appointment -> null",run(pg,mk(),{"ins":"no","inc":"under70","appt":"zzz"})["c"] is None)
    # 8. tier unknown (income unanswered): guide price only, no coverage claimed
    r=run(pg,mk(),{"ins":"no","inc":None,"appt":"new"})["c"]
    ok("tier unknown: no coverage claimed",r["known"] is False and r["cov"]==0 and r["fee"]==400,str(r))
    # 8b. presentation of the statement (labels, honest captions, notes)
    ST={"ins":"no","inc":"under70","filed":"yes","appt":"recall"}
    t=run_ui(pg,mk1({"acdqFee2026":50,"cdcpGridFee2026":100}),ST)["text"]
    ok("capped line: fully covered note",("Fully covered at the guide price" in t) and "$0.00" in t,t[:200])
    t=run_ui(pg,mk1({"isCoveredByCDCP":False}),ST)["text"]
    ok("non-covered service: honest caption, no tier claim",("Not a CDCP-covered service" in t) and "100% of the CDCP fee schedule" not in t,t[:200])
    t=run_ui(pg,mk1({"acdqFee2026":0,"cdcpGridFee2026":0}),ST)["text"]
    ok("zero fee is not called non-covered",("Not a CDCP-covered service" not in t) and "Fully covered" not in t,t[:200])
    t=run_ui(pg,mk(),dict(ST,filed=None))["text"]
    ok("unconfirmed eligibility: conditional note",("If your eligibility is confirmed" in t),t[:200])
    t=run_ui(pg,mk1({"acdqFee2026":12345.67,"cdcpGridFee2026":9000.5}),dict(ST,inc="band70"))["text"]
    ok("large amounts keep separators and cents",("$12,345.67" in t) and ("$6,945" in t) and ("Treatment cost" in t),t[:240])
    t=run_ui(pg,mk(),dict(ST,inc="over90"))["text"]
    ok("over 90k: not eligible caption, full cost",("Not eligible" in t) and ("$200.00" in t),t[:900])
    # 9. invalid fee data must never produce a number
    bad_vals=[("missing fee","__DEL__"),("null",None),("string","88"),("NaN",float("nan")),("negative",-5),("Infinity",float("inf"))]
    for field in ("acdqFee2026","cdcpGridFee2026"):
        for label,v in bad_vals:
            procs=mk1({field:v})
            if isinstance(v,float) and not math.isfinite(v):
                js=f"""()=>{{const procs={json.dumps(mk())};
                  const t=procs.find(p=>p.code==='11112');t['{field}']={ 'NaN' if v!=v else 'Infinity'};
                  window.CDCP_PROVINCES={{QC:{{procedures:procs}}}};
                  const el=document.createElement('div');document.body.appendChild(el);
                  const m=window.mountCdcpQuiz(el,'en',{{}});Object.assign(m.state,{{ins:'no',inc:'under70',filed:'yes',appt:'recall'}});
                  el.querySelectorAll('details').forEach(d=>d.open=true);return {{c:m.cost(),text:el.innerText}};}}"""
                r=pg.evaluate(js)
            else:
                r=run(pg,procs,{"ins":"no","inc":"under70","filed":"yes","appt":"recall"})
            ok(f"invalid {field}={label} -> flagged, not computed",bool(r["c"] and r["c"].get("bad")),str(r["c"]))
    # 10. rendered text must never contain NaN / undefined / Infinity across the real UI states
    pg.goto(BASE+"/123/");pg.wait_for_timeout(300)
    MOUNT="""(a)=>{const el=document.createElement('div');document.body.appendChild(el);const m=window.mountCdcpQuiz(el,'en',{});m.set(a);el.querySelectorAll('details').forEach(d=>d.open=true);const t=el.innerText;el.remove();return t}"""
    for ins in ("yes","no"):
        for inc in ("under70","band70","band80","over90"):
            for fl in ("yes","no"):
                for pk in ("new","recall","emerg"):
                    t=pg.evaluate(MOUNT,{"ins":ins,"inc":inc,"filed":fl,"appt":pk})
                    ok(f"no NaN text {ins}/{inc}/{fl}/{pk}",not any(w in t for w in("NaN","undefined","Infinity","null")),t[:120])
    # 10b. one screen at a time: question -> question -> question -> appointment -> result; answers survive every route
    pg.goto(BASE+"/123/");pg.wait_for_timeout(300);pg.click("#tryCard");pg.wait_for_timeout(300)
    def ans(k,v):
        if pg.locator(f'#quiz input[name$="{k}"]').count()==0:
            if pg.locator('#quiz[data-view="result"]').count(): pg.click("#quiz .cq-back");pg.wait_for_timeout(450)
            if pg.locator(f'#quiz input[name$="{k}"]').count()==0:
                pg.locator(f'#quiz button.cq-sumrow[data-k="{k}"]').first.click();pg.wait_for_timeout(450)
        pg.locator(f'#quiz input[name$="{k}"][value="{v}"]').click(force=True);pg.wait_for_timeout(450)
    def snap():
        return pg.evaluate("""()=>{const r=document.querySelector('#quiz'),vis=s=>[...r.querySelectorAll(s)].filter(e=>e.getClientRects().length).length;
          return {view:r.dataset.view,st:r.dataset.state,fs:r.querySelectorAll('.cq-ctl .cq-row').length,sel:r.querySelectorAll('select').length,
            checked:[...r.querySelectorAll('.cq-ctl input:checked')].map(i=>i.value).join(','),
            chip:[...r.querySelectorAll('.cq-sumrow')].map(b=>b.dataset.k).join(','),
            big:(r.querySelector('.cq-big:not(.cq-big-empty)')||{}).textContent||null,clear:!!r.querySelector('.cq-clear')&&!r.querySelector('.cq-clear').hidden,
            resultVisible:vis('.cq-status')+vis('.cq-sum')+vis('.cq-act')+vis('.cq-rest'),ctlVisible:vis('.cq-ctl .cq-row'),
            pill:(r.querySelector('.cq-pill')||{}).textContent}}""")
    s0=snap(); ok("stage: starts on question 1, nothing preselected, one question shown, no dropdown, no result blocks on screen",s0["view"]=="ins" and s0["checked"]=="" and s0["fs"]==1 and s0["sel"]==0 and not s0["clear"] and s0["resultVisible"]==0,str(s0))
    ans("ins","no");s1=snap(); ok("stage: a click answers and advances",s1["view"]=="inc" and s1["st"]=="pending" and s1["big"] is None and s1["resultVisible"]==0,str(s1))
    ans("inc","band70");s2=snap(); ok("stage: income answered -> tax return asked, still no result on screen",s2["view"]=="filed" and s2["st"]=="unconfirmed" and s2["resultVisible"]==0,str(s2))
    ans("filed","yes");s3=snap(); ok("stage: three answers -> the appointment picker (no figure, no booking action yet)",s3["view"]=="appt" and s3["st"]=="qualified" and s3["big"] is None and s3["fs"]==1 and s3["checked"]=="" and s3["chip"]=="ins,inc,filed" and s3["resultVisible"]==0,str(s3))
    pg.click("#quiz .cq-back");pg.wait_for_timeout(250);s3b=snap(); ok("stage: Back returns to the previous question with its answer",s3b["view"]=="filed" and s3b["checked"]=="yes",str(s3b))
    pg.click("#quiz .cq-back");pg.wait_for_timeout(250);ok("stage: Back again, one question at a time",snap()["view"]=="inc" and snap()["checked"]=="band70")
    pg.click("#quiz .cq-next");pg.wait_for_timeout(250);ok("stage: Continue with nothing left unanswered returns to the appointment picker",snap()["view"]=="appt")
    ans("appt","new");s4=snap(); ok("stage: visit chosen -> the whole card becomes the result (figure, no controls left)",s4["view"]=="result" and s4["big"] is not None and s4["ctlVisible"]==0 and s4["resultVisible"]>=4,str(s4))
    fig=s4["big"]
    ans("appt","recall");s5=snap(); ok("result: Back, another visit -> a different figure",s5["view"]=="result" and s5["big"]!=fig,str((s5,fig)))
    ans("appt","new")
    ans("inc","band80");s6=snap(); ok("edit: changing income from the chip returns straight to the result, appointment kept",s6["view"]=="result" and s6["big"]!=fig,str(s6))
    ans("inc","band70");ok("edit: restoring the answer restores the figure",snap()["big"]==fig)
    ans("ins","yes");s7=snap(); ok("branch: private insurance ends the calculation, answers kept behind it",s7["st"]=="insurance" and s7["view"]=="result",str(s7))
    ans("ins","no");s8=snap(); ok("branch: undoing it restores the whole result",s8["view"]=="result" and s8["big"]==fig,str(s8))
    ans("inc","over90");s9=snap(); ok("branch: 90k+ is ineligible, full cost shown",s9["st"]=="income" and s9["big"] is not None and ("Not eligible" in (s9["pill"] or "") or "Non admissible" in (s9["pill"] or "")),str(s9))
    pg.click("#quiz .cq-back");pg.wait_for_timeout(250);ok("branch: with 90k+ the tax-return answer is not applicable (not in the chip)",snap()["chip"]=="ins,inc",snap()["chip"])
    ans("inc","band70");ok("branch: leaving 90k+ brings the tax-return answer back and the figure",snap()["big"]==fig and snap()["st"]=="qualified")
    pg.click("#quiz .cq-clear");pg.wait_for_timeout(250)
    s10=snap(); ok("reset: explicit, clears every answer, returns to question 1",s10["view"]=="ins" and s10["checked"]=="" and not s10["clear"] and pg.evaluate("document.activeElement.closest('.cq-ctl')!==null"),str(s10))
    pg.focus('#quiz input[name$="ins"][value="yes"]');pg.keyboard.press("ArrowRight");pg.wait_for_timeout(350)
    s11=snap(); ok("keyboard: arrow selects but does not advance",s11["view"]=="ins" and s11["checked"]=="no",str(s11))
    pg.focus("#quiz .cq-next");pg.keyboard.press("Enter");pg.wait_for_timeout(250)
    ok("keyboard: Continue advances and focus stays in the controls",snap()["view"]=="inc" and pg.evaluate("document.activeElement.closest('.cq-ctl')!==null"))
    pg.evaluate("document.querySelector('#quiz').__m=0")
    for k,v in (("inc","under70"),("filed","yes")):
        pg.focus(f'#quiz input[name$="{k}"][value="{v}"]');pg.keyboard.press("Space");pg.wait_for_timeout(200);pg.focus("#quiz .cq-next");pg.keyboard.press("Enter");pg.wait_for_timeout(250)
    pg.focus('#quiz input[name$="appt"][value="new"]');pg.keyboard.press("ArrowDown");pg.wait_for_timeout(350)
    ok("keyboard: on the appointment picker an arrow chooses without revealing the result",snap()["view"]=="appt" and snap()["checked"]=="recall",str(snap()))
    pg.focus("#quiz .cq-next");pg.keyboard.press("Enter");pg.wait_for_timeout(250)
    ok("keyboard: Continue reveals the result",snap()["view"]=="result" and snap()["big"] is not None)

    # 10c. status labels follow the answers, without an unsupported figure
    pg.click("#quiz .cq-clear");pg.wait_for_timeout(250)
    pill=lambda:pg.evaluate("document.querySelector('#quiz .cq-pill')?.textContent")
    ok("states: no answers -> own label",pill() in("Aucune réponse","No answers yet"),str(pill()))
    ans("ins","no");ok("states: some answers -> incomplete",pill() in("Incomplet","Incomplete"),str(pill()))
    ans("inc","over90");ok("states: 90k+ -> ineligible label",pill() in("Non admissible","Not eligible"),str(pill()))
    ok("states: the appointment picker follows, chip lists only the applicable answers",snap()["view"]=="appt" and snap()["chip"]=="ins,inc",str(snap()))
    pg.locator("#quiz button.cq-sumrow[data-k=ins]").click();pg.wait_for_timeout(250);ok("states: a chip segment jumps to its question",snap()["view"]=="ins")

    # 10d. design-system conformance: the rules written at the top of cdcp-embed.css, enforced
    import re
    css=open("cdcp-embed.css",encoding="utf-8").read()
    body=re.sub(r"/\*.*?\*/","",css,flags=re.S)
    sec_tokens_end=body.index(".cdcp *,.cdcp *::before")          # everything before the reset is the token layer
    host_start=body.index(".quiz-wrap{")
    rules=body[sec_tokens_end:host_start]
    ok("ds: no colour literals outside the token layer (except #000 mixed into hover/press)",not re.findall(r"#[0-9a-fA-F]{3,8}\b(?<!#000)|rgba?\(",re.sub(r"color-mix\([^;]*#000\)","",rules)),str(re.findall(r"#[0-9a-fA-F]{3,8}\b|rgba?\(",rules))[:200])
    ok("ds: no px font sizes outside the token layer",not re.findall(r"font-size:\s*\d+px",rules),str(re.findall(r"font-size:\s*\d+px",rules)))
    rm=rules[rules.index("@media (prefers-reduced-motion"):len(rules)]
    ok("ds: !important only in the reduced-motion switch",rules.count("!important")==rm.count("!important")>0)
    depth=0;top=[];buf=""
    for ch in rules:
        if ch=="{":
            if depth==0: top.append(buf.strip())
            depth+=1;buf=""
        elif ch=="}":
            depth-=1;buf=""
        elif depth==0: buf+=ch
    dup=sorted({x for x in top if top.count(x)>1 and not x.startswith("@")})
    ok("ds: no top-level selector defined twice",not dup,str(dup))
    ok("ds: no viewport width queries; no layout breakpoints (one frame)",not re.findall(r"@media[^{]*(?:min|max)-width",css) and not re.findall(r"@container",css))
    pg.evaluate("""()=>{const e=document.createElement('div');e.id='dsx';document.body.appendChild(e);}""")
    DS_STATES=[{},{"ins":"no"},{"ins":"no","inc":"band70"},{"ins":"no","inc":"band70","filed":"yes"},{"ins":"no","inc":"band70","filed":"yes","appt":"emerg"},{"ins":"no","inc":"over90","appt":"new"},{"ins":"no","inc":"under70","filed":"no","appt":"recall"},{"ins":"yes"}]
    sizes=set();small=[];noring=[];nosel=[]
    for width in (360,1000):
        for st in DS_STATES:
            r=pg.evaluate("""([w,st])=>{const e=document.getElementById('dsx');e.innerHTML='';e.style.width=w+'px';const m=mountCdcpQuiz(e,'fr',{demo:true});m.set(st);
              const out={sizes:[],small:[],nosel:[]};
              e.querySelectorAll('*').forEach(el=>{const cs=getComputedStyle(el),r=el.getBoundingClientRect();if(!r.width||!r.height||cs.visibility==='hidden')return;
                const own=[...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim());
                if(own&&!el.closest('.cq-big')){const f=parseFloat(cs.fontSize);if(f<17)out.sizes.push(f);}
                if(el.matches('button,summary,.cq-opt')&&r.height<43&&!el.closest('.cq-sr'))out.small.push(el.className+':'+Math.round(r.height));});
              e.querySelectorAll('.cq-opt:has(input:checked)').forEach(l=>{if(getComputedStyle(l).boxShadow==='none')out.nosel.push(l.textContent)});
              return out}""",[width,st])
            sizes|=set(r["sizes"]);small+=r["small"];nosel+=r["nosel"]
    ok("ds: small text uses only the three UI sizes (12 / 13 / 14)",sizes<={12.0,13.0,14.0},str(sorted(sizes)))
    ok("ds: every button, summary and choice is at least 44px tall",not small,str(small[:5]))
    ok("ds: a selected choice always shows the selection ring",not nosel,str(nosel))
    for st in ({"ins":"no","inc":"band70"},{"ins":"no","inc":"band70","filed":"yes"},{"ins":"no","inc":"band70","filed":"yes","appt":"emerg"}):
        pg.evaluate("""(st)=>{const e=document.getElementById('dsx');e.innerHTML='';e.style.width='1000px';const m=mountCdcpQuiz(e,'fr',{demo:true});m.set(st)}""",st)
        pg.evaluate("document.getElementById('dsx').scrollIntoView();document.activeElement&&document.activeElement.blur()")
        pg.keyboard.press("Tab")
        for _ in range(14):
            has=pg.evaluate("""()=>{const a=document.activeElement;if(!a||!a.closest||!a.closest('#dsx'))return null;
              const hit=[a,a.closest('.cq-opt')].filter(Boolean).some(x=>{const o=getComputedStyle(x);return o.outlineStyle!=='none'&&parseFloat(o.outlineWidth)>=2});
              return [hit,a.tagName+'.'+a.className+(a.value?'='+a.value:'')]}""")
            if has and not has[0]: noring.append(has[1])
            pg.keyboard.press("Tab")
    ok("ds: every focusable control shows the focus ring",not noring,str(noring[:5]))

    # 10e. the result screen: one frame, actions above the fold, fine print in one drawer
    pg.set_viewport_size({"width":1280,"height":720})
    MNT="""([w,st])=>{const e=document.getElementById('dsx');e.innerHTML='';e.style.width=w+'px';const m=mountCdcpQuiz(e,'fr',{demo:true});m.set(st);
      e.scrollIntoView({behavior:'instant'});return true}"""
    full={"ins":"no","inc":"under70","filed":"yes","appt":"new"}
    for w in (1000,390):
        pg.set_viewport_size({"width":1280 if w==1000 else 390,"height":720 if w==1000 else 844})
        pg.evaluate(MNT,[w,full]);pg.wait_for_timeout(900)
        r=pg.evaluate("""()=>{const e=document.getElementById('dsx'),a=e.querySelector('.cq-act'),t=e.getBoundingClientRect(),bs=[...a.querySelectorAll('a.cq-cta-btn')],pb=e.querySelector('a.cq-cta-btn-primary').getBoundingClientRect();
          const dr=[...e.querySelectorAll('.cq-rest > details')].map(d=>[d.querySelector('summary').textContent.trim(),d.open,!!d.querySelector('details.cq-matrix-all')]);
          const y=s=>e.querySelector(s).getBoundingClientRect().top;
          return {view:e.dataset.view,w:t.width,primaryW:pb.width,primaryBottom:pb.bottom-t.top,btns:bs.length,dr,split:e.querySelector('.cq-split').innerText.replace(/\\s+/g,' '),splitVisible:e.querySelector('.cq-split').getClientRects().length>0,
            noticeInDrawer:!!e.querySelector('.cq-rest details .cq-billing-notice'),noticeOutside:!!e.querySelector('.cq-det .cq-billing-notice'),
            order:[y('.cq-status'),y('.cq-sum'),y('.cq-brk'),y('.cq-act'),y('.cq-det'),y('.cq-rest')],controls:e.querySelectorAll('.cq-row').length,dark:getComputedStyle(e).backgroundColor}}""")
        ok(f"result@{w}: the card is one column no wider than 32rem, controls gone",r["view"]=="result" and r["w"]<=512.5 and r["controls"]==0,str(r))
        ok(f"result@{w}: the primary action is full width and within the first 900px",r["primaryW"]>r["w"]-64 and r["primaryBottom"]<900,str(r))
        ok(f"result@{w}: the secondary action is a text link (two calls to action in all)",r["btns"]==2,str(r["btns"]))
        ok(f"result@{w}: one fine-print drawer, closed, holding the coverage matrix",[d[0] for d in r["dr"]]==["Avis de transparence tarifaire"] and not r["dr"][0][1] and r["dr"][0][2],str(r["dr"]))
        ok(f"result@{w}: the notice lives in the drawer",r["noticeInDrawer"] and not r["noticeOutside"])
        ok(f"result@{w}: the split is visible: cost | paid by the plan","344,00" in r["split"] and "268,00" in r["split"] and r["splitVisible"],r["split"])
        ok(f"result@{w}: reading order is state, figure, split, actions, inclusions, drawer",r["order"]==sorted(r["order"]),str(r["order"]))
        ok(f"result@{w}: the card is on the dark surface",r["dark"] not in("rgb(255, 255, 255)","rgba(0, 0, 0, 0)"),r["dark"])
    pg.set_viewport_size({"width":390,"height":844})
    pg.evaluate(MNT,[390,{"ins":"no","inc":"under70","filed":"yes","appt":None}]);pg.wait_for_timeout(500)
    r=pg.evaluate("""()=>{const e=document.getElementById('dsx'),vis=s=>[...e.querySelectorAll(s)].some(x=>x.getClientRects().length);return {view:e.dataset.view,act:vis('.cq-act'),big:vis('.cq-big'),status:vis('.cq-status'),rows:e.querySelectorAll('.cq-row').length}}""")
    ok("appointment screen: no figure, no booking action, no status block on screen; only the picker",r["view"]=="appt" and not r["act"] and not r["big"] and not r["status"] and r["rows"]==1,str(r))
    for st,nm in (({"ins":"yes"},"insurance"),({"ins":"no","inc":"under70","filed":"no","appt":"new"},"tax")):
        pg.evaluate(MNT,[390,st]);pg.wait_for_timeout(300)
        ok(f"result: {nm} shows its own action on the result screen",pg.evaluate("document.getElementById('dsx').dataset.view")=="result" and pg.evaluate("[...document.getElementById('dsx').querySelectorAll('.cq-act a.cq-cta-btn')].length")>=1)
    pg.set_viewport_size({"width":1280,"height":720})

    # 11. shipped data sanity
    data=pg.evaluate("window.CDCP_PROVINCES.QC.procedures")
    dm={x["code"]:x for x in data}
    for pk,codes in PK.items():
        for code in codes:
            q=dm.get(code)
            ok(f"data: {pk}/{code} exists",q is not None)
            if q:
                ok(f"data: {code} fees finite and >= 0",all(isinstance(q.get(k),(int,float)) and q[k]>=0 for k in("acdqFee2026","cdcpGridFee2026")),str(q))
    ok("page errors",not errs,str(errs))
    b.close()
print(f"{n} checks, {len(fails)} failed");sys.exit(1 if fails else 0)
