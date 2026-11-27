document.documentElement.lang="ar";document.documentElement.dir="rtl";
// ===== Index =====
const SUBS=[],CTLS=[],BY={},SUBBY={};
ECC.forEach(d=>d.subs.forEach(s=>{s.dom=d.id;SUBS.push(s);SUBBY[s.id]=s;s.c.forEach((c,i)=>{c.sub=s.id;c.dom=d.id;c.last=i===s.c.length-1;
  c.kind=/^يجب تحديد وتوثيق واعتماد/.test(c.ar)?"doc":/^يجب تطبيق/.test(c.ar)?"impl":c.s?"req":(c.last&&/مراجعة/.test(c.ar))?"rev":"other";
  const m=c.ar.match(/ويفضل[^.،]*(،[^.]*)?\./);c.pref=m?m[0]:"";const me=c.en.match(/It is recommended[^.]*\./);c.prefEn=me?me[0]:"";CTLS.push(c);BY[c.id]=c})}));
const NSUBC=CTLS.reduce((n,c)=>n+(c.s?c.s.length:0),0);
const CCCBY={};CCC.forEach(r=>r.e.forEach(id=>{const k=id.split("-").length>=3?id.split("-").slice(0,3).join("-"):id;(CCCBY[k]=CCCBY[k]||[]).push(r)}));

// ===== Official/derived rule sets =====
const ETYPES=[
 ["gov","جهة حكومية","وزارة أو هيئة أو مؤسسة حكومية، داخل المملكة أو خارجها"],
 ["govco","شركة أو جهة تابعة لجهة حكومية","الشركات والجهات التابعة للجهات الحكومية"],
 ["cni","جهة قطاع خاص مرتبطة ببنى تحتية وطنية حساسة","تملك أو تشغّل أو تستضيف بنى تحتية وطنية حساسة"],
 ["other","جهة أخرى","قطاع خاص لا يملك ولا يشغّل ولا يستضيف بنى تحتية وطنية حساسة"]];
const OBLIG=new Set(["gov","govco","cni"]);
const SCOPE_Q="تُطبَّق هذه الضوابط على الجهات الحكومية في المملكة العربية السعودية (وتشمل الوزارات والهيئات والمؤسسات وغيرها) والجهات والشركات التابعة لها (داخل المملكة وخارجها)، وجهات القطاع الخاص التي تمتلك بنى تحتية وطنية حساسة (Critical National Infrastructures \"CNIs\") أو تقوم بتشغيلها أو استضافتها… كما تُشجّع الهيئة الجهات الأخرى في المملكة وبشدة على الاستفادة من هذه الضوابط لتطبيق أفضل الممارسات فيما يتعلق بتحسين الأمن السيبراني وتطويره داخل الجهة.";
const SCOPE_Q2="…ويجب على كل جهة الالتزام بجميع الضوابط القابلة للتطبيق عليها. من الأمثلة على الضوابط التي تتفاوت فيها قابلية التطبيق من جهة إلى أخرى حسب طبيعة أعمال الجهة واستخدامها للتقنيات المذكورة: الضوابط ضمن المكون الفرعي رقم (٤-٢) المتعلقة بالأمن السيبراني للحوسبة السحابية والاستضافة… تكون قابلة التطبيق وملزمة على الجهة التي تستخدم حالياً خدمات الحوسبة السحابية والاستضافة أو تخطط لاستخدامها.";
const SCOPE_SRC="ECC-2:2024، قسم «نطاق العمل وقابلية التطبيق»";
const COND=[
 {k:"cloud",q:"هل تستخدم الجهة خدمات الحوسبة السحابية أو الاستضافة لدى طرف خارجي، أو تخطط لاستخدامها؟",o:[["yes","نعم"],["plan","نخطط"],["no","لا"]],na:v=>v==="no",subs:["4-2"],off:true,trig:"نص قسم «قابلية التطبيق داخل الجهة»: ضوابط 4-2 «تكون قابلة التطبيق وملزمة على الجهة التي تستخدم حالياً خدمات الحوسبة السحابية والاستضافة أو تخطط لاستخدامها»."},
 {k:"tp",q:"هل تتعامل الجهة مع أطراف خارجية (موردين، مقدمي خدمات، متعاقدين)؟",o:[["yes","نعم"],["no","لا"]],na:v=>v==="no",subs:["4-1"],trig:"المجال الفرعي 4-1 مخصّص للأمن السيبراني المتعلق بالأطراف الخارجية."},
 {k:"web",q:"هل لدى الجهة تطبيقات ويب خارجية متاحة من الإنترنت؟",o:[["yes","نعم"],["no","لا"]],na:v=>v==="no",subs:["2-15"],trig:"نص المجال الفرعي 2-15: «حماية تطبيقات الويب الخارجية للجهة»."},
 {k:"dev",q:"هل لدى الجهة مشاريع تطوير تطبيقات أو برمجيات خاصة بها (داخليًا أو عبر متعاقد)؟",o:[["yes","نعم"],["no","لا"]],na:v=>v==="no",ctls:["1-6-3"],trig:"نص الضابط 1-6-3: «متطلبات الأمن السيبراني لمشاريع تطوير التطبيقات والبرمجيات الخاصة للجهة»."},
 {k:"intl",q:"هل لدى الجهة اتفاقيات أو التزامات دولية معتمدة محليًا تتضمن متطلبات أمن سيبراني؟",o:[["yes","نعم"],["no","لا"]],na:v=>v==="no",ctls:["1-7-1"],trig:"نص الضابط 1-7-1 يبدأ بعبارة «في حال وجود اتفاقيات أو التزامات دولية معتمدة محلياً…»."},
 {k:"byod",q:"هل يُسمح للأجهزة الشخصية للعاملين (BYOD) بالارتباط بشبكة الجهة؟",o:[["yes","نعم"],["no","لا"]],note:{"2-6":"الجزء الخاص بالأجهزة الشخصية (BYOD) في 2-6 ينطبق «عند ارتباطها بشبكة الجهة» بنص الضابط 2-6-1؛ أما متطلبات أجهزة الجهة المحمولة فتبقى منطبقة."},trig:"نص الضابط 2-6-1: «…والأجهزة الشخصية للعاملين (BYOD) عند ارتباطها بشبكة الجهة»."}];
// Tool methodology (not official): foundation subdomains first
const FOUND=new Set(["1-1","1-2","1-3","1-4","1-5","2-1"]);
const LAYERS=[["d","موثّق","المتطلب مكتوب في وثيقة معتمدة من صاحب الصلاحية"],["i","مطبّق","يوجد دليل تشغيلي على أن المتطلب يُنفَّذ فعلًا"],["e","فعّال","يُراجَع دوريًا وتوجد نتائج قياس أو مراجعة موثقة"]];
const LV=[["y","نعم"],["p","جزئي"],["n","لا"]];
const ST={"":["لم يُقيَّم","s-"],w:["قيد التقييم","s-w"],c:["ملتزم","s-c"],p:["التزام جزئي","s-p"],x:["غير ملتزم","s-x"],na:["لا ينطبق","s-na"]};
const AP={u:["لم يُحدد بعد","a-u"],m:["إلزامي","a-m"],r:["موصى به","a-r"],na:["لا ينطبق","a-na"]};
const IMP=[["H","أثر عالٍ"],["M","أثر متوسط"],["L","أثر منخفض"]],EFF=[["S","جهد قليل"],["M","جهد متوسط"],["L","جهد كبير"]];
const PH={1:["المرحلة 1","0 إلى 30 يومًا"],2:["المرحلة 2","31 إلى 60 يومًا"],3:["المرحلة 3","61 إلى 90 يومًا"]};

// ===== State =====
const COLS=["ctl","sub","docs","snaps","fw","ana","audit","team","reports"];
let S=blank();
function blank(){return {cfg:{entity:"",assessor:"",date:"",type:"",cond:{},exec:"",rep:{}},ctl:{},sub:{},docs:{},snaps:{},fw:{},ana:{},audit:{},team:{},reports:{},log:{}}}
// Server-enforced write levels per path (sharing level of the viewer). Mirrors the db rules declared at publish.
const DB_RULES=[{path:"meta",read:"view",write:"admin"},{path:"team",read:"view",write:"admin"},{path:"snaps",read:"view",write:"admin"},{path:"fw",read:"view",write:"admin"},{path:"reports",read:"view",write:"admin"},{path:"ctl",read:"view",write:"interact"},{path:"sub",read:"view",write:"interact"},{path:"docs",read:"view",write:"interact"},{path:"ana",read:"view",write:"interact"},{path:"audit",read:"view",write:"interact"},{path:"log",read:"view",write:"interact"}];
const ROLES={lead:["مدير التقييم","يعدّل كل شيء: النطاق، والفريق، واللقطات، والتقارير الرسمية","محرر (Editor)"],assessor:["مقيّم","يقيّم الضوابط ويسجّل الأدلة والوثائق في المكونات المسندة إليه","مساهم (Contributor)"],viewer:["مطّلع","يطّلع على كل شيء دون تعديل","مشاهد (Viewer)"]};
const RANK={viewer:0,assessor:1,lead:2};
const U={tab:"home",lvl:{owner:false,admin:false,write:null},logs:[],dom:"1",open:{},q:"",f:"all",gv:"board",gm:false,demo:false,real:null,db:null,user:null,me:"",names:{},ai:null,dl:null,sync:"local",busy:{},aiOut:{},anaRes:null,anaSel:new Set(),anaTxt:"",anaName:"",confirm:null,audit:null,cmpA:"",cmpB:"",fwText:""};
const LK="ecc_policy_map_v3";
try{const r=localStorage.getItem(LK);if(r){const o=JSON.parse(r);S=Object.assign(blank(),o);S.cfg=Object.assign(blank().cfg,o.cfg||{})}}catch(e){}

// ===== Helpers =====
const $=s=>document.querySelector(s);
const esc=s=>String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const today=()=>{const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")};
function addMonths(iso,m){if(!iso||!m)return "";const d=new Date(iso+"T00:00:00");if(isNaN(d))return "";d.setMonth(d.getMonth()+(+m));return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")}
const pct=(n,t)=>t?Math.round(n/t*100):0;
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const short=(t,n)=>{t=String(t||"");return t.length>n?t.slice(0,n-1)+"…":t};
function toast(t){const e=$("#toast");e.textContent=plainAr(tr(t));e.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(()=>e.hidden=true,2400)}
const C=id=>S.ctl[id]||{};

// ===== Applicability =====
function ruleNA(c){for(const q of COND){if(!q.na)continue;const v=S.cfg.cond[q.k];if(!v||!q.na(v))continue;
  if((q.subs&&q.subs.includes(c.sub))||(q.ctls&&q.ctls.includes(c.id)))return q}return null}
function appOf(id){const c=BY[id],o=C(id);
  if(o.app)return {v:o.app,src:"manual",why:o.appWhy||""};
  const r=ruleNA(c);if(r)return {v:"na",src:"rule",why:r.trig};
  if(!S.cfg.type)return {v:"u",src:"unset",why:""};
  return OBLIG.has(S.cfg.type)?{v:"m",src:"scope",why:""}:{v:"r",src:"scope",why:""}}
// ===== Derived status =====
function dst(id){if(appOf(id).v==="na")return "na";const o=C(id),d=o.d||"",i=o.i||"";
  if(!d&&!i)return "";if(!d||!i)return "w";if(d==="y"&&i==="y")return "c";if(d==="n"&&i==="n")return "x";return "p"}
const isPaper=id=>{const o=C(id);return appOf(id).v!=="na"&&o.d==="y"&&o.i==="n"};
const noEvidence=id=>{const o=C(id);return dst(id)==="c"&&!(o.att||[]).length&&!o.ev_d&&!o.ev_i&&!o.ev_e};
const effState=id=>{const o=C(id);return dst(id)!=="c"?"":o.e==="y"?"y":o.e==="p"?"p":o.e==="n"?"n":"u"};
const isUndoc=id=>{const o=C(id);return appOf(id).v!=="na"&&o.i==="y"&&(o.d==="n"||o.d==="p")};
function mat(id){const o=C(id);if(o.d!=="y")return o.d==="p"?.5:0;if(o.i!=="y")return o.i==="p"?1.5:1;return o.e==="y"?3:o.e==="p"?2.5:2}
function stats(list){const r={c:0,p:0,x:0,w:0,na:0,none:0,total:list.length,m:0,r:0,u:0,paper:0,undoc:0,eff:0,prelim:!scopeReady()};
  list.forEach(c=>{const s=dst(c.id);if(s)r[s]++;else r.none++;const a=appOf(c.id).v;if(a==="m")r.m++;if(a==="r")r.r++;if(a==="u")r.u++;if(s==="c"&&C(c.id).e==="y")r.eff++;if(isPaper(c.id))r.paper++;if(isUndoc(c.id))r.undoc++});
  r.app=r.total-r.na;r.done=r.c+r.p+r.x;r.comp=r.done?Math.round(r.c/r.done*1000)/10:null;return r}
// ===== Gaps & roadmap =====
// scope is complete when the entity type is set and every applicability question is answered
const scopeMissing=()=>COND.filter(q=>!S.cfg.cond[q.k]).length;
const scopeReady=()=>!!S.cfg.type&&scopeMissing()===0;
function isGap(id){const s=dst(id);return s==="p"||s==="x"}
function score(id){const c=BY[id],o=C(id),a=appOf(id).v;return ({H:3,M:2,L:1}[o.imp||"M"])*2+(FOUND.has(c.sub)?2:0)+(a==="m"||a==="u"?2:0)+(c.kind==="doc"?1:0)-({S:0,M:1,L:2}[o.eff||"M"])}
function phaseOf(id){const o=C(id);if(o.ph)return +o.ph;const s=score(id);return s>=8?1:s>=5?2:3}
function depOf(id){const c=BY[id];if(c.kind==="doc")return null;const d=SUBBY[c.sub].c.find(x=>x.kind==="doc"&&x.id!==id);if(!d)return null;return dst(d.id)==="c"?null:d.id}
function missingLayer(id){const o=C(id);if(o.d!=="y")return "التوثيق";if(o.i!=="y")return "التطبيق";if(o.e!=="y")return "الفاعلية";return ""}
function gapList(){return CTLS.filter(c=>isGap(c.id)&&(!U.gm||appOf(c.id).v==="m")).map(c=>({c,ph:phaseOf(c.id),sc:score(c.id)})).sort((a,b)=>a.ph-b.ph||b.sc-a.sc||a.c.id.localeCompare(b.c.id,undefined,{numeric:true}))}
// ===== Official implementation guide (GECC-2:2026) =====
const GD=id=>GUIDE[id]||{t:[],g:[],d:[]};
const gdHave=id=>{const n=GD(id).d.length;return (C(id).gd||[]).filter(i=>i<n).length};
function evStat(list){let h=0,t=0;list.forEach(c=>{if(appOf(c.id).v==="na")return;t+=GD(c.id).d.length;h+=gdHave(c.id)});return {h,t,p:t?Math.round(h/t*100):0}}
function guideText(id,short){const g=GD(id);const gl=short?g.g.slice(0,3).map(x=>x.slice(0,220)):g.g.slice(0,10);
  return (gl.length?"إرشادات التطبيق من الدليل الرسمي (GECC-2:2026):\n- "+gl.join("\n- "):"")+(g.d.length&&!short?"\nالمخرجات المتوقعة في الدليل الرسمي:\n"+g.d.map((x,i)=>`${i+1}. ${x}`).join("\n"):"")}

// ===== Documents =====
function docNext(d){return addMonths(d.ad,d.per)}
function docState(d){const n=docNext(d);if(!n)return "";if(n<today())return "late";const t=new Date();t.setDate(t.getDate()+30);const s=t.toISOString().slice(0,10);return n<=s?"soon":"ok"}
const docsFor=sid=>Object.entries(S.docs).filter(([k,d])=>(d.subs||[]).includes(sid));

// ===== Roles & permissions =====
// Platform level caps the role: admin (Editor/Owner) → lead, interact (Contributor) → assessor, view → viewer.
function maxRole(){if(U.demo||!U.db)return "lead";if(U.lvl.owner||U.lvl.admin)return "lead";return U.lvl.write===false?"viewer":"assessor"}
function role(){const mx=maxRole();if(U.demo||!U.db)return mx;const t=S.team[U.me];const r=t&&t.role||mx;return RANK[r]>RANK[mx]?mx:r}
const myDoms=()=>{const t=!U.demo&&U.db&&S.team[U.me];return t&&t.doms&&t.doms.length?t.doms:null};
function canCol(col,id){const r=role();if(r==="lead")return true;if(r==="viewer")return false;
  if(["cfg","team","snaps","fw","reports"].includes(col))return false;
  if((col==="ctl"||col==="sub")&&id){const d=myDoms();if(d){const dom=(BY[id]||SUBBY[id]||{}).dom;return d.includes(dom)}}return true}
const fsAttr=(col,id)=>canCol(col,id)?"":"disabled";
function logEv(what,id,extra){if(U.demo)return;if(!U.db){if(typeof logLocal==="function")logLocal(what,id,extra);return}try{U.db.collection("log").doc(uid()).set(Object.assign({at:Date.now(),by:U.me||"",what,id:id||""},extra||{})).catch(()=>{})}catch(e){}}

// ===== Persistence (shared db when available, else this browser) =====
let lsT=null;const wq={},wt={};
function saveLocal(){if(U.demo||U.supa)return;clearTimeout(lsT);lsT=setTimeout(()=>{if(typeof secSave==="function"&&secSave())return;try{localStorage.setItem(LK,JSON.stringify(S));if(typeof saveDone==="function")saveDone(true)}catch(e){if(typeof saveDone==="function")saveDone(false,e)}},300)}
function persist(col,id){if(U.demo)return;if(!U.db){const o=col==="cfg"?S.cfg:S[col]&&S[col][id];if(o&&typeof o==="object"){o._at=Date.now();if(U.tsMe)o._by=U.tsMe}if(typeof tsTouch==="function")tsTouch()}if(U.db&&!canCol(col,id)){toast("ليست لديك صلاحية تعديل هذا الجزء. تواصل مع مدير التقييم.");return}saveLocal();if(!U.db)return;const p=col==="cfg"?"meta/cfg":col+"/"+id;wq[p]=1;clearTimeout(wt[p]);
  wt[p]=setTimeout(async()=>{const v=col==="cfg"?S.cfg:S[col][id];
    try{if(v==null)await U.db.doc(p).delete();else await U.db.doc(p).set(Object.assign({},v,{_by:U.me||"",_at:Date.now()}))}catch(e){writeErr(e)}finally{delete wq[p]}},650)}
function writeErr(e){const c=e&&e.code;U.sync="warn";paintSync();toast(c==="not_granted"?"لا تملك صلاحية التعديل على هذه النسخة المشتركة":"تعذّر الحفظ في التخزين المشترك؛ بقي التعديل محفوظًا في هذا المتصفح")}
// per-field edit time (standalone only), so team files merge field by field
const stampF=(o,k)=>{if(U.db||U.demo)return;o._f=Object.assign({},o._f,{[k]:Date.now()})};
function setF(col,id,k,v){if(col==="cfg"){if(k.includes(".")){const [a,b]=k.split(".");S.cfg[a]=Object.assign({},S.cfg[a],{[b]:v});stampF(S.cfg,a)}else{S.cfg[k]=v;stampF(S.cfg,k)}persist("cfg");if(!U.db&&typeof logEdit==="function")logEdit("cfg","",k);return}const o=S[col][id]=S[col][id]||{};if(v===""||v==null)delete o[k];else o[k]=v;stampF(o,k);persist(col,id);if(!U.db&&typeof logEdit==="function")logEdit(col,id,k)}
function putDoc(col,id,val){if(val==null)delete S[col][id];else S[col][id]=val;persist(col,id)}
const clean=o=>{const x=Object.assign({},o);delete x._by;delete x._at;return x};
function startDb(db){U.db=db;U.sync="live";let got=0;const tm=setTimeout(()=>{if(!got){U.sync="warn";paintSync()}},10000);
  const fresh=blank();const had=JSON.stringify(S)!==JSON.stringify(blank());U.localCopy=had?JSON.parse(JSON.stringify(S)):null;
  if(U.demo)U.real=fresh;else S=fresh;
  const T=()=>U.demo?U.real:S;
  const ok=()=>{got++;clearTimeout(tm);if(U.sync!=="live"){U.sync="live";paintSync()}};
  const fail=()=>{U.sync="warn";paintSync()};
  COLS.forEach(col=>db.collection(col).onSnapshot(sn=>{ok();const R=T();
    sn.docChanges().forEach(ch=>{const id=ch.doc.id;if(wq[col+"/"+id])return;if(ch.type==="removed")delete R[col][id];else{const d=ch.doc.data()||{};R[col][id]=clean(d);if(d._by)R[col][id]._by=d._by,R[col][id]._at=d._at}});
    softRender()},fail));
  db.doc("meta/cfg").onSnapshot(sn=>{ok();if(wq["meta/cfg"])return;const R=T();R.cfg=Object.assign(blank().cfg,sn.exists?clean(sn.data()):{});softRender()},fail);
  db.collection("log").orderBy("at","desc").limit(60).onSnapshot(sn=>{U.logs=sn.docs.map(d=>d.data());if(U.tab==="team")softRender()},()=>{});
  paintSync();render()}
const editing=()=>{const a=document.activeElement;return !!(a&&/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName))};
function softRender(){if(editing()){U.dirty=true;return}render()}
document.addEventListener("focusout",()=>setTimeout(()=>{if(U.dirty&&!editing()){U.dirty=false;render()}},0));
function paintSync(){const e=$("#sync");if(!e)return;const m=U.demo?["warn","وضع المثال — لا يُحفظ شيء"]:U.db?(U.sync==="live"?["live","محفوظ في قاعدة البيانات"]:["warn","قاعدة البيانات لا تستجيب"]):(window.claude?["warn","غير متصل بقاعدة البيانات"]:U.saveErr?["bad","لم يُحفظ آخر تعديل"]:U.locked?["warn","مقفل"]:["",U.savedAt?"محفوظ في هذا المتصفح · "+U.savedAt.toTimeString().slice(0,5):"محفوظ في هذا المتصفح فقط"]);e.className="sync "+m[0];e.innerHTML=`<i></i><span class="rf-txt">${m[1]}</span>`}

// Plain browser download, used when the page runs as a standalone file (no Claude viewer).
function dlFile(name,blob){const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1500)}

// ===== AI (Claude via the page's sample capability) =====
const AI_ERR={not_granted:"لم يُسمح للصفحة باستخدام Claude. يمكنك السماح من قائمة صلاحيات الصفحة.",rate_limited:"طلبات كثيرة في وقت قصير. انتظر قليلًا ثم أعد المحاولة.",prompt_too_large:"النص أطول من المسموح. قسّم السياسة واختر مجالات أقل.",invalid_json:"جاء الرد بصيغة غير متوقعة. أعد المحاولة أو قلّل نطاق الطلب.",cancelled:"أُوقف الطلب.",refused:"اعتذر النموذج عن هذا الطلب.",sampling_disabled:"استخدام Claude معطّل لهذا الحساب."};
const aiErr=e=>AI_ERR[e&&e.code]||"تعذّر الوصول إلى Claude الآن. أعد المحاولة لاحقًا.";
function profileText(){const t=ETYPES.find(x=>x[0]===S.cfg.type);const cs=COND.map(q=>{const v=S.cfg.cond[q.k];return v?`- ${q.q} ${q.o.find(o=>o[0]===v)?.[1]||v}`:""}).filter(Boolean).join("\n");
  return `نوع الجهة: ${t?t[1]:"غير محدد"}\n${cs}`}
function ctlText(c,full){let t=`[${c.id}] ${c.ar}`;if(c.s)t+="\n"+c.s.map(x=>`  [${x.id}] ${x.ar}`).join("\n");return t}
const AI_RULES=`قواعد ملزمة:
- اكتب بالعربية الفصحى المهنية الموجزة.
- لا تخترع أرقام ضوابط أو أسماء وثائق رسمية أو متطلبات لم ترد في النص المعطى. إن احتجت مرجعًا غير موجود فقل "يحتاج تحققًا".
- اقتراحاتك إرشادية للمختص وليست نصًا رسميًا من الهيئة الوطنية للأمن السيبراني.
- اذكر أدوارًا وظيفية عامة (مثل: الإدارة المعنية بالأمن السيبراني، إدارة تقنية المعلومات، الموارد البشرية) لا أسماء أشخاص.`;
async function aiCall(key,input,opts){if(!U.ai&&!window.claude){if(U.busy[key])return null;return aiExternal(key,input)}if(!U.ai){toast("ميزة الذكاء الاصطناعي متاحة عند فتح الصفحة داخل Claude");return null}
  if(U.busy[key])return null;U.busy[key]=new AbortController();render();
  try{return await U.ai.json(input,Object.assign({signal:U.busy[key].signal,modelTier:"default"},opts||{}))}
  catch(e){if(e&&e.code!=="cancelled")toast(aiErr(e));return null}
  finally{delete U.busy[key];render()}}
