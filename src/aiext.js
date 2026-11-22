// ===== AI of the user's choice (standalone version) =====
// The tool never calls an AI service itself. It prepares the request with sensitive data hidden, the user copies it
// into Claude, ChatGPT or any assistant they trust, then pastes the reply back. Real names are restored on the device.
const AI_LINKS=[["Claude","https://claude.ai/new"],["ChatGPT","https://chatgpt.com/"],["Gemini","https://gemini.google.com/app"]];
let aiX=null;
function aiExternal(key,input){return new Promise(done=>{
  const hidden=rdOn();const req=(hidden?rdClean(input):input)+"\n\nمهم: أعد الرد بصيغة JSON فقط داخل كتلة ```json، دون أي شرح قبلها أو بعدها.";
  const nHidden=hidden?Object.values(U.rd.ents).filter(e=>e.on&&req.includes("["+e.tok+"]")).length:0;
  const close=v=>{if(!aiX)return;aiX.el.remove();aiX=null;delete U.busy[key];document.body.style.overflow="";render();done(v)};
  U.busy[key]={abort:()=>close(null)};render();
  const el=document.createElement("div");el.id="aix";el.setAttribute("role","dialog");el.setAttribute("aria-modal","true");el.dir=U.lang==="en"?"ltr":"rtl";
  el.innerHTML=`<div class="aix-card">
   <div class="aix-h"><h2>حلّل بأداة ذكاء اصطناعي من اختيارك</h2><button class="icon-btn" data-aix="x" aria-label="إغلاق">×</button></div>
   <p class="note">الأداة لا تتصل بأي ذكاء اصطناعي. انسخ الطلب، والصقه في المساعد الذي تثق به، ثم الصق رده هنا.</p>
   <div class="aix-priv ${hidden?"on":""}">${hidden?`<b>${nHidden}</b> معلومة حساسة أُخفيت من الطلب برموز، وستُعاد الأسماء الحقيقية في النتيجة على جهازك.`:`إخفاء المعلومات الحساسة متوقف. فعّله من «محلل السياسات» قبل إرسال بيانات جهتك.`}</div>
   <ol class="aix-steps">
    <li><span>انسخ الطلب</span><button class="btn" data-aix="copy">نسخ الطلب</button><details><summary>عرض الطلب قبل نسخه</summary><textarea readonly dir="auto" data-notr>${esc(req)}</textarea></details></li>
    <li><span>افتح المساعد والصق الطلب فيه</span><span class="row">${AI_LINKS.map(([n,u])=>`<a class="btn quiet" href="${u}" target="_blank" rel="noopener noreferrer">${n}</a>`).join("")}</span></li>
    <li><span>انسخ رده كاملًا والصقه هنا</span><textarea id="aix-in" dir="auto" placeholder="الصق الرد هنا…" data-notr></textarea></li></ol>
   <div class="row aix-f"><button class="btn" data-aix="use">استخدم الرد</button><button class="btn quiet" data-aix="x">إلغاء</button></div></div>`;
  document.body.appendChild(el);applyLang(el);el.dir=U.lang==="en"?"ltr":"rtl";document.body.style.overflow="hidden";
  aiX={el,req,close};setTimeout(()=>{const b=el.querySelector("[data-aix=copy]");if(b)b.focus()},30)})}
function aiParse(txt){const s=String(txt||"");const m=s.match(/```(?:json)?\s*([\s\S]*?)```/i);let body=m?m[1]:s;
  const a=body.indexOf("{"),b=body.lastIndexOf("}");if(a<0||b<a)return null;body=body.slice(a,b+1);
  try{return JSON.parse(body)}catch(e){try{return JSON.parse(body.replace(/,\s*([}\]])/g,"$1").replace(/[“”]/g,'"'))}catch(x){return null}}}
document.addEventListener("click",async e=>{const t=e.target.closest("[data-aix]");if(!t||!aiX)return;const a=t.dataset.aix;
  if(a==="x")aiX.close(null);
  else if(a==="copy"){try{await navigator.clipboard.writeText(aiX.req);t.textContent=tr("نُسخ ✓");toast("نُسخ الطلب. الصقه في المساعد.")}catch(x){const ta=aiX.el.querySelector("details");if(ta){ta.open=true;const q=ta.querySelector("textarea");q.focus();q.select()}toast("انسخه يدويًا من المربع")}}
  else if(a==="use"){const v=aiParse((aiX.el.querySelector("#aix-in")||{}).value);if(!v){toast("لم نجد في الرد بيانات JSON صالحة. انسخ الرد كاملًا.");return}
    aiX.close(rdOn()?rdRestore(v):v);toast("استُخدم الرد")}});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&aiX)aiX.close(null)});
