import itertools, json
from playwright.sync_api import sync_playwright
procs=json.load(open("src/procs.json"))
vjs=open("/home/claude/sss-marketing/cdcp-embed.js").read()
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(); errs=[]
    pg.on("pageerror",lambda e: errs.append(str(e)[:200]))
    pg.goto("http://127.0.0.1:5199/"); pg.wait_for_timeout(800)
    pg.evaluate("p=>{window.CDCP_PROVINCES={QC:{procedures:p}}}",procs)
    pg.add_script_tag(content=vjs)
    res=pg.evaluate("""()=>{
      const E=window.engine, by=E.indexProcedures(window.CDCP_PROVINCES.QC.procedures);
      const el=document.createElement('div');document.body.appendChild(el);
      const m=window.mountCdcpQuiz(el,'fr',{});
      const bad=[];let n=0;
      const ins=[null,'yes','no'],inc=[null,'under70','band70','band80','over90'],filed=[null,'yes','no'],appt=[null,'new','recall','emerg'];
      for(const i of ins)for(const c of inc)for(const f of filed)for(const a of appt){
        const A={ins:i,inc:c,filed:f,appt:a};m.set(A);n++;
        const v=m.cost(),e=E.estimate({...A},by);
        const vo=m.outcome(),eo=E.outcome({...A});
        const vs=v?(v.bad?'bad':[v.fee,v.cov,v.oop,v.known,v.pre,v.lab,v.excl].join()):'null';
        const es=e?(e.bad?'bad':[e.fee,e.covered,e.patient,e.known,e.preAuth,e.lab,e.excluded].join()):'null';
        if(vs!==es||JSON.stringify(vo)!==JSON.stringify(eo)&&String(vo)!==String(eo))bad.push([A,vs,es,vo,eo]);
      }
      return {n,bad:bad.slice(0,5),nb:bad.length};}""")
    print(json.dumps(res)[:900]); print(errs); b.close()
