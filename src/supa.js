// ===== Standalone (GitHub) version: Supabase database, sign-in, organisations, platform dashboard =====
// Runs only outside Claude. Implements the small subset of the Claude db API that startDb() uses,
// so the rest of the tool works the same on both. Only the public project URL and publishable key live here.
const SB_URL="https://rryqjscgzpaihgucygrp.supabase.co",SB_KEY="sb_publishable_WkPv7nQl3Hc4B3oeA0gHig_aJqx-5Bo";
const SB_LIB="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js";
// keep the sign-in link tokens before hash routing replaces the URL hash
const SB_HASH=(()=>{const h=location.hash.slice(1);return /access_token=|error_description=/.test(h)?h:""})();
if(SB_HASH){try{history.replaceState(null,"",location.pathname+location.search)}catch(e){}}
const CLOUD=()=>!!(window.claude||U.supa);
let SB=null;
TABS_OK.add("admin");
IC.admin='<path d="M3 3v18h18"/><path d="M7 15l3-4 3 2 5-6"/>';
HEAD.admin=["لوحة المنصة","من سجّل في الأداة، ومن استخدمها، والفجوات الأكثر تكرارًا بين الجهات. أرقام مجمّعة تظهر لمدير المنصة فقط."];
const ROLE_LVL={lead:{owner:false,admin:true,write:true},assessor:{owner:false,admin:false,write:true},viewer:{owner:false,admin:false,write:false}};

// ---- db shim (Claude db API subset over the org_docs table) ----
function makeShimDb(sb,org){
  const L={},cfgL=[],logL=[];
  const errOf=e=>{const x=new Error(e&&e.message||"db");x.code=e&&(e.code==="42501"||/row-level security/i.test(e.message||""))?"not_granted":(e&&e.code)||"db";return x};
  const split=p=>{const i=p.indexOf("/");return [p.slice(0,i),p.slice(i+1)]};
  const snap=chs=>({docChanges:()=>chs});
  const ch=(type,id,data)=>({type,doc:{id,data:()=>data}});
  async function loadCol(col){
    if(col==="team"){const {data,error}=await sb.from("memberships").select("user_id,role,doms").eq("org_id",org);if(error)throw error;
      return data.map(r=>[r.user_id,{role:r.role,doms:r.doms||[]}])}
    const {data,error}=await sb.from("org_docs").select("id,data").eq("org_id",org).eq("col",col);if(error)throw error;return data.map(r=>[r.id,r.data])}
  async function loadLog(){const {data,error}=await sb.from("org_docs").select("data").eq("org_id",org).eq("col","log").order("updated_at",{ascending:false}).limit(60);if(error)throw error;return data.map(r=>r.data)}
  const known={};
  async function refreshTeam(){try{const rows=await loadCol("team");const now=new Set(rows.map(r=>r[0]));const chs=rows.map(([id,d])=>ch("modified",id,d));
    Object.keys(known.team||{}).forEach(id=>{if(!now.has(id))chs.push(ch("removed",id,null))});known.team=Object.fromEntries(rows);(L.team||[]).forEach(f=>f(snap(chs)))}catch(e){}}
  const pushLog=()=>loadLog().then(ds=>logL.forEach(f=>f({docs:ds.map(d=>({data:()=>d}))}))).catch(()=>{});
  sb.channel("org-"+org)
    .on("postgres_changes",{event:"*",schema:"public",table:"org_docs",filter:"org_id=eq."+org},p=>{
      const row=p.eventType==="DELETE"?p.old:p.new;if(!row||!row.col)return;
      if(row.col==="log"){pushLog();return}
      if(row.col==="meta"){if(row.id==="cfg")cfgL.forEach(f=>f({exists:p.eventType!=="DELETE",data:()=>row.data||{}}));return}
      (L[row.col]||[]).forEach(f=>f(snap([ch(p.eventType==="DELETE"?"removed":"modified",row.id,row.data||{})])))})
    .on("postgres_changes",{event:"*",schema:"public",table:"memberships",filter:"org_id=eq."+org},()=>{refreshTeam();sbRefreshMe()})
    .subscribe();
  const doc=path=>{const [col,id]=split(path);return {
    async set(v){let r;
      if(col==="team")r=await sb.from("memberships").update({role:v.role,doms:v.doms||[]}).eq("org_id",org).eq("user_id",id);
      else r=await sb.from("org_docs").upsert({org_id:org,col,id,data:v,updated_by:U.me||null,updated_at:new Date().toISOString()});
      if(r.error)throw errOf(r.error)},
    async delete(){let r;
      if(col==="team")r=await sb.from("memberships").delete().eq("org_id",org).eq("user_id",id);
      else r=await sb.from("org_docs").delete().eq("org_id",org).eq("col",col).eq("id",id);
      if(r.error)throw errOf(r.error)},
    onSnapshot(cb,err){if(path!=="meta/cfg")return ()=>{};cfgL.push(cb);
      sb.from("org_docs").select("data").eq("org_id",org).eq("col","meta").eq("id","cfg").maybeSingle()
        .then(({data,error})=>{if(error){err&&err(error);return}cb({exists:!!data,data:()=>data?data.data:{}})});return ()=>{}}}};
  const collection=col=>{const q={
    doc:id=>doc(col+"/"+id),
    orderBy(){return q},limit(){return q},
    onSnapshot(cb,err){
      if(col==="log"){logL.push(cb);pushLog();return ()=>{}}
      (L[col]=L[col]||[]).push(cb);
      loadCol(col).then(rows=>{if(col==="team")known.team=Object.fromEntries(rows);cb(snap(rows.map(([id,d])=>ch("added",id,d))))}).catch(e=>err&&err(e));
      return ()=>{}}};return q};
  return {doc,collection}}

// ---- sign-in overlay ----
const sbEl=()=>document.getElementById("sbauth");
function sbShow(mode,msg){U.sbMode=mode;U.sbMsg=msg||"";let el=sbEl();
  if(!el){el=document.createElement("div");el.id="sbauth";el.setAttribute("role","dialog");el.setAttribute("aria-modal","true");document.body.appendChild(el)}
  el.dir=U.lang==="en"?"ltr":"rtl";const mems=(U.sbMems||[]);
  const err=U.sbMsg?`<p class="sb-msg ${U.sbOk?"ok":""}" role="alert">${esc(U.sbMsg)}</p>`:"";
  const pw=(id,ac)=>`<label><span>كلمة المرور</span><input id="${id}" type="password" autocomplete="${ac}" minlength="8" required></label>`;
  const em=`<label><span>البريد الإلكتروني</span><input id="sb-email" type="email" autocomplete="email" dir="ltr" required value="${esc(U.sbEmail||"")}"></label>`;
  const body={
    in:`<h2>تسجيل الدخول</h2><p class="note">ادخل لحفظ تقييم جهتك في قاعدة بيانات مشتركة، والعمل عليه مع فريقك.</p>
      <form data-sbf="in">${em}${pw("sb-pw","current-password")}${err}<button class="btn" type="submit">دخول</button></form>
      <div class="sb-links"><button class="lnk" data-sb="up">إنشاء حساب</button><button class="lnk" data-sb="forgot">نسيت كلمة المرور</button></div>
      <button class="btn quiet sb-local" data-sb="local">استخدام الأداة دون حساب (تُحفظ البيانات في هذا المتصفح فقط)</button>`,
    up:`<h2>إنشاء حساب</h2><p class="note">إذا دعاك مدير التقييم في جهتك، سجّل بالبريد نفسه الذي وصلته الدعوة عليه لتنضم تلقائيًا.</p>
      <form data-sbf="up"><label><span>الاسم</span><input id="sb-name" autocomplete="name" required></label>${em}${pw("sb-pw","new-password")}<p class="note" style="margin:0">8 أحرف على الأقل.</p>${err}<button class="btn" type="submit">إنشاء الحساب</button></form>
      <div class="sb-links"><button class="lnk" data-sb="in">لديّ حساب</button></div>`,
    forgot:`<h2>استعادة كلمة المرور</h2><p class="note">نرسل رابط إعادة التعيين إلى بريدك.</p>
      <form data-sbf="forgot">${em}${err}<button class="btn" type="submit">إرسال الرابط</button></form>
      <div class="sb-links"><button class="lnk" data-sb="in">رجوع</button></div>`,
    reset:`<h2>كلمة مرور جديدة</h2><form data-sbf="reset">${pw("sb-pw","new-password")}${err}<button class="btn" type="submit">حفظ</button></form>`,
    sent:`<h2>تحقق من بريدك</h2><p class="note">${esc(U.sbMsg)}</p><div class="sb-links"><button class="lnk" data-sb="in">العودة لتسجيل الدخول</button></div>`,
    org:`<h2>${mems.length?"اختر الجهة":"أنشئ جهتك"}</h2>
      ${mems.length?`<div class="sb-orgs">${mems.map((m,i)=>`<button class="sb-org" data-sb="pick" data-i="${i}"><b>${esc(m.organizations&&m.organizations.name||"جهة")}</b><span>${esc(ROLES[m.role][0])}</span></button>`).join("")}</div><p class="note">أو أنشئ جهة جديدة تكون أنت مدير تقييمها:</p>`:`<p class="note">لم تنضم إلى أي جهة بعد. أنشئ جهتك وتصبح مدير التقييم فيها، أو اطلب من مدير التقييم في جهتك دعوتك على بريدك.</p>`}
      <form data-sbf="org"><label><span>اسم الجهة</span><input id="sb-org" required minlength="2" maxlength="160"></label>${err}<button class="btn" type="submit">إنشاء الجهة</button></form>
      <div class="sb-links">${U.sbPA?`<button class="lnk" data-sb="padmin">لوحة المنصة فقط</button>`:""}<button class="lnk" data-sb="out">تسجيل الخروج</button></div>`,
    guest:`<h2>متابعة كضيف</h2><p class="note">عرّف بنفسك قبل البدء، ليعرف فريق الأداة من يستخدمها ويطوّرها لما يحتاجه.</p>
      <form data-sbf="guest"><label><span>الاسم</span><input id="sbg-name" autocomplete="name" required minlength="2" maxlength="120" value="${esc((sbGuest()||{}).name||"")}"></label>
      <label><span>الجهة أو جهة العمل</span><input id="sbg-org" autocomplete="organization" required minlength="2" maxlength="160" value="${esc((sbGuest()||{}).org||"")}"></label>
      <label><span>البريد الإلكتروني (اختياري)</span><input id="sbg-email" type="email" autocomplete="email" dir="ltr" maxlength="200" value="${esc((sbGuest()||{}).email||"")}"></label>
      <p class="note sb-priv">نحفظ هذه البيانات لمعرفة من يستخدم الأداة فقط، ولا نشاركها مع أحد. أما تقييمك نفسه فيبقى في متصفحك ولا يُرسل.</p>${err}<button class="btn" type="submit">متابعة</button></form>
      <div class="sb-links"><button class="lnk" data-sb="in">لديّ حساب، تسجيل الدخول</button></div>`,
    wait:`<p class="thinking"><i></i>جارٍ الاتصال بقاعدة البيانات…</p>`}[mode];
  el.innerHTML=`<div class="sb-card"><img class="sb-banner" src="${LOGO_BANNER}" alt="ECC — Essential Cybersecurity Controls"><div class="sb-brand"><b>خارطة مراجعة سياسات ECC</b></div>${body}<p class="sb-foot">© 2026 Daniyah Alharbi</p></div>`;
  applyLang(el);el.dir=U.lang==="en"?"ltr":"rtl";const f=el.querySelector("input");if(f&&mode!=="wait")setTimeout(()=>f.focus(),30)}
function sbHide(){const el=sbEl();if(el)el.remove();U.sbMsg="";U.sbOk=false}
const sbV=id=>{const e=document.getElementById(id);return e?e.value.trim():""};
const sbErr=e=>{const m=(e&&e.message)||"";return /Invalid login/i.test(m)?"البريد أو كلمة المرور غير صحيحة.":/Email not confirmed/i.test(m)?"لم يُفعّل البريد بعد. افتح رابط التفعيل الذي وصلك.":/already registered/i.test(m)?"هذا البريد مسجّل مسبقًا. سجّل الدخول أو استعد كلمة المرور.":/Password should be/i.test(m)?"كلمة المرور قصيرة أو ضعيفة.":/rate limit/i.test(m)?"محاولات كثيرة. انتظر قليلًا ثم أعد المحاولة.":/fetch|network/i.test(m)?"تعذّر الاتصال بقاعدة البيانات. تحقق من الإنترنت.":"تعذّرت العملية. حاول مرة أخرى."};
const sbBack=()=>location.origin+location.pathname;
document.addEventListener("submit",async e=>{const f=e.target.closest("[data-sbf]");if(!f)return;e.preventDefault();const m=f.dataset.sbf;
  if(m==="guest"){const g={name:sbV("sbg-name"),org:sbV("sbg-org"),email:sbV("sbg-email").toLowerCase()};
    if(g.name.length<2||g.org.length<2){sbShow("guest","اكتب اسمك وجهتك للمتابعة.");return}
    if(g.email&&!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(g.email)){sbShow("guest","البريد الإلكتروني غير صحيح.");return}
    try{localStorage.setItem("ecc_guest",JSON.stringify(g));localStorage.setItem("ecc_local_mode","1")}catch(x){}
    guestRegister(g);U.guest=true;sbHide();render();return}
  const b=f.querySelector("button[type=submit]");if(b)b.disabled=true;U.sbOk=false;U.sbEmail=sbV("sb-email")||U.sbEmail;
  try{
    if(m==="in"){const {data,error}=await SB.auth.signInWithPassword({email:sbV("sb-email"),password:document.getElementById("sb-pw").value});if(error)throw error;sbShow("wait");await sbAfterLogin(data.user)}
    else if(m==="up"){const {data,error}=await SB.auth.signUp({email:sbV("sb-email"),password:document.getElementById("sb-pw").value,options:{data:{name:sbV("sb-name")},emailRedirectTo:sbBack()}});if(error)throw error;
      if(data.session){sbShow("wait");await sbAfterLogin(data.user)}else sbShow("sent","أرسلنا رابط تفعيل إلى بريدك. افتحه من هذا الجهاز، ثم سجّل الدخول.")}
    else if(m==="forgot"){const {error}=await SB.auth.resetPasswordForEmail(sbV("sb-email"),{redirectTo:sbBack()});if(error)throw error;sbShow("sent","إذا كان البريد مسجّلًا فسيصلك رابط لإعادة تعيين كلمة المرور.")}
    else if(m==="reset"){const {data,error}=await SB.auth.updateUser({password:document.getElementById("sb-pw").value});if(error)throw error;sbShow("wait");await sbAfterLogin(data.user)}
    else if(m==="org"){const {data,error}=await SB.rpc("create_org",{p_name:sbV("sb-org")});if(error)throw error;try{localStorage.setItem("ecc_org",data)}catch(x){}if(U.supa){location.reload();return}sbShow("wait");const {data:{user}}=await SB.auth.getUser();await sbAfterLogin(user)}
  }catch(x){sbShow(U.sbMode==="wait"?"in":m,sbErr(x))}});
document.addEventListener("click",async e=>{const t=e.target.closest("[data-sb]");if(!t)return;e.preventDefault();const a=t.dataset.sb;
  if(["in","up","forgot"].includes(a)&&!SB){try{localStorage.removeItem("ecc_local_mode")}catch(x){}sbStart(true);return}
  if(["in","up","forgot"].includes(a))sbShow(a);
  else if(a==="local"){if(sbGuest()){try{localStorage.setItem("ecc_local_mode","1")}catch(x){}U.guest=true;sbHide();render()}else sbShow("guest")}
  else if(a==="pick"){const m=U.sbMems[+t.dataset.i];if(m&&U.supa){try{localStorage.setItem("ecc_org",m.org_id)}catch(x){}location.reload();return}if(m){sbShow("wait");sbSelectOrg(m)}}
  else if(a==="padmin"){sbHide();U.supaAdminOnly=true;U.tab="admin";render()}
  else if(a==="out")sbSignOut()});

// ---- after sign-in: invitations, organisations, platform admin ----
async function sbAfterLogin(user){if(!user){sbShow("in");return}U.sbUser=user;U.me=user.id;
  try{await SB.rpc("claim_invites")}catch(e){}
  const [mm,pa,pr]=await Promise.all([
    SB.from("memberships").select("org_id,role,doms,organizations(name)").eq("user_id",user.id),
    SB.rpc("is_platform_admin"),
    SB.from("profiles").select("name").eq("id",user.id).maybeSingle()]);
  if(mm.error){sbShow("in",sbErr(mm.error));return}
  U.sbMems=mm.data||[];U.sbPA=!!pa.data;U.myName=(pr.data&&pr.data.name)||(user.email||"").split("@")[0];U.names[user.id]=U.myName;
  if(U.sbPA&&!NAV[3][1].some(x=>x[0]==="admin"))NAV[3][1].push(["admin","لوحة المنصة"]);
  let saved="";try{saved=localStorage.getItem("ecc_org")||""}catch(e){}
  const pick=U.sbMems.find(m=>m.org_id===saved)||(U.sbMems.length===1?U.sbMems[0]:null);
  if(pick)await sbSelectOrg(pick);else sbShow("org")}
async function sbSelectOrg(m){const org=m.org_id;
  U.supa={org,name:m.organizations&&m.organizations.name||"",role:m.role};U.lvl=ROLE_LVL[m.role]||ROLE_LVL.viewer;
  try{localStorage.setItem("ecc_org",org);localStorage.removeItem("ecc_local_mode")}catch(e){}
  U.user={profiles:async ids=>{const {data}=await SB.from("profiles").select("id,name").in("id",ids);const o={};(data||[]).forEach(p=>o[p.id]={name:p.name});return o},search:async()=>[]};
  U.assets={upload:async f=>{const nm=(f.name||"report.pdf").replace(/[^\w.\-]+/g,"_").slice(-80);const path=org+"/"+uid()+"-"+nm;
      const {error}=await SB.storage.from("evidence").upload(path,f,{contentType:f.type||"application/pdf",upsert:false});if(error)throw error;return {id:path,url:"sb:"+path}},
    delete:async id=>{await SB.storage.from("evidence").remove([id])}};
  SB.from("visits").insert({org_id:org}).then(()=>{},()=>{});
  sbLoadInvites();sbHide();startDb(makeShimDb(SB,org))}
async function sbRefreshMe(){if(!U.supa)return;const {data}=await SB.from("memberships").select("role").eq("org_id",U.supa.org).eq("user_id",U.me).maybeSingle();
  if(!data){toast("أُزيلت عضويتك من هذه الجهة");setTimeout(()=>location.reload(),1500);return}
  if(data.role!==U.supa.role){U.supa.role=data.role;U.lvl=ROLE_LVL[data.role];render()}}
async function sbLoadInvites(){if(!U.supa||U.supa.role!=="lead"){U.invites=[];return}
  const {data}=await SB.from("invitations").select("id,email,role,doms,created_at").eq("org_id",U.supa.org).order("created_at",{ascending:false});U.invites=data||[];if(U.tab==="team")softRender()}
async function sbSignOut(){try{await SB.auth.signOut()}catch(e){}try{localStorage.removeItem("ecc_org")}catch(e){}location.reload()}
async function sbOpen(path){const w=window.open("","_blank");
  const {data,error}=await SB.storage.from("evidence").createSignedUrl(path,300);
  if(error||!data){if(w)w.close();toast("تعذّر فتح الملف");return}if(w)w.location=data.signedUrl;else location.href=data.signedUrl}

// ---- team invitations (lead) ----
async function sbInvite(){const email=sbV("inv-email").toLowerCase(),role=sbV("inv-role")||"assessor";
  if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){toast("اكتب بريدًا إلكترونيًا صحيحًا");return}
  const {error}=await SB.from("invitations").insert({org_id:U.supa.org,email,role,invited_by:U.me});
  if(error){toast(/duplicate|unique/i.test(error.message)?"هذا البريد مدعو مسبقًا":"تعذّر حفظ الدعوة");return}
  logEv("team","",{v:"دعوة "+email});toast("حُفظت الدعوة. أرسل للشخص رابط الأداة ليسجّل بهذا البريد.");U.invEmail="";sbLoadInvites()}
document.addEventListener("click",async e=>{const t=e.target.closest("[data-act]");if(!t)return;const a=t.dataset.act;
  if(a==="sbinvite")sbInvite();
  else if(a==="sbinvdel"){await SB.from("invitations").delete().eq("id",t.dataset.id);sbLoadInvites()}
  else if(a==="sbopen")sbOpen(t.dataset.v);
  else if(a==="sbout")sbSignOut();
  else if(a==="sborgs"){U.sbPickAll=true;sbShow("org")}
  else if(a==="sbsignin"){try{localStorage.removeItem("ecc_local_mode")}catch(x){}sbStart(true)}
  else if(a==="admrefresh"){U.adm=null;render()}});
function vTeamSupa(){if(!U.supa)return "";const lead=U.supa.role==="lead";
  const inv=lead?`<section class="card c12"><h2>دعوة عضو بالبريد الإلكتروني</h2>
    <div class="row" style="flex-wrap:wrap;gap:8px"><input id="inv-email" type="email" dir="ltr" placeholder="name@entity.gov.sa" style="max-width:300px" autocomplete="off"><select id="inv-role" style="width:auto">${Object.entries(ROLES).map(([k,v])=>`<option value="${k}" ${k==="assessor"?"selected":""}>${v[0]}</option>`).join("")}</select><button class="btn" data-act="sbinvite">دعوة</button></div>
    <p class="note" style="margin:8px 0 0">لا نرسل بريدًا من الأداة. أرسل رابط الأداة للشخص بنفسك؛ عند تسجيله بهذا البريد ينضم إلى جهتك بالدور المحدد. بعد انضمامه تستطيع حصره في مكونات محددة من الجدول أدناه.</p>
    ${(U.invites||[]).length?`<div class="tw" style="margin-top:10px"><table><thead><tr><th>البريد</th><th>الدور</th><th>تاريخ الدعوة</th><th></th></tr></thead><tbody>${U.invites.map(i=>`<tr><td dir="ltr" data-notr>${esc(i.email)}</td><td>${ROLES[i.role][0]}</td><td class="num nw">${esc((i.created_at||"").slice(0,10))}</td><td><button class="btn sm danger ghost" data-act="sbinvdel" data-id="${esc(i.id)}">إلغاء</button></td></tr>`).join("")}</tbody></table></div>`:""}</section>`:"";
  const acct=`<section class="card c12"><h2>الحساب والجهة</h2><div class="row" style="flex-wrap:wrap;gap:8px"><span>الجهة: <b>${esc(U.supa.name)}</b></span><span class="tag">${esc(U.sbUser&&U.sbUser.email||"")}</span><button class="btn sm quiet" data-act="sborgs">تبديل الجهة أو إنشاء جهة</button><button class="btn sm quiet" data-act="sbout">تسجيل الخروج</button></div></section>`;
  return acct+inv}

// ---- platform dashboard (platform admin only; aggregates across organisations) ----
// period: "all" (default, since the first visit) or a number of days
const ADM_P=[["all","منذ البداية"],["90","90 يومًا"],["30","30 يومًا"],["7","7 أيام"]];
async function admLoad(){U.admBusy=true;const p=U.admP||"all";
  const [a,g]=await Promise.all([SB.rpc("admin_overview"),SB.rpc("admin_period",{p_days:p==="all"?null:+p})]);
  U.admBusy=false;U.adm=a.error?{err:1}:a.data;if(!a.error){U.adm.P=g.error?null:g.data;U.adm.pKey=p}if(U.tab==="admin")render()}
document.addEventListener("click",e=>{const t=e.target.closest("[data-admp]");if(!t)return;U.admP=t.dataset.admp;U.adm=null;render()});
function vAdmin(){if(!U.sbPA||!SB)return `<div class="empty"><b>غير متاح</b>هذه اللوحة لمدير المنصة فقط.</div>`;
  if(!U.adm){if(!U.admBusy)admLoad();return `<p class="thinking"><i></i>جارٍ تحميل الأرقام…</p>`}
  const A=U.adm;if(A.err)return `<div class="banner warn"><span>تعذّر تحميل اللوحة.</span><button class="btn sm quiet" data-act="admrefresh">إعادة المحاولة</button></div>`;
  const P=A.P||null,pk=A.pKey||"all",pName=(ADM_P.find(x=>x[0]===pk)||ADM_P[0])[1];
  const kpi=(n,l)=>`<div class="kpi"><b class="num">${n??0}</b><span>${l}</span></div>`;
  const per=`<div class="seg adm-per" role="group" aria-label="الفترة">${ADM_P.map(x=>`<button type="button" class="${pk===x[0]?"on":""}" data-admp="${x[0]}" aria-pressed="${pk===x[0]}">${x[1]}</button>`).join("")}</div>`;
  // days on the chart: the chosen period, or from the first recorded visit
  const today0=new Date().toISOString().slice(0,10);let start;
  if(pk==="all")start=(P&&P.first)||today0;else{const d=new Date();d.setDate(d.getDate()-(+pk)+1);start=d.toISOString().slice(0,10)}
  const days=[];for(let d=new Date(start+"T12:00:00");d.toISOString().slice(0,10)<=today0&&days.length<800;d.setDate(d.getDate()+1))days.push(d.toISOString().slice(0,10));
  if(!days.length)days.push(today0);
  const um=Object.fromEntries(((P&&P.uDaily)||[]).map(x=>[x.d,x.n])),gm=Object.fromEntries(((P&&P.gDaily)||[]).map(x=>[x.d,x.n]));
  const mx=Math.max(1,...days.map(d=>(um[d]||0)+(gm[d]||0))),W=Math.max(days.length*10,60);
  const bars=`<svg class="adm-bars" viewBox="0 0 ${W} 90" preserveAspectRatio="none" role="img" aria-label="الاستخدام اليومي">${days.map((d,i)=>{const u=um[d]||0,g=gm[d]||0,h=u/mx*80,hg=g/mx*80;return `<rect x="${i*10+1}" y="${88-h}" width="8" height="${Math.max(h,u?2:.6)}" rx="1.5"><title>${d}: ${u}</title></rect>${g?`<rect class="g" x="${i*10+1}" y="${88-h-hg}" width="8" height="${Math.max(hg,2)}" rx="1.5"><title>${d}: ${g} ضيف</title></rect>`:""}`}).join("")}</svg><div class="legend adm-leg"><span><i style="background:var(--accent)"></i>مستخدمون مسجّلون</span><span><i style="background:#8FB8C9"></i>ضيوف دون حساب</span></div><div class="adm-axis"><span>${days[0]}</span><span>${days[days.length-1]}</span></div>`;
  const ctl=(A.ctl||[]).filter(x=>BY[x.id]).map(x=>Object.assign({gap:x.p+x.x,rate:x.orgs?(x.p+x.x)/x.orgs:0},x));
  const top=ctl.filter(x=>x.gap).sort((a,b)=>b.gap-a.gap||b.rate-a.rate).slice(0,12);
  const paper=ctl.filter(x=>x.paper).sort((a,b)=>b.paper-a.paper).slice(0,6);
  const ttl=id=>esc(String(tx(BY[id])||"").slice(0,110));
  const gapT=top.length?`<div class="tw"><table><thead><tr><th>الضابط</th><th>النص</th><th>جهات قيّمته</th><th>فيها فجوة</th><th>النسبة</th><th>التزام ورقي</th></tr></thead><tbody>${top.map(x=>`<tr><td class="mono nw">${x.id}</td><td>${ttl(x.id)}</td><td class="num">${x.orgs}</td><td class="num">${x.gap}</td><td class="num">${Math.round(x.rate*100)}%</td><td class="num">${x.paper}</td></tr>`).join("")}</tbody></table></div>`:`<p class="note">لا فجوات مسجّلة بعد.</p>`;
  const paperT=paper.length?`<ul class="adm-list">${paper.map(x=>`<li><span class="mono">${x.id}</span> ${ttl(x.id)} <b class="num">${x.paper}</b></li>`).join("")}</ul>`:`<p class="note">لا حالات بعد.</p>`;
  const ppl=(A.people||[]);
  const pplT=`<div class="tw"><table><thead><tr><th>الاسم</th><th>البريد</th><th>سجّل في</th><th>آخر دخول</th><th>الزيارات</th><th>التعديلات</th><th>الجهات</th></tr></thead><tbody>${ppl.map(p=>`<tr><td data-notr>${esc(p.name||"—")}</td><td dir="ltr" data-notr>${esc(p.email||"")}</td><td class="num nw">${esc(p.joined||"")}</td><td class="num nw">${esc(p.last||"—")}</td><td class="num">${p.visits}</td><td class="num">${p.edits}</td><td class="num">${p.orgs}</td></tr>`).join("")}</tbody></table></div>`;
  const orgT=(A.orgList||[]).length?`<div class="tw"><table><thead><tr><th>الجهة</th><th>أُنشئت</th><th>الأعضاء</th><th>ضوابط مقيّمة</th><th>آخر تعديل</th></tr></thead><tbody>${A.orgList.map(o=>`<tr><td data-notr>${esc(o.name)}</td><td class="num nw">${esc(o.created)}</td><td class="num">${o.members}</td><td class="num">${o.assessed} / ${CTLS.length}</td><td class="num nw">${esc(o.last||"—")}</td></tr>`).join("")}</tbody></table></div>`:`<p class="note">لا جهات بعد.</p>`;
  const gl=(P&&P.guests)||[];
  const gT=gl.length?`<div class="tw"><table><thead><tr><th>الاسم</th><th>الجهة</th><th>البريد</th><th>أول زيارة</th><th>آخر زيارة</th><th>أيام الاستخدام</th><th>صفحات فتحها</th><th>الجهاز</th></tr></thead><tbody>${gl.map(g=>`<tr><td data-notr>${g.name?esc(g.name):`<span class="note">ضيف لم يعرّف بنفسه</span>`}</td><td data-notr>${esc(g.org||"—")}</td><td dir="ltr" data-notr>${esc(g.email||"")}</td><td class="num nw">${esc(g.first)}</td><td class="num nw">${esc(g.last)}</td><td class="num">${g.days}</td><td class="num">${g.tabs}</td><td>${g.mobile?"جوال":"حاسب"}</td></tr>`).join("")}</tbody></table></div>`:`<p class="note">لا ضيوف في هذه الفترة.</p>`;
  const tabsT=P&&(P.gTabs||[]).length?`<ul class="adm-list">${P.gTabs.map(x=>{const nm=(NAV.flatMap(g=>g[1]).find(y=>y[0]===x.t)||[0,x.t])[1];return `<li><span>${esc(nm)}</span><b class="num">${x.n}</b></li>`}).join("")}</ul>`:`<p class="note">لا بيانات بعد.</p>`;
  return `<div class="grid">
   <section class="card c12"><h2>الفترة ${per}</h2><div class="kpis">${kpi(A.users,"مستخدم مسجّل (الكل)")}${kpi(A.orgs,"جهة (الكل)")}${P?kpi(P.uActive,"مستخدم نشط")+kpi(P.uVisits,"زيارة مستخدمين")+kpi(P.g,"ضيف")+kpi(P.gNamed,"ضيف عرّف بنفسه"):""}</div>
    ${P?"":`<p class="note" style="margin:8px 0 0">أرقام الفترة والضيوف تظهر بعد تشغيل ملف التحديث 03-guest-profiles.sql في Supabase.</p>`}</section>
   <section class="card c7"><h2>الاستخدام اليومي <span class="note">${pName}</span></h2>${bars}</section>
   <section class="card c5"><h2>الصفحات التي فتحها الضيوف</h2>${tabsT}</section>
   ${P?`<section class="card c12"><h2>الضيوف (${gl.length}) <span class="note">${pName}</span></h2><div class="kpis" style="margin-bottom:12px">${kpi(P.gMobile,"من جوال")}${kpi(P.gEn,"بالإنجليزية")}${kpi(P.gReturning,"عاد أكثر من يوم")}</div>${gT}</section>`:""}
   <section class="card c7"><h2>الفجوات الأكثر تكرارًا بين الجهات <button class="btn sm quiet act" data-act="admrefresh">تحديث</button></h2><p class="note" style="margin-top:0">فجوة = حالة «جزئي» أو «غير ملتزم». الضوابط التي حُكم بعدم انطباقها مستبعدة.</p>${gapT}</section>
   <section class="card c5"><h2>أكثر التزام ورقي تكرارًا</h2><p class="note" style="margin-top:0">موثّق في السياسة، ولا دليل على تطبيقه.</p>${paperT}</section>
   <section class="card c12"><h2>المستخدمون المسجّلون (${ppl.length})</h2>${pplT}</section>
   <section class="card c12"><h2>الجهات (${(A.orgList||[]).length})</h2>${orgT}</section></div>`}
// ---- guests: anonymous visit counting (random device id, day, language, phone or computer, pages opened) ----
function guestId(){let d="";try{d=localStorage.getItem("ecc_device")||""}catch(e){}
  if(!/^[0-9a-f-]{36}$/.test(d)){d=(crypto.randomUUID?crypto.randomUUID():"10000000-1000-4000-8000-100000000000".replace(/[018]/g,c=>(c^crypto.getRandomValues(new Uint8Array(1))[0]&15>>c/4).toString(16)));try{localStorage.setItem("ecc_device",d)}catch(e){}}return d}
function guestTrack(){if(window.claude||U.supa||!U.guest||U.demo||/^(localhost|127.)/.test(location.hostname))return;if(U._gt===U.tab)return;U._gt=U.tab;
  try{fetch(SB_URL+"/rest/v1/rpc/log_guest",{method:"POST",keepalive:true,headers:{apikey:SB_KEY,Authorization:"Bearer "+SB_KEY,"Content-Type":"application/json"},
    body:JSON.stringify({p_device:guestId(),p_lang:U.lang,p_mobile:matchMedia("(max-width: 760px)").matches,p_tab:U.tab})}).catch(()=>{})}catch(e){}}
const sbGuest=()=>{try{const g=JSON.parse(localStorage.getItem("ecc_guest")||"null");return g&&g.name?g:null}catch(e){return null}};
function guestRegister(g){if(/^(localhost|127\.)/.test(location.hostname))return;
  try{fetch(SB_URL+"/rest/v1/rpc/register_guest",{method:"POST",keepalive:true,headers:{apikey:SB_KEY,Authorization:"Bearer "+SB_KEY,"Content-Type":"application/json"},
    body:JSON.stringify({p_device:guestId(),p_name:g.name,p_org:g.org||null,p_email:g.email||null})}).catch(()=>{})}catch(e){}}
// ---- boot ----
async function sbStart(force){if(window.claude)return;
  let local=false;try{local=localStorage.getItem("ecc_local_mode")==="1"}catch(e){}
  if(local&&!force&&!SB_HASH){if(!sbGuest()){sbShow("guest");return}U.guest=true;guestTrack();return}
  try{await loadScript(SB_LIB)}catch(e){if(force)toast("تعذّر تحميل مكتبة قاعدة البيانات. تحقق من الإنترنت.");return}
  if(!SB)SB=window.supabase.createClient(SB_URL,SB_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,flowType:"implicit"}});
  const P=new URLSearchParams(SB_HASH);
  if(P.get("error_description")){sbShow("in",P.get("error_description").replace(/\+/g," "));return}
  if(P.get("access_token")){const {data,error}=await SB.auth.setSession({access_token:P.get("access_token"),refresh_token:P.get("refresh_token")||""});
    if(error){sbShow("in",sbErr(error));return}
    if(P.get("type")==="recovery"){sbShow("reset");return}
    sbShow("wait");await sbAfterLogin(data.user);return}
  const {data:{session}}=await SB.auth.getSession();
  if(session){sbShow("wait");try{await sbAfterLogin(session.user)}catch(e){sbShow("in",sbErr(e))}}else sbShow("in")}
setInterval(async()=>{if(!U.supa||!U.user)return;const ids=[...new Set([...Object.values(S.ctl).map(o=>o._by),...Object.keys(S.team),...U.logs.map(l=>l.by),...Object.values(S.reports).map(r=>r.by)].filter(x=>x&&!(x in U.names)))];if(!ids.length)return;try{const ps=await U.user.profiles(ids);ids.forEach(i=>U.names[i]=(ps[i]&&ps[i].name)||"");softRender()}catch(e){}},4000);
