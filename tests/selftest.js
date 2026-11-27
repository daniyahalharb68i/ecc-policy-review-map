// ===== Automated tests for the ECC Policy Review Map =====
// Runs inside a test build of the app (tests/out/app-tests.html), so it exercises the real code, not copies of it.
// Run all: `node tests/run-tests.js` (builds the page, runs it in headless Edge/Chrome, prints results, exit code 1 on failure).
(async function(){
const R=[];let cur="";
const test=async(name,fn)=>{try{await fn();R.push([cur,name,true,""])}catch(e){R.push([cur,name,false,String(e&&e.message||e)])}};
const ok=(c,m)=>{if(!c)throw new Error(m||"assertion failed")};
const eq=(a,b,m)=>{if(JSON.stringify(a)!==JSON.stringify(b))throw new Error((m||"not equal")+": got "+JSON.stringify(a)+" expected "+JSON.stringify(b))};
const fresh=(cfg)=>{S=blank();Object.assign(S.cfg,cfg||{});U.rd.terms=[];U.rd.ents={};U.demo=false};
const fullScope={type:"gov",cond:Object.fromEntries(COND.map(q=>[q.k,(q.o[0]||["yes"])[0]]))};
const quiet=fn=>{const t=toast;toast=()=>{};try{return fn()}finally{toast=t}};
window.goatcounter={count:()=>{}};

// ---------- 1) control status and percentages ----------
cur="1. حالات الضوابط والنسب";
await test("موثّق+مطبّق = ملتزم، لا+لا = غير ملتزم، مختلط = جزئي، طبقة واحدة = قيد التقييم",()=>{fresh(fullScope);
  S.ctl["1-1-1"]={d:"y",i:"y"};S.ctl["1-1-2"]={d:"n",i:"n"};S.ctl["1-1-3"]={d:"y",i:"n"};S.ctl["1-2-1"]={d:"y"};
  eq([dst("1-1-1"),dst("1-1-2"),dst("1-1-3"),dst("1-2-1"),dst("1-2-2")],["c","x","p","w",""])});
await test("نسبة الالتزام = ملتزم ÷ المُقيَّم (جزئي + غير ملتزم + ملتزم)",()=>{fresh(fullScope);
  S.ctl["1-1-1"]={d:"y",i:"y"};S.ctl["1-1-2"]={d:"y",i:"y"};S.ctl["1-1-3"]={d:"n",i:"n"};S.ctl["1-2-1"]={d:"y",i:"p"};
  const s=stats(CTLS);eq([s.c,s.x,s.p,s.done],[2,1,1,4]);eq(s.comp,50)});
await test("التزام ورقي وممارسة غير موثقة",()=>{fresh(fullScope);S.ctl["1-1-1"]={d:"y",i:"n"};S.ctl["1-1-2"]={d:"n",i:"y"};
  ok(isPaper("1-1-1"),"paper");ok(isUndoc("1-1-2"),"undoc");const s=stats(CTLS);eq([s.paper,s.undoc],[1,1])});
await test("الفاعلية منفصلة عن الالتزام: ملتزم دون فاعلية لا يُحسب «فعّالًا»",()=>{fresh(fullScope);
  S.ctl["1-1-1"]={d:"y",i:"y",e:"y"};S.ctl["1-1-2"]={d:"y",i:"y",e:"n"};S.ctl["1-1-3"]={d:"y",i:"y"};
  const s=stats(CTLS);eq([s.c,s.eff],[3,1]);eq([effState("1-1-1"),effState("1-1-2"),effState("1-1-3")],["y","n","u"])});
await test("ضابط ملتزم بلا أي دليل يُرصد",()=>{fresh(fullScope);S.ctl["1-1-1"]={d:"y",i:"y"};S.ctl["1-1-2"]={d:"y",i:"y",ev_d:"سياسة"};
  ok(noEvidence("1-1-1")&&!noEvidence("1-1-2"))});
await test("الفجوات = جزئي + غير ملتزم، وغير المُقيَّم لا يدخلها",()=>{fresh(fullScope);S.ctl["1-1-1"]={d:"y",i:"n"};S.ctl["1-1-2"]={d:"n",i:"n"};S.ctl["1-1-3"]={d:"y",i:"y"};
  eq(gapList().map(g=>g.c.id).sort(),["1-1-1","1-1-2"])});

// ---------- 2) applicability rules for every entity type ----------
cur="2. قواعد الانطباق";
await test("بلا نوع جهة: «لم يُحدد بعد»، والنتائج أولية",()=>{fresh({});eq(appOf("1-1-1").v,"u");ok(stats(CTLS).prelim,"prelim")});
for(const [t] of ETYPES)await test(`نوع الجهة ${t}: ${OBLIG.has(t)?"إلزامي":"موصى به"}`,()=>{fresh({type:t});eq(appOf("2-2-1").v,OBLIG.has(t)?"m":"r")});
await test("أسئلة الانطباق غير المكتملة تُبقي النتائج أولية",()=>{fresh({type:"gov",cond:{}});ok(!scopeReady());fresh(fullScope);ok(scopeReady())});
for(const q of COND.filter(q=>q.na))await test(`سؤال «${q.k}» بإجابة «لا» يجعل ضوابطه لا تنطبق`,()=>{fresh({type:"gov",cond:{[q.k]:"no"}});
  const ids=CTLS.filter(c=>(q.subs||[]).includes(c.sub)||(q.ctls||[]).includes(c.id)).map(c=>c.id);ok(ids.length,"has controls");ids.forEach(id=>eq(appOf(id).v,"na",id))});
await test("التعديل اليدوي للانطباق يتقدّم على القواعد",()=>{fresh({type:"other"});S.ctl["1-1-1"]={app:"m"};eq(appOf("1-1-1").v,"m")});

// ---------- 3) JSON import / export ----------
cur="3. استيراد وتصدير JSON";
await test("تصدير ثم استيراد يعيد البيانات نفسها",()=>{fresh(fullScope);S.cfg.entity="جهة";S.ctl["1-1-1"]={d:"y",i:"p",n:"ملاحظة",due:"2026-12-31",gd:[0,2]};S.docs.a1={name:"سياسة",ver:"1.0",ad:"2026-01-01",per:12,subs:["1-1"]};
  const N=secSanitize(JSON.parse(JSON.stringify(S)));eq(N.ctl["1-1-1"],S.ctl["1-1-1"]);eq(N.docs.a1,S.docs.a1);eq(N.cfg.entity,"جهة")});
await test("الاستيراد يرفض القيم الخاطئة: حالات وتواريخ ومعرّفات وروابط",()=>{const N=secSanitize({cfg:{type:"<x>",entity:5},ctl:{"1-1-1":{d:"\" onmouseover=x",due:"tomorrow!!",n:{a:1},att:[{name:"a",url:"javascript:alert(1)"}]},"9-9-9":{d:"y"}},snaps:{"<b>":{at:"x"}}});
  eq(N.cfg.type,"");ok(!("entity" in N.cfg)||N.cfg.entity==="","entity");ok(!N.ctl["1-1-1"].d,"d");ok(!N.ctl["1-1-1"].due,"due");ok(!N.ctl["1-1-1"].n,"n obj");eq(N.ctl["1-1-1"].att,[{name:"a"}]);ok(!N.ctl["9-9-9"]);eq(Object.keys(N.snaps),[])});
await test("الاستيراد لا يلوّث النماذج الأولية (__proto__)",()=>{secSanitize(JSON.parse('{"__proto__":{"polluted":1},"ctl":{"1-1-1":{"__proto__":{"x":1},"d":"y"}}}'));ok(({}).polluted===undefined&&({}).x===undefined)});
await test("الاستيراد يرفض المحتوى الأكبر من 50 ميجابايت",()=>{let msg="";const t=toast;toast=m=>msg=m;try{importJSON("x".repeat(50*1024*1024+1))}finally{toast=t}ok(/50/.test(msg),msg)});
await test("صيغة الأداة السابقة تُحوَّل",()=>{fresh({});U.confirm=null;quiet(()=>importJSON(JSON.stringify({ctl:{"1-1-1":{s:"p",e:"دليل"}},cfg:{entity:"قديم"}})));ok(U.confirm,"confirm");U.confirm.fn();U.confirm=null;eq([S.ctl["1-1-1"].d,S.ctl["1-1-1"].i,S.cfg.entity],["y","p","قديم"])});

// ---------- 4) team merge ----------
cur="4. الدمج في مساحة الفريق";
await test("الحقل نفسه: التعديل الأحدث يغلب",()=>{const a={n:"قديم",_f:{n:100}},b={n:"أحدث",_f:{n:200}};eq(tsMergeItem(a,b).v.n,"أحدث");eq(tsMergeItem(b,a).v.n,"أحدث")});
await test("العضو نفسه يعدّل الحقل نفسه مرتين: آخر قيمة فقط",()=>{const v1={n:"أولى",_f:{n:100}},v2={n:"ثانية",_f:{n:150}};eq(tsMergeItem(v1,v2).v.n,"ثانية")});
await test("حقول مختلفة: كلاهما محفوظ",()=>{const m=tsMergeItem({d:"y",_f:{d:100}},{i:"p",_f:{i:120}}).v;eq([m.d,m.i],["y","p"])});
await test("مسح حقل لاحقًا ينتقل ولا يعود",()=>{const m=tsMergeItem({n:"x",_f:{n:100}},{_f:{n:200}}).v;ok(!("n" in m))});
await test("المرفقات من الطرفين تُجمع",()=>{const m=tsMergeItem({att:[{lid:"a",name:"a"}]},{att:[{lid:"b",name:"b"}]}).v;eq(m.att.map(x=>x.lid).sort(),["a","b"])});
await test("التعارض يُكتشف عندما يغيّر الطرفان الحقل نفسه منذ آخر مزامنة",()=>{const base={ctl:{"1-1-1":{n:"أصل"}}},mine={ctl:{"1-1-1":{n:"قيمتي"}}},theirs={ctl:{"1-1-1":{n:"قيمتهم"}}};
  const c=tsConflicts(base,mine,theirs);eq(c.length,1);eq([c[0].mine,c[0].theirs],["قيمتي","قيمتهم"])});
await test("لا تعارض إذا غيّر طرف واحد فقط",()=>{eq(tsConflicts({ctl:{"1-1-1":{n:"أصل"}}},{ctl:{"1-1-1":{n:"أصل"}}},{ctl:{"1-1-1":{n:"جديد"}}}).length,0)});
await test("المزامنة المتزامنة: لا يضيع تعديل أي عضو (محاكاة كتابة متداخلة)",async()=>{
  let disk=null,mod=0;const H={kind:"file",name:"t.ecc",getFile:async()=>{const f=new File(disk?[disk]:[],"t.ecc");Object.defineProperty(f,"lastModified",{value:mod});return f},createWritable:async()=>({write:async b=>{disk=b;mod++},close:async()=>{}})};
  fresh(fullScope);S.ctl["1-1-1"]={n:"سارة",_f:{n:1}};U.ts=Object.assign(U.ts,{h:H,pw:"Test-pass-1",busy:false,base:null,conflicts:[],wid:"A"});await tsSync(true);
  // teammate writes between our read and our write: simulate by changing the file right after our first read
  const other=JSON.parse(JSON.stringify(S));other.ctl["1-2-1"]={d:"y",_f:{d:5}};
  const realGet=H.getFile;let n=0;H.getFile=async()=>{n++;if(n===2){const sv=S;S=other;disk=await tsEncrypt(await tsPack({rev:9,wid:"B",at:Date.now(),lease:0}),"Test-pass-1");mod+=10;S=sv}return realGet()};
  S.ctl["1-1-2"]={d:"n",_f:{d:6}};U.ts.busy=false;await tsSync(true);H.getFile=realGet;
  const p=await tsUnpack(await tsDecrypt(await (await H.getFile()).arrayBuffer(),"Test-pass-1"));
  ok(p.st.ctl["1-2-1"]&&p.st.ctl["1-2-1"].d==="y","teammate edit kept");ok(p.st.ctl["1-1-2"]&&p.st.ctl["1-1-2"].d==="n","my edit kept");U.ts.h=null});

// ---------- 5) hiding sensitive information ----------
cur="5. إخفاء المعلومات الحساسة";
const secretTxt="للتواصل ahmed.salem@rta.gov.sa جوال 0551234567 والهوية 1012345678 والآيبان SA4420000001234567891234 والخادم 10.20.30.40 و\\\\fs01\\finance والموظف EMP-10234 والمهندس خالد بن سعد العتيبي";
await test("كل الأنماط تُكتشف وتُخفى",()=>{fresh({entity:""});const c=rdClean(secretTxt);
  ["ahmed.salem","0551234567","1012345678","SA4420000001234567891234","10.20.30.40","fs01","EMP-10234","خالد بن سعد"].forEach(x=>ok(!c.includes(x),"leaked: "+x))});
await test("اسم الجهة وكلمات المستخدم تُخفى بالاسم الذي اختاره",()=>{fresh({entity:"هيئة النقل"});U.rd.terms=[{val:"نواة",label:"النظام المالي"}];
  const c=rdClean("نظام نواة في هيئة النقل");ok(c.includes("[النظام المالي]")&&c.includes("[الجهة]")&&!c.includes("نواة"),c)});
await test("الذاكرة المؤقتة: تغيير معلومة في منتصف النص بالطول نفسه لا يُفلت",()=>{fresh({entity:""});
  const pad="أ".repeat(300),t1=pad+" ahmed@aaaa.gov.sa "+pad,t2=pad+" sarah@bbbb.gov.sa "+pad;eq(t1.length,t2.length);
  ok(!rdClean(t1).includes("ahmed@"));const c2=rdClean(t2);ok(!c2.includes("sarah@"),"second secret leaked: "+c2.slice(295,330))});
await test("PDF عربي: «لإ» المقلوبة في النص المستخرج وأشكال الهمزة لا تُفلت اسم الجهة",()=>{fresh({entity:"هيئة النقل الإقليمية"});
  ["يجب على هيئة النقل اإلقليمية تطبيق","هيئه النقل الاقليمية"].forEach(t=>ok(!/النقل/.test(rdClean(t)),"leaked: "+t))});
await test("إرجاع الأسماء الحقيقية في النتائج",()=>{fresh({entity:"هيئة النقل"});const c=rdClean("هيئة النقل ahmed@x.gov.sa");const r=rdRestore({q:c});eq(r.q,"هيئة النقل ahmed@x.gov.sa")});
await test("الطلب المُعدّ للذكاء الاصطناعي لا يحتوي الأسرار",async()=>{fresh({entity:"هيئة النقل"});U.rd.on=true;const p=aiExternal("t:1","سياسة هيئة النقل "+secretTxt);
  await new Promise(r=>setTimeout(r,30));const req=aiX.req;aiX.close(null);await p;["ahmed.salem","0551234567","هيئة النقل"].forEach(x=>ok(!req.includes(x),"in AI request: "+x))});

// ---------- 6) reports in Arabic and English ----------
cur="6. التقارير بالعربية والإنجليزية";
const sample=()=>{fresh(fullScope);S.cfg.entity="جهة";S.ctl["1-1-1"]={d:"y",i:"n",own:"إدارة"};S.ctl["1-1-2"]={d:"y",i:"y",e:"y"}};
await test("التقرير العربي: الأقسام الأساسية موجودة",()=>{sample();const h=reportPages("ar","T").join("");["الملخص التنفيذي","المؤشرات الرئيسية","خارطة المعالجة","المنهجية والمصادر","ملتزم وفاعليته مثبتة"].forEach(t=>ok(h.includes(t),t))});
await test("التقرير الإنجليزي: العناوين إنجليزية ولا تبقى عناوين عربية",()=>{sample();const h=reportPages("en","T").join("");["Executive summary","Key indicators","Remediation roadmap","Method and sources"].forEach(t=>ok(h.includes(t),t));
  ["الملخص التنفيذي","المؤشرات الرئيسية","خارطة المعالجة"].forEach(t=>ok(!h.includes(t),"Arabic heading in EN: "+t))});
await test("التقرير التنفيذي: أعلى المخاطر والقرارات",()=>{sample();const a=reportPages("ar","T","exec").join(""),e=reportPages("en","T","exec").join("");ok(a.includes("أعلى المخاطر")&&a.includes("قرارات مطلوبة"));ok(e.includes("Top risks")&&e.includes("Decisions needed"))});
await test("ملفات Word وExcel سليمة البنية بالعربية والإنجليزية",async()=>{for(const rtl of [true,false]){const d=await buildDocx([{h1:"عنوان"},{p:"نص <و> & \"اقتباس\""},{table:[["أ","ب"],["1","2"]]}],{rtl});
    const x=await buildXlsx([{name:"ورقة",rows:[["أ","ب"],["=SUM(1)",2]],rtl}]);for(const b of [d,x]){const z=await JSZip.loadAsync(b);for(const f of Object.keys(z.files).filter(f=>f.endsWith(".xml"))){const t=await z.file(f).async("string");ok(!new DOMParser().parseFromString(t,"application/xml").getElementsByTagName("parsererror").length,f)}}}});

// ---------- 7) security ----------
cur="7. الأمان";
await test("التحقق من الملفات: الأنواع والمحتوى والحجم",async()=>{const F=(n,b)=>new File([b],n);const pdf=new Uint8Array([0x25,0x50,0x44,0x46,0x2D]);
  eq((await secCheck(F("a.exe",new Uint8Array([77,90])),"analyzer")).ok,false);eq((await secCheck(F("a.svg","<svg/>"),"evidence")).ok,false);
  eq((await secCheck(F("a.pdf","MZ"),"analyzer")).ok,false);eq((await secCheck(F("a.pdf",pdf),"analyzer")).ok,true);
  const big=new Uint8Array(26*1024*1024);big.set(pdf);eq((await secCheck(F("b.pdf",big),"analyzer")).ok,false)});
await test("CSV: الخلايا التي تبدأ بـ = + - @ تُحيَّد",async()=>{fresh(fullScope);S.ctl["1-1-1"]={d:"n",i:"n",own:"=HYPERLINK(\"x\")",rem:"+cmd",n:"@x"};
  let out="";const sv=save;save=(n,d)=>{out=d};try{csv()}finally{save=sv}ok(out.includes("\"'=HYPERLINK")&&out.includes("\"'+cmd"),out.slice(0,300))});
await test("XSS: اسم جهة يحوي HTML لا يُنفَّذ عند العرض",()=>{fresh(fullScope);window.__x=0;S.cfg.entity='<img src=x onerror="window.__x=1">';U.tab="home";render();ok(!document.querySelector('#view img[src="x"],.ent img[src="x"]'),"img injected")});
await test("التشفير المحلي: لا يبقى نص واضح بعد التفعيل",async()=>{fresh(fullScope);S.cfg.entity="جهة سرية";await quiet(()=>lockEnable("Strong-pass-2026"));await new Promise(r=>setTimeout(r,400));
  ok(!(localStorage.getItem(LK)||"").includes("جهة سرية"));ok(!(localStorage.getItem(LK_ENC)||"").includes("جهة"));await lockDisable()});

await test("كل مكتبة خارجية لها بصمة سلامة (SRI)",()=>{[...PDF_LIBS,PDFJS+"pdf.min.mjs",PDFJS+"pdf.worker.min.mjs",GC_JS,"https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.2/jszip.min.js"].forEach(u=>ok(/^sha384-/.test(SRI[u]||""),"no SRI: "+u))});
await test("PDF ممسوح ضوئيًا (بلا نص) يُرصد ولا يُعامل كنسخة آمنة",async()=>{await loadScript(PDF_LIBS[1]);const d=new window.jspdf.jsPDF();d.setFillColor(40,40,40);d.rect(20,20,120,60,"F");
  const sc=await rdScanned(new File([d.output("blob")],"scan.pdf"));eq(sc,[1])});

// ---------- 8) accessibility ----------
cur="8. إمكانية الوصول";
await test("كل حقل ظاهر له اسم مقروء في كل الصفحات",()=>{toggleDemo();const miss=[];try{for(const t of TABS_OK){U.tab=t;if(t==="review")U.open[SUBS[0].id]=true;render();
  document.querySelectorAll("#view input:not([type=hidden]):not([type=file]),#view select,#view textarea").forEach(i=>{if(i.offsetParent&&!(i.labels&&i.labels.length||i.getAttribute("aria-label")||i.closest("label")))miss.push(t+":"+(i.id||i.type))})}}finally{toggleDemo();render()}
  eq(miss,[])});
await test("لا قفزات في ترتيب العناوين",()=>{toggleDemo();const bad=[];try{for(const t of TABS_OK){U.tab=t;render();let last=1;document.querySelectorAll("#view h1,#view h2,#view h3,#view h4").forEach(h=>{const l=+h.tagName[1];if(l>last+1)bad.push(t+":h"+last+"→h"+l);last=l})}}finally{toggleDemo();render()}eq(bad,[])});
await test("رابط «تخطَّ إلى المحتوى» أول عنصر، ووصف القائمة يعود للعربية",()=>{ok(document.querySelector("body > a.skip, .skip"),"skip");setLang("en");setLang("ar");eq(document.querySelector("#nav").getAttribute("aria-label"),"أقسام الأداة")});

// ---------- report ----------
const pass=R.filter(r=>r[2]).length,fail=R.length-pass;
const out=document.createElement("pre");out.id="test-results";out.dir="rtl";
out.textContent=`النتيجة: ${pass} نجح، ${fail} فشل من ${R.length}\n`+R.map(r=>`${r[2]?"PASS":"FAIL"} | ${r[0]} | ${r[1]}${r[3]?" | "+r[3]:""}`).join("\n");
document.body.innerHTML="";document.body.appendChild(out);document.title=(fail?"FAIL ":"PASS ")+pass+"/"+R.length;window.__TEST_DONE__=true;
try{fetch("/result",{method:"POST",body:out.textContent})}catch(e){}
})().catch(e=>{document.body.innerHTML="<pre id=test-results>CRASH "+String(e&&e.stack||e).replace(/</g,"&lt;")+"</pre>";document.title="FAIL crash";window.__TEST_DONE__=true;try{fetch("/result",{method:"POST",body:"CRASH "+String(e&&e.stack||e)})}catch(x){}});
