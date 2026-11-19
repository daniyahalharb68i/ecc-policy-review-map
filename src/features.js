// ===== Features: routing, Arabic display & search normalisation, evidence attachments, intro tour, PDF text, guide translation =====

// --- Routing: one hash per screen, so Back/Forward and shared links work ---
const TABS_OK=new Set(["home","scope","review","ana","road","audit","docs","map","snaps","team","report"]);
{const h=location.hash.slice(1);if(TABS_OK.has(h))U.tab=h}
function syncHash(){if(TABS_OK.has(U.tab)&&location.hash.slice(1)!==U.tab){try{location.hash=U.tab}catch(e){}}}
window.addEventListener("hashchange",()=>{const h=location.hash.slice(1);if(TABS_OK.has(h)&&h!==U.tab){U.tab=h;U.confirm=null;const r=$("#rail");if(r)r.classList.remove("open");render();window.scrollTo(0,0)}});

// --- Arabic display: strip diacritics/tatweel so marks never render detached; normalise search ---
const TK_ONE=/[ً-ْٰـ]/;
const TK_ALL=/[ً-ْٰـ]/g;
const plainAr=s=>String(s==null?"":s).replace(TK_ALL,"");
function stripMarks(root){if(!root)return;
  const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode:n=>{const p=n.parentElement;if(!p||/^(TEXTAREA|SCRIPT|STYLE)$/.test(p.tagName))return NodeFilter.FILTER_REJECT;return TK_ONE.test(n.nodeValue)?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_SKIP}});
  const ns=[];while(w.nextNode())ns.push(w.currentNode);ns.forEach(n=>{n.nodeValue=plainAr(n.nodeValue)});
  root.querySelectorAll("[placeholder],[title]").forEach(el=>{["placeholder","title"].forEach(a=>{const v=el.getAttribute(a);if(v&&TK_ONE.test(v))el.setAttribute(a,plainAr(v))})})}
// search: ignore diacritics, hamza forms, taa marbuta and alef maqsura
const normQ=s=>plainAr(s).toLowerCase().replace(/[أإآٱ]/g,"ا").replace(/ى/g,"ي").replace(/ة/g,"ه").replace(/ؤ/g,"و").replace(/ئ/g,"ي").replace(/\s+/g," ").trim();

// --- Evidence attachments: Claude asset store when available, otherwise this browser (IndexedDB) ---
const ATT_MAX=20*1024*1024;
let _fdb=null;
const fdb=()=>_fdb||(_fdb=new Promise((ok,no)=>{try{const r=indexedDB.open("ecc_files",1);r.onupgradeneeded=()=>r.result.createObjectStore("f");r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)}catch(e){no(e)}}));
const fdbOp=(mode,fn)=>fdb().then(d=>new Promise((ok,no)=>{const t=d.transaction("f",mode),st=t.objectStore("f"),rq=fn(st);t.oncomplete=()=>ok(rq&&rq.result);t.onerror=()=>no(t.error)}));
const fdbPut=(k,b)=>fdbOp("readwrite",s=>s.put(b,k));
const fdbGet=k=>fdbOp("readonly",s=>s.get(k));
const fdbDel=k=>fdbOp("readwrite",s=>s.delete(k));
const fmtSize=n=>n>=1048576?(n/1048576).toFixed(1)+" MB":Math.max(1,Math.round(n/1024))+" KB";
const extOf=n=>(String(n).split(".").pop()||"").slice(0,4).toUpperCase();
const attAccept=()=>window.claude?".pdf,.png,.jpg,.jpeg,.webp":".pdf,.png,.jpg,.jpeg,.webp,.docx,.xlsx,.pptx";
async function attAdd(id,file){if(!file)return;if(!canCol("ctl",id)){toast("ليست لديك صلاحية تعديل هذا الضابط");return}
  if(file.size>ATT_MAX){toast("حجم الملف أكبر من 20 ميجابايت");return}
  if(window.claude&&!U.assets){toast("رفع الملفات غير متاح لصلاحيتك الحالية في هذه الأداة");return}
  U.attBusy=id;render();
  try{const rec={name:file.name,size:file.size,type:file.type||"",at:today(),by:U.me||""};
    if(window.claude){const a=await U.assets.upload(file);rec.aid=a.id;rec.url=a.url}
    else{const k=uid();await fdbPut(k,file);rec.lid=k}
    const o=S.ctl[id]=S.ctl[id]||{};o.att=(o.att||[]).concat([rec]);persist("ctl",id);logEv("att",id,{v:file.name});toast("أُرفق الملف")}
  catch(e){toast("تعذّر رفع الملف. تأكد من نوعه وحجمه.")}
  finally{U.attBusy=null;render()}}
async function attOpen(id,i){const r=(C(id).att||[])[i];if(!r)return;
  const open=href=>{const a=document.createElement("a");a.href=href;a.target="_blank";a.rel="noopener";document.body.appendChild(a);a.click();a.remove()};
  if(r.url){open(r.url);return}
  try{const b=await fdbGet(r.lid);if(!b){toast("الملف غير موجود في هذا المتصفح");return}const u=URL.createObjectURL(b);open(u);setTimeout(()=>URL.revokeObjectURL(u),120000)}catch(e){toast("تعذّر فتح الملف")}}
function attDel(id,i){const r=(C(id).att||[])[i];if(!r)return;
  U.confirm={msg:`حذف المرفق «${esc(r.name)}»؟`,yes:"حذف",fn:async()=>{try{if(r.aid&&U.assets)await U.assets.delete(r.aid)}catch(e){}try{if(r.lid)await fdbDel(r.lid)}catch(e){}
    const o=S.ctl[id]=S.ctl[id]||{};o.att=(o.att||[]).filter((x,j)=>j!==i);if(!o.att.length)delete o.att;persist("ctl",id);logEv("att",id,{v:"حذف "+r.name});render()}};render()}
function attBox(id){const L=C(id).att||[],can=canCol("ctl",id);
  return `<div class="box"><h4>المرفقات (الأدلة) <span class="note">${L.length} ملف</span></h4>
  ${L.length?`<ul class="atts">${L.map((r,i)=>`<li><span class="ft">${esc(extOf(r.name))}</span><span class="an">${esc(r.name)}<small>${fmtSize(r.size||0)} · ${esc(r.at||"")}${r.by&&U.names[r.by]?" · "+esc(U.names[r.by]):""}</small></span><button class="btn sm quiet" data-act="attopen" data-id="${id}" data-v="${i}">فتح</button>${can?`<button class="btn sm danger ghost" data-act="attdel" data-id="${id}" data-v="${i}">حذف</button>`:""}</li>`).join("")}</ul>`:`<p class="note" style="margin:0">لا مرفقات بعد. أرفق الوثيقة المعتمدة أو لقطة الشاشة التي تثبت الضابط.</p>`}
  ${can?(U.attBusy===id?`<span class="thinking" style="margin-top:8px"><i></i>جارٍ الرفع…</span>`:`<label class="btn sm ghost attpick">إرفاق ملف (PDF أو صورة${window.claude?"":" أو Word"})<input type="file" data-act="attfile" data-id="${id}" accept="${attAccept()}" hidden></label>`):""}
  ${!window.claude?`<p class="note" style="margin:6px 0 0">في النسخة المحلية تُحفظ المرفقات في هذا المتصفح فقط، ولا تدخل في النسخة الاحتياطية JSON.</p>`:""}</div>`}

// --- PDF text extraction for the policy analyzer ---
const PDFJS="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/";
async function pdfText(file){await loadScript(PDFJS+"pdf.min.js");const lib=window.pdfjsLib;lib.GlobalWorkerOptions.workerSrc=PDFJS+"pdf.worker.min.js";
  const doc=await lib.getDocument({data:await file.arrayBuffer()}).promise;const out=[];
  for(let p=1;p<=doc.numPages;p++){const pg=await doc.getPage(p);const c=await pg.getTextContent();out.push(c.items.map(i=>i.str).join(" "))}
  return out.join("\n\n").replace(/[ \t]+/g," ").trim()}

// --- Arabic (unofficial) translation of the GECC guide items, Claude version only ---
async function aiGuideTr(id){const g=GD(id);if(!g.d.length&&!g.g.length)return;
  const r=await aiCall("aigtr:"+id,`ترجم إلى العربية الفصحى المهنية بنود «الدليل الإرشادي لتطبيق الضوابط الأساسية للأمن السيبراني» التالية للضابط ${id}. حافظ على المعنى والترتيب والعدد تمامًا، ولا تضف أو تحذف بندًا. أبقِ المصطلحات التقنية والاختصارات (مثل SIEM وMFA وVPN) بالإنجليزية، وأبقِ رموز الضوابط الفرعية بين الأقواس المربعة كما هي.
المخرجات المتوقعة (${g.d.length}):
${g.d.map((x,i)=>`${i+1}. ${x}`).join("\n")}
إرشادات التطبيق (${g.g.length}):
${g.g.map((x,i)=>`${i+1}. ${x}`).join("\n")}
أعد JSON فقط: {"d":["..."],"g":["..."]} بنفس العدد والترتيب.`,{modelTier:"default"});
  if(r&&Array.isArray(r.d)&&r.d.length===g.d.length){const tr={d:r.d.map(String),g:Array.isArray(r.g)&&r.g.length===g.g.length?r.g.map(String):[],at:today()};
    if(canCol("ctl",id)){setF("ctl",id,"gtr",tr)}else{U.aiOut["gtr:"+id]=tr}toast("تُرجمت بنود الدليل لهذا الضابط");render()}
  else if(r)toast("جاءت الترجمة ناقصة. أعد المحاولة.")}
const gtrOf=id=>C(id).gtr||U.aiOut["gtr:"+id]||null;

// --- Intro tour: highlights each section, next / back / skip ---
const TOUR=[["tab:home","نظرة عامة","ملخص الالتزام والفجوات وما يحتاج انتباهك أولًا."],
 ["tab:scope","ابدأ من هنا","حدّد نوع جهتك وطبيعة عملها، لتعرف الضوابط الإلزامية والموصى بها والتي لا تنطبق."],
 ["tab:review","مراجعة الضوابط","قيّم كل ضابط على ثلاث طبقات: موثّق، ومطبّق، وفعّال. سجّل الدليل وأرفق ملفاته."],
 ["tab:ana","محلل السياسات","ارفع سياستك (PDF أو Word) ليقارنها Claude بالضوابط بندًا بندًا."],
 ["tab:road","خارطة المعالجة","الفجوات مرتبة على ثلاث مراحل، ولكل فجوة مسؤول وموعد وحالة معالجة."],
 ["tab:audit","التدقيق التجريبي","عيّنة عشوائية كما يفعل المدقق، لتعرف أين تضعف أدلتك."],
 ["tab:docs","سجل الوثائق","سياساتك المعتمدة ومواعيد مراجعتها القادمة."],
 ["tab:team","الفريق والصلاحيات","أضف فريقك وحدّد دور كل شخص وما يحق له تعديله."],
 ["tab:report","التقارير","أصدر تقريرًا رسميًا بصيغة PDF، ويمكن قفله بكلمة مرور إذا كان سريًا."],
 ["#lang","اللغة","بدّل بين العربية والإنجليزية في أي وقت."],
 ["#tourbtn","الجولة التعريفية","أعد هذه الجولة متى شئت من هذا الزر."]];
let tourI=-1;
const tourEl=()=>{const k=TOUR[tourI][0];return k.startsWith("tab:")?document.querySelector(`#nav [data-act=tab][data-v=${k.slice(4)}]`):document.querySelector(k)};
function startTour(){tourI=0;const r=$("#rail");if(r&&matchMedia("(max-width:920px)").matches)r.classList.add("open");drawTour()}
function endTour(){tourI=-1;const o=$("#tour");if(o)o.remove();try{localStorage.setItem("ecc_tour_done","1")}catch(e){}const r=$("#rail");if(r)r.classList.remove("open")}
function drawTour(){if(tourI<0)return;let o=$("#tour");
  if(!o){o=document.createElement("div");o.id="tour";o.setAttribute("role","dialog");o.setAttribute("aria-modal","true");o.innerHTML=`<div class="hole"></div><div class="tcard"></div>`;document.body.appendChild(o)}
  o.dir=U.lang==="en"?"ltr":"rtl";
  const el=tourEl(),[_,t,d]=TOUR[tourI],N=TOUR.length,T=s=>plainAr(tr(s));
  const card=o.querySelector(".tcard"),hole=o.querySelector(".hole");
  card.innerHTML=`<div class="tstep">${tourI+1} / ${N}</div><b>${esc(T(t))}</b><p>${esc(T(d))}</p><div class="tbtns"><button class="btn sm quiet" data-tour="skip">${esc(T("تخطي"))}</button><span style="flex:1"></span>${tourI?`<button class="btn sm ghost" data-tour="prev">${esc(T("السابق"))}</button>`:""}<button class="btn sm" data-tour="next">${esc(T(tourI===N-1?"إنهاء":"التالي"))}</button></div>`;
  if(el){el.scrollIntoView({block:"nearest"});const r=el.getBoundingClientRect(),p=6;Object.assign(hole.style,{display:"block",left:(r.left-p)+"px",top:(r.top-p)+"px",width:(r.width+2*p)+"px",height:(r.height+2*p)+"px"});
    const cw=Math.min(320,innerWidth-32),below=r.bottom+14+180<innerHeight;card.style.width=cw+"px";
    let left=r.left+r.width/2-cw/2;left=Math.max(16,Math.min(innerWidth-cw-16,left));card.style.left=left+"px";
    if(below){card.style.top=(r.bottom+14)+"px";card.style.bottom="auto"}else{card.style.top="auto";card.style.bottom=(innerHeight-r.top+14)+"px"}}
  else{hole.style.display="none";card.style.width=Math.min(320,innerWidth-32)+"px";card.style.left="50%";card.style.top="50%";card.style.transform="translate(-50%,-50%)"}
  const nb=card.querySelector("[data-tour=next]");if(nb)nb.focus()}
document.addEventListener("click",e=>{const b=e.target.closest("[data-tour]");if(!b)return;const a=b.dataset.tour;
  if(a==="skip")endTour();else if(a==="next"){if(tourI>=TOUR.length-1)endTour();else{tourI++;drawTour()}}else if(a==="prev"){tourI=Math.max(0,tourI-1);drawTour()}});
document.addEventListener("keydown",e=>{if(tourI<0)return;if(e.key==="Escape")endTour();else if(e.key==="ArrowLeft"||e.key==="ArrowRight"){const fwd=(e.key==="ArrowLeft")===(U.lang!=="en");if(fwd){if(tourI<TOUR.length-1){tourI++;drawTour()}else endTour()}else if(tourI){tourI--;drawTour()}}});
window.addEventListener("resize",()=>{if(tourI>=0)drawTour()});
