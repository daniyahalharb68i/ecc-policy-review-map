// ===== Policy sanitiser: hide sensitive data inside the browser, with no AI and no network =====
// Rule-based detection + the user's own words (typed or selected in the preview), each with a name the user chooses.
// Only the cleaned text is ever sent to AI; tokens are mapped back to the real values locally.
const RD_TYPES=[
 // [key, Arabic label, token prefix, regex]   (order = priority when matches overlap)
 ["email","البريد الإلكتروني","بريد",/[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}/g],
 ["url","الروابط","رابط",/\bhttps?:\/\/[^\s<>"'،)]+|\bwww\.[^\s<>"'،)]+/gi],
 ["iban","أرقام الآيبان","آيبان",/\bSA\d{2}[ ]?(?:[0-9A-Z]{4}[ ]?){4}[0-9A-Z]{4}\b/gi],
 ["ip","عناوين IP","عنوان-IP",/\b(?:25[0-5]|2[0-4]\d|1?\d?\d)(?:\.(?:25[0-5]|2[0-4]\d|1?\d?\d)){3}(?:\/\d{1,2})?\b|\b(?:[0-9A-Fa-f]{1,4}:){4,7}[0-9A-Fa-f]{1,4}\b/g],
 ["path","مسارات الشبكة والحسابات","مسار",/\\\\[A-Za-z0-9._$\-]+(?:\\[^\s\\،]+)+|\b[A-Za-z]:\\(?:[^\s\\،]+\\)*[^\s\\،]*|\b[A-Za-z][A-Za-z0-9_\-]{1,19}\\[A-Za-z][A-Za-z0-9._\-]{1,30}\b/g],
 ["intid","المعرّفات الداخلية","معرّف",/\b(?:EMP|SRV|SVR|PC|LAP|WS|AST|ASSET|HR|TKT|INC|CHG|REQ|CR|VLAN)[-_ ]?\d{2,8}\b|(?:الرقم الوظيفي|رقم وظيفي|رقم الموظف|السجل التجاري|سجل تجاري)\s*[:：]?\s*[0-9٠-٩]{3,12}/gi],
 ["person","أسماء بعد الألقاب","شخص",/(?:(?:السيد|السيدة|الأستاذ|الأستاذة|المهندس|المهندسة|الدكتور|الدكتورة|م\.|أ\.|د\.)\s+[\u0621-\u064A]{2,}(?:\s+(?:بن|بنت|آل|ال)?\s*[\u0621-\u064A]{2,}){1,2})|\b(?:Mr|Mrs|Ms|Dr|Eng)\.?\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2}/g],
 ["mac","عناوين MAC","MAC",/\b(?:[0-9A-F]{2}[:\-]){5}[0-9A-F]{2}\b/gi],
 ["phone","أرقام الجوال والهاتف","هاتف",/(?<!\d)(?:\+966|00966|966|0)?[ \-]?(?:5\d[ \-]?\d{3}[ \-]?\d{4}|1[1-7][ \-]?\d{3}[ \-]?\d{4})(?!\d)/g],
 ["nid","أرقام الهوية والإقامة","هوية",/(?<!\d)[12]\d{9}(?!\d)/g],
 ["host","النطاقات وأسماء الخوادم","نطاق",/\b(?:[A-Za-z0-9\-]+\.)+(?:sa|com|net|org|gov|edu|local|internal|corp|lan|intra)\b/gi],
 ["money","المبالغ المالية","مبلغ",/(?:\d[\d,٬.]*\s?(?:ريالًا|ريالا|ريال|ر\.س|SAR|SR)(?![A-Za-z]))|(?:\b(?:SAR|SR)\s?\d(?:[\d,.]*\d)?)/gi]];
U.rd=U.rd||{on:true,types:{email:1,url:1,iban:1,ip:1,mac:1,phone:1,nid:1,host:1,money:1,path:1,intid:1,person:1},terms:[],ents:{},view:"mark"};
try{const sv=JSON.parse(localStorage.getItem("ecc_rd")||"null");if(sv){U.rd.terms=sv.terms||[];Object.assign(U.rd.types,sv.types||{});U.rd.on=sv.on!==false}}catch(e){}
const rdSave=()=>{if(typeof lockMeta==="function"&&lockMeta()&&!window.claude){saveLocal();return}try{localStorage.setItem("ecc_rd",JSON.stringify({terms:U.rd.terms,types:U.rd.types,on:U.rd.on}))}catch(e){}};
const rdOn=()=>U.rd.on!==false;
// Arabic-Indic digits → Latin, one character for one, so positions stay aligned with the original text
const rdDigits=s=>s.replace(/[٠-٩]/g,d=>String(d.charCodeAt(0)-1632)).replace(/[۰-۹]/g,d=>String(d.charCodeAt(0)-1776));
const rdEsc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
// Arabic-tolerant pattern for the user's words: any alef/hamza form matches any other, and "لا/لإ/لأ/لآ" also
// matches the reversed order that PDF text extraction often produces for the lam-alef ligature (e.g. "اإلقليمية").
const rdTermRe=v=>{const A="[اأإآ]";let p=rdEsc(rdDigits(v)).replace(/[اأإآ]/g,"\u0001");
  p=p.replace(/ل\u0001/g,`(?:ل${A}|${A}ل)`).replace(/\u0001/g,A).replace(/[ةه](?=\s|$)/g,"[ةه]").replace(/ى(?=\s|$)/g,"[ىي]").replace(/\s+/g,"\\s+");return new RegExp(p,"gi")};
let RD_CACHE={txt:null,cfg:"",spans:[]};
function rdSpans(txt){const cfg=JSON.stringify([U.rd.types,U.rd.terms,S.cfg.entity||""]);
  // the cache is reused only for exactly the same text and settings (full string comparison)
  if(RD_CACHE.txt===txt&&RD_CACHE.cfg===cfg)return RD_CACHE.spans;
  const src=rdDigits(txt),found=[];
  // 1) the user's own words and the entity name come first
  const terms=U.rd.terms.slice();if(S.cfg.entity&&S.cfg.entity.trim().length>1&&!terms.some(t=>t.val===S.cfg.entity.trim()))terms.unshift({val:S.cfg.entity.trim(),label:"الجهة",auto:1});
  terms.forEach((t,ti)=>{if(!t.val||t.val.length<2)return;const re=rdTermRe(t.val);let m;while((m=re.exec(src))){found.push({s:m.index,e:m.index+m[0].length,type:"term",t,label:t.label,pr:0});if(!m[0].length)re.lastIndex++}});
  // 2) rule-based detectors
  RD_TYPES.forEach(([k,,,re],pi)=>{if(!U.rd.types[k])return;re.lastIndex=0;let m;while((m=re.exec(src))){found.push({s:m.index,e:m.index+m[0].length,type:k,pr:pi+1});if(!m[0].length)re.lastIndex++}});
  found.sort((a,b)=>a.s-b.s||a.pr-b.pr||(b.e-b.s)-(a.e-a.s));
  const out=[];let end=-1;found.forEach(f=>{if(f.s>=end){out.push(f);end=f.e}});
  // give each distinct value one stable token, keeping names/toggles the user already set
  const cnt={};out.forEach(f=>{const val=txt.slice(f.s,f.e);const id=(f.type==="term"?"t:"+f.t.val.toLowerCase():f.type)+"|"+val.toLowerCase();
    let en=U.rd.ents[id];if(!en){let tok;if(f.type==="term")tok=f.label||"مخفي";else{const T=RD_TYPES.find(x=>x[0]===f.type);cnt[f.type]=(cnt[f.type]||Object.values(U.rd.ents).filter(x=>x.type===f.type).length)+1;tok=T[2]+"-"+cnt[f.type]}
      en=U.rd.ents[id]={id,type:f.type,val,tok,on:true}}
    f.id=id});
  RD_CACHE={txt,cfg,spans:out};return out}
function rdClean(txt){if(!txt)return "";const sp=rdSpans(txt);let o="",i=0;sp.forEach(f=>{const en=U.rd.ents[f.id];if(!en||!en.on)return;o+=txt.slice(i,f.s)+"["+en.tok+"]";i=f.e});return o+txt.slice(i)}
function rdMap(){const m={};Object.values(U.rd.ents).forEach(e=>{if(e.on)m["["+e.tok+"]"]=m["["+e.tok+"]"]||e.val});return m}
// put the real values back into AI results, locally
function rdRestore(x,m){m=m||rdMap();if(typeof x==="string"){let s=x;Object.keys(m).sort((a,b)=>b.length-a.length).forEach(k=>{s=s.split(k).join(m[k])});return s}
  if(Array.isArray(x))return x.map(v=>rdRestore(v,m));if(x&&typeof x==="object"){const o={};for(const k in x)o[k]=rdRestore(x[k],m);return o}return x}
const rdList=txt=>{const seen=new Set(),L=[];rdSpans(txt).forEach(f=>{if(seen.has(f.id))return;seen.add(f.id);const en=U.rd.ents[f.id];if(en)L.push(Object.assign({n:rdSpans(txt).filter(z=>z.id===f.id).length},en))});return L};
const rdFmt=()=>{const f=U.anaFile;if(!f)return "(نص)";const e=(f.name.split(".").pop()||"").toLowerCase();return e==="docx"?"(Word)":e==="pdf"?"(PDF)":"(نص)"};
const rdTypeName=t=>t==="term"?"كلمة أضفتها":(RD_TYPES.find(x=>x[0]===t)||[0,t])[1];

function vRedact(){const txt=U.anaTxt||"";const has=txt.length>0;const L=has?rdList(txt):[];const on=L.filter(e=>e.on).length;
  const prevSrc=txt.slice(0,60000);let prev="";
  if(has){const sp=rdSpans(txt).filter(f=>f.s<prevSrc.length);let i=0;
    if(U.rd.view==="clean")prev=esc(rdClean(prevSrc));
    else{sp.forEach(f=>{const en=U.rd.ents[f.id];prev+=esc(prevSrc.slice(i,f.s))+`<mark class="rd-m ${en&&en.on?"":"off"}" title="${esc(en?"["+en.tok+"]":"")}" data-rdtog="${esc(f.id)}">${esc(prevSrc.slice(f.s,Math.min(f.e,prevSrc.length)))}</mark>`;i=f.e});prev+=esc(prevSrc.slice(i))}}
  return `<section class="card c12 rd"><h2>إخفاء المعلومات الحساسة <span class="tag off">داخل جهازك، دون ذكاء اصطناعي</span>
    <span class="act"><label class="rd-sw"><input type="checkbox" data-rd="on" ${rdOn()?"checked":""}> أخفِها قبل أي تحليل</label></span></h2>
   <p class="lead">قبل أن يخرج أي نص من جهازك، تستبدل الأداة المعلومات الحساسة برموز مثل <span class="mono">[بريد-1]</span>. التحليل يرى الرموز فقط، ثم تُعاد الأسماء الحقيقية في النتائج على جهازك.</p>
   <div class="rd-grid">
    <div class="box"><h3>ما تكتشفه الأداة تلقائيًا</h3><div class="chk">${RD_TYPES.map(([k,l])=>`<label class="${U.rd.types[k]?"on":""}"><input type="checkbox" data-rd="type" data-v="${k}" ${U.rd.types[k]?"checked":""}>${l}</label>`).join("")}</div>
     <p class="note" style="margin:8px 0 0">اسم الجهة من «النطاق والانطباق» يُخفى تلقائيًا أيضًا.</p></div>
    <div class="box"><h3>أضف كلمة تخفيها بنفسك</h3>
     <div class="rd-add"><input id="rd-val" placeholder="الكلمة أو العبارة، مثل اسم نظام أو موظف" autocomplete="off"><input id="rd-lab" placeholder="الاسم البديل، مثل: النظام المالي" autocomplete="off"><button class="btn sm" data-rd="add">إخفاء</button></div>
     <p class="note" style="margin:6px 0 0">أو ظلّل أي نص في المعاينة أدناه بالماوس أو بإصبعك، واختر له اسمًا.</p>
     ${U.rd.terms.length?`<div class="rd-terms">${U.rd.terms.map((t,i)=>`<span class="tag">${esc(t.val)} ← [${esc(t.label||"مخفي")}]<button class="rd-x" data-rd="delterm" data-v="${i}" aria-label="إزالة">×</button></span>`).join("")}</div>`:""}</div></div>
   ${has?`<div class="rd-bar"><span><b class="num">${on}</b> عنصرًا سيُخفى${L.length>on?` · <span class="note">${L.length-on} مستثنى</span>`:""}</span>
     <span class="row">${seg([["mark","الأصل مع التظليل"],["clean","النسخة المنقّاة"]],U.rd.view,"rdview","x","v")}<button class="btn sm quiet" data-rd="copy">نسخ المنقّاة</button>${U.rdBusy?`<span class="thinking"><i></i>جارٍ إنشاء الملف <span id="rd-busy" class="num">${esc(U.rdBusy)}</span></span>`:`<button class="btn sm" data-rd="dl">تنزيل المنقّاة ${rdFmt()}</button>`}</span></div>
    <div class="rd-prev" id="rd-prev" dir="auto" data-notr>${prev}${txt.length>prevSrc.length?`<span class="note">\n… تعرض المعاينة أول 60,000 حرف، والإخفاء يشمل النص كاملًا.</span>`:""}</div>
    ${L.length?`<details class="rd-list" ${L.length<=12?"open":""}><summary>العناصر المخفية (${L.length}) — غيّر اسم أي رمز أو استثنِ عنصرًا</summary><div class="tw"><table><thead><tr><th></th><th>النوع</th><th>النص الأصلي</th><th>يظهر للتحليل باسم</th><th>مرات</th></tr></thead><tbody>${L.map(e=>`<tr class="${e.on?"":"rd-off"}"><td><input type="checkbox" data-rd="ent" data-v="${esc(e.id)}" ${e.on?"checked":""} aria-label="إخفاء"></td><td class="nw">${esc(rdTypeName(e.type))}</td><td data-notr dir="auto">${esc(e.val)}</td><td><input class="rd-tok" data-rd="tok" data-v="${esc(e.id)}" value="${esc(e.tok)}" aria-label="الاسم البديل"></td><td class="num">${e.n}</td></tr>`).join("")}</tbody></table></div></details>`:`<p class="note">لم يُكتشف شيء حساس تلقائيًا. أضف كلماتك بنفسك إن لزم.</p>`}
    ${U.anaFile&&/\.pdf$/i.test(U.anaFile.name)?`<p class="note" style="margin:8px 0 0">نسخة PDF المنقّاة تحافظ على شكل الصفحات، لكنها تُحفظ صورًا: النص المخفي يُزال فعلًا ولا يمكن استرجاعه أو نسخه من الملف.</p>`:""}
    <p class="note" style="margin:8px 0 0">الاكتشاف التلقائي يعتمد على أنماط معروفة، وقد تفوته أسماء الأشخاص والأنظمة الداخلية. راجع المعاينة قبل الإرسال؛ المراجعة النهائية مسؤوليتك.</p>`
   :`<p class="note">ارفع السياسة أو الصق نصها في الخطوة 1 لتظهر المعاينة هنا.</p>`}</section>`}

// --- events (own listeners, separate from the main handler) ---
document.addEventListener("click",e=>{const t=e.target.closest("[data-rd],[data-rdtog]");if(!t)return;
  if(t.dataset.rdtog&&!window.getSelection().toString()){const en=U.rd.ents[t.dataset.rdtog];if(en){en.on=!en.on;render()}return}
  const a=t.dataset.rd;
  if(a==="add"){const v=($("#rd-val")||{}).value||"",l=($("#rd-lab")||{}).value||"";rdAddTerm(v,l)}
  else if(a==="delterm"){U.rd.terms.splice(+t.dataset.v,1);rdSave();render()}
  else if(a==="copy"){const c=rdClean(U.anaTxt);(navigator.clipboard?navigator.clipboard.writeText(c):Promise.reject()).then(()=>toast("نُسخت النسخة المنقّاة")).catch(()=>toast("تعذّر النسخ"))}
  else if(a==="dl")rdDownload();else if(a==="dl-old"){const nm="policy";save(nm+"-sanitized.txt","﻿"+rdClean(U.anaTxt),"text/plain;charset=utf-8")}});
document.addEventListener("change",e=>{const t=e.target.closest("[data-rd]");if(!t)return;const a=t.dataset.rd;
  if(a==="on"){U.rd.on=t.checked;rdSave();render()}
  else if(a==="type"){U.rd.types[t.dataset.v]=t.checked?1:0;rdSave();render()}
  else if(a==="ent"){const en=U.rd.ents[t.dataset.v];if(en){en.on=t.checked;render()}}
  else if(a==="tok"){const en=U.rd.ents[t.dataset.v];const v=t.value.replace(/[\[\]]/g,"").trim();if(en&&v){en.tok=v;render()}}});
document.addEventListener("keydown",e=>{if(e.key==="Enter"&&(e.target.id==="rd-val"||e.target.id==="rd-lab")){e.preventDefault();rdAddTerm(($("#rd-val")||{}).value||"",($("#rd-lab")||{}).value||"")}});
document.addEventListener("click",e=>{const t=e.target.closest("[data-act=rdview]");if(!t)return;U.rd.view=t.dataset.v;render()});
function rdAddTerm(v,l){v=String(v).trim();l=String(l).replace(/[\[\]]/g,"").trim();if(v.length<2){toast("اكتب كلمة من حرفين على الأقل");return}
  if(U.rd.terms.some(x=>x.val.toLowerCase()===v.toLowerCase())){toast("هذه الكلمة مضافة مسبقًا");return}
  U.rd.terms.push({val:v,label:l||"مخفي-"+(U.rd.terms.length+1)});rdSave();rdHidePop();render();
  const n=(U.anaTxt.toLowerCase().split(v.toLowerCase()).length-1);toast(n?`ستُخفى في ${n} موضعًا`:"أُضيفت، ولم تظهر في النص الحالي")}

// --- manual: select text in the preview, then name it ---
let rdPop=null;
function rdHidePop(){if(rdPop){rdPop.remove();rdPop=null}}
function rdShowPop(){const s=window.getSelection();const tx0=s?s.toString().trim():"";const box=$("#rd-prev");
  if(!tx0||tx0.length<2||tx0.length>200||!box||!s.rangeCount||!box.contains(s.anchorNode)){rdHidePop();return}
  const r=s.getRangeAt(0).getBoundingClientRect();rdHidePop();rdPop=document.createElement("div");rdPop.className="rd-pop";rdPop.dir=U.lang==="en"?"ltr":"rtl";
  rdPop.innerHTML=`<span class="note">إخفاء «${esc(tx0.length>40?tx0.slice(0,40)+"…":tx0)}» باسم:</span><input id="rd-pop-lab" placeholder="مثل: اسم الموظف" autocomplete="off"><button class="btn sm" id="rd-pop-go">إخفاء</button>`;
  document.body.appendChild(rdPop);applyLang(rdPop);
  const w=rdPop.offsetWidth,top=Math.min(window.innerHeight-rdPop.offsetHeight-8,r.bottom+8),left=Math.max(8,Math.min(window.innerWidth-w-8,r.left+r.width/2-w/2));
  rdPop.style.top=top+"px";rdPop.style.left=left+"px";rdPop.dataset.v=tx0;rdPop.dataset.y=window.scrollY;
  rdPop.querySelector("#rd-pop-go").onclick=()=>rdAddTerm(rdPop.dataset.v,rdPop.querySelector("#rd-pop-lab").value);
  rdPop.querySelector("#rd-pop-lab").onkeydown=ev=>{if(ev.key==="Enter"){ev.preventDefault();rdAddTerm(rdPop.dataset.v,ev.target.value)}else if(ev.key==="Escape")rdHidePop()}}
document.addEventListener("mouseup",e=>{if(rdPop&&rdPop.contains(e.target))return;setTimeout(rdShowPop,10)});
document.addEventListener("touchend",e=>{if(rdPop&&rdPop.contains(e.target))return;setTimeout(rdShowPop,350)});
document.addEventListener("keydown",e=>{if(e.key==="Escape")rdHidePop()});
window.addEventListener("scroll",()=>{if(rdPop&&!rdPop.contains(document.activeElement)&&Math.abs(window.scrollY-(+rdPop.dataset.y||0))>120)rdHidePop()},{passive:true});

// ===== Local coverage check (no AI): word matching against each control's official text =====
const CV_STOP=new Set("يجب ان أن على في من الى إلى مع بما ذلك التي الذي الذين او أو كل عن هذه هذا بين حسب وفق لدى عند ضمن بشكل لها له تكون يكون وان وأن كما مثل اي أي غير بعد قبل حيث التالي التالية الجهة للجهة بالجهة المتعلقة المتعلق تغطي يغطي بحد ادنى الأدنى الادنى كحد ذات وذلك ايضا أيضا خلال جميع الامن الأمن السيبراني للأمن متطلبات الضوابط ضابط shall must the and for with that this which into from such any all are be of to in on or by as an a is at it its their entity cybersecurity requirements requirement controls control including include".split(" "));
const cvNorm=s=>String(s||"").toLowerCase().replace(/[ً-ْـ]/g,"").replace(/[إأآ]/g,"ا").replace(/ى/g,"ي").replace(/ة/g,"ه").replace(/[^\p{L}\p{N}\s]/gu," ");
const cvStem=w=>{if(/[a-z]/.test(w)){return w.replace(/(ations?|ments?|ing|ies|es|s|ed)$/,"").slice(0,7)}
  if(w.length>4)w=w.replace(/^(وال|بال|فال|كال|لل|ال|و|ب|ل|ف)/,"");if(w.length>4)w=w.replace(/(ات|ون|ين|يه|ها|ه|ي)$/,"");return w.slice(0,6)};
let CV_STOPN=null;const cvWords=s=>{if(!CV_STOPN)CV_STOPN=new Set([...CV_STOP].map(w=>cvNorm(w).trim()));return cvNorm(s).split(/\s+/).filter(w=>w.length>2&&!CV_STOPN.has(w))};
function cvRun(){const txt=U.anaTxt||"";if(txt.length<200){toast("ألصق نص السياسة أولًا");return}if(!U.anaSel.size){toast("اختر مكونًا واحدًا على الأقل");return}
  const ar=(txt.match(/[؀-ۿ]/g)||[]).length>(txt.match(/[A-Za-z]/g)||[]).length;
  const bag=new Set(cvWords(txt).map(cvStem));
  const items=CTLS.filter(c=>U.anaSel.has(c.sub)).map(c=>{const src=ar?c.ar:(c.en||c.ar);const ws=[...new Map(cvWords(src).map(w=>[cvStem(w),w])).entries()].filter(([s])=>s.length>2);
    const hit=ws.filter(([s])=>bag.has(s)).map(x=>x[1]),miss=ws.filter(([s])=>!bag.has(s)).map(x=>x[1]);const p=ws.length?hit.length/ws.length:0;
    return {id:c.id,p,v:p>=.6?"covered":p>=.3?"weak":"missing",hit,miss}});
  U.cvRes={at:today(),ar,items};render();setTimeout(()=>{const e=$("#cv-res");if(e)e.scrollIntoView({behavior:"smooth",block:"start"})},50)}
function vCov(){const R=U.cvRes;if(!R)return "";const c={covered:0,weak:0,missing:0};R.items.forEach(i=>c[i.v]++);
  return `<section class="card c12" id="cv-res"><h2>فحص التغطية المحلي <span class="tag meth">مطابقة كلمات تقريبية، غير رسمية</span><span class="act"><button class="btn sm quiet" data-rd="cvclose">إغلاق</button></span></h2>
   <p class="lead">قارنت الأداة كلمات نص كل ضابط ${R.ar?"العربي":"الإنجليزي"} بكلمات سياستك، داخل جهازك ودون إرسال شيء. هي مؤشر سريع لما قد يكون ناقصًا، وليست حكمًا: كلمة موجودة لا تعني أن المتطلب مكتوب بصيغة ملزمة.</p>
   <div class="kpis" style="margin-bottom:12px"><div class="kpi good"><b>${c.covered}</b><span>كلماته مذكورة غالبًا</span></div><div class="kpi"><b style="color:var(--warn)">${c.weak}</b><span>مذكور جزئيًا</span></div><div class="kpi alert"><b>${c.missing}</b><span>لا يكاد يُذكر</span></div></div>
   <div class="verd">${R.items.sort((a,b)=>a.p-b.p).map(i=>{const v=VD[i.v];return `<div><span class="idb" data-act="go" data-id="${i.id}">${i.id}</span><div style="display:grid;gap:4px;min-width:0"><div class="row"><span class="pill ${v[1]}">${Math.round(i.p*100)}%</span><span class="note">${esc(short(tx(BY[i.id]),150))}</span></div>
     ${i.miss.length?`<span class="note"><b>كلمات لم تظهر في سياستك:</b> <span data-notr>${esc(i.miss.slice(0,10).join("، "))}</span></span>`:""}</div></div>`}).join("")}</div></section>`}
document.addEventListener("click",e=>{const t=e.target.closest("[data-rd=cvrun],[data-rd=cvclose]");if(!t)return;if(t.dataset.rd==="cvrun")cvRun();else{U.cvRes=null;render()}});
