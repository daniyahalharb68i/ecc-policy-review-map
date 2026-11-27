// ===== Reliable local saving: visible save status, storage-space warning, automatic rolling backups =====
U.saveErr=false;U.savedAt=null;U.storeWarn=null;
// called by saveLocal() after each attempt
function saveDone(ok,err){U.saveErr=!ok;if(ok)U.savedAt=new Date();
  if(!ok){toast(err&&/quota/i.test(String(err.name||err.message))?"لم يُحفظ آخر تعديل: مساحة التخزين في المتصفح ممتلئة. احفظ نسخة احتياطية مشفّرة الآن.":"لم يُحفظ آخر تعديل في المتصفح. احفظ نسخة احتياطية الآن.");render()}
  paintSync();storeCheck();abSchedule()}
// warn when the browser storage is nearly full; ask the browser to keep the data (not evict it)
let stLast=0;async function storeCheck(force){if(window.claude||!navigator.storage||!navigator.storage.estimate)return;if(!force&&Date.now()-stLast<60000)return;stLast=Date.now();
  try{const e=await navigator.storage.estimate();const r=e.quota?e.usage/e.quota:0;const w=r>=.8?Math.round(r*100):null;if(w!==U.storeWarn){U.storeWarn=w;softRender()}}catch(x){}}
if(!window.claude&&navigator.storage&&navigator.storage.persist){navigator.storage.persisted().then(p=>{if(!p)navigator.storage.persist().catch(()=>{})}).catch(()=>{})}
// automatic backups kept on this device: one every 10 minutes when something changed, the last 6 kept
const AB_PREFIX="__autobk_",AB_KEEP=6,AB_EVERY=10*60*1000;let abT=null,abSig="";
const abHash=s=>{let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return (h>>>0).toString(36)+":"+s.length};
function abSchedule(){if(window.claude||U.demo||U.locked||abT)return;abT=setTimeout(()=>{abT=null;abSave()},AB_EVERY)}
async function abSave(){if(window.claude||U.demo||U.locked)return;const txt=JSON.stringify(S);const sig=abHash(txt);if(sig===abSig||!Object.keys(S.ctl).length)return;
  try{let payload=txt;if(U.lockKey){const e=await lkEnc(new TextEncoder().encode(txt));payload={__enc:1,iv:e.iv,ct:e.ct}}
    await fdbOp("readwrite",s=>s.put({at:new Date().toISOString(),n:Object.keys(S.ctl).length,data:payload},AB_PREFIX+Date.now()));abSig=sig;
    const ks=(await fdbOp("readonly",s=>s.getAllKeys())).filter(k=>String(k).startsWith(AB_PREFIX)).sort();for(const k of ks.slice(0,Math.max(0,ks.length-AB_KEEP)))await fdbOp("readwrite",s=>s.delete(k))}catch(e){}}
async function abList(){try{const ks=(await fdbOp("readonly",s=>s.getAllKeys())).filter(k=>String(k).startsWith(AB_PREFIX)).sort().reverse();const out=[];for(const k of ks){const v=await fdbOp("readonly",s=>s.get(k));if(v)out.push({k,at:v.at,n:v.n})}return out}catch(e){return []}}
async function abRestore(k){try{const v=await fdbOp("readonly",s=>s.get(k));if(!v)return;let txt=v.data;
  if(txt&&txt.__enc){if(!U.lockKey){toast("افتح القفل أولًا");return}txt=new TextDecoder().decode(await lkDec(txt.iv,txt.ct))}
  const N=secSanitize(JSON.parse(txt));U.confirm={msg:`استرجاع النسخة التلقائية من ${esc(v.at.slice(0,16).replace("T"," "))}؟ سيحل محلها التقييم الحالي.`,yes:"استرجاع",fn:()=>replaceAll(N)};render()}catch(e){toast("تعذّر استرجاع النسخة التلقائية")}}
U.abItems=null;
function vAutoBackups(){if(window.claude)return "";if(U.abItems===null){U.abItems=[];abList().then(l=>{U.abItems=l;if(U.tab==="report")softRender()})}
  const L=U.abItems||[];
  return `<details class="ab"><summary>نسخ تلقائية على هذا الجهاز (${L.length})</summary><p class="note">تحفظ الأداة نسخة كل 10 دقائق عند وجود تغيير، وتحتفظ بآخر ${AB_KEEP}. تحميك من خطأ أو حذف غير مقصود، لكنها على الجهاز نفسه؛ فاحتفظ أيضًا بنسخة مشفّرة خارجه.</p>
   ${L.length?`<ul class="ab-l">${L.map(x=>`<li><span class="num">${esc(String(x.at).slice(0,16).replace("T"," "))}</span><span class="note">${x.n} ${LX("ضابطًا مقيّمًا","assessed controls")}</span><button class="btn sm quiet" data-ab="${esc(x.k)}">استرجاع</button></li>`).join("")}</ul>`:`<p class="note">لا نسخ تلقائية بعد.</p>`}
   <button class="btn sm quiet" data-ab="__now">احفظ نسخة تلقائية الآن</button></details>`}
document.addEventListener("click",async e=>{const t=e.target.closest("[data-ab]");if(!t)return;const k=t.dataset.ab;
  if(k==="__now"){abSig="";await abSave();U.abItems=null;render();toast("حُفظت نسخة تلقائية")}else abRestore(k)});
// count of evidence files that a JSON backup would leave out
const attCount=()=>Object.values(S.ctl).reduce((n,o)=>n+((o&&o.att)||[]).filter(r=>r.lid).length,0);

// ===== Local audit log (standalone): every change is recorded with time and the member name =====
function logLocal(what,id,extra){if(U.demo||U.locked)return;const k=uid(),t=Date.now();S.log=S.log||{};
  S.log[k]=Object.assign({at:t,_at:t,by:U.tsMe||"",what,id:id||""},extra||{});
  const ks=Object.keys(S.log);if(ks.length>1000)ks.sort((a,b)=>(S.log[a].at||0)-(S.log[b].at||0)).slice(0,ks.length-1000).forEach(x=>delete S.log[x]);saveLocal()}
// typing in a field logs at most one entry per field per minute
const leLast={};function logEdit(col,id,k){const key=col+"|"+id+"|"+k,t=Date.now();if(leLast[key]&&t-leLast[key]<60000)return;leLast[key]=t;logLocal("edit",id||"",{v:(col==="cfg"?"cfg.":"")+k})}
