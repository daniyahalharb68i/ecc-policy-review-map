// ===== Official PDF report (A4, Arabic or English) =====
const PDF_LIBS=["https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js","https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"];
const loadScript=src=>new Promise((ok,no)=>{if([...document.scripts].some(s=>s.src===src))return ok();const s=document.createElement("script");s.src=src;s.onload=ok;s.onerror=()=>no(new Error("load"));document.head.appendChild(s)});
const CLS=[["internal","داخلي","Internal"],["confidential","سري","Confidential"],["restricted","مقيّد","Restricted"],["public","عام","Public"]];
const ST_EN={"":"Not assessed",w:"In progress",c:"Compliant",p:"Partially compliant",x:"Non-compliant",na:"Not applicable"};
const AP_EN={m:"Mandatory",r:"Recommended",na:"Not applicable"};
const ET_EN={gov:"Government entity",govco:"Government-affiliated company or entity",cni:"Private-sector entity owning, operating or hosting CNI",other:"Other entity (not in ECC scope)"};
const ML_EN={"التوثيق":"Documentation","التطبيق":"Implementation","الفاعلية":"Effectiveness","":"—"};
const repNo=()=>{const y=new Date().getFullYear();const n=Object.values(S.reports).filter(r=>(r.no||"").includes("-"+y+"-")).length+1;return `ECC-RPT-${y}-${String(n).padStart(3,"0")}`};
function reportPages(lang,no){
  const en=lang==="en",R=(a,b)=>en?b:a,T=o=>en?(o.en||o.ar):o.ar,c=S.cfg,rp=c.rep||{},s=stats(CTLS),ev=evStat(CTLS),gl=gapList();
  const et=c.type?(en?ET_EN[c.type]:ETYPES.find(x=>x[0]===c.type)[1]):R("غير محدد","Not set");
  const cls=CLS.find(x=>x[0]===(rp.cls||"internal"));const clsT=en?cls[2]:cls[1];
  const date=c.date||today(),dir=en?"ltr":"rtl",al=en?"left":"right";
  const css=`font-family:'Inter Tight','IBM Plex Sans Arabic',Tahoma,sans-serif;color:#213C2C;direction:${dir};text-align:${al};letter-spacing:0`;
  const th=`style="background:#F3E8E1;color:#1A382B;font-weight:600;font-size:11px;padding:7px 8px;border-bottom:1px solid #D9DDD2;text-align:${al}"`;
  const td=`style="padding:6px 8px;border-bottom:1px solid #e1e7ef;font-size:11px;vertical-align:top;text-align:${al}"`;
  const tbl=(head,rows)=>`<table style="width:100%;border-collapse:collapse;margin-top:8px"><tr>${head.map(h=>`<th ${th}>${h}</th>`).join("")}</tr>${rows.map(r=>`<tr>${r.map(x=>`<td ${td}>${x}</td>`).join("")}</tr>`).join("")}</table>`;
  const h2=t=>`<h2 style="font-family:'Inter Tight','IBM Plex Sans Arabic',sans-serif;font-size:15px;color:#1A382B;margin:18px 0 6px;font-weight:700">${t}</h2>`;
  const st=k=>en?ST_EN[k]:ST[k][0];
  const pages=[];
  // cover
  pages.push({cover:true,body:`<div style="height:100%;display:flex;flex-direction:column;justify-content:space-between">
    <div><div style="display:flex;align-items:center;gap:12px"><img src="${LOGO_MARK}" alt="" style="width:46px;height:46px;border-radius:10px"><div style="font-size:12px;color:#5b6676;letter-spacing:0">${R("تقرير مراجعة","Review report")} · ${no}</div></div>
      <div style="height:5px;width:96px;border-radius:3px;background:linear-gradient(90deg,#945B46,#B7896F);margin:14px 0 26px"></div>
      <h1 style="font-family:'Inter Tight','IBM Plex Sans Arabic',sans-serif;font-size:31px;line-height:1.3;margin:0 0 10px;font-weight:500;color:#1A382B">${R("تقرير مراجعة الالتزام بالضوابط الأساسية للأمن السيبراني","Essential Cybersecurity Controls Compliance Review Report")}</h1>
      <div style="font-size:15px;color:#3b4757">ECC-2:2024</div>
      <div style="margin-top:40px;font-size:22px;font-weight:600">${esc(c.entity||R("اسم الجهة","Entity name"))}</div></div>
    <div>${tbl([R("البند","Item"),R("القيمة","Value")],[[R("رقم التقرير","Report number"),no],[R("الإصدار","Version"),esc(rp.ver||"1.0")],[R("تاريخ التقييم","Assessment date"),date],[R("تاريخ الإصدار","Issue date"),today()],[R("التصنيف","Classification"),`<b>${clsT}</b>`]])}
      <div style="margin-top:22px">${tbl([R("الدور","Role"),R("الاسم","Name"),R("التوقيع","Signature"),R("التاريخ","Date")],[[R("أعدّه","Prepared by"),esc(rp.prep||c.assessor||""),"",""],[R("راجعه","Reviewed by"),esc(rp.rev||""),"",""],[R("اعتمده","Approved by"),esc(rp.appr||""),"",""]].map(r=>r.map((x,i)=>i===2||i===3?`<div style="height:26px"></div>`:x)))}</div><div style="margin-top:16px;font-size:9.5px;color:#7b8e8a">${R("أُعدّ باستخدام أداة «خارطة مراجعة سياسات ECC» — © 2026 Daniyah Alharbi. جميع الحقوق محفوظة.","Prepared with the ECC Policy Review Map — © 2026 Daniyah Alharbi. All rights reserved.")}</div></div></div>`});
  // summary
  const kp=[[R("نسبة الالتزام","Compliance rate"),(s.comp??"—")+"%"],[R("ملتزم / جزئي / غير ملتزم","Compliant / Partial / Non-compliant"),`${s.c} / ${s.p} / ${s.x}`],[R("لم يُقيَّم","Not assessed"),s.none+s.w],[R("إلزامي / موصى به / لا ينطبق","Mandatory / Recommended / Not applicable"),`${s.m} / ${s.r} / ${s.na}`],[R("التزام ورقي (موثّق دون تطبيق)","Paper compliance (documented, not implemented)"),s.paper],[R("ممارسات مطبّقة غير موثقة","Undocumented practices"),s.undoc],[R("جاهزية الأدلة (الدليل الإرشادي GECC-2:2026)","Evidence readiness (GECC-2:2026 guide)"),`${ev.p}% (${ev.h}/${ev.t})`],[R("فجوات مفتوحة","Open gaps"),gl.length]];
  const exec=en?(c.execEn||""):(c.exec||"");
  pages.push({body:`${h2(R("1. الملخص التنفيذي","1. Executive summary"))}${exec?`<div style="font-size:12px;line-height:1.85;white-space:pre-wrap">${esc(exec)}</div>`:`<div style="font-size:11px;color:#8a94a3">${R("لم يُكتب ملخص تنفيذي.","No executive summary was provided.")}</div>`}
    ${h2(R("2. النطاق","2. Scope"))}<div style="font-size:12px;line-height:1.8">${R("نوع الجهة","Entity type")}: <b>${esc(et)}</b> — ${c.type?(OBLIG.has(c.type)?R("ضمن نطاق عمل الضوابط (ملزمة)","within the ECC scope (mandatory)"):R("خارج نطاق الإلزام بـ ECC (الضوابط موصى بها)","outside the mandatory ECC scope (controls recommended)")):""}<br>${R("المرجع: ECC-2:2024، قسم «نطاق العمل وقابلية التطبيق».","Reference: ECC-2:2024, “Scope of Work and Applicability”.")}</div>
    ${h2(R("3. المؤشرات الرئيسية","3. Key indicators"))}${tbl([R("المؤشر","Indicator"),R("القيمة","Value")],kp)}
    ${h2(R("4. الالتزام حسب المكونات الأساسية","4. Compliance by main domain"))}${tbl([R("المكوّن","Domain"),R("منطبق","Applicable"),R("الالتزام","Compliance"),R("ملتزم","Compliant"),R("جزئي","Partial"),R("غير ملتزم","Non-compliant")],ECC.map(d=>{const t=stats(d.subs.flatMap(x=>x.c));return [`${d.id}. ${esc(T(d))}`,t.app,(t.comp??"—")+"%",t.c,t.p,t.x]}))}`});
  // subdomains
  const subRows=SUBS.map(x=>{const t=stats(x.c),e=evStat(x.c);return [`<b>${x.id}</b> ${esc(T(x))}`,t.app,(t.comp??"—")+(t.comp==null?"":"%"),t.paper||"—",e.t?e.p+"%":"—"]});
  for(let i=0;i<subRows.length;i+=16)pages.push({body:`${h2(i?R("5. الالتزام حسب المكونات الفرعية (تابع)","5. Compliance by subdomain (cont.)"):R("5. الالتزام حسب المكونات الفرعية","5. Compliance by subdomain"))}${tbl([R("المكوّن الفرعي","Subdomain"),R("منطبق","Applicable"),R("الالتزام","Compliance"),R("ورقي","Paper"),R("الأدلة","Evidence")],subRows.slice(i,i+16))}`});
  // roadmap
  const gRows=gl.map(g=>{const o=C(g.c.id);return [`<b style="font-family:'IBM Plex Mono',monospace">${g.c.id}</b> ${esc(short(T(g.c),110))}${isPaper(g.c.id)?` <b style="color:#DC2626">[${R("التزام ورقي","Paper")}]</b>`:""}`,st(dst(g.c.id)),g.ph,en?ML_EN[missingLayer(g.c.id)]:missingLayer(g.c.id),esc(o.own||"—"),esc(o.due||"—"),en?({prog:"In progress",done:"Done"}[o.rs]||"Not started"):rsName(o.rs)]});
  if(!gRows.length)pages.push({body:`${h2(R("6. خارطة المعالجة","6. Remediation roadmap"))}<div style="font-size:12px">${R("لا توجد فجوات مفتوحة.","No open gaps.")}</div>`});
  for(let i=0;i<gRows.length;i+=13)pages.push({body:`${h2(i?R("6. خارطة المعالجة (تابع)","6. Remediation roadmap (cont.)"):R("6. خارطة المعالجة","6. Remediation roadmap"))}${i?"":`<div style="font-size:11px;color:#5b6676">${R("المرحلة 1: 0–30 يومًا، المرحلة 2: 31–60 يومًا، المرحلة 3: 61–90 يومًا. ترتيب الأولوية منهجية داخلية وليس نصًا رسميًا.","Phase 1: 0–30 days, Phase 2: 31–60 days, Phase 3: 61–90 days. Prioritisation is an internal method, not official NCA text.")}</div>`}${tbl([R("الضابط","Control"),R("الحالة","Status"),R("المرحلة","Phase"),R("ينقصه","Missing layer"),R("المسؤول","Owner"),R("الاستحقاق","Due"),R("المعالجة","Remediation")],gRows.slice(i,i+13))}`});
  // documents + statement
  const D=Object.values(S.docs);
  pages.push({body:`${h2(R("7. سجل الوثائق","7. Document register"))}${D.length?tbl([R("الوثيقة","Document"),R("الإصدار","Version"),R("الاعتماد","Approved"),R("المراجعة القادمة","Next review")],D.map(d=>[esc(d.name),esc(d.ver||"—"),esc(d.ad||"—"),(docNext(d)||"—")+(docState(d)==="late"?` <b style="color:#DC2626">${R("متأخرة","Overdue")}</b>`:"")])):`<div style="font-size:12px">${R("لا توجد وثائق مسجلة.","No documents registered.")}</div>`}
    ${h2(R("8. المنهجية والمصادر","8. Method and sources"))}<div style="font-size:11.5px;line-height:1.85">${R("قُيّم كل ضابط على ثلاث طبقات: موثّق، ومطبّق، وفعّال. يُعد الضابط ملتزمًا إذا كان موثّقًا ومطبّقًا. نصوص الضوابط من وثيقة ECC-2:2024، والمخرجات المتوقعة من الدليل الإرشادي GECC-2:2026 الصادرين عن الهيئة الوطنية للأمن السيبراني. هذا التقرير تقييم داخلي أعدته الجهة، ولا يحل محل أداة التقييم وقياس الالتزام الرسمية التي تصدرها الهيئة.","Each control was assessed on three layers: documented, implemented and effective. A control is compliant when it is both documented and implemented. Control texts are from ECC-2:2024 and expected deliverables from the GECC-2:2026 implementation guide, both issued by the National Cybersecurity Authority. This report is an internal assessment prepared by the entity and does not replace NCA's official Assessment and Compliance Tool.")}</div>`});
  const N=pages.length;
  return pages.map((p,i)=>`<div class="rp-page" style="width:794px;height:1123px;box-sizing:border-box;padding:46px 54px 40px;background:#fff;position:relative;overflow:hidden;${css}">
    ${p.cover?"":`<div style="display:flex;justify-content:space-between;font-size:10px;color:#5b6676;border-bottom:1px solid #d9dfe8;padding-bottom:8px"><span>${esc(c.entity||"")} · ${R("تقرير مراجعة ECC-2:2024","ECC-2:2024 review report")}</span><span>${no}</span></div>`}
    <div style="${p.cover?"height:1010px":""}">${p.body}</div>
    <div style="position:absolute;bottom:22px;left:54px;right:54px;display:flex;justify-content:space-between;font-size:9.5px;color:#5b6676;border-top:1px solid #d9dfe8;padding-top:7px"><span>${R("التصنيف","Classification")}: <b>${clsT}</b></span><span>${R("صفحة","Page")} ${i+1} ${R("من","of")} ${N}</span><span>${R("صدر","Issued")} ${today()}</span></div></div>`)}
async function makePDF(){const lang=U.repLang||U.lang;const no=repNo();
  U.pdfMsg=lang==="en"?"Preparing…":"جارٍ تجهيز التقرير…";render();
  try{await Promise.all(PDF_LIBS.map(loadScript))}catch(e){U.pdfMsg="";toast("تعذّر تحميل مكتبة PDF. تحقق من الاتصال وأعد المحاولة.");render();return}
  const host=document.createElement("div");host.style.cssText="position:fixed;left:-10000px;top:0;width:794px;z-index:-1";document.body.appendChild(host);
  try{if(document.fonts&&document.fonts.ready)await document.fonts.ready;
    const pages=reportPages(lang,no);const pdf=new window.jspdf.jsPDF(Object.assign({unit:"mm",format:"a4",compress:true},U.pw?{encryption:{userPassword:U.pw,ownerPassword:U.pw+"#"+uid(),userPermissions:["print"]}}:{}));
    for(let i=0;i<pages.length;i++){U.pdfMsg=`${i+1} / ${pages.length}`;const m=$("#pdfmsg");if(m)m.textContent=U.pdfMsg;
      host.innerHTML=plainAr(pages[i]);const cv=await window.html2canvas(host.firstElementChild,{scale:2,backgroundColor:"#ffffff",logging:false,useCORS:true});
      if(i)pdf.addPage();pdf.addImage(cv.toDataURL("image/jpeg",0.92),"JPEG",0,0,210,297)}
    pdf.setProperties({title:`${no} ECC-2:2024`,subject:"ECC-2:2024 review report",creator:"ECC Policy Review Map — © 2026 Daniyah Alharbi",author:"ECC Policy Review Map (Daniyah Alharbi)"});
    const blob=pdf.output("blob"),name=`${no}-${lang}.pdf`;
    // archive in the database (editors only: assets need the admin level)
    let archived=false;if(!U.demo&&U.db&&U.assets&&canCol("reports")){try{const a=await U.assets.upload(blob);const s=stats(CTLS);putDoc("reports",no+"-"+lang,{no,lang,at:Date.now(),by:U.me||"",aid:a.id,url:a.url,comp:s.comp,gaps:gapList().length,cls:(S.cfg.rep||{}).cls||"internal",locked:!!U.pw,ver:(S.cfg.rep||{}).ver||"1.0"});logEv("report",no,{v:lang});archived=true}catch(e){toast("صدر التقرير، لكن تعذّر حفظه في الأرشيف.")}}
    U.pdfMsg="";render();
    if(U.dl){try{await U.dl.save({filename:name,data:blob});toast(archived?"صدر التقرير وحُفظ في الأرشيف":"صدر التقرير")}catch(e){if(!(e&&e.code==="cancelled"))toast(archived?"حُفظ التقرير في الأرشيف، ويمكنك فتحه من هناك":"تعذّر تنزيل الملف")}}
    else if(!window.claude){dlFile(name,blob);toast("صدر التقرير")}
    else toast(archived?"حُفظ التقرير في الأرشيف. افتحه من قائمة التقارير الصادرة.":"لا يتيح هذا العرض تنزيل الملفات. افتح الأداة داخل Claude.")}
  catch(e){U.pdfMsg="";toast("تعذّر إنشاء ملف PDF.");render()}
  finally{host.remove()}}
