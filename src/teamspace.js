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
async function tsPack(meta){const z=new JSZip();z.file("state.json",JSON.stringify(S));z.file("about.txt","ECC Policy Review Map team file. Open it with the tool and the team password.");
  if(meta)z.file("meta.json",JSON.stringify(meta));
  const lids=new Set();Object.values(S.ctl).forEach(o=>(o.att||[]).forEach(r=>{if(r.lid)lids.add(r.lid)}));
  for(const k of lids){try{const b=await fdbGet(k);if(b)z.file("att/"+k,b)}catch(e){}}
  return z.generateAsync({type:"uint8array",compression:"DEFLATE"})}
async function tsUnpack(bytes){const z=await JSZip.loadAsync(bytes);const st=secSanitize(JSON.parse(await z.file("state.json").async("string")));
  const types={};Object.values(st.ctl||{}).forEach(o=>(o.att||[]).forEach(r=>{if(r.lid)types[r.lid]=r.type||""}));
  let files=0;for(const p of Object.keys(z.files).filter(p=>p.startsWith("att/")&&!z.files[p].dir)){const k=p.slice(4);
    try{if(!(await fdbGet(k))){const ab=await z.file(p).async("arraybuffer");await fdbPut(k,new Blob([ab],{type:types[k]||""}));files++}}catch(e){}}
  let meta=null;try{const m=z.file("meta.json");if(m){const o=JSON.parse(await m.async("string"));meta={rev:+o.rev||0,by:String(o.by||"").slice(0,60),at:+o.at||0,wid:String(o.wid||"").slice(0,40),lease:+o.lease||0}}}catch(e){}
  return {st,files,meta}}

// --- three-way conflict detection: a field changed on BOTH sides since the last common sync (the "base") ---
// The newest edit still wins, but the other value is never lost silently: it is kept in a conflict list
// (with both values), and the whole remote version is kept as a conflict copy you can download.
const tsVal=(o,k)=>o&&k in o?JSON.stringify(o[k]):undefined;
function tsConflicts(base,mine,theirs){if(!base)return [];const out=[];
  COLS.forEach(col=>{const B0=base[col]||{},M=mine[col]||{},T=theirs[col]||{};
    Object.keys(T).forEach(id=>{const b=B0[id],m=M[id],t=T[id];if(!m||!t||typeof m!=="object")return;
      new Set([...Object.keys(m),...Object.keys(t)].filter(k=>!TS_META.has(k)&&k!=="att")).forEach(k=>{
        const vb=tsVal(b,k),vm=tsVal(m,k),vt=tsVal(t,k);if(vm!==vb&&vt!==vb&&vm!==vt)out.push({col,id,k,mine:m[k],theirs:t[k],by:t._by||"",at:Date.now()})})})});
  return out}
U.ts.wid=U.ts.wid||(crypto.randomUUID?crypto.randomUUID():String(Math.random()).slice(2));
U.ts.conflicts=[];
const TS_BASE="__ts_base",TS_CONF="__ts_conflict";
async function tsSaveBase(){try{await fdbPut(TS_BASE,new Blob([JSON.stringify(S)],{type:"application/json"}))}catch(e){}}
async function tsLoadBase(){try{const b=await fdbGet(TS_BASE);return b?JSON.parse(await b.text()):null}catch(e){return null}}
async function tsKeepConflictCopy(remote){try{await fdbPut(TS_CONF,new Blob([JSON.stringify({at:new Date().toISOString(),remote})],{type:"application/json"}));U.ts.hasCopy=true}catch(e){}}
async function tsDownloadConflictCopy(){try{const b=await fdbGet(TS_CONF);if(!b){toast("لا توجد نسخة تعارض");return}await saveBlob(`ECC-conflict-copy-${today()}.json`,b)}catch(e){toast("تعذّر تنزيل نسخة التعارض")}}
function tsResolve(i,useTheirs){const c=U.ts.conflicts[i];if(!c)return;const o=S[c.col]&&S[c.col][c.id];if(!o)return;
  const v=useTheirs?c.theirs:c.mine;if(v===undefined)delete o[c.k];else o[c.k]=v;o._f=Object.assign({},o._f,{[c.k]:Date.now()});
  persist(c.col,c.id);logEv("conflict",c.id,{v:`${c.k}: ${useTheirs?"قيمة الزميل":"قيمتي"}`});U.ts.conflicts.splice(i,1);render()}

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

// Coordinated sync (no server): a short lease in the file tells others "someone is saving now";
// the file is re-checked right before writing and re-read after writing. If anyone wrote in between,
// we merge their version again instead of overwriting it (optimistic concurrency, up to 5 attempts).
const TS_LEASE=12000,sigOf=f=>f.lastModified+":"+f.size,sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function tsSync(quiet){const T=U.ts;if(U.locked||!T.h||!T.pw||T.busy)return;T.busy=true;if(!quiet)render();
  try{let r={add:0,upd:0,keep:0},files=0,done=false,newConf=[];if(!T.base)T.base=await tsLoadBase();
    for(let attempt=0;attempt<5&&!done;attempt++){
      const f1=await T.h.getFile(),sig1=sigOf(f1);let remote=null,meta=null;
      if(f1.size){const p=await tsUnpack(await tsDecrypt(await f1.arrayBuffer(),T.pw));remote=p.st;meta=p.meta;files+=p.files}
      // someone else holds a fresh lease: wait a little and start over
      if(meta&&meta.wid!==T.wid&&meta.lease>Date.now()){T.waitBy=meta.by;await sleep(800+Math.random()*1500);continue}
      if(remote){const cf=tsConflicts(T.base,S,remote);if(cf.length){newConf=newConf.concat(cf);await tsKeepConflictCopy(remote)}const m=tsMerge(remote);r.add+=m.add;r.upd+=m.upd}
      const rev=((meta&&meta.rev)||0)+1,mine={rev,by:U.tsMe||"",at:Date.now(),wid:T.wid,lease:Date.now()+TS_LEASE};
      const bytes=await tsEncrypt(await tsPack(mine),T.pw);
      const f2=await T.h.getFile();if(sigOf(f2)!==sig1)continue;              // changed while we merged: merge again
      await tsWrite(T.h,bytes);
      const f3=await T.h.getFile();const p3=await tsUnpack(await tsDecrypt(await f3.arrayBuffer(),T.pw));
      if(!p3.meta||p3.meta.wid!==T.wid||p3.meta.rev!==rev)continue;           // overwritten right after us: merge again
      done=true;T.rev=rev}
    if(!done)throw new Error("busy");
    if(newConf.length){const seen=new Set(T.conflicts.map(c=>c.col+c.id+c.k));newConf.forEach(c=>{if(!seen.has(c.col+c.id+c.k))T.conflicts.push(c)});
      logEv("conflict","",{v:newConf.length+" تعارض"});toast(`تنبيه: ${newConf.length} تعارض. عدّل زميلك الحقل نفسه؛ راجعها في «مساحة الفريق».`)}
    T.base=JSON.parse(JSON.stringify(S));await tsSaveBase();
    T.at=new Date().toTimeString().slice(0,5);T.st=r;T.err="";T.dirty=false;T.waitBy="";
    if((!quiet||r.add||r.upd)&&!newConf.length)toast(r.add||r.upd?`تمت المزامنة: ${r.add} جديد و${r.upd} محدّث من زملائك${files?`، و${files} مرفق`:""}`:"تمت المزامنة، ولا تعديلات جديدة من زملائك")}
  catch(e){T.err=e.message==="password"?"كلمة المرور غير صحيحة لهذا الملف":e.message==="format"?"هذا الملف ليس ملف مساحة فريق":e.message==="busy"?"الملف مشغول بمزامنة زميل. ستُعاد المحاولة تلقائيًا.":"تعذّرت المزامنة. تأكد أن الملف غير مفتوح للتعديل في برنامج آخر.";
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
async function tsImport(f){const ck=await secCheck(f,"team");if(!ck.ok){toast(ck.why);return}const pw=tsPw("tsx");if(!pw){toast("اكتب كلمة مرور الحزمة أولًا");return}
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
  else main=`<div class="ts-two"><div class="box"><h3>أنا أول من يبدأ</h3><p class="note">اختر كلمة مرور للفريق، ثم احفظ الملف في مجلد مشترك لجهتكم.</p>${pwf(true)}<button class="btn" data-ts="create" style="margin-top:8px">إنشاء ملف مساحة الفريق</button></div>
     <div class="box"><h3>زميلي أنشأ الملف</h3><p class="note">افتح الملف من المجلد المشترك، ثم اكتب كلمة مرور الفريق.</p><button class="btn ghost" data-ts="open" style="margin-top:8px">فتح ملف مساحة فريق</button></div></div>`;
  const how=`<section class="card c12"><h2>كيف تعمل مساحة الفريق</h2><ol class="steps2">
     <li>ينشئ مدير التقييم ملفًا مشفّرًا ويحفظه في مجلد مشترك تعتمده جهتكم، مثل OneDrive أو SharePoint أو مجلد الشبكة.</li>
     <li>يعطي الفريق مكان الملف وكلمة المرور، بقناة مختلفة عن الإيميل إن أمكن.</li>
     <li>يفتح كل عضو الملف من الأداة، ويعمل على المكونات المسندة إليه.</li>
     <li>عند كل مزامنة تقرأ الأداة الملف، وتأخذ لكل ضابط آخر تعديل، ثم تحفظ النتيجة فيه. لا يُحذف شيء أثناء الدمج.</li></ol>
   <p class="note" style="margin:0"><b>لماذا هذا آمن:</b> الملف مشفّر بمعيار AES-256 قبل أن يغادر جهازك، ويبقى داخل تخزين جهتكم لا عندنا. من دون كلمة المرور لا يمكن قراءته. <b>تنبيه:</b> إن عدّل شخصان الضابط نفسه بين مزامنتين، يُعتمد التعديل الأحدث.</p></section>`;
  const pkg=`<section class="card c12" id="ts-pkg"><h2>حزمة الفريق المشفّرة <span class="note">للجوال، أو للإرسال بالبريد، أو كنسخة احتياطية كاملة مع المرفقات</span></h2>
   <div class="ts-two"><div class="box"><h3>تصدير</h3><p class="note">ملف واحد مشفّر فيه التقييم كاملًا والمرفقات.</p>${pwf(true,"tsx")}<button class="btn" data-ts="export" style="margin-top:8px">تصدير الحزمة</button></div>
    <div class="box"><h3>استيراد ودمج</h3><p class="note">اكتب كلمة مرور الحزمة في خانة التصدير المجاورة، ثم اختر الملف. تُدمج مع تقييمك ولا تحل محله.</p><label class="btn ghost attpick" style="margin-top:8px">اختيار حزمة .ecc<input type="file" id="ts-file" accept=".ecc" hidden></label></div></div></section>`;
  return `<div class="grid"><section class="card c12"><h2>ملف مساحة الفريق <span class="tag off">دون خادم · داخل تخزين جهتكم</span></h2>${main}${T.waitBy?`<p class="note">ينتظر انتهاء مزامنة ${esc(T.waitBy)}…</p>`:""}</section>${tsConfView()}${me}${how}${tsAuditView()}${TS_FS&&(con||T.need)?"":pkg}</div>`}

// --- conflicts and audit views ---
const FIELD_NAMES={d:"موثّق",i:"مطبّق",e:"فعّال",n:"ملاحظات",ev_d:"دليل التوثيق",ev_i:"دليل التطبيق",ev_e:"دليل الفاعلية",own:"المسؤول",due:"الموعد",rem:"خطة المعالجة",rs:"حالة المعالجة",ph:"المرحلة",app:"الانطباق",gd:"مخرجات الدليل",rk:"وصف الخطر",rl:"الاحتمالية",ri:"الأثر",rt:"المعالجة",exw:"مبرر الاستثناء",exc:"الإجراء البديل",exa:"معتمد الاستثناء",exu:"انتهاء الاستثناء"};
const cv=v=>v===undefined?"(فارغ)":typeof v==="object"?JSON.stringify(v):String(v);
function tsConfView(){const L=U.ts.conflicts||[];if(!L.length&&!U.ts.hasCopy)return "";
  return `<section class="card c12 ts-conf"><h2>تعارضات المزامنة (${L.length}) ${U.ts.hasCopy?'<span class="act"><button class="btn sm quiet" data-tsc="copy">تنزيل نسخة التعارض</button></span>':""}</h2>
   <p class="lead">عدّلت أنت وزميلك الحقل نفسه منذ آخر مزامنة. اعتمدت الأداة التعديل الأحدث، واحتفظت بالقيمة الأخرى هنا لتقرر بنفسك. نسخة الزميل الكاملة محفوظة كنسخة تعارض.</p>
   ${L.length?`<div class="tw"><table><thead><tr><th>العنصر</th><th>الحقل</th><th>قيمتي</th><th>قيمة الزميل</th><th></th></tr></thead><tbody>${L.map((c,i)=>`<tr><td>${c.col==="ctl"&&BY[c.id]?idb(c.id):esc(c.col+" "+c.id)}</td><td>${esc(FIELD_NAMES[c.k]||c.k)}</td><td data-notr>${esc(cv(c.mine)).slice(0,300)}</td><td data-notr>${esc(cv(c.theirs)).slice(0,300)}${c.by?` <span class="note">— ${esc(c.by)}</span>`:""}</td><td class="row"><button class="btn sm" data-tsc="mine" data-i="${i}">اعتمد قيمتي</button><button class="btn sm quiet" data-tsc="theirs" data-i="${i}">اعتمد قيمة الزميل</button></td></tr>`).join("")}</tbody></table></div>`:""}</section>`}
function tsAuditView(){const L=Object.values(S.log||{}).sort((a,b)=>(b.at||0)-(a.at||0)).slice(0,100);
  return `<section class="card c12"><h2>سجل التعديلات <span class="note">آخر ${L.length}</span></h2>
   <p class="note" style="margin-top:0"><b>تنبيه:</b> الاسم في السجل هو ما كتبه العضو في «اسمك في الفريق» على جهازه، وليس إثباتًا لهويته؛ فلا توجد حسابات أو تحقق من الهوية في النسخة المحلية. يُدمج السجل بين أعضاء الفريق مع كل مزامنة.</p>
   ${L.length?`<div class="tw"><table><thead><tr><th>الوقت</th><th>العضو</th><th>الإجراء</th><th>العنصر</th><th>التفصيل</th></tr></thead><tbody>${L.map(l=>`<tr><td class="num nw">${new Date(l.at).toISOString().slice(0,16).replace("T"," ")}</td><td>${esc(l.by||"—")}</td><td>${esc(LOGT[l.what]||l.what)}</td><td>${l.id&&BY[l.id]?idb(l.id):esc(l.id||"")}</td><td class="note">${esc(FIELD_NAMES[l.v]||l.v||"")}</td></tr>`).join("")}</tbody></table></div>`:`<p class="note">لا تعديلات مسجلة بعد.</p>`}</section>`}
document.addEventListener("click",e=>{const t=e.target.closest("[data-tsc]");if(!t)return;const a=t.dataset.tsc;if(a==="copy")tsDownloadConflictCopy();else tsResolve(+t.dataset.i,a==="theirs")});
