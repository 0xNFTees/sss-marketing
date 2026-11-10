#!/usr/bin/env python3
"""CDCP calculator (V2 web component) — site integration suite.

Covers the four pages that embed <cdcp-calculator> (/, /123, /rcsd, /cdcp),
plus the embed system pages (frame.html resize engine, demo.html, kit.html).

Run a local server from the repo root first:
  python3 -m http.server 8123
"""
from playwright.sync_api import sync_playwright

BASE = "http://localhost:8123"
PASS = 0
FAIL = []

def ok(name, cond, detail=""):
    global PASS
    if cond: PASS += 1
    else: FAIL.append(name + (" — " + str(detail)[:220] if detail else ""))

TIER = {"under70": 1.0, "band70": 0.6, "band80": 0.4}
BUNDLES = {
 "QC": {"new": (344,268), "recall": (218,178), "emerg": (136,91)},
 "ON": {"new": (423,342), "recall": (240,190), "emerg": (148,102)},
 "BC": {"new": (418,326.1), "recall": (187.9,182.54), "emerg": (137,80.43)},
 "AB": {"new": (466.1,421.52), "recall": (255.55,244.56), "emerg": (191.15,162.2)},
 "NS": {"new": (296,278), "recall": (155,173), "emerg": (148,100)},
 "NB": {"new": (348,296), "recall": (171,157.5), "emerg": (140,94)},
 "PE": {"new": (334,288), "recall": (161,154), "emerg": (142,96)},
 "MB": {"new": (346.91,295.09), "recall": (188.17,165.14), "emerg": (130,92)},
 "SK": {"new": (321,278), "recall": (151.8,142), "emerg": (113,90)},
 "NL": {"new": (383.92,314), "recall": (214.21,188), "emerg": (145,100)},
 "YT": {"new": (462,382), "recall": (226,202), "emerg": (162,124)},
 "NT": {"new": (509,422), "recall": (252,220), "emerg": (176,134)},
 "NU": {"new": (544,454), "recall": (270,234), "emerg": (190,146)},
}

def num(s):
    import re
    return float(re.sub(r"[^\d.,]", "", s).replace(" ", "").replace(",", "." if "," in s and "$" in s and s.index("$") > 0 else ""))

def money(s):
    import re
    t = re.sub(r"[^\d.,]", "", s.replace(" ", "").replace(" ", ""))
    if t.count(",") == 1 and t.count(".") == 0: t = t.replace(",", ".")
    else: t = t.replace(",", "")
    return float(t)

def widget(pg, sel="cdcp-calculator"):
    return pg.locator(sel).first

def sh_click_opt(pg, i, sel="cdcp-calculator"):
    widget(pg, sel).evaluate("(el,i)=>el.shadowRoot.querySelectorAll('.opt')[i].click()", i)
    pg.wait_for_timeout(260)

def sh_text(pg, sel="cdcp-calculator"):
    return widget(pg, sel).evaluate("el=>el.shadowRoot.textContent")

def run_flow(pg, answers, sel="cdcp-calculator"):
    for i in answers: sh_click_opt(pg, i, sel)
    pg.wait_for_timeout(250)

def ledger(pg, sel="cdcp-calculator"):
    return widget(pg, sel).evaluate("el=>[...el.shadowRoot.querySelectorAll('table td:last-child')].map(td=>td.textContent)")

def page_errors(pg, store):
    pg.on("pageerror", lambda e: store.append(str(e)))

with sync_playwright() as p:
    b = p.chromium.launch()

    # ---- /rcsd (fr) and /cdcp (en): component present, full math grid on /cdcp ----
    for path, lang in [("/rcsd/index.html", "fr"), ("/cdcp/index.html", "en")]:
        errs = []
        pg = b.new_page(viewport={"width": 1280, "height": 950}); page_errors(pg, errs)
        pg.goto(BASE + path); pg.wait_for_timeout(900)
        ok(path + ": <cdcp-calculator> mounted with shadow root",
           pg.evaluate("()=>!!document.querySelector('cdcp-calculator') && !!document.querySelector('cdcp-calculator').shadowRoot"))
        t = sh_text(pg)
        ok(path + ": language is " + lang, ("Régime canadien" in t) if lang == "fr" else ("Canadian Dental Care Plan" in t), t[:120])
        run_flow(pg, [1, 0, 0, 0])
        t = sh_text(pg)
        ok(path + ": qualified result reached (100%)", ("100" in t) and ("canada.ca" in widget(pg).evaluate("el=>el.shadowRoot.innerHTML")))
        ok(path + ": booking CTA points at /#contact",
           widget(pg).evaluate("el=>[...el.shadowRoot.querySelectorAll('a')].some(a=>a.getAttribute('href')&&a.getAttribute('href').indexOf('/#contact')===0)"))
        ok(path + ": QC pre-selected", widget(pg).evaluate("el=>el.shadowRoot.querySelector('#cdcp-prov').value") == "QC")
        ok(path + ": powered-by badge links to sss.marketing with utm",
           widget(pg).evaluate("el=>{const a=el.shadowRoot.querySelector('.sss');return a&&a.href.includes('sss.marketing')&&a.href.includes('utm_source=cdcp_widget')}"))
        ok(path + ": no page errors", not errs, errs)
        if lang == "en":
            # full province × visit × tier math grid through the UI (39 cells at tier 100 + spot tiers)
            bad = 0
            for prov in BUNDLES:
                widget(pg).evaluate("(el,v)=>{const s=el.shadowRoot.querySelector('#cdcp-prov');s.value=v;s.dispatchEvent(new Event('change'))}", prov)
                for visit in ["new", "recall", "emerg"]:
                    widget(pg).evaluate("(el,v)=>{const s=el.shadowRoot.querySelector('#cdcp-visit');s.value=v;s.dispatchEvent(new Event('change'))}", visit)
                    rows = ledger(pg)
                    f, g = BUNDLES[prov][visit]
                    covered = round(min(g * 1.0, f) * 100) / 100
                    patient = round((f - covered) * 100) / 100
                    if abs(money(rows[0]) - f) > 0.011 or abs(money(rows[1]) - covered) > 0.011 or abs(money(rows[-1]) - patient) > 0.011:
                        bad += 1
            ok("/cdcp: 39/39 estimates match the engine at tier 100", bad == 0, "bad=" + str(bad))
        pg.close()

    # tier 60 and 40 spot checks (ON new) + ineligible branches, on /cdcp
    for tier_idx, tier_id in [(1, "band70"), (2, "band80")]:
        errs = []
        pg = b.new_page(viewport={"width": 1280, "height": 950}); page_errors(pg, errs)
        pg.goto(BASE + "/cdcp/index.html"); pg.wait_for_timeout(800)
        run_flow(pg, [1, 0, tier_idx, 0])
        widget(pg).evaluate("(el)=>{const s=el.shadowRoot.querySelector('#cdcp-prov');s.value='ON';s.dispatchEvent(new Event('change'))}")
        pg.wait_for_timeout(150)
        rows = ledger(pg)
        f, g = BUNDLES["ON"]["new"]; tpc = TIER[tier_id]
        covered = round(min(g * tpc, f) * 100) / 100
        ok("/cdcp ON new %s: covered %.2f, patient %.2f" % (tier_id, covered, f - covered),
           abs(money(rows[1]) - covered) <= 0.011 and abs(money(rows[-1]) - round((f - covered) * 100) / 100) <= 0.011, rows)
        ok("/cdcp %s: co-pay row shown" % tier_id, len(rows) == 5, rows)
        pg.close()

    pg = b.new_page(viewport={"width": 1280, "height": 950})
    pg.goto(BASE + "/cdcp/index.html"); pg.wait_for_timeout(800)
    sh_click_opt(pg, 0)  # insurance yes
    ok("/cdcp: insurance branch is ineligible-with-booking", "Private insurance" in sh_text(pg))
    widget(pg).evaluate("el=>{const g=[...el.shadowRoot.querySelectorAll('.ghost')];g[g.length-1].click()}"); pg.wait_for_timeout(250)
    run_flow(pg, [1, 1])
    ok("/cdcp: non-resident branch blocks", "residency" in sh_text(pg))
    widget(pg).evaluate("el=>{const g=[...el.shadowRoot.querySelectorAll('.ghost')];g[g.length-1].click()}"); pg.wait_for_timeout(250)
    run_flow(pg, [1, 0, 3])
    ok("/cdcp: $90k+ branch blocks", "0%" in sh_text(pg))
    widget(pg).evaluate("el=>{const g=[...el.shadowRoot.querySelectorAll('.ghost')];g[g.length-1].click()}"); pg.wait_for_timeout(250)
    run_flow(pg, [1, 0, 0, 1])
    ok("/cdcp: unfiled-taxes branch asks to file", "file your tax return" in sh_text(pg).lower())
    pg.close()

    # ---- homepage: service card s5 opens the calculator ----
    errs = []
    pg = b.new_page(viewport={"width": 1280, "height": 950}); page_errors(pg, errs)
    pg.goto(BASE + "/index.html"); pg.wait_for_timeout(1400)
    pg.locator("[data-svc=s5]").click(force=True); pg.wait_for_timeout(1200)
    ok("/: service card mounts the component",
       pg.evaluate("()=>{const el=document.querySelector('#cdcpQuizHome cdcp-calculator');return !!el&&!!el.shadowRoot&&el.shadowRoot.textContent.length>50}"))
    run_flow(pg, [1, 0, 0, 0], "#cdcpQuizHome cdcp-calculator")
    ok("/: flow reaches the result", "100" in sh_text(pg, "#cdcpQuizHome cdcp-calculator"))
    ok("/: no page errors", not errs, errs)
    pg.close()

    # ---- /123: quiz pane mounts in fr, lang toggle remounts in en ----
    errs = []
    pg = b.new_page(viewport={"width": 1280, "height": 950}); page_errors(pg, errs)
    pg.goto(BASE + "/123/index.html"); pg.wait_for_timeout(1200)
    opened = pg.evaluate("()=>{const q=document.getElementById('quiz');return q?q.closest('.pane,[hidden]')!==null||true:false}")
    # open the drawer/pane if a trigger exists
    pg.evaluate("""()=>{const q=document.getElementById('quiz');
      if(q&&!q.querySelector('cdcp-calculator')){const btns=[...document.querySelectorAll('button,a')];
        const t=btns.find(b=>/calculatrice|calculator|d[ée]mo/i.test(b.textContent));if(t)t.click();}}""")
    pg.wait_for_timeout(1200)
    has = pg.evaluate("()=>!!document.querySelector('#quiz cdcp-calculator')")
    ok("/123: component mounts (after opening the demo pane)", has)
    if has:
        ok("/123: mounts in French", "Régime canadien" in sh_text(pg, "#quiz cdcp-calculator"))
    ok("/123: no page errors", not errs, errs)
    pg.close()

    # ---- mobile: no horizontal overflow with the component open ----
    for path in ["/rcsd/index.html", "/cdcp/index.html"]:
        pg = b.new_page(viewport={"width": 360, "height": 800})
        pg.goto(BASE + path); pg.wait_for_timeout(900)
        run_flow(pg, [1, 0, 0, 0])
        ok(path + " @360: no horizontal overflow on result",
           pg.evaluate("()=>document.documentElement.scrollWidth<=361"))
        hts = widget(pg).evaluate("el=>[...el.shadowRoot.querySelectorAll('.opt,.cta,.ghost,select')].map(n=>n.getBoundingClientRect().height)")
        ok(path + " @360: all tap targets ≥ 42px", all(h >= 42 for h in hts if h > 0), hts)
        pg.close()

    # ---- embed system: frame.html resize engine ----
    pg = b.new_page(viewport={"width": 900, "height": 1000})
    pg.goto(BASE + "/embed/frame.html?clinic=Test%20Clinic&color=%232563EB&lang=en&province=BC&booking=https%3A%2F%2Fexample.com")
    pg.wait_for_timeout(900)
    got = pg.evaluate("""()=>new Promise(res=>{let h=null;
      addEventListener('message',e=>{if(e.data&&e.data.type==='cdcp-resize')h=e.data.height});
      const el=document.querySelector('cdcp-calculator');
      el.shadowRoot.querySelectorAll('.opt')[1].click();
      setTimeout(()=>res(h),800);})""")
    ok("/embed/frame.html: emits cdcp-resize postMessage on interaction", bool(got) and got > 300, got)
    ok("/embed/frame.html: query params applied",
       pg.evaluate("()=>{const el=document.querySelector('cdcp-calculator');return el.getAttribute('data-clinic-name')==='Test Clinic'&&el.getAttribute('data-province')==='BC'}"))
    pg.close()

    # ---- demo + kit smoke ----
    for path, needle in [("/embed/demo.html", "cdcp-calculator"), ("/embed/kit.html", "#out-wc")]:
        errs = []
        pg = b.new_page(viewport={"width": 1280, "height": 950}); page_errors(pg, errs)
        pg.goto(BASE + path); pg.wait_for_timeout(900)
        ok(path + ": renders", pg.locator(needle).count() > 0)
        ok(path + ": no page errors", not errs, errs)
        pg.close()

    b.close()

print("PASS", PASS, "FAIL", len(FAIL))
for f in FAIL: print("  ✗", f)
exit(1 if FAIL else 0)
