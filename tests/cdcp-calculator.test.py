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
    pg.goto(BASE+"/123/");pg.wait_for_timeout(300);pg.click("#tryCard");pg.wait_for_timeout(200)
    for ins in ("yes","no"):
        for inc in ("under70","band70","band80","over90"):
            for fl in ("yes","no"):
                for pk in range(1,6):
                    pg.dispatch_event('#quiz input[name$="ins"][value="no"]',"click")
                    pg.select_option("#quiz select",index=pk)
                    for k,v in (("ins",ins),("inc",inc),("filed",fl)):
                        pg.dispatch_event(f'#quiz input[name$="{k}"][value="{v}"]',"click")
                    t=pg.inner_text(".cq")
                    ok(f"no NaN text {ins}/{inc}/{fl}/{pk}",not any(w in t for w in("NaN","undefined","Infinity","null")),t[:120])
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
