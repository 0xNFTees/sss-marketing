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
PK = {"new":["01103","02102","11112","12101"],"recall":["01202","11112"],"emerg":["01205","02102"],"filling":["23311"],"major":["51101"]}
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
  return {c, text:el.innerText};
}"""

def run(pg,procs,answers): return pg.evaluate(JS,[procs,answers])
JSUI = """([procs,ans])=>{
  window.CDCP_PROVINCES={QC:{procedures:procs}};
  const el=document.createElement('div');document.body.appendChild(el);
  const m=window.mountCdcpQuiz(el,'en',{});m.set(ans);
  return {text:el.innerText};
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
    r=run(pg,mk({"23311":{"acdqFee2026":50,"cdcpGridFee2026":100}}),{"ins":"no","inc":"under70","filed":"yes","appt":"filling"})["c"]
    ok("cap at ACDQ fee (100% tier)",r["cov"]==50 and r["oop"]==0,str(r))
    r=run(pg,mk({"23311":{"acdqFee2026":50,"cdcpGridFee2026":100}}),{"ins":"no","inc":"band70","filed":"yes","appt":"filling"})["c"]
    ok("cap at ACDQ fee (60% of 100 = 60 > 50)",r["cov"]==50 and r["oop"]==0,str(r))
    # 3. zero values
    z=mk({"23311":{"acdqFee2026":0,"cdcpGridFee2026":0}})
    r=run(pg,z,{"ins":"no","inc":"under70","filed":"yes","appt":"filling"})
    ok("zero fee/zero grid",r["c"]["fee"]==0 and r["c"]["cov"]==0 and r["c"]["oop"]==0 and "NaN" not in r["text"],str(r))
    r=run(pg,mk({"23311":{"cdcpGridFee2026":0}}),{"ins":"no","inc":"under70","filed":"yes","appt":"filling"})["c"]
    ok("zero grid, positive fee: patient pays all",r["cov"]==0 and r["oop"]==100,str(r))
    # 4. rounding: line coverage rounded to the cent, never above the fee, patient share = fee - coverage
    r=run(pg,mk({"23311":{"acdqFee2026":100,"cdcpGridFee2026":33.33}}),{"ins":"no","inc":"band70","filed":"yes","appt":"filling"})["c"]
    ok("rounding 33.33*0.6=19.998 -> 20.00",r["cov"]==20 and r["oop"]==80,str(r))
    r=run(pg,mk({"23311":{"acdqFee2026":100,"cdcpGridFee2026":10.01}}),{"ins":"no","inc":"band80","filed":"yes","appt":"filling"})["c"]
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
    ST={"ins":"no","inc":"under70","filed":"yes","appt":"filling"}
    t=run_ui(pg,mk({"23311":{"acdqFee2026":50,"cdcpGridFee2026":100}}),ST)["text"]
    ok("capped line: fully covered note",("Fully covered at the guide price" in t) and "$0.00" in t,t[:200])
    t=run_ui(pg,mk({"23311":{"isCoveredByCDCP":False}}),ST)["text"]
    ok("non-covered service: honest caption, no tier claim",("Not a CDCP-covered service" in t) and "100% of the CDCP fee schedule" not in t,t[:200])
    t=run_ui(pg,mk({"23311":{"acdqFee2026":0,"cdcpGridFee2026":0}}),ST)["text"]
    ok("zero fee is not called non-covered",("Not a CDCP-covered service" not in t) and "Fully covered" not in t,t[:200])
    t=run_ui(pg,mk(),dict(ST,filed=None))["text"]
    ok("unconfirmed eligibility: conditional note",("If your eligibility is confirmed" in t),t[:200])
    t=run_ui(pg,mk({"23311":{"acdqFee2026":12345.67,"cdcpGridFee2026":9000.5}}),dict(ST,inc="band70"))["text"]
    ok("large amounts keep separators and cents",("$12,345.67" in t) and ("$6,945" in t) and ("Treatment cost" in t),t[:240])
    t=run_ui(pg,mk(),dict(ST,inc="over90"))["text"]
    ok("over 90k: not eligible caption, full cost",("Not eligible" in t) and ("$100.00" in t),t[:200])
    # 9. invalid fee data must never produce a number
    bad_vals=[("missing fee","__DEL__"),("null",None),("string","88"),("NaN",float("nan")),("negative",-5),("Infinity",float("inf"))]
    for field in ("acdqFee2026","cdcpGridFee2026"):
        for label,v in bad_vals:
            procs=mk({"23311":{field:v}})
            if isinstance(v,float) and not math.isfinite(v):
                js=f"""()=>{{const procs={json.dumps(mk())};
                  const t=procs.find(p=>p.code==='23311');t['{field}']={ 'NaN' if v!=v else 'Infinity'};
                  window.CDCP_PROVINCES={{QC:{{procedures:procs}}}};
                  const el=document.createElement('div');document.body.appendChild(el);
                  const m=window.mountCdcpQuiz(el,'en',{{}});Object.assign(m.state,{{ins:'no',inc:'under70',filed:'yes',appt:'filling'}});
                  return {{c:m.cost(),text:el.innerText}};}}"""
                r=pg.evaluate(js)
            else:
                r=run(pg,procs,{"ins":"no","inc":"under70","filed":"yes","appt":"filling"})
            ok(f"invalid {field}={label} -> flagged, not computed",bool(r["c"] and r["c"].get("bad")),str(r["c"]))
    # 10. rendered text must never contain NaN / undefined / Infinity across the real UI states
    pg.goto(BASE+"/123/");pg.wait_for_timeout(300)
    MOUNT="""(a)=>{const el=document.createElement('div');document.body.appendChild(el);const m=window.mountCdcpQuiz(el,'en',{});m.set(a);const t=el.innerText;el.remove();return t}"""
    for ins in ("yes","no"):
        for inc in ("under70","band70","band80","over90"):
            for fl in ("yes","no"):
                for pk in ("new","recall","emerg","filling","major"):
                    t=pg.evaluate(MOUNT,{"ins":ins,"inc":inc,"filed":fl,"appt":pk})
                    ok(f"no NaN text {ins}/{inc}/{fl}/{pk}",not any(w in t for w in("NaN","undefined","Infinity","null")),t[:120])
    # 10b. the stage: one question at a time, answers survive every route, reset is explicit
    pg.goto(BASE+"/123/");pg.wait_for_timeout(300);pg.click("#tryCard");pg.wait_for_timeout(300)
    def ans(k,v):
        if pg.locator(f'#quiz input[name$="{k}"]').count()==0:
            pg.locator(f'#quiz button[data-k="{k}"]').first.click();pg.wait_for_timeout(120)
        pg.locator(f'#quiz input[name$="{k}"][value="{v}"]').click(force=True);pg.wait_for_timeout(300)
    def snap():
        return pg.evaluate("""()=>{const r=document.querySelector('#quiz');
          return {view:r.dataset.view,st:r.dataset.state,fs:r.querySelectorAll('.cq-ctl fieldset').length,sel:r.querySelectorAll('select').length,
            checked:[...r.querySelectorAll('.cq-ctl input:checked')].map(i=>i.value).join(','),
            sum:[...r.querySelectorAll('.cq-sumrow')].map(b=>b.dataset.k+'='+b.querySelector('.cq-sr-a').textContent).join('|'),
            big:(r.querySelector('.cq-big:not(.cq-big-empty)')||{}).textContent||null,clear:!r.querySelector('.cq-clear').hidden,
            pill:(r.querySelector('.cq-pill')||{}).textContent}}""")
    nbs=lambda x:(x or "").replace("\xa0","").replace(" ","")
    s0=snap(); ok("stage: starts on question 1, nothing preselected, one question shown, no dropdown",s0["view"]=="ins" and s0["checked"]=="" and s0["fs"]==1 and s0["sel"]==0 and not s0["clear"],str(s0))
    ans("ins","no");s1=snap(); ok("stage: a click answers and advances",s1["view"]=="inc" and s1["st"]=="pending" and s1["big"] is None,str(s1))
    ans("inc","band70");s2=snap(); ok("stage: income answered -> tax return asked, eligibility still to confirm",s2["view"]=="filed" and s2["st"]=="unconfirmed" and s2["big"] is None,str(s2))
    ans("filed","yes");s3=snap(); ok("stage: tax return answered -> visit asked, still no figure",s3["view"]=="appt" and s3["st"]=="qualified" and s3["big"] is None,str(s3))
    pg.click("#quiz .cq-back");pg.wait_for_timeout(200);s3b=snap(); ok("stage: Back returns to the previous question with its answer",s3b["view"]=="filed" and s3b["checked"]=="yes",str(s3b))
    pg.click("#quiz .cq-next");pg.wait_for_timeout(200);ok("stage: Continue goes to the first unanswered question",snap()["view"]=="appt")
    ans("appt","new");s4=snap(); ok("stage: all answered -> result with figure and editable answers",s4["view"]=="result" and s4["big"] is not None and s4["sum"].count("|")==2 and s4["sum"].startswith("ins=") and s4["checked"]=="new",str(s4))
    fig=s4["big"]
    ans("appt","recall");s5=snap(); ok("result: switching the visit changes the figure and nothing else",s5["view"]=="result" and s5["big"]!=fig and s5["sum"]==s4["sum"],str((s5,fig)))
    ans("appt","new")
    ans("inc","band80");s6=snap(); ok("edit: changing income returns straight to the result, other answers kept",s6["view"]=="result" and s6["big"]!=fig and s6["sum"].split("|")[0::2]==s4["sum"].split("|")[0::2] and s6["checked"]=="new",str(s6))
    ans("inc","band70");ok("edit: restoring the answer restores the figure",snap()["big"]==fig)
    ans("ins","yes");s7=snap(); ok("branch: private insurance ends the calculation, answers kept behind it",s7["st"]=="insurance" and s7["view"]=="result",str(s7))
    ans("ins","no");s8=snap(); ok("branch: undoing it restores the whole result",s8["view"]=="result" and s8["big"]==fig and s8["sum"]==s4["sum"],str(s8))
    ans("inc","over90");s9=snap(); ok("branch: 90k+ is ineligible, tax-return row not applicable, full cost shown",s9["st"]=="income" and "filed" not in s9["sum"] and s9["big"] is not None and "Not eligible" in (s9["pill"] or "") or "Non admissible" in (s9["pill"] or ""),str(s9))
    ans("inc","band70");ok("branch: leaving 90k+ brings the tax-return answer back",snap()["sum"]==s4["sum"] and snap()["big"]==fig)
    # keyboard: arrows choose without jumping ahead; Continue moves on
    pg.click("#quiz .cq-clear");pg.wait_for_timeout(200)
    s10=snap(); ok("reset: explicit, clears every answer, returns to question 1",s10["view"]=="ins" and s10["checked"]=="" and not s10["clear"] and pg.evaluate("document.activeElement.closest('.cq-ctl')!==null"),str(s10))
    pg.focus('#quiz input[name$="ins"][value="yes"]');pg.keyboard.press("ArrowRight");pg.wait_for_timeout(350)
    s11=snap(); ok("keyboard: arrow selects but does not advance",s11["view"]=="ins" and s11["checked"]=="no",str(s11))
    pg.focus("#quiz .cq-next");pg.keyboard.press("Enter");pg.wait_for_timeout(200)
    ok("keyboard: Continue advances and focus stays in the controls",snap()["view"]=="inc" and pg.evaluate("document.activeElement.closest('.cq-ctl')!==null"))

    # 10c. result states mirror the answers: none -> some -> complete, without an unsupported figure
    pg.click("#quiz .cq-clear");pg.wait_for_timeout(200)
    tr=lambda:pg.evaluate("[...document.querySelectorAll('#quiz .cq-tr')].map(x=>x.dataset.k+':'+x.dataset.done).join(',')")
    pill=lambda:pg.evaluate("document.querySelector('#quiz .cq-pill')?.textContent")
    ok("states: no answers -> every row to answer, own label",tr()=="ins:0,inc:0,filed:0,appt:0" and pill() in("Aucune réponse","No answers yet"),tr()+str(pill()))
    ans("ins","no");ok("states: some answers -> row marked, still incomplete",tr().startswith("ins:1,inc:0") and pill() in("Incomplet","Incomplete"),tr()+str(pill()))
    ans("inc","over90");ok("states: 90k+ drops the tax-return row (not applicable), ineligible label",tr()=="ins:1,inc:1,appt:0" and pill() in("Non admissible","Not eligible"),tr()+str(pill()))
    pg.locator("#quiz .cq-tr[data-k=ins]").click();pg.wait_for_timeout(200);ok("states: a result row jumps to its question",snap()["view"]=="ins")

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
