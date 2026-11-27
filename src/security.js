// ===== Security layer: file checks, import sanitising, encryption at rest, encrypted backup, full wipe =====

// ---------- 1) File validation: allowed type by extension AND by content signature, plus size limits ----------
const SEC_TYPES={
  pdf:{ext:["pdf"],sig:b=>b[0]===0x25&&b[1]===0x50&&b[2]===0x44&&b[3]===0x46},                 // %PDF
  ooxml:{ext:["docx","xlsx","pptx"],sig:b=>b[0]===0x50&&b[1]===0x4B&&b[2]===0x03&&b[3]===0x04},  // ZIP (Office)
  png:{ext:["png"],sig:b=>b[0]===0x89&&b[1]===0x50&&b[2]===0x4E&&b[3]===0x47},
  jpg:{ext:["jpg","jpeg"],sig:b=>b[0]===0xFF&&b[1]===0xD8&&b[2]===0xFF},
  webp:{ext:["webp"],sig:b=>b[0]===0x52&&b[1]===0x49&&b[2]===0x46&&b[3]===0x46&&b[8]===0x57&&b[9]===0x45&&b[10]===0x42&&b[11]===0x50},
  text:{ext:["txt","md"],sig:b=>!b.slice(0,4096).includes(0)},                                   // no binary bytes
  json:{ext:["json"],sig:b=>{let i=0;if(b[0]===0xEF&&b[1]===0xBB&&b[2]===0xBF)i=3;while(i<b.length&&/\s/.test(String.fromCharCode(b[i])))i++;return b[i]===0x7B}},
  ecc:{ext:["ecc"],sig:b=>new TextDecoder().decode(b.slice(0,8))==="ECCTEAM1"}};
const SEC_RULES={ // what each place accepts, and its maximum size
  analyzer:{types:["pdf","ooxml","text"],ooxml:["docx"],max:25*1024*1024,label:"PDF أو Word أو نص"},
  evidence:{types:["pdf","ooxml","png","jpg","webp"],max:20*1024*1024,label:"PDF أو Word أو Excel أو PowerPoint أو صورة PNG/JPG/WEBP"},
  backup:{types:["json","ecc"],max:300*1024*1024,label:"نسخة احتياطية JSON أو ECC"},
  team:{types:["ecc"],max:300*1024*1024,label:"حزمة فريق ECC"}};
async function secCheck(file,where){const R=SEC_RULES[where];if(!file)return {ok:false,why:"لم يُختر ملف"};
  const ext=(String(file.name).split(".").pop()||"").toLowerCase();
  const t=R.types.find(k=>SEC_TYPES[k].ext.includes(ext)&&(k!=="ooxml"||!R.ooxml||R.ooxml.includes(ext)));
  if(!t)return {ok:false,why:`نوع الملف غير مسموح هنا. المسموح: ${R.label}.`};
  if(!file.size)return {ok:false,why:"الملف فارغ."};
  if(file.size>R.max)return {ok:false,why:`حجم الملف أكبر من الحد المسموح (${Math.round(R.max/1048576)} ميجابايت).`};
  let head;try{head=new Uint8Array(await file.slice(0,4096).arrayBuffer())}catch(e){return {ok:false,why:"تعذّرت قراءة الملف."}}
  if(!SEC_TYPES[t].sig(head))return {ok:false,why:"محتوى الملف لا يطابق امتداده، فرُفض احتياطًا."};
  return {ok:true,type:t,ext}}

// ---------- 2) Sanitising imported data (JSON backups and team packages) ----------
const SEC_BAD_KEYS=new Set(["__proto__","prototype","constructor"]),SEC_ID=/^[A-Za-z0-9_\-]{1,80}$/,SEC_DATE=/^\d{4}-\d{2}-\d{2}$/;
function secDeep(v,d){if(d>8)return undefined;if(v==null)return v;const t=typeof v;
  if(t==="string")return v.length>250000?v.slice(0,250000):v;if(t==="number")return isFinite(v)?v:0;if(t==="boolean")return v;
  if(Array.isArray(v))return v.slice(0,5000).map(x=>secDeep(x,d+1)).filter(x=>x!==undefined);
  if(t==="object"){const o={};Object.keys(v).slice(0,5000).forEach(k=>{if(SEC_BAD_KEYS.has(k))return;const x=secDeep(v[k],d+1);if(x!==undefined)o[k]=x});return o}return undefined}
const SEC_ENUM={d:["y","p","n"],i:["y","p","n"],e:["y","p","n"],app:["m","r","na"],imp:["H","M","L"],eff:["S","M","L"],rs:["prog","done"],rt:["mit","acc","trf","avd"],ph:["1","2","3"],rl:["1","2","3","4","5"],ri:["1","2","3","4","5"]};
const SEC_STR={n:20000,ev_d:5000,ev_i:5000,ev_e:5000,own:200,rem:20000,appWhy:2000,rk:2000,exw:5000,exc:5000,exa:200,_by:80,name:300,ver:40,label:300,at:40,ad:10,txt:250000,by:80,what:40,id:80,v:500};
function secTypes(o){Object.keys(o).forEach(k=>{if(k in SEC_STR){if(typeof o[k]!=="string"){if(typeof o[k]==="number"&&k!=="at")o[k]=String(o[k]);else if(!(k==="at"&&typeof o[k]==="number"))delete o[k]}if(typeof o[k]==="string"&&o[k].length>SEC_STR[k])o[k]=o[k].slice(0,SEC_STR[k])}});
  if("_f" in o&&(typeof o._f!=="object"||Array.isArray(o._f)))delete o._f;if(o._f)Object.keys(o._f).forEach(k=>{if(typeof o._f[k]!=="number")delete o._f[k]});
  ["subs","items","res","ai","gtr","cond","rep"].forEach(k=>{if(k in o&&(o[k]===null||typeof o[k]!=="object"))delete o[k]});
  // "per" is a number (review cycle, documents) or an object (status per control, snapshots)
  if("per" in o&&!(typeof o.per==="number"&&isFinite(o.per)&&o.per>=0&&o.per<=120)&&!(o.per&&typeof o.per==="object"&&!Array.isArray(o.per)))delete o.per;return o}
function secItem(o){if(!o||typeof o!=="object"||Array.isArray(o))return null;secTypes(o);
  Object.keys(SEC_ENUM).forEach(k=>{if(k in o&&!SEC_ENUM[k].includes(String(o[k])))delete o[k]});
  ["due","exu","ad","at"].forEach(k=>{if(k in o&&typeof o[k]==="string"&&o[k].length===10&&!SEC_DATE.test(o[k]))delete o[k]});
  if("gd" in o)o.gd=Array.isArray(o.gd)?o.gd.filter(n=>Number.isInteger(n)&&n>=0&&n<500):undefined;
  if("att" in o)o.att=Array.isArray(o.att)?o.att.filter(r=>r&&typeof r==="object").map(r=>{const x={};["name","type","at","by","lid","aid"].forEach(k=>{if(typeof r[k]==="string")x[k]=r[k].slice(0,300)});if(typeof r.size==="number")x.size=r.size;if(typeof r.url==="string"&&/^(https:\/\/|sb:)/.test(r.url))x.url=r.url;return x}):undefined;
  if("_at" in o&&typeof o._at!=="number")delete o._at;
  Object.keys(o).forEach(k=>{if(o[k]===undefined)delete o[k]});return o}
function secSanitize(raw){const src=secDeep(raw,0)||{},N=blank();
  ["ctl","sub","docs","snaps","fw","ana","audit","team","reports","log"].forEach(c=>{if(src[c]&&typeof src[c]==="object"&&Object.keys(src[c]).length>5000)src[c]=Object.fromEntries(Object.entries(src[c]).slice(0,5000))});
  if(src.cfg&&typeof src.cfg==="object"){["entity","assessor","exec","execEn","date","type"].forEach(k=>{if(k in src.cfg&&typeof src.cfg[k]!=="string")delete src.cfg[k]});if(typeof src.cfg.exec==="string")src.cfg.exec=src.cfg.exec.slice(0,20000);if(typeof src.cfg.entity==="string")src.cfg.entity=src.cfg.entity.slice(0,300)}
  const cfg=src.cfg&&typeof src.cfg==="object"?src.cfg:{};N.cfg=Object.assign(N.cfg,cfg);
  if(N.cfg.type&&!ETYPES.some(x=>x[0]===N.cfg.type))N.cfg.type="";if(N.cfg.date&&!SEC_DATE.test(N.cfg.date))N.cfg.date="";
  if(typeof N.cfg.cond!=="object"||Array.isArray(N.cfg.cond))N.cfg.cond={};if(typeof N.cfg.rep!=="object"||Array.isArray(N.cfg.rep))N.cfg.rep={};
  ["ctl","sub","docs","snaps","fw","ana","audit","team","reports","log"].forEach(col=>{const C0=src[col];if(!C0||typeof C0!=="object"||Array.isArray(C0))return;
    Object.keys(C0).forEach(id=>{if(col==="ctl"&&!BY[id])return;if(col==="sub"&&!SUBBY[id])return;if(col!=="ctl"&&col!=="sub"&&!SEC_ID.test(id))return;
      const it=col==="ctl"?secItem(C0[id]):(C0[id]&&typeof C0[id]==="object"&&!Array.isArray(C0[id])?C0[id]:null);if(!it)return;
      if(col!=="ctl")secTypes(it);
      if(col==="snaps"){if(it.at&&!SEC_DATE.test(it.at))return;["comp","c","p","x","gaps","paper"].forEach(k=>{if(k in it&&typeof it[k]!=="number"&&it[k]!==null)delete it[k]});if(it.per&&typeof it.per==="object")Object.keys(it.per).forEach(k=>{if(!BY[k]||!(it.per[k] in ST))delete it.per[k]})}
      if(col==="docs"&&Array.isArray(it.subs))it.subs=it.subs.filter(x=>SUBBY[x]);
      N[col][id]=it})});
  return N}

// ---------- 3) Encryption at rest: the assessment, the hidden-words list and evidence files, locked by a password ----------
const LK_ENC=LK+"_enc",LOCK_META="ecc_lock",LOCK_IDLE=15*60*1000;
const b64=u=>{let s="";new Uint8Array(u).forEach(c=>s+=String.fromCharCode(c));return btoa(s)},ub64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const lockMeta=()=>{try{return JSON.parse(localStorage.getItem(LOCK_META)||"null")}catch(e){return null}};
U.lockKey=null;U.locked=!!lockMeta()&&!window.claude;
async function lkDerive(pw,salt,iter){const base=await crypto.subtle.importKey("raw",new TextEncoder().encode(pw),"PBKDF2",false,["deriveKey"]);
  return crypto.subtle.deriveKey({name:"PBKDF2",salt,iterations:iter,hash:"SHA-256"},base,{name:"AES-GCM",length:256},false,["encrypt","decrypt"])}
async function lkEnc(bytes){const iv=crypto.getRandomValues(new Uint8Array(12));return {iv,ct:await crypto.subtle.encrypt({name:"AES-GCM",iv},U.lockKey,bytes)}}
async function lkDec(iv,ct,key){return crypto.subtle.decrypt({name:"AES-GCM",iv},key||U.lockKey,ct)}
// evidence files in IndexedDB (called by fdbPut / fdbGet)
async function secWrapPut(b){if(!U.lockKey||!(b instanceof Blob))return b;const e=await lkEnc(await b.arrayBuffer());return {__enc:1,iv:e.iv,ct:e.ct,type:b.type||""}}
async function secUnwrapGet(v){if(!v||!v.__enc)return v;if(!U.lockKey)throw new Error("locked");return new Blob([await lkDec(v.iv,v.ct)],{type:v.type})}
// state: called from saveLocal(); returns true when it handled saving
let lkBusy=Promise.resolve();
function secSave(){if(!lockMeta()||window.claude)return false;if(!U.lockKey)return true; // locked: never overwrite with plaintext
  lkBusy=lkBusy.then(async()=>{const e=await lkEnc(new TextEncoder().encode(JSON.stringify({S,rd:U.rd.terms})));
    try{localStorage.setItem(LK_ENC,JSON.stringify({iv:b64(e.iv),ct:b64(e.ct)}));localStorage.removeItem(LK);localStorage.removeItem("ecc_rd");if(typeof saveDone==="function")saveDone(true)}catch(x){if(typeof saveDone==="function")saveDone(false,x);else toast("تعذّر الحفظ: مساحة التخزين ممتلئة")}}).catch(()=>{});return true}
async function fdbAllKeys(){return fdbOp("readonly",s=>s.getAllKeys())}
async function fdbRaw(k){return fdbOp("readonly",s=>s.get(k))}
async function fdbRawPut(k,v){return fdbOp("readwrite",s=>s.put(v,k))}
async function lockEnable(pw){if(pw.length<10){toast("كلمة المرور 10 أحرف على الأقل");return false}
  const salt=crypto.getRandomValues(new Uint8Array(16)),iter=310000;U.lockKey=await lkDerive(pw,salt,iter);
  const chk=await lkEnc(new TextEncoder().encode("ECC-LOCK-OK"));
  for(const k of await fdbAllKeys()){const v=await fdbRaw(k);if(v instanceof Blob)await fdbRawPut(k,await secWrapPut(v))}
  localStorage.setItem(LOCK_META,JSON.stringify({v:1,salt:b64(salt),iter,chk:{iv:b64(chk.iv),ct:b64(chk.ct)}}));
  secSave();await lkBusy;U.locked=false;lkTouch();toast("فُعّلت الحماية. بيانات التقييم والملفات مشفّرة الآن على هذا الجهاز.");render();return true}
async function lockDisable(){if(!U.lockKey)return;
  for(const k of await fdbAllKeys()){const v=await fdbRaw(k);if(v&&v.__enc)await fdbRawPut(k,await secUnwrapGet(v))}
  localStorage.removeItem(LOCK_META);localStorage.removeItem(LK_ENC);U.lockKey=null;
  try{localStorage.setItem(LK,JSON.stringify(S))}catch(e){}rdSave();toast("أُلغيت الحماية بكلمة المرور.");render()}
async function lockOpen(pw){const m=lockMeta();if(!m)return false;
  try{const key=await lkDerive(pw,ub64(m.salt),m.iter);const ok=new TextDecoder().decode(await lkDec(ub64(m.chk.iv),ub64(m.chk.ct),key));if(ok!=="ECC-LOCK-OK")return false;
    U.lockKey=key;const raw=localStorage.getItem(LK_ENC);
    if(raw){const p=JSON.parse(raw);const o=JSON.parse(new TextDecoder().decode(await lkDec(ub64(p.iv),ub64(p.ct))));S=secSanitize(o.S||{});U.rd.terms=Array.isArray(o.rd)?o.rd.filter(t=>t&&typeof t.val==="string"):[]}
    U.locked=false;lkTouch();return true}catch(e){return false}}
async function lockNow(){if(!U.lockKey)return;secSave();await lkBusy;
  U.lockKey=null;U.locked=true;S=blank();U.anaTxt="";U.anaName="";U.anaRes=null;U.cvRes=null;U.rd.ents={};U.aiOut={};U.confirm=null;if(U.ts){U.ts.pw=""}
  render();lockShow()}
// lock screen
function lockShow(msg){let el=document.getElementById("lockov");if(!el){el=document.createElement("div");el.id="lockov";el.setAttribute("role","dialog");el.setAttribute("aria-modal","true");document.body.appendChild(el)}
  el.dir=U.lang==="en"?"ltr":"rtl";
  el.innerHTML=`<form class="lock-card" data-lockf><img src="${LOGO_MARK}" alt="" width="56" height="56"><h2>التقييم محمي بكلمة مرور</h2><p class="note">بيانات التقييم والملفات على هذا الجهاز مشفّرة. اكتب كلمة المرور لفتحها.</p>
   <input id="lock-pw" type="password" autocomplete="current-password" placeholder="كلمة المرور" required>${msg?`<p class="lock-msg" role="alert">${esc(msg)}</p>`:""}
   <button class="btn" type="submit">فتح</button>
   <details class="lock-forgot"><summary>نسيت كلمة المرور؟</summary><p class="note">لا يمكن استرجاع البيانات المشفّرة دون كلمة المرور، ولا نملك نسخة منها. يمكنك مسح بيانات الأداة من هذا الجهاز ثم استرجاع آخر نسخة احتياطية.</p><button type="button" class="btn danger ghost" data-sec="wipe">مسح بيانات الأداة من هذا الجهاز</button></details></form>`;
  applyLang(el);el.dir=U.lang==="en"?"ltr":"rtl";setTimeout(()=>{const p=document.getElementById("lock-pw");if(p)p.focus()},30)}
document.addEventListener("submit",async e=>{if(!e.target.closest("[data-lockf]"))return;e.preventDefault();const pw=($("#lock-pw")||{}).value||"";
  const b=e.target.querySelector("button[type=submit]");b.disabled=true;
  if(await lockOpen(pw)){const el=document.getElementById("lockov");if(el)el.remove();render();toast("فُتح التقييم")}else{lockShow("كلمة المرور غير صحيحة")}});
// auto-lock after 15 minutes without activity
let lkLast=Date.now();const lkTouch=()=>{lkLast=Date.now()};["pointerdown","keydown","scroll","touchstart"].forEach(ev=>window.addEventListener(ev,lkTouch,{passive:true}));
setInterval(()=>{if(U.lockKey&&Date.now()-lkLast>LOCK_IDLE)lockNow()},30000);

// ---------- 4) Encrypted backup (with evidence files) and restore ----------
async function bkEncrypted(){const a=($("#bk-pw")||{}).value||"",b=($("#bk-pw2")||{}).value||"";
  if(a.length<10){toast("كلمة مرور النسخة 10 أحرف على الأقل");return}if(a!==b){toast("كلمتا المرور غير متطابقتين");return}
  try{const bytes=await tsEncrypt(await tsPack(),a);await saveBlob(`ECC-backup-${today()}.ecc`,new Blob([bytes],{type:"application/octet-stream"}));toast("حُفظت نسخة احتياطية مشفّرة مع المرفقات")}catch(e){toast("تعذّر إنشاء النسخة")}}
async function bkRestore(file){const chk=await secCheck(file,"backup");if(!chk.ok){toast(chk.why);return}
  try{let N;
    if(chk.type==="ecc"){const pw=($("#bk-pw")||{}).value||"";if(!pw){toast("اكتب كلمة مرور النسخة في خانة كلمة المرور أولًا");return}
      const p=await tsUnpack(await tsDecrypt(await file.arrayBuffer(),pw));N=secSanitize(p.st)}
    else{N=secSanitize(JSON.parse(await file.text()))}
    U.confirm={msg:`سيُستبدل التقييم الحالي بمحتوى النسخة (${Object.keys(N.ctl).length} ضابطًا مقيّمًا).`,yes:"استبدال",fn:()=>{replaceAll(N);logEv("import")}};render();
    setTimeout(()=>{const c=document.querySelector(".confirm");if(c)c.scrollIntoView({behavior:"smooth",block:"center"})},60)}
  catch(e){toast(e.message==="password"?"كلمة مرور النسخة غير صحيحة":e.message==="format"?"هذا الملف ليس نسخة احتياطية":"الملف تالف أو ليس نسخة احتياطية صالحة")}}

// ---------- 5) Full wipe of everything the tool stored on this device ----------
async function secWipe(){try{Object.keys(localStorage).filter(k=>k.startsWith("ecc_")||k===LK||k===LK_ENC).forEach(k=>localStorage.removeItem(k))}catch(e){}
  try{sessionStorage.clear()}catch(e){}
  await new Promise(ok=>{try{if(_fdb)_fdb.then(d=>d.close()).catch(()=>{});const r=indexedDB.deleteDatabase("ecc_files");r.onsuccess=r.onerror=r.onblocked=()=>ok()}catch(e){ok()}});
  location.reload()}
document.addEventListener("click",e=>{const t=e.target.closest("[data-sec]");if(!t)return;const a=t.dataset.sec;
  if(a==="wipe"){if(confirm(tr("سيُحذف من هذا الجهاز كل ما حفظته الأداة: التقييم، والمرفقات، والإعدادات. لا يمكن التراجع. هل تريد المتابعة؟")))secWipe()}
  else if(a==="lockon"){const p=($("#lk-pw")||{}).value||"",q=($("#lk-pw2")||{}).value||"";if(p!==q){toast("كلمتا المرور غير متطابقتين");return}lockEnable(p)}
  else if(a==="lockoff"){U.confirm={msg:"إلغاء الحماية؟ ستُحفظ بيانات التقييم والملفات على هذا الجهاز دون تشفير.",yes:"إلغاء الحماية",fn:lockDisable};render()}
  else if(a==="locknow")lockNow();
  else if(a==="bkenc")bkEncrypted()});
function vSecurity(){if(window.claude)return "";const on=!!lockMeta();
  return `<section class="card c12" id="security"><h2>حماية البيانات على هذا الجهاز</h2>
   <p class="lead">بيانات التقييم محفوظة في متصفحك. فعّل الحماية لتُشفَّر (AES-256) بكلمة مرور لا تُحفظ في أي مكان، فلا يقرؤها من يفتح هذا المتصفح بعدك. تُقفل الأداة تلقائيًا بعد 15 دقيقة دون استخدام.</p>
   ${on?`<div class="row"><span class="pill s-c">الحماية مفعّلة</span><button class="btn" data-sec="locknow">قفل الآن</button><button class="btn quiet" data-sec="lockoff">إلغاء الحماية</button></div>`
     :`<div class="ts-pw" style="max-width:420px"><input id="lk-pw" type="password" autocomplete="new-password" placeholder="كلمة مرور جديدة (10 أحرف على الأقل)"><input id="lk-pw2" type="password" autocomplete="new-password" placeholder="أعد كتابة كلمة المرور"></div>
       <div class="row" style="margin-top:8px"><button class="btn" data-sec="lockon">تفعيل الحماية بكلمة مرور</button></div>
       <p class="note" style="margin:8px 0 0"><b>تنبيه:</b> إن نسيت كلمة المرور فلا يمكن استرجاع البيانات المشفّرة. احفظ نسخة احتياطية مشفّرة أولًا.</p>`}
   <details style="margin-top:12px"><summary>مسح كل بيانات الأداة من هذا الجهاز</summary><p class="note">يحذف التقييم، والمرفقات، وكلمات الإخفاء، وإعدادات الفريق من هذا المتصفح. استخدمه عند تسليم الجهاز أو الانتهاء من العمل على جهاز مشترك.</p><button class="btn danger ghost" data-sec="wipe">مسح نهائي من هذا الجهاز</button></details></section>`}
// show the lock screen on start if the data is protected
if(U.locked){const go=()=>lockShow();if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",go);else setTimeout(go,0)}
