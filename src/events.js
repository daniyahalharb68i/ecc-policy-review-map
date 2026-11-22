// ===== AI actions =====
async function aiRem(id){const c=BY[id],o=C(id);const lay=LAYERS.map(L=>`${L[1]}: ${({y:"نعم",p:"جزئي",n:"لا"})[o[L[0]]]||"لم يُقيَّم"}${o["ev_"+L[0]]?` (الدليل: ${o["ev_"+L[0]]})`:""}`).join("\n");
  const r=await aiCall("airem:"+id,`أنت مستشار حوكمة ومخاطر وامتثال متخصص في الضوابط الأساسية للأمن السيبراني ECC-2:2024 الصادرة عن الهيئة الوطنية للأمن السيبراني.
${AI_RULES}${aiLang()}

ملف الجهة:
${profileText()}

الضابط (النص الرسمي):
${ctlText(c)}
${c.pref?"ملاحظة: الجزء التالي من الضابط «يُفضَّل» وليس إلزاميًا: "+c.pref:""}

الوضع الحالي حسب الطبقات الثلاث (موثّق، مطبّق، فعّال):
${lay}
ملاحظات المقيّم: ${o.n||"لا يوجد"}

${guideText(id)}
المخرجات المعلّمة كمتوفرة لدى الجهة: ${(o.gd||[]).map(i=>i+1).join("، ")||"لا شيء"}

المطلوب: اقترح طريقة عملية لإغلاق الفجوة في هذا الضابط تحديدًا، تبدأ بالطبقة الناقصة الأولى. لا تكرر نص الضابط.
- ابنِ الخطوات على إرشادات الدليل الرسمي أعلاه، واجعل "output" لكل خطوة أحد المخرجات المتوقعة غير المتوفرة (اذكر رقمه، مثل: المخرج 2).
- اجعل "evidence" فارغًا، إلا لأدلة إضافية مفيدة غير مذكورة في الدليل.
أعد JSON فقط بهذا الشكل:
{"diagnosis":"جملة أو جملتان تشخّصان الفجوة","quick_wins":["إجراء يمكن إنجازه خلال أسبوعين"],"steps":[{"step":"خطوة محددة","owner":"دور وظيفي","effort":"S أو M أو L","output":"المخرج أو الدليل الناتج"}],"evidence":["دليل يطلبه المدقق عادة لهذا الضابط"],"policy_clause":"نص مقترح لبند سياسة بصيغة إلزامية (يجب…) يغطي المتطلب والضوابط الفرعية","pitfalls":["خطأ شائع يجعل الدليل مرفوضًا"]}`);
  if(r){r.at=today();U.aiOut[id]=r;render()}}
async function aiPlan(){const gl=gapList().slice(0,45);if(!gl.length){toast("لا فجوات لبناء خطة");return}
  const t=gl.map(g=>`[${g.c.id}] مرحلة ${g.ph} · ينقصه ${missingLayer(g.c.id)}${isPaper(g.c.id)?" · التزام ورقي":""}${depOf(g.c.id)?" · يعتمد على "+depOf(g.c.id):""} — ${short(g.c.ar,140)}`).join("\n");
  const r=await aiCall("aiplan:x",`أنت مستشار حوكمة وامتثال تعدّ خطة معالجة فجوات الضوابط الأساسية للأمن السيبراني ECC-2:2024 على ثلاث مراحل (0–30 و31–60 و61–90 يومًا).
${AI_RULES}${aiLang()}

ملف الجهة:
${profileText()}

الفجوات مرتبة حسب مرحلتها المقترحة:
${t}

المطلوب: لكل مرحلة محور واضح وسبب ترتيبها، مع أرقام الضوابط من القائمة أعلاه فقط. ثم القرارات المطلوبة من الإدارة العليا ومخاطر التأجيل.
أعد JSON فقط:
{"overview":"فقرة قصيرة","phases":[{"phase":1,"theme":"عنوان المحور","why":"سبب الترتيب","items":["2-2-1"]}],"decisions":["قرار مطلوب"],"risks":["خطر"]}`);
  if(r){r.at=today();setF("cfg",null,"plan",r);render()}}
async function aiQ(id){const c=BY[id],o=C(id);
  const r=await aiCall("aiq:"+id,`تصرّف كمدقق أمن سيبراني يراجع التزام جهة بالضابط التالي من ECC-2:2024.
${AI_RULES}${aiLang()}

الضابط:
${ctlText(c)}
ما تدّعيه الجهة: موثّق=${o.d||"؟"}، مطبّق=${o.i||"؟"}، فعّال=${o.e||"؟"}
الأدلة التي سجّلتها: ${LAYERS.map(L=>L[1]+": "+(o["ev_"+L[0]]||"لا شيء")).join(" | ")}
${guideText(id)}
المخرجات المعلّمة كمتوفرة: ${(o.gd||[]).map(i=>i+1).join("، ")||"لا شيء"}
اعتمد على المخرجات المتوقعة في الدليل الرسمي عند صياغة العيّنات التي سيطلبها المدقق.

أعد JSON فقط:
{"questions":["سؤال سيطرحه المدقق في المقابلة"],"samples":["عيّنة أو سجل سيطلب الاطلاع عليه"],"red_flags":["ما في الأدلة الحالية سيُضعف موقف الجهة"]}`,{modelTier:"quick"});
  if(r){U.aiOut["q:"+id]=r;const A=S.audit.cur;if(A){A.q=A.q||{};A.q[id]=r;putDoc("audit","cur",A)}render()}}
async function aiExec(lang){lang=lang||"ar";const s=stats(CTLS),gl=gapList();const doms=ECC.map(d=>{const st=stats(d.subs.flatMap(x=>x.c));return `${d.ar}: ${st.comp??"—"}%`}).join("، ");
  const r=await aiCall("aiexec:"+lang,(lang==="en"?"Write the entire output in professional English. ":"")+`اكتب ملخصًا تنفيذيًا للإدارة العليا عن نتيجة مراجعة الالتزام بالضوابط الأساسية للأمن السيبراني ECC-2:2024.
${AI_RULES}${aiLang()}
- لا تتجاوز 220 كلمة. لا عناوين Markdown. ثلاث فقرات: الوضع، أهم المخاطر، القرارات المطلوبة.

البيانات:
${profileText()}
نسبة الالتزام: ${s.comp??"غير محسوبة"}% (ملتزم ${s.c}، جزئي ${s.p}، غير ملتزم ${s.x}، لم يُقيَّم ${s.none+s.w})
التزام ورقي (موثّق بلا تطبيق): ${s.paper}، ممارسات غير موثقة: ${s.undoc}
حسب المكونات: ${doms}
فجوات المرحلة الأولى: ${gl.filter(g=>g.ph===1).slice(0,12).map(g=>g.c.id+" "+short(g.c.ar,70)).join("؛ ")}

أعد JSON فقط: {"summary":"النص"}`);
  if(r&&r.summary){setF("cfg",null,lang==="en"?"execEn":"exec",r.summary);render()}}
async function aiAna(){const ids=[...U.anaSel];const cs=CTLS.filter(c=>U.anaSel.has(c.sub));const txt=(rdOn()?rdClean(U.anaTxt):U.anaTxt).slice(0,90000);const docName=rdOn()?rdClean(U.anaName||""):U.anaName;
  const req=cs.map(c=>{const k=c.kind==="doc"?"(توثيق)":c.kind==="impl"?"(تطبيق)":c.kind==="rev"?"(مراجعة دورية)":"";const gt=guideText(c.id,true);return `[${c.id}] ${k} ${c.ar}`+(c.s?"\n"+c.s.map(z=>`  [${z.id}] ${z.ar}`).join("\n"):"")+(gt?"\n  "+gt.replace(/\n/g,"\n  "):"")}).join("\n");
  const r=await aiCall("anarun:x",`أنت مدقق سياسات أمن سيبراني. قارن نص السياسة أدناه بمتطلبات الضوابط الأساسية للأمن السيبراني ECC-2:2024 المحددة.
${AI_RULES}${aiLang()}
- لكل ضابط في القائمة، ولكل ضابط فرعي إن وُجد، أعطِ حكمًا واحدًا: "covered" (مغطى بوضوح وبصيغة إلزامية) أو "weak" (مذكور بصيغة غير ملزمة أو ناقصة أو عامة جدًا) أو "missing" (غير مذكور).
- عند وجود ضوابط فرعية، احكم على كل ضابط فرعي، ولا تحكم على الضابط الأب.
- "quote" منسوخ حرفيًا من نص السياسة، أقل من 200 حرف، دون أي تعديل. إن لم يوجد فاتركه فارغًا.
- "clause" رقم البند أو عنوانه في السياسة إن وُجد.
- ضوابط (تطبيق) و(مراجعة دورية) لا تُثبتها السياسة وحدها: احكم فقط هل تنص السياسة على الالتزام بها.
- "fix" صياغة مقترحة لبند يعالج النقص، بصيغة إلزامية.

المتطلبات:
${req}

نص السياسة (${docName||"بلا اسم"}):
<<<
${txt}
>>>

أعد JSON فقط:
{"summary":"فقرة قصيرة عن مدى تغطية السياسة","items":[{"id":"2-2-3-1","verdict":"covered","quote":"","clause":"","issue":"","fix":""}],"hygiene":{"approved_by_authority":"yes|no|unclear","communicated":"yes|no|unclear","review_interval":"yes|no|unclear","version_control":"yes|no|unclear","owner_defined":"yes|no|unclear","scope_defined":"yes|no|unclear"},"hygiene_notes":""}`,{modelTier:"complex"});
  if(r&&Array.isArray(r.items)){U.anaRes={name:U.anaName,at:today(),subs:ids,res:rdOn()?rdRestore(r):r,txt:U.anaTxt.slice(0,90000)};render();setTimeout(()=>{const e=document.querySelector(".card.raise");if(e)e.scrollIntoView({behavior:"smooth",block:"start"})},50)}}
async function aiSug(){const r=await aiCall("anasug:x",`أمامك نص سياسة أمن سيبراني، وقائمة بالمكونات الفرعية للضوابط الأساسية ECC-2:2024. حدّد المكونات التي تتناولها هذه السياسة فعلًا.
${SUBS.map(x=>`${x.id}: ${x.ar}`).join("\n")}

النص:
<<<
${(rdOn()?rdClean(U.anaTxt):U.anaTxt).slice(0,30000)}
>>>
أعد JSON فقط: {"subs":["2-2"]}`,{modelTier:"quick"});
  if(r&&Array.isArray(r.subs)){U.anaSel=new Set(r.subs.filter(x=>SUBBY[x]));toast(`اقترح Claude ${U.anaSel.size} مكونًا. راجعها قبل التحليل.`);render()}}
function anaApply(){const a=U.anaRes;if(!a)return;const by={};(a.res.items||[]).forEach(i=>{const p=BY[i.id]?i.id:i.id.split("-").slice(0,3).join("-");if(!BY[p])return;(by[p]=by[p]||[]).push(i)});
  const ids=Object.keys(by);U.confirm={msg:`سيُضبط «موثّق» لـ ${ids.length} ضابطًا من نتيجة التحليل، ويُكتب اسم الوثيقة في دليل التوثيق. القيم الحالية لهذه الطبقة ستُستبدل.`,soft:true,yes:"اعتمد",fn:()=>{
    ids.forEach(id=>{const v=by[id].map(i=>i.verdict);const d=v.every(x=>x==="covered")?"y":v.every(x=>x==="missing")?"n":"p";const cl=[...new Set(by[id].map(i=>i.clause).filter(Boolean))].slice(0,3).join("، ");
      const o=S.ctl[id]=S.ctl[id]||{};o.d=d;o.ev_d=(a.name||"سياسة")+(cl?" — "+cl:"");stampF(o,"d");stampF(o,"ev_d");persist("ctl",id)});logEv("ana","",{v:a.name});toast(`حُدّثت طبقة التوثيق لـ ${ids.length} ضابطًا`)}};render()}

// ===== Other actions =====
function snapNow(label){const s=stats(CTLS),per={};CTLS.forEach(c=>per[c.id]=dst(c.id));const id=uid();putDoc("snaps",id,{at:today(),label:label||"",comp:s.comp,c:s.c,p:s.p,x:s.x,gaps:gapList().length,paper:s.paper,per})}
async function save(filename,data,type){if(!window.claude){dlFile(filename,new Blob([data],{type}));toast("تم التنزيل");return}if(U.dl){try{await U.dl.save({filename,data:new Blob([data],{type})});toast("جاهز للحفظ");return}catch(e){if(e&&e.code==="cancelled")return}}
  U.confirm={msg:"لا يتيح هذا العرض تنزيل الملفات. انسخ المحتوى من المربع أدناه واحفظه يدويًا.",soft:true,yes:"حسنًا",fn:()=>{}};render();const t=document.createElement("textarea");t.value=data;t.style.minHeight="200px";t.style.direction="ltr";$("#view").prepend(t);t.select()}
function csv(){const q=v=>`"${String(v==null?"":v).replace(/"/g,'""')}"`;const rows=[["ECC","المكوّن الفرعي","النص","الانطباق","الحالة","موثّق","مطبّق","فعّال","المرحلة","الأولوية","المسؤول","الاستحقاق","حالة المعالجة","خطة المعالجة","التزام ورقي"]].concat(gapList().map(g=>{const o=C(g.c.id);return [g.c.id,SUBBY[g.c.sub].ar,g.c.ar,AP[appOf(g.c.id).v][0],ST[dst(g.c.id)][0],o.d||"",o.i||"",o.e||"",g.ph,g.sc,o.own||"",o.due||"",rsName(o.rs),o.rem||"",isPaper(g.c.id)?"نعم":""]}));
  save("ECC-roadmap-"+today()+".csv","﻿"+rows.map(r=>r.map(q).join(",")).join("\r\n"),"text/csv")}
function importJSON(txt){let o;try{o=JSON.parse(txt)}catch(e){toast("النص ليس JSON صالحًا");return}
  const N=blank();if(o.cfg&&o.cfg.cond!==undefined||o.docs||o.snaps){COLS.forEach(k=>N[k]=o[k]||{});N.cfg=Object.assign(N.cfg,o.cfg||{})}
  else if(o.ctl||o.sub){const M={c:["y","y"],p:["y","p"],x:["n","n"]};Object.entries(o.ctl||{}).forEach(([id,v])=>{if(!BY[id])return;const x={};if(M[v.s]){x.d=M[v.s][0];x.i=M[v.s][1]}if(v.s==="na"){x.app="na";x.appWhy="مستورد من الأداة السابقة"}if(v.e)x.ev_d=v.e;if(v.n)x.n=v.n;if(v.r)x.rem=v.r;N.ctl[id]=x});
    Object.entries(o.sub||{}).forEach(([id,v])=>{if(SUBBY[id]&&v.n)N.sub[id]={n:v.n}});if(o.cfg){N.cfg.entity=o.cfg.entity||"";N.cfg.assessor=o.cfg.assessor||"";N.cfg.date=o.cfg.date||""}}
  else{toast("لم نتعرف على صيغة الملف");return}
  U.confirm={msg:`سيُستبدل التقييم الحالي بالبيانات المستوردة (${Object.keys(N.ctl).length} ضابطًا).`,yes:"استبدال",fn:()=>{replaceAll(N);logEv("import")}};render()}
function replaceAll(N){const old=S;S=N;if(U.db){COLS.forEach(col=>{Object.keys(old[col]).forEach(id=>{if(!N[col][id])persist(col,id)});Object.keys(N[col]).forEach(id=>persist(col,id))});persist("cfg")}saveLocal();toast("تم");render()}
function demoData(){let sd=7;const rnd=()=>(sd=(sd*9301+49297)%233280)/233280;const D=blank();
  Object.assign(D.cfg,{entity:"هيئة النقل الإقليمية (مثال)",assessor:"فريق الحوكمة",date:today(),type:"gov",cond:{cloud:"yes",tp:"yes",web:"yes",dev:"no",intl:"no",byod:"no"}});
  CTLS.forEach(c=>{if(rnd()<.12)return;const r=rnd(),x={};if(r<.42){x.d="y";x.i="y";x.e=rnd()<.5?"y":"p"}else if(r<.6){x.d="y";x.i="n"}else if(r<.78){x.d="y";x.i="p"}else if(r<.88){x.d="n";x.i="y"}else{x.d="n";x.i="n"}
    if(x.d==="y")x.ev_d=rnd()<.7?"سياسة "+SUBBY[c.sub].ar+" v1.2 — البند "+(1+Math.floor(rnd()*9))+"."+(1+Math.floor(rnd()*5)):"السياسة المعتمدة";if(x.i==="y"&&rnd()<.6)x.ev_i="تقرير تشغيلي 2026-Q3";x.imp=["H","M","L"][Math.floor(rnd()*3)];x.eff=["S","M","L"][Math.floor(rnd()*3)];if(rnd()<.4)x.own=["الإدارة المعنية بالأمن السيبراني","إدارة تقنية المعلومات","الموارد البشرية"][Math.floor(rnd()*3)];const gn=GD(c.id).d.length;if(gn&&x.d==="y"){x.gd=[...Array(gn).keys()].filter(()=>rnd()<.55);if(!x.gd.length)delete x.gd}D.ctl[c.id]=x});
  D.docs={a:{name:"سياسة التحكم بالدخول",ver:"2.0",own:"الإدارة المعنية بالأمن السيبراني",apr:"صاحب الصلاحية",ad:"2025-06-10",per:12,subs:["2-2"]},b:{name:"سياسة الاستخدام المقبول",ver:"1.3",own:"الإدارة المعنية بالأمن السيبراني",apr:"صاحب الصلاحية",ad:"2026-02-01",per:12,subs:["2-1"]},c:{name:"سياسة النسخ الاحتياطي",ver:"1.0",own:"إدارة تقنية المعلومات",apr:"صاحب الصلاحية",ad:"2026-09-15",per:24,subs:["2-9"]}};
  D.snaps={s1:{at:"2026-05-01",label:"التقييم الأول",comp:38,gaps:61,paper:22},s2:{at:"2026-08-01",label:"بعد المرحلة 1",comp:47,gaps:49,paper:17}};return D}
function toggleDemo(){if(U.demo){S=U.real;U.real=null;U.demo=false}else{U.real=S;S=demoData();U.demo=true;const s=stats(CTLS);S.snaps.s3={at:today(),label:"اليوم",comp:s.comp,gaps:gapList().length,paper:s.paper}}U.tab="home";U.confirm=null;render()}
async function readFile(f){if(!f)return;const n=f.name.toLowerCase();U.anaFile=f;try{if(n.endsWith(".pdf")){toast("جارٍ قراءة ملف PDF…");U.anaTxt=await pdfText(f);if(U.anaTxt.length<200)toast("الملف لا يحوي نصًا قابلًا للقراءة (قد يكون صورًا ممسوحة). الصق النص يدويًا.")}else if(n.endsWith(".docx")){if(!window.JSZip){toast("تعذّر تحميل قارئ ملفات Word. الصق النص يدويًا.");return}
    const z=await JSZip.loadAsync(f);const x=await z.file("word/document.xml").async("string");const t=x.replace(/<w:p[ >][\s\S]*?<\/w:p>/g,p=>p.replace(/<w:tab\/>/g,"\t").replace(/<[^>]+>/g,"")+"\n").replace(/<[^>]+>/g,"").replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&apos;/g,"'");U.anaTxt=t.replace(/\n{3,}/g,"\n\n").trim()}
   else U.anaTxt=await f.text();if(!U.anaName)U.anaName=f.name.replace(/\.[^.]+$/,"");U.anaRes=null;render();toast("قُرئ الملف: "+U.anaTxt.length.toLocaleString("en")+" حرفًا")}catch(e){toast("تعذّرت قراءة الملف. الصق النص يدويًا.")}}
function go(id){const c=BY[id]||null,s=c?c.sub:id;if(!SUBBY[s])return;U.tab="review";U.q="";U.f="all";U.dom=SUBBY[s].dom;U.open[s]=true;if(c)U.open[id]=true;render();setTimeout(()=>{const e=document.getElementById(c?"c-"+id:"s-"+s);if(e)e.scrollIntoView({behavior:"smooth",block:"start"})},40)}

// ===== Event wiring =====
document.addEventListener("click",e=>{const t=e.target.closest("[data-act]");if(!t||t.tagName==="INPUT"&&t.type!=="checkbox"||t.tagName==="SELECT"||t.tagName==="TEXTAREA")return;
  const a=t.dataset.act,id=t.dataset.id,v=t.dataset.v,k=t.dataset.k;
  switch(a){
  case "attopen":attOpen(id,+v);break;
  case "attdel":attDel(id,+v);break;
  case "aigtr":aiGuideTr(id);break;
  case "tab":U.tab=v;U.confirm=null;$("#rail").classList.remove("open");$("#menu").setAttribute("aria-expanded","false");render();window.scrollTo(0,0);break;
  case "dom":U.dom=v;U.q="";U.f="all";render();if(t.dataset.top)window.scrollTo({top:0,behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"});break;
  case "tg":case "tc":U.open[id]=!U.open[id];render();break;
  case "go":go(id);break;
  case "jumps":go(id);break;
  case "jumpf":U.tab="review";U.f=v;U.q="";render();window.scrollTo(0,0);break;
  case "clrf":U.q="";U.f="all";render();break;
  case "lay":{if(!canCol("ctl",id)){toast("ليست لديك صلاحية تعديل هذا الضابط");break}const before=dst(id);const o=S.ctl[id]=S.ctl[id]||{};if(o[k]===v)delete o[k];else o[k]=v;stampF(o,k);if(dst(id)==="c"&&before!=="c"){U.flash=id;clearTimeout(U._ft);U._ft=setTimeout(()=>{U.flash=null},1500)}persist("ctl",id);logEv("layer",id,{v:({d:"موثّق",i:"مطبّق",e:"فعّال"})[k]+": "+(({y:"نعم",p:"جزئي",n:"لا"})[o[k]]||"—")});render();break}
  case "tmadd":if(!S.team[id]){putDoc("team",id,{role:"assessor",doms:[],at:Date.now()});logEv("team",id,{v:"إضافة"});toast("أُضيف إلى الفريق. تأكد أن الأداة مشاركة معه من قائمة المشاركة.")}render();break;
  case "tmdom":{const m=Object.assign({},S.team[id]);const s=new Set(m.doms||[]);t.checked?s.add(v):s.delete(v);m.doms=[...s].sort();putDoc("team",id,m);logEv("team",id,{v:"نطاق: "+(m.doms.join("، ")||"الكل")});render();break}
  case "tmdel":U.confirm={msg:"إزالة هذا العضو من فريق الأداة؟ لإيقاف وصوله نهائيًا أزله أيضًا من قائمة المشاركة.",yes:"إزالة",fn:()=>{putDoc("team",id,null);logEv("team",id,{v:"إزالة"})}};render();break;
  case "gd":{if(!canCol("ctl",id)){toast("ليست لديك صلاحية تعديل هذا الضابط");render();break}const o=S.ctl[id]=S.ctl[id]||{};const s=new Set(o.gd||[]);const i=+v;s.has(i)?s.delete(i):s.add(i);o.gd=[...s].sort((a,b)=>a-b);if(!o.gd.length)delete o.gd;stampF(o,"gd");persist("ctl",id);render();break}
  case "etype":if(!canCol("cfg"))break;setF("cfg",null,"type",v);logEv("scope","",{v});render();break;
  case "cond":{if(!canCol("cfg"))break;logEv("scope",id,{v});const c=Object.assign({},S.cfg.cond);if(c[id]===v)delete c[id];else c[id]=v;setF("cfg",null,"cond",c);render();break}
  case "scopeok":setF("cfg",null,"scopeOk",t.checked);render();break;
  case "appclear":{const o=S.ctl[id];if(o){delete o.app;delete o.appWhy;persist("ctl",id)}render();break}
  case "airem":aiRem(id);break;
  case "aiplan":aiPlan();break;
  case "aiq":aiQ(id);break;
  case "aiexec":aiExec(id);break;
  case "pdf":makePDF();break;
  case "replang":U.repLang=v;render();break;
  case "anarun":if(!U.anaSel.size){toast("اختر مكونًا واحدًا على الأقل");break}if(U.anaTxt.length<200){toast("ألصق نص السياسة أولًا");break}aiAna();break;
  case "anasug":aiSug();break;
  case "aistop":{const c=U.busy[id];if(c&&c.abort)c.abort();break}
  case "aisave":setF("ctl",id,"ai",U.aiOut[id]);delete U.aiOut[id];toast("حُفظ المقترح مع الضابط");render();break;
  case "aidrop":delete U.aiOut[id];setF("ctl",id,"ai",null);render();break;
  case "aicopy":{const r=U.aiOut[id]||C(id).ai;if(!r)break;const txt=(r.steps||[]).map((s,i)=>`${i+1}. ${s.step} — ${s.owner||""}`).join("\n");const o=S.ctl[id]=S.ctl[id]||{};o.rem=(o.rem?o.rem+"\n":"")+txt;stampF(o,"rem");persist("ctl",id);toast("أُضيفت الخطوات إلى خطة المعالجة");render();break}
  case "copyt":try{navigator.clipboard.writeText(v).then(()=>toast("نُسخ"),()=>toast("حدد النص وانسخه يدويًا"))}catch(err){toast("حدد النص وانسخه يدويًا")}break;
  case "anaclr":U.anaSel=new Set();render();break;
  case "anaapply":anaApply();break;
  case "anasave":{const a=U.anaRes;if(!a)break;const id2=uid();putDoc("ana",id2,{name:a.name,at:a.at,subs:a.subs,res:a.res});a.saved=true;toast("حُفظ التحليل");render();break}
  case "anaopen":{const x=S.ana[id];if(x){U.anaRes=Object.assign({saved:true,txt:""},x);render()}break}
  case "anadel":U.confirm={msg:"حذف هذا التحليل نهائيًا؟",yes:"حذف",fn:()=>putDoc("ana",id,null)};render();break;
  case "anadoc":{const a=U.anaRes;if(!a)break;const id2=uid();putDoc("docs",id2,{name:a.name||"سياسة بلا اسم",subs:a.subs.slice(),ad:"",per:""});toast("أُضيفت إلى سجل الوثائق. أكمل تاريخ الاعتماد وفترة المراجعة هناك.");render();break}
  case "gv":U.gv=v;render();break;
  case "csv":csv();break;
  case "audstart":{const n=+$("#aud-n").value,f=$("#aud-f").value;let pool=CTLS.filter(c=>appOf(c.id).v!=="na"&&(C(c.id).d||C(c.id).i)).map(c=>c.id);
    if(f==="c"){const cl=pool.filter(i=>C(i).d==="y"||C(i).i==="y");if(cl.length>=n)pool=cl}
    for(let i=pool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]]}
    putDoc("audit","cur",{at:today(),ids:pool.slice(0,n).sort((a,b)=>a.localeCompare(b,undefined,{numeric:true})),marks:{},q:{}});render();break}
  case "audmark":{const A=Object.assign({},S.audit.cur);A.marks=Object.assign({},A.marks);if(A.marks[id]===v)delete A.marks[id];else A.marks[id]=v;putDoc("audit","cur",A);render();break}
  case "audend":U.confirm={msg:"إنهاء الجولة الحالية؟ ستُحذف أحكامها.",yes:"إنهاء",fn:()=>putDoc("audit","cur",null)};render();break;
  case "docadd":{const name=$("#nd-name").value.trim();if(!name){toast("اكتب اسم الوثيقة");break}putDoc("docs",uid(),{name,ver:$("#nd-ver").value.trim(),own:$("#nd-own").value.trim(),apr:$("#nd-apr").value.trim(),ad:$("#nd-ad").value,per:$("#nd-per").value,subs:[]});toast("أُضيفت الوثيقة. اربطها بالمكونات التي تغطيها.");render();break}
  case "docsub":{const d=Object.assign({},S.docs[id]);const s=new Set(d.subs||[]);t.checked?s.add(v):s.delete(v);d.subs=[...s].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));putDoc("docs",id,d);render();break}
  case "docrev":{const d=Object.assign({},S.docs[id]);d.ad=today();putDoc("docs",id,d);toast("سُجّل تاريخ اعتماد اليوم");render();break}
  case "docdel":U.confirm={msg:`حذف «${esc(S.docs[id]?.name||"")}» من السجل؟`,yes:"حذف",fn:()=>putDoc("docs",id,null)};render();break;
  case "cw":U.cw=v;render();break;
  case "fwimp":{const lines=U.fwText.split(/\r?\n/).map(l=>l.trim()).filter(Boolean);let n=0,bad=0;lines.forEach(l=>{const c=l.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(x=>x.trim().replace(/^"|"$/g,""));if(/^ecc$/i.test(c[0]))return;if(c.length<4||!c[3]||!(BY[c[0]]||SUBBY[c[0]])){bad++;return}putDoc("fw",uid(),{ecc:c[0],fw:c[1],ref:c[2],src:c[3],note:c[4]||""});n++});toast(`استُورد ${n}${bad?`، وتُجوهل ${bad} سطرًا (رقم ECC غير صحيح أو بلا مصدر)`:""}`);if(n)U.fwText="";render();break}
  case "fwdel":putDoc("fw",id,null);render();break;
  case "fwclr":U.confirm={msg:"حذف كل العلاقات المستوردة؟",yes:"حذف",fn:()=>Object.keys(S.fw).forEach(k=>putDoc("fw",k,null))};render();break;
  case "snap":snapNow($("#sn-l").value.trim());logEv("snap");toast("حُفظت اللقطة");render();break;
  case "sndel":U.confirm={msg:"حذف هذه اللقطة؟",yes:"حذف",fn:()=>putDoc("snaps",id,null)};render();break;
  case "dlrep":save(`ECC-report-${today()}.html`,`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>تقرير مراجعة ECC</title><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;600&display=swap"></head><body style="padding:24px">${reportHTML()}</body></html>`,"text/html");break;
  case "dljson":save(`ECC-backup-${today()}.json`,JSON.stringify(S,null,1),"application/json");break;
  case "imp":importJSON($("#imp").value);break;
  case "demo":toggleDemo();break;
  case "reset":U.confirm={msg:"مسح كل بيانات التقييم نهائيًا؟ لا يمكن التراجع.",yes:"مسح نهائي",fn:()=>{replaceAll(blank());logEv("reset")}};render();break;
  case "pushlocal":U.localDone=true;replaceAll(U.localCopy);break;
  case "droplocal":U.localDone=true;render();break;
  case "cfy":{const f=U.confirm&&U.confirm.fn;U.confirm=null;if(f)f();render();break}
  case "cfn":U.confirm=null;render();break;
  }});
document.addEventListener("input",e=>{const t=e.target;
  if(t.dataset.b){const [col,id,k]=t.dataset.b.split("|");if(t.tagName==="SELECT")return;setF(col,col==="cfg"?null:id,k,t.value);return}
  const a=t.dataset.act;if(a==="q"){U.q=t.value;clearTimeout(U.qt);U.qt=setTimeout(()=>{render();const q=$("#q");if(q){q.focus();q.setSelectionRange(q.value.length,q.value.length)}},220)}
  else if(a==="rppw"){U.pw=t.value}else if(a==="tmq"){U.tmQ=t.value;clearTimeout(U.tmT);U.tmT=setTimeout(async()=>{if(!U.user)return;try{U.tmRes=await U.user.search(U.tmQ)}catch(e){U.tmRes=[]}render();const q=$("#tm-q");if(q){q.focus();q.setSelectionRange(q.value.length,q.value.length)}},300)}
  else if(a==="anatxt"){U.anaTxt=t.value;U.anaRes=null;U.anaFile=null}else if(a==="ananame")U.anaName=t.value;else if(a==="fwtxt")U.fwText=t.value});
document.addEventListener("change",e=>{const t=e.target;
  if(t.dataset.b&&(t.tagName==="SELECT"||t.type==="date")){const [col,id,k]=t.dataset.b.split("|");setF(col,col==="cfg"?null:id,k,t.value);render();return}
  const a=t.dataset.act;if(a==="f"){U.f=t.value;render()}else if(a==="gm"){U.gm=t.checked;render()}else if(a==="anasel"){t.checked?U.anaSel.add(t.dataset.id):U.anaSel.delete(t.dataset.id);render()}
  else if(a==="attfile"){attAdd(t.dataset.id,t.files[0])}else if(a==="cmp"){U["cmp"+t.dataset.k]=t.value;render()}
  else if(a==="tmrole"){const m=Object.assign({},S.team[t.dataset.id]);m.role=t.value;putDoc("team",t.dataset.id,m);logEv("team",t.dataset.id,{v:"الدور: "+ROLES[t.value][0]});render()}else if(a==="anatxt"&&U.anaTxt.length>0)render();else if(t.id==="anafile")readFile(t.files[0])});
document.addEventListener("dragover",e=>{const z=e.target.closest&&e.target.closest("#dz");if(z){e.preventDefault();z.classList.add("over")}});
document.addEventListener("dragleave",e=>{const z=e.target.closest&&e.target.closest("#dz");if(z)z.classList.remove("over")});
document.addEventListener("drop",e=>{const z=e.target.closest&&e.target.closest("#dz");if(z){e.preventDefault();readFile(e.dataTransfer.files[0])}});
$("#tourbtn").onclick=startTour;
$("#menu").onclick=()=>{const r=$("#rail");const o=r.classList.toggle("open");$("#menu").setAttribute("aria-expanded",String(o))};
$("#lang").onclick=()=>setLang(U.lang==="en"?"ar":"en");
$("#theme").onclick=()=>{const r=document.documentElement;const dark=r.dataset.theme!=="light";r.dataset.theme=dark?"light":"dark";try{localStorage.setItem("ecc_theme",r.dataset.theme)}catch(e){}};
try{const th=localStorage.getItem("ecc_theme");if(th)document.documentElement.dataset.theme=th}catch(e){}

// ===== Boot =====
render();
(async()=>{if(!window.claude||!claude.use)return;
  claude.use("sample").then(x=>{U.ai=x;if(x)render()}).catch(()=>{});
  claude.use("downloads").then(x=>{U.dl=x}).catch(()=>{});
  claude.use("assets").then(x=>{U.assets=x}).catch(()=>{});
  try{const u=await claude.use("user");if(u){U.user=u;try{U.me=await u.id()}catch(e){}
    try{const [o,a,w,me]=await Promise.all([u.isOwner(),u.canEdit(),u.can("data.write"),u.me()]);U.lvl={owner:!!o,admin:!!a,write:w};U.myName=me&&me.name||""}catch(e){}}}catch(e){}
  try{const db=await claude.use("db");if(db)startDb(db)}catch(e){}
  // resolve display names for people referenced on screen (ids only are stored)
  setInterval(async()=>{if(!U.user)return;const ids=[...new Set([...Object.values(S.ctl).map(o=>o._by),...Object.keys(S.team),...U.logs.map(l=>l.by),...Object.values(S.reports).map(r=>r.by)].filter(x=>x&&!(x in U.names)))];if(!ids.length)return;try{const ps=await U.user.profiles(ids);ids.forEach(i=>U.names[i]=(ps[i]&&ps[i].name)||"");softRender()}catch(e){}},4000)})();

sbStart();
// first visit: intro tour
setTimeout(()=>{try{if(!localStorage.getItem("ecc_tour_done")&&!U.demo&&!document.getElementById("sbauth"))startTour()}catch(e){}},1400);
