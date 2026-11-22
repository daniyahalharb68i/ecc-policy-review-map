// ===== Team space without a server =====
// One encrypted file (.ecc) lives in the entity's own shared storage (OneDrive, SharePoint, Google Drive, network folder).
// Everyone opens the same file with the same password; on every sync the tool reads it, merges by last edit, and writes it back.
// Encryption: PBKDF2-SHA256 (310,000 rounds) → AES-256-GCM, in the browser. The password never leaves the device and is never stored.
const TS_MAGIC="ECCTEAM1",TS_ITER=310000,TS_HKEY="__team_handle";
const TS_FS=typeof window.showOpenFilePicker==="function"&&typeof window.showSaveFilePicker==="function"&&!window.claude;
U.ts=U.ts||{h:null,name:"",pw:"",at:"",busy:false,st:null,need:null};
try{U.tsMe=localStorage.getItem("ecc_ts_me")||""}catch(e){U.tsMe=""}
if(!window.claude){const tt=NAV.flatMap(g=>g[1]).find(x=>x[0]==="team");if(tt)tt[1]="مساحة الفريق";HEAD.team=["مساحة الفريق","اعملوا على تقييم واحد من ملف مشفّر في التخزين المشترك لجهتكم، دون أي خادم."]}

// --- crypto ---
const enc=new TextEncoder();
async function tsKey(pw,salt){const base=await crypto.subtle.importKey("raw",enc.encode(pw),"PBKDF2",false,["deriveKey"]);
  return crypto.subtle.deriveKey({name:"PBKDF2",salt,iterations:TS_ITER,hash:"SHA-256"},base,{name:"AES-GCM",length:256},false,["encrypt","decrypt"])}
async function tsEncrypt(bytes,pw){const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));
  const ct=new Uint8Array(await crypto.subtle.encrypt({name:"AES-GCM",iv},await tsKey(pw,salt),bytes));
  const out=new Uint8Array(8+16+12+ct.length);out.set(enc.encode(TS_MAGIC),0);out.set(salt,8);out.set(iv,24);out.set(ct,36);return out}
async function tsDecrypt(buf,pw){const b=new Uint8Array(buf);if(new TextDecoder().decode(b.slice(0,8))!==TS_MAGIC)throw new Error("format");
  try{return new Uint8Array(await crypto.subtle.decrypt({name:"AES-GCM",iv:b.slice(24,36)},await tsKey(pw,b.slice(8,24)),b.slice(36)))}catch(e){throw new Error("password")}}

// --- package: state + evidence files ---
async function tsPack(){const z=new JSZip();z.file("state.json",JSON.stringify(S));z.file("about.txt","ECC Policy Review Map team file. Open it with the tool and the team password.");
  const lids=new Set();Object.values(S.ctl).forEach(o=>(o.att||[]).forEach(r=>{if(r.lid)lids.add(r.lid)}));
  for(const k of lids){try{const b=await fdbGet(k);if(b)z.file("att/"+k,b)}catch(e){}}
  return z.generateAsync({type:"uint8array",compression:"DEFLATE"})}
async function tsUnpack(bytes){const z=await JSZip.loadAsync(bytes);const st=JSON.parse(await z.file("state.json").async("string"));
  const types={};Object.values(st.ctl||{}).forEach(o=>(o.att||[]).forEach(r=>{if(r.lid)types[r.lid]=r.type||""}));
  let files=0;for(const p of Object.keys(z.files).filter(p=>p.startsWith("att/")&&!z.files[p].dir)){const k=p.slice(4);
    try{if(!(await fdbGet(k))){const ab=await z.file(p).async("arraybuffer");await fdbPut(k,new Blob([ab],{type:types[k]||""}));files++}}catch(e){}}
  return {st,files}}

// --- merge field by field: for each field the newest edit wins (each field carries its own edit time in _f),
//     a field cleared later stays cleared, and evidence attachments from both sides are combined ---
const TS_META=new Set(["_at","_by","_f"]);
const attKey=r=>r.lid||r.aid||(r.name+"|"+(r.size||"")+"|"+(r.at||""));
function tsField(o,k){if(o._f&&o._f[k]!=null)return o._f[k];return k in o?(o._at||0):-1}
function tsMergeItem(a,b){const out={},keys=new Set([...Object.keys(a),...Object.keys(b)].filter(k=>!TS_META.has(k)));let ch=false;
  keys.forEach(k=>{if(k==="att"&&(a.att||b.att)){const m=new Map();(a.att||[]).concat(b.att||[]).forEach(r=>{if(!m.has(attKey(r)))m.set(attKey(r),r)});const v=[...m.values()];out.att=v;if(v.length!==(a.att||[]).length)ch=true;return}
    const ta=tsField(a,k),tb=tsField(b,k);
    if(tb>ta){if(k in b)out[k]=b[k];if(JSON.stringify(a[k])!==JSON.stringify(b[k]))ch=true}else if(k in a)out[k]=a[k]});
  const f=Object.assign({},a._f||{});Object.entries(b._f||{}).forEach(([k,t])=>{if(!(f[k]>=t))f[k]=t});if(Object.keys(f).length)out._f=f;
  out._at=Math.max(a._at||0,b._at||0);const nb=(b._at||0)>(a._at||0);out._by=nb?b._by:a._by;if(!out._by)delete out._by;if(!out._at)delete out._at;
  return {v:out,ch}}
function tsMerge(N){const r={add:0,upd:0,keep:0};
  COLS.concat(["log"]).forEach(col=>{const A=S[col]=S[col]||{},Bc=N[col]||{};Object.keys(Bc).forEach(id=>{const a=A[id],b=Bc[id];
    if(!a){A[id]=b;r.add++;return}if(typeof a!=="object"||typeof b!=="object")return;const m=tsMergeItem(a,b);A[id]=m.v;if(m.ch)r.upd++;else r.keep++})});
  if(N.cfg){const m=tsMergeItem(S.cfg,N.cfg);S.cfg=Object.assign(blank().cfg,m.v);if(m.ch)r.upd++}
  saveLocal();return r}

// --- file handle (Chrome / Edge on a computer) ---
async function tsRemember(h){try{await fdbOp("readwrite",s=>s.put(h,TS_HKEY))}catch(e){}}
async function tsForget(){try{await fdbOp("readwrite",s=>s.delete(TS_HKEY))}catch(e){}}
(async()=>{if(!TS_FS)return;try{const h=await fdbGet(TS_HKEY);if(h&&h.kind==="file"){U.ts.h=h;U.ts.name=h.name;U.ts.need="reconnect";if(U.tab==="team")render()}}catch(e){}})();
async function tsPerm(h){const o={mode:"readwrite"};if((await h.queryPermission(o))==="granted")return true;return (await h.requestPermission(o))==="granted"}
async function tsRead(h){const f=await h.getFile();return f.size?await f.arrayBuffer():null}
async function tsWrite(h,bytes){const w=await h.createWritable();await w.write(bytes);await w.close()}

async function tsSync(quiet){const T=U.ts;if(!T.h||!T.pw||T.busy)return;T.busy=true;if(!quiet)render();
  try{const buf=await tsRead(T.h);let r={add:0,upd:0,keep:0},files=0;
    if(buf){const p=await tsUnpack(await tsDecrypt(buf,T.pw));r=tsMerge(p.st);files=p.files}
    await tsWrite(T.h,await tsEncrypt(await tsPack(),T.pw));
    T.at=new Date().toTimeString().slice(0,5);T.st=r;T.err="";T.dirty=false;
    if(!quiet||r.add||r.upd)toast(r.add||r.upd?`تمت المزامنة: ${r.add} جديد و${r.upd} محدّث من زملائك${files?`، و${files} مرفق`:""}`:"تمت المزامنة، ولا تعديلات جديدة من زملائك")}
  catch(e){T.err=e.message==="password"?"كلمة المرور غير صحيحة لهذا الملف":e.message==="format"?"هذا الملف ليس ملف مساحة فريق":"تعذّرت المزامنة. تأكد أن الملف غير مفتوح للتعديل في برنامج آخر.";
    if(e.message==="password")T.pw="";toast(T.err)}
  finally{T.busy=false;softRender()}}
// sync shortly after edits, and check the shared file every 2 minutes while the page is open
let tsT=null;function tsTouch(){if(!U.ts.h||!U.ts.pw)return;U.ts.dirty=true;clearTimeout(tsT);tsT=setTimeout(()=>tsSync(true),15000)}
setInterval(()=>{if(U.ts.h&&U.ts.pw&&document.visibilityState==="visible")tsSync(true)},120000);
window.addEventListener("beforeunload",e=>{if(U.ts.dirty){e.preventDefault();e.returnValue=""}});

// --- actions ---
const tsPw=(p="ts")=>($("#"+p+"-pw")||{}).value||"",tsPw2=(p="ts")=>($("#"+p+"-pw2")||{}).value||"";
function tsCheckNew(p="ts"){const a=tsPw(p),b=tsPw2(p);if(a.length<8){toast("كلمة المرور 8 أحرف على الأقل");return null}if(a!==b){toast("كلمتا المرور غير متطابقتين");return null}return a}
const TS_TYPES=[{description:"ECC team file",accept:{"application/octet-stream":[".ecc"]}}];
async function tsCreate(){const pw=tsCheckNew();if(!pw)return;try{
  const h=await window.showSaveFilePicker({suggestedName:"ECC-team-"+((S.cfg.entity||"").replace(/[\\/:*?"<>|]+/g,"").slice(0,30)||"space")+".ecc",types:TS_TYPES});
  Object.assign(U.ts,{h,name:h.name,pw,need:null,err:""});await tsRemember(h);await tsWrite(h,await tsEncrypt(await tsPack(),pw));U.ts.at=new Date().toTimeString().slice(0,5);
  toast("أُنشئ ملف مساحة الفريق. شارك مكانه وكلمة المرور مع فريقك.");render()}catch(e){if(e.name!=="AbortError")toast("تعذّر إنشاء الملف")}}
async function tsOpen(){try{const [h]=await window.showOpenFilePicker({types:TS_TYPES,multiple:false});Object.assign(U.ts,{h,name:h.name,pw:"",need:"password",err:""});await tsRemember(h);render();setTimeout(()=>{const p=$("#ts-pw");if(p)p.focus()},50)}catch(e){if(e.name!=="AbortError")toast("تعذّر فتح الملف")}}
async function tsUnlock(){const pw=tsPw();if(!pw){toast("اكتب كلمة مرور الملف");return}if(!(await tsPerm(U.ts.h))){toast("لم يُسمح للأداة بتعديل الملف");return}
  U.ts.pw=pw;U.ts.need=null;await tsSync(false)}
async function tsClose(){await tsForget();U.ts={h:null,name:"",pw:"",at:"",busy:false,st:null,need:null};render()}
// fallback: download / upload the package (phones, Safari, Firefox)
async function tsExport(){const pw=tsCheckNew("tsx");if(!pw)return;try{const b=await tsEncrypt(await tsPack(),pw);
  const nm="ECC-team-"+today()+".ecc";if(window.claude&&U.dl)await U.dl.save({filename:nm,data:new Blob([b])});else dlFile(nm,new Blob([b],{type:"application/octet-stream"}));toast("صُدّرت الحزمة المشفّرة")}catch(e){toast("تعذّر التصدير")}}
async function tsImport(f){const pw=tsPw("tsx");if(!pw){toast("اكتب كلمة مرور الحزمة أولًا");return}
  try{const p=await tsUnpack(await tsDecrypt(await f.arrayBuffer(),pw));const r=tsMerge(p.st);render();
    toast(`دُمجت الحزمة: ${r.add} جديد و${r.upd} محدّث${p.files?`، و${p.files} مرفق`:""}. ما عدّلته أنت لاحقًا بقي كما هو.`)}
  catch(e){toast(e.message==="password"?"كلمة المرور غير صحيحة":e.message==="format"?"هذا الملف ليس حزمة فريق":"تعذّر قراءة الحزمة")}}
document.addEventListener("click",e=>{const t=e.target.closest("[data-ts]");if(!t)return;const a=t.dataset.ts;
  ({create:tsCreate,open:tsOpen,unlock:tsUnlock,sync:()=>tsSync(false),close:tsClose,export:tsExport,reconnect:()=>{U.ts.need="password";render();setTimeout(()=>{const p=$("#ts-pw");if(p)p.focus()},50)}}[a]||(()=>{}))()});
document.addEventListener("change",e=>{if(e.target.id==="ts-file"){const f=e.target.files[0];e.target.value="";if(f)tsImport(f)}
  else if(e.target.id==="ts-me"){U.tsMe=e.target.value.trim().slice(0,60);try{localStorage.setItem("ecc_ts_me",U.tsMe)}catch(x){}}});
document.addEventListener("keydown",e=>{if(e.key==="Enter"&&e.target.id==="ts-pw"&&U.ts.need){e.preventDefault();tsUnlock()}});

// --- page ---
function vTeamSpace(){const T=U.ts,con=T.h&&T.pw;
  const me=`<section class="card c12"><h2>اسمك في الفريق</h2><div class="row"><input id="ts-me" value="${esc(U.tsMe||"")}" placeholder="مثل: سارة — الحوكمة" style="max-width:320px" autocomplete="name"><span class="note">يظهر بجانب ما تعدّله، ليعرف زملاؤك من غيّر ماذا. يُحفظ في جهازك فقط.</span></div></section>`;
  const pwf=(two,p="ts")=>`<div class="ts-pw"><input id="${p}-pw" type="password" placeholder="كلمة مرور الفريق" autocomplete="new-password">${two?`<input id="${p}-pw2" type="password" placeholder="أعد كتابة كلمة المرور (للتصدير)" autocomplete="new-password">`:""}</div>`;
  let main;
  if(!TS_FS)main=`<p class="note">الحفظ المباشر على ملف مشترك متاح في Chrome أو Edge على الحاسب. في هذا المتصفح استخدم الحزمة المشفّرة أدناه.</p>`;
  else if(con)main=`<div class="ts-on"><div><span class="ts-dot"></span><b>متصل بـ</b> <span class="mono" dir="ltr">${esc(T.name)}</span></div>
     <p class="note" style="margin:4px 0 0">${T.busy?"جارٍ المزامنة…":T.at?`آخر مزامنة ${T.at}${T.st?` · ${T.st.add} جديد، ${T.st.upd} محدّث من الزملاء`:""}`:""}${T.err?` · <span style="color:var(--bad)">${esc(T.err)}</span>`:""}</p>
     <p class="note" style="margin:4px 0 0">تُحفظ تعديلاتك في الملف تلقائيًا بعد 15 ثانية من آخر تعديل، وتُقرأ تعديلات زملائك كل دقيقتين.</p>
     <div class="row" style="margin-top:10px"><button class="btn" data-ts="sync" ${T.busy?"disabled":""}>مزامنة الآن</button><button class="btn quiet" data-ts="close">قطع الاتصال</button></div></div>`;
  else if(T.h&&T.need)main=`<div class="ts-on"><div><b>${T.need==="reconnect"?"آخر ملف استخدمته:":"الملف:"}</b> <span class="mono" dir="ltr">${esc(T.name)}</span></div>
     <p class="note">اكتب كلمة مرور الفريق لفتحه. لا تُحفظ كلمة المرور في أي مكان.</p>${pwf(false)}${T.err?`<p class="note" style="color:var(--bad)">${esc(T.err)}</p>`:""}
     <div class="row" style="margin-top:8px"><button class="btn" data-ts="unlock">فتح ومزامنة</button><button class="btn quiet" data-ts="close">ملف آخر</button></div></div>`;
  else main=`<div class="ts-two"><div class="box"><h4>أنا أول من يبدأ</h4><p class="note">اختر كلمة مرور للفريق، ثم احفظ الملف في مجلد مشترك لجهتكم.</p>${pwf(true)}<button class="btn" data-ts="create" style="margin-top:8px">إنشاء ملف مساحة الفريق</button></div>
     <div class="box"><h4>زميلي أنشأ الملف</h4><p class="note">افتح الملف من المجلد المشترك، ثم اكتب كلمة مرور الفريق.</p><button class="btn ghost" data-ts="open" style="margin-top:8px">فتح ملف مساحة فريق</button></div></div>`;
  const how=`<section class="card c12"><h2>كيف تعمل مساحة الفريق</h2><ol class="steps2">
     <li>ينشئ مدير التقييم ملفًا مشفّرًا ويحفظه في مجلد مشترك تعتمده جهتكم، مثل OneDrive أو SharePoint أو مجلد الشبكة.</li>
     <li>يعطي الفريق مكان الملف وكلمة المرور، بقناة مختلفة عن الإيميل إن أمكن.</li>
     <li>يفتح كل عضو الملف من الأداة، ويعمل على المكونات المسندة إليه.</li>
     <li>عند كل مزامنة تقرأ الأداة الملف، وتأخذ لكل ضابط آخر تعديل، ثم تحفظ النتيجة فيه. لا يُحذف شيء أثناء الدمج.</li></ol>
   <p class="note" style="margin:0"><b>لماذا هذا آمن:</b> الملف مشفّر بمعيار AES-256 قبل أن يغادر جهازك، ويبقى داخل تخزين جهتكم لا عندنا. من دون كلمة المرور لا يمكن قراءته. <b>تنبيه:</b> إن عدّل شخصان الضابط نفسه بين مزامنتين، يُعتمد التعديل الأحدث.</p></section>`;
  const pkg=`<section class="card c12" id="ts-pkg"><h2>حزمة الفريق المشفّرة <span class="note">للجوال، أو للإرسال بالبريد، أو كنسخة احتياطية كاملة مع المرفقات</span></h2>
   <div class="ts-two"><div class="box"><h4>تصدير</h4><p class="note">ملف واحد مشفّر فيه التقييم كاملًا والمرفقات.</p>${pwf(true,"tsx")}<button class="btn" data-ts="export" style="margin-top:8px">تصدير الحزمة</button></div>
    <div class="box"><h4>استيراد ودمج</h4><p class="note">اكتب كلمة مرور الحزمة في خانة التصدير المجاورة، ثم اختر الملف. تُدمج مع تقييمك ولا تحل محله.</p><label class="btn ghost attpick" style="margin-top:8px">اختيار حزمة .ecc<input type="file" id="ts-file" accept=".ecc" hidden></label></div></div></section>`;
  return `<div class="grid"><section class="card c12"><h2>ملف مساحة الفريق <span class="tag off">دون خادم · داخل تخزين جهتكم</span></h2>${main}</section>${me}${how}${TS_FS&&(con||T.need)?"":pkg}</div>`}
