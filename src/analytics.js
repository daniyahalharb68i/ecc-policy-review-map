// ===== Standalone version: no database. Visits are counted with GoatCounter (no cookies, no personal data). =====
// Only the page name and an optional, opt-in list of control IDs with gaps are sent. Never names, emails, entity data or text.
const GC_URL="https://ecc-map.goatcounter.com/count",GC_JS="https://gc.zgo.at/count.js";
const CLOUD=()=>!!window.claude;
function vAdmin(){return ""}
function sbOpen(){}
let gcReady=null,gcLast="";
function gcLoad(){if(gcReady||window.claude)return gcReady;
  window.goatcounter={no_onload:true,allow_local:false};
  gcReady=new Promise(ok=>{const s=document.createElement("script");s.async=true;s.src=GC_JS;s.dataset.goatcounter=GC_URL;s.onload=()=>ok(true);s.onerror=()=>ok(false);document.head.appendChild(s)});return gcReady}
function gcCount(path,title,event){if(window.claude)return;gcLoad().then(ok=>{try{if(ok&&window.goatcounter&&window.goatcounter.count)window.goatcounter.count({path,title:title||path,event:!!event})}catch(e){}})}
// one page view per screen the visitor opens
function guestTrack(){if(window.claude||U.demo)return;if(gcLast===U.tab)return;gcLast=U.tab;gcCount("/"+U.tab,(HEAD[U.tab]||[U.tab])[0])}
function sbStart(){if(window.claude)return;guestTrack()}

// Leftovers of the removed database version (sign-in session, chosen entity, guest profile): deleted from this browser.
(function(){try{const ks=[];for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(/^sb-|^supabase\./.test(k)||["ecc_org","ecc_guest","ecc_device","ecc_local_mode"].includes(k))ks.push(k)}ks.forEach(k=>localStorage.removeItem(k))}catch(e){}})();
document.addEventListener("change",async e=>{if(e.target.id!=="impfile")return;const f=e.target.files[0];e.target.value="";if(!f)return;
  try{importJSON(await f.text());setTimeout(()=>{const c=document.querySelector(".confirm");if(c)c.scrollIntoView({behavior:"smooth",block:"center"})},60)}catch(x){toast("تعذّرت قراءة الملف")}});
document.addEventListener("click",e=>{if(!e.target.closest("[data-act=bkhow]"))return;U.tab="report";render();setTimeout(()=>{const b=$("#backup");if(b)b.scrollIntoView({behavior:"smooth",block:"start"})},80)});
document.querySelectorAll("[data-mail]").forEach(a=>{const [u,d]=a.dataset.mail.split("|");a.href="mailto:"+u+"@"+d;a.title=u+"@"+d});
// ===== Public gap index: opt-in sharing of gap control IDs only =====
const GI_KEY="ecc_gap_index";
const giLast=()=>{try{return JSON.parse(localStorage.getItem(GI_KEY)||"null")}catch(e){return null}};
const giGaps=()=>CTLS.filter(c=>isGap(c.id)).map(c=>c.id);
function vGapIndex(){if(window.claude||U.demo)return "";const g=giGaps(),s=stats(CTLS),last=giLast();
  const ready=s.done>=10;
  return `<section class="card c12 gi"><h2>شارك في مؤشر الفجوات العام <span class="tag off">بيانات مُجمّعة دون أي معلومة تعرّف بجهتك</span></h2>
   <p class="lead">يجمع المؤشر أكثر ضوابط ECC التي تتعثر فيها الجهات، ليستفيد منه الجميع. المشاركة اختيارية، ولا تحتاج حسابًا.</p>
   ${ready?`<div class="box"><h4>هذا بالضبط ما سيُرسل، ولا شيء غيره</h4>
     <p class="note" style="margin:0 0 6px">أرقام الضوابط التي حالتها «جزئي» أو «غير ملتزم» (${g.length}):</p>
     <div class="gi-ids" dir="ltr">${g.length?g.map(id=>`<span class="mono">${id}</span>`).join(" "):`<span class="note">لا فجوات</span>`}</div>
     <p class="note" style="margin:8px 0 0">لا يُرسل اسم الجهة، ولا اسمك، ولا نوع الجهة، ولا نصوص أو ملاحظات أو أدلة أو ملفات. لا يمكن ربط الأرقام بجهتك.</p></div>
     <div class="row" style="margin-top:10px">${last?`<span class="note">شاركت آخر مرة في ${esc(last.at)} (${last.n} فجوة).</span>`:""}<button class="btn" data-act="gishare" ${g.length?"":"disabled"}>${last?"شارك التحديث":"شارك الآن"}</button></div>`
   :`<p class="note">يظهر خيار المشاركة بعد تقييم 10 ضوابط على الأقل (قيّمت ${s.done}).</p>`}</section>`}
async function giShare(){const g=giGaps();if(!g.length)return;const last=giLast();
  if(last&&last.at===today()){toast("شاركت اليوم بالفعل. شكرًا لك.");return}
  gcCount("/index/share","مشاركة في مؤشر الفجوات",true);
  g.forEach((id,i)=>setTimeout(()=>gcCount("/gap/"+id,"فجوة "+id,true),120*i));
  try{localStorage.setItem(GI_KEY,JSON.stringify({at:today(),n:g.length}))}catch(e){}
  toast("شكرًا لمشاركتك. أُرسلت أرقام الضوابط فقط.");render()}
document.addEventListener("click",e=>{const t=e.target.closest("[data-act=gishare]");if(t)giShare()});
