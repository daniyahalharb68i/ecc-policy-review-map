// ===== GRC work features: evidence requests, policy skeletons, Excel, calendar, risk & exceptions =====
const LX=(ar,en)=>U.lang==="en"?en:ar;
const ctlTxt=id=>{const c=BY[id];return c?(U.lang==="en"?(c.en||c.ar):c.ar):""};
const stName=id=>{const s=dst(id);return U.lang==="en"?(ST_EN[s]||s):(ST[s]||ST[""])[0]};
const gdMissing=id=>{const g=GD(id),have=new Set(C(id).gd||[]),tr0=(C(id).gtr||{}).d;return g.d.map((x,i)=>({i,t:(U.lang!=="en"&&tr0&&tr0[i])?tr0[i]:x})).filter(x=>!have.has(x.i))};
const shortT=(s,n)=>{s=String(s||"");return s.length>n?s.slice(0,n-1)+"…":s};

// ---------- 1) Evidence request list, grouped by owner ----------
function evidRows(){return gapList().map(g=>{const id=g.c.id,o=C(id);return {id,own:(o.own||"").trim()||LX("غير مسند","Unassigned"),due:o.due||"",layer:U.lang==="en"?ML_EN[missingLayer(id)]:missingLayer(id),txt:ctlTxt(id),need:gdMissing(id),ph:g.ph}})}
async function evidWord(){const R=evidRows();if(!R.length){toast(LX("لا فجوات بعد","No gaps yet"));return}
  const by={};R.forEach(r=>(by[r.own]=by[r.own]||[]).push(r));const B=[];
  B.push({h1:LX("قائمة طلب الأدلة","Evidence request list")},{p:`${LX("الجهة","Entity")}: ${S.cfg.entity||"—"} · ${LX("التاريخ","Date")}: ${today()}`},
    {note:LX("أُعدّت من خارطة مراجعة سياسات ECC. المخرجات المطلوبة من الدليل الإرشادي الرسمي GECC-2:2026.","Prepared with the ECC Policy Review Map. Expected deliverables are from the official GECC-2:2026 guide.")});
  Object.keys(by).sort().forEach(own=>{B.push({h2:`${LX("إلى","To")}: ${own} (${by[own].length})`});
    by[own].forEach(r=>{B.push({h3:`${r.id} — ${shortT(r.txt,160)}`},{p:`${LX("الناقص","Missing")}: ${r.layer||"—"}${r.due?` · ${LX("المطلوب قبل","Needed by")}: ${r.due}`:""} · ${LX("المرحلة","Phase")} ${r.ph}`});
      if(r.need.length)r.need.slice(0,12).forEach(n=>B.push({li:n.t,mark:"☐"}));else B.push({li:LX("دليل يثبت تطبيق الضابط وفاعليته","Evidence that the control is implemented and effective"),mark:"☐"})})});
  await saveBlob(`${LX("طلب-الأدلة","evidence-request")}-${fileStamp()}.docx`,await buildDocx(B,{rtl:U.lang!=="en"}));toast(LX("نُزّلت قائمة طلب الأدلة","Evidence request list downloaded"))}
async function evidExcel(){const R=evidRows();if(!R.length){toast(LX("لا فجوات بعد","No gaps yet"));return}
  const rows=[[LX("المسؤول","Owner"),LX("الضابط","Control"),LX("نص الضابط","Control text"),LX("الناقص","Missing"),LX("الدليل المطلوب","Evidence requested"),LX("المطلوب قبل","Needed by"),LX("المرحلة","Phase"),LX("حالة الطلب","Request status"),LX("ملاحظات","Notes")]];
  R.sort((a,b)=>a.own.localeCompare(b.own)||a.ph-b.ph).forEach(r=>{const items=r.need.length?r.need:[{t:LX("دليل يثبت تطبيق الضابط وفاعليته","Evidence that the control is implemented and effective")}];
    items.forEach(n=>rows.push([r.own,r.id,r.txt,r.layer||"",n.t,r.due,r.ph,LX("لم يُرسل","Not sent"),""]))});
  await saveBlob(`${LX("طلب-الأدلة","evidence-request")}-${fileStamp()}.xlsx`,await buildXlsx([{name:LX("طلب الأدلة","Evidence requests"),rows,widths:[20,10,60,12,60,12,8,14,30],rtl:U.lang!=="en"}]));toast(LX("نُزّل ملف Excel","Excel file downloaded"))}

// ---------- 2) Draft skeleton of a policy for one subdomain (official control text, no AI) ----------
async function policySkeleton(sid){const x=SUBBY[sid];if(!x)return;const en=U.lang==="en",nm=tx(x),rp=S.cfg.rep||{};
  const B=[{h1:`${LX("سياسة","Policy:")} ${nm}`},{note:LX("مسودة أولية أعدّتها أداة «خارطة مراجعة سياسات ECC» من النص الرسمي لوثيقة ECC-2:2024. البنود بين معقوفين [ ] يملؤها معدّ السياسة. راجعها وكيّفها مع جهتك قبل الاعتماد؛ هذه المسودة لا تغني عن المراجعة المهنية.","Initial draft prepared by the ECC Policy Review Map from the official ECC-2:2024 text. Fill in the items in [ ]. Review and adapt it before approval; this draft does not replace professional review.")},
   {table:[[LX("البند","Item"),LX("القيمة","Value")],[LX("الجهة","Entity"),S.cfg.entity||"[ ]"],[LX("رقم الوثيقة","Document number"),"[ ]"],[LX("الإصدار","Version"),"0.1 ("+LX("مسودة","draft")+")"],[LX("التاريخ","Date"),today()],[LX("التصنيف","Classification"),"[ ]"],[LX("مالك الوثيقة","Document owner"),LX("الإدارة المعنية بالأمن السيبراني","Cybersecurity function")]]},
   {h2:"1. "+LX("الغرض","Purpose")},{p:(en?x.oe:x.oa)||"[ ]"},{note:LX("مأخوذ من هدف المكوّن الفرعي في ECC-2:2024.","Taken from the subdomain objective in ECC-2:2024.")},
   {h2:"2. "+LX("نطاق العمل وقابلية التطبيق","Scope and applicability")},{p:LX("تنطبق هذه السياسة على [حدّد الأنظمة والأصول المعلوماتية والتقنية والعاملين والأطراف الخارجية المشمولين].","This policy applies to [specify the systems, information and technology assets, staff and third parties in scope].")},
   {h2:"3. "+LX("الأدوار والمسؤوليات","Roles and responsibilities")},
   {li:LX("راعي السياسة ومالكها: [ ]","Sponsor and owner: [ ]")},{li:LX("مراجعة السياسة وتحديثها: الإدارة المعنية بالأمن السيبراني","Review and update: cybersecurity function")},{li:LX("تطبيق السياسة: [ ]","Implementation: [ ]")},{li:LX("قياس الالتزام: [ ]","Compliance monitoring: [ ]")},
   {h2:"4. "+LX("بنود السياسة","Policy statements")}];
  x.c.forEach((c,i)=>{const t=en?(c.en||c.ar):c.ar;B.push({p:`4.${i+1} ${t}`},{note:`${LX("المرجع","Reference")}: ECC ${c.id}`});
    (c.s||[]).forEach((z,j)=>{B.push({li:`4.${i+1}.${j+1} ${en?(z.en||z.ar):z.ar} (ECC ${z.id})`})})});
  B.push({h2:"5. "+LX("الالتزام بالسياسة","Compliance")},{li:LX("يجب على [رئيس الإدارة المعنية بالأمن السيبراني] التأكد من الالتزام بهذه السياسة دوريًا.","[The head of cybersecurity] shall verify compliance with this policy periodically.")},{li:LX("يجب على جميع العاملين في الجهة الالتزام بهذه السياسة.","All staff shall comply with this policy.")},{li:LX("قد يعرّض أي انتهاك لهذه السياسة صاحبه إلى إجراء تأديبي حسب الإجراءات المتبعة في الجهة.","Any violation may result in disciplinary action under the entity's procedures.")},
   {h2:"6. "+LX("الاستثناءات","Exceptions")},{p:LX("لا يُستثنى أي بند من هذه السياسة إلا بعد تقييم المخاطر، وتوثيق المبرر والضابط البديل، واعتماده من صاحب الصلاحية لمدة محددة.","No statement may be waived without a risk assessment, a documented justification and compensating control, and approval by the authorizing official for a defined period.")},
   {h2:"7. "+LX("المراجعة والتحديث","Review and update")},{p:LX("تُراجع هذه السياسة كل [مدة المراجعة] أو عند حدوث تغييرات في المتطلبات التشريعية والتنظيمية ذات العلاقة.","This policy shall be reviewed every [period] or when relevant legislative and regulatory requirements change.")},{note:`${LX("المرجع","Reference")}: ECC 1-3-4`},
   {h2:"8. "+LX("الاعتماد","Approval")},{table:[[LX("الدور","Role"),LX("الاسم","Name"),LX("التوقيع","Signature"),LX("التاريخ","Date")],[LX("أعدّه","Prepared by"),rp.prep||"",""," "],[LX("راجعه","Reviewed by"),rp.rev||"",""," "],[LX("اعتمده","Approved by"),rp.appr||"",""," "]]});
  await saveBlob(`${LX("مسودة-سياسة","policy-draft")}-${sid}-${today()}.docx`,await buildDocx(B,{rtl:!en}));toast(LX("نُزّلت مسودة السياسة","Policy draft downloaded"))}

// ---------- 3) Full Excel export ----------
async function fullExcel(){const en=U.lang==="en",yn=v=>({y:LX("نعم","Yes"),p:LX("جزئي","Partial"),n:LX("لا","No")})[v]||"";
  const ctl=[[LX("الضابط","Control"),LX("المكون الأساسي","Domain"),LX("المكون الفرعي","Subdomain"),LX("نص الضابط","Control text"),LX("الانطباق","Applicability"),LX("موثّق","Documented"),LX("مطبّق","Implemented"),LX("فعّال","Effective"),LX("الحالة","Status"),LX("التزام ورقي","Paper compliance"),LX("ممارسة غير موثقة","Undocumented practice"),LX("أدلة الدليل الإرشادي","Guide deliverables"),LX("المرفقات","Attachments"),LX("المسؤول","Owner"),LX("الموعد","Due"),LX("المرحلة","Phase"),LX("حالة المعالجة","Remediation"),LX("دليل التوثيق","Documentation evidence"),LX("دليل التطبيق","Implementation evidence"),LX("ملاحظات","Notes"),LX("آخر تعديل","Last edit"),LX("بواسطة","By")]];
  CTLS.forEach(c=>{const o=C(c.id),a=appOf(c.id),gl=isGap(c.id);ctl.push([c.id,tx(ECC.find(d=>d.id===c.dom)),tx(SUBBY[c.sub]),en?(c.en||c.ar):c.ar,en?AP_EN[a.v]:AP[a.v][0],yn(o.d),yn(o.i),yn(o.e),stName(c.id),isPaper(c.id)?"✓":"",isUndoc(c.id)?"✓":"",GD(c.id).d.length?`${gdHave(c.id)}/${GD(c.id).d.length}`:"",(o.att||[]).length||"",o.own||"",o.due||"",gl?phaseOf(c.id):"",o.rs?(RS.find(r=>r[0]===o.rs)||[0,""])[1]:"",o.ev_d||"",o.ev_i||"",o.n||"",o._at?new Date(o._at).toISOString().slice(0,16).replace("T"," "):"",o._by||""])});
  const docs=[[LX("الوثيقة","Document"),LX("الإصدار","Version"),LX("تاريخ الاعتماد","Approved"),LX("دورة المراجعة (أشهر)","Review cycle (months)"),LX("المراجعة القادمة","Next review"),LX("المكونات","Subdomains")]];
  Object.values(S.docs).forEach(d=>docs.push([d.name||"",d.ver||"",d.ad||"",d.per||"",docNext(d)||"",(d.subs||[]).join("، ")]));
  const risk=[[LX("الضابط","Control"),LX("الخطر","Risk"),LX("الاحتمالية","Likelihood"),LX("الأثر","Impact"),LX("الدرجة","Score"),LX("المستوى","Level"),LX("المعالجة","Treatment"),LX("المسؤول","Owner")]];
  riskRows().forEach(r=>risk.push([r.id,r.stmt,r.l,r.i,r.s,r.lvl[1],r.trt,r.own]));
  const exc=[[LX("الضابط","Control"),LX("المبرر","Justification"),LX("الضابط البديل","Compensating control"),LX("اعتمده","Approved by"),LX("ينتهي في","Expires"),LX("الحالة","Status")]];
  excRows().forEach(r=>exc.push([r.id,r.why,r.comp,r.appr,r.until,r.st[1]]));
  const sh=[{name:LX("التقييم","Assessment"),rows:ctl,widths:[9,22,24,60,11,9,9,9,13,10,10,10,9,18,12,8,12,30,30,30,16,14]},{name:LX("المخاطر","Risks"),rows:risk,widths:[9,60,10,10,8,12,14,18]},{name:LX("الاستثناءات","Exceptions"),rows:exc,widths:[9,40,40,20,12,12]},{name:LX("الوثائق","Documents"),rows:docs,widths:[40,10,14,12,14,30]}];
  sh.forEach(s=>s.rtl=!en);
  await saveBlob(`ECC-${LX("تقييم","assessment")}-${fileStamp()}.xlsx`,await buildXlsx(sh));toast(LX("نُزّل ملف Excel كامل","Full Excel file downloaded"))}

// ---------- 4) Calendar (.ics): remediation due dates, document reviews, exception expiry ----------
async function calIcs(){const E=[];
  CTLS.forEach(c=>{const o=C(c.id);if(o.due&&isGap(c.id)&&o.rs!=="done")E.push({date:o.due,uid:"due-"+c.id,title:`${LX("معالجة","Remediate")} ECC ${c.id}`,desc:`${shortT(ctlTxt(c.id),200)}\n${LX("المسؤول","Owner")}: ${o.own||"—"}`});
    if(o.exu)E.push({date:o.exu,uid:"exc-"+c.id,title:`${LX("انتهاء استثناء","Exception expires")} ECC ${c.id}`,desc:o.exw||""})});
  Object.entries(S.docs).forEach(([k,d])=>{const n=docNext(d);if(n)E.push({date:n,uid:"doc-"+k,title:`${LX("مراجعة وثيقة","Review document")}: ${d.name||""}`,desc:d.ver?`${LX("الإصدار","Version")} ${d.ver}`:""})});
  if(!E.length){toast(LX("لا مواعيد بعد. حدّد مواعيد في خارطة المعالجة أو سجل الوثائق.","No dates yet. Set due dates in the roadmap or the document register."));return}
  await saveBlob(`ECC-${LX("مواعيد","dates")}-${today()}.ics`,new Blob([buildIcs(E)],{type:"text/calendar;charset=utf-8"}));toast(LX(`نُزّل ملف تقويم فيه ${E.length} موعدًا. افتحه ليُضاف إلى تقويمك.`,`Calendar file with ${E.length} dates downloaded. Open it to add them to your calendar.`))}

// ---------- 5) Risk register & heat map; 6) exceptions register ----------
const RISK_LVL=s=>s>=15?["crit",LX("حرج","Critical")]:s>=10?["high",LX("عالٍ","High")]:s>=5?["mod",LX("متوسط","Medium")]:["low",LX("منخفض","Low")];
const TRT=[["mit","معالجة","Mitigate"],["acc","قبول","Accept"],["trf","نقل","Transfer"],["avd","تجنّب","Avoid"]];
const rDefL=id=>dst(id)==="x"?4:3,rDefI=id=>({H:5,M:3,L:2})[C(id).imp||"M"]+(appOf(id).v==="m"?0:-1);
function riskRows(){return gapList().map(g=>{const id=g.c.id,o=C(id),l=+o.rl||rDefL(id),i=Math.max(1,+o.ri||rDefI(id)),s=l*i;
  return {id,l,i,s,lvl:RISK_LVL(s),stmt:o.rk||`${LX("عدم الالتزام بالضابط","Non-compliance with")} ${id}: ${shortT(ctlTxt(id),120)}`,trt:(TRT.find(t=>t[0]===(o.rt||"mit"))||TRT[0])[U.lang==="en"?2:1],own:o.own||"",exc:excActive(id)}}).sort((a,b)=>b.s-a.s)}
const excActive=id=>{const o=C(id);return !!(o.exw||o.exu)&&(!o.exu||o.exu>=today())};
function excRows(){const t=today(),soon=addMonths(t,1);return CTLS.filter(c=>{const o=C(c.id);return o.exw||o.exc||o.exa||o.exu||U.excNew===c.id}).map(c=>{const o=C(c.id);
  const st=!o.exu?["w",LX("بلا تاريخ انتهاء","No expiry")]:o.exu<t?["x",LX("منتهٍ","Expired")]:o.exu<=soon?["p",LX("ينتهي قريبًا","Expiring soon")]:["c",LX("ساري","Active")];
  return {id:c.id,why:o.exw||"",comp:o.exc||"",appr:o.exa||"",until:o.exu||"",st}})}
function vRisk(){const R=riskRows(),E=excRows();const cell={};R.forEach(r=>{const k=r.l+"-"+r.i;(cell[k]=cell[k]||[]).push(r.id)});
  const heat=`<div class="heat" role="table" aria-label="${LX("خريطة المخاطر","Risk heat map")}"><div class="heat-y">${LX("الاحتمالية","Likelihood")}</div><div class="heat-g">${[5,4,3,2,1].map(l=>`<span class="hx">${l}</span>`+[1,2,3,4,5].map(i=>{const n=(cell[l+"-"+i]||[]).length,lv=RISK_LVL(l*i)[0];return `<span class="hc ${lv} ${n?"has":""}" title="${(cell[l+"-"+i]||[]).join("، ")}">${n||""}</span>`}).join("")).join("")}<span></span>${[1,2,3,4,5].map(i=>`<span class="hx">${i}</span>`).join("")}</div><div class="heat-x">${LX("الأثر","Impact")}</div></div>`;
  const cnt=k=>R.filter(r=>r.lvl[0]===k).length;
  const rows=R.map(r=>`<tr><td>${idb(r.id)}${r.exc?` <span class="flag paper">${LX("مستثنى","Excepted")}</span>`:""}</td><td style="min-width:240px">${inp("ctl",r.id,"rk",C(r.id).rk||"","",r.stmt,"f-rk-"+r.id)}</td><td>${sel("ctl",r.id,"rl",[1,2,3,4,5].map(n=>[n,n]),C(r.id).rl,LX("تلقائي","Auto")+" ("+rDefL(r.id)+")")}</td><td>${sel("ctl",r.id,"ri",[1,2,3,4,5].map(n=>[n,n]),C(r.id).ri,LX("تلقائي","Auto")+" ("+Math.max(1,rDefI(r.id))+")")}</td><td class="num"><span class="sev ${r.lvl[0]}">${r.s} · ${r.lvl[1]}</span></td><td>${sel("ctl",r.id,"rt",TRT.map(t=>[t[0],U.lang==="en"?t[2]:t[1]]),C(r.id).rt||"mit")}</td><td class="nw">${esc(r.own||"—")}</td></tr>`).join("");
  const gapsNoExc=gapList().filter(g=>!E.some(e=>e.id===g.c.id));
  const exRows=E.map(e=>`<tr><td>${idb(e.id)}</td><td>${ta("ctl",e.id,"exw",C(e.id).exw,LX("لماذا لا يمكن تطبيق الضابط الآن؟","Why can't the control be applied now?"))}</td><td>${ta("ctl",e.id,"exc",C(e.id).exc,LX("ما الإجراء البديل الذي يخفف الخطر؟","What alternative measure reduces the risk?"))}</td><td>${inp("ctl",e.id,"exa",C(e.id).exa,"",LX("صاحب الصلاحية","Authorizing official"))}</td><td>${inp("ctl",e.id,"exu",C(e.id).exu,"date")}</td><td><span class="pill s-${e.st[0]}">${e.st[1]}</span></td></tr>`).join("");
  return `<div class="grid">
   <section class="card c12"><h2>${LX("سجل المخاطر","Risk register")} <span class="tag meth">${LX("منهجية الأداة، غير رسمية","Tool method, unofficial")}</span><span class="act"><button class="btn sm quiet" data-g="fullx">${LX("تصدير Excel","Export Excel")}</button></span></h2>
    <p class="lead">${LX("كل فجوة خطر محتمل. الدرجة = الاحتمالية × الأثر (من 1 إلى 5). القيم التلقائية: الاحتمالية 4 لغير الملتزم و3 للجزئي، والأثر من «أثر» الضابط في المراجعة. عدّلها حسب واقع جهتك.","Each gap is a potential risk. Score = likelihood × impact (1–5). Defaults: likelihood 4 for non-compliant, 3 for partial; impact from the control’s impact in the review. Adjust to your entity.")}</p>
    ${R.length?`<div class="risk-top"><div class="kpis">${[["crit",LX("حرج","Critical")],["high",LX("عالٍ","High")],["mod",LX("متوسط","Medium")],["low",LX("منخفض","Low")]].map(([k,l])=>`<div class="kpi"><b class="num"><span class="sev ${k}" style="font-size:inherit">${cnt(k)}</span></b><span>${l}</span></div>`).join("")}</div>${heat}</div>
    <div class="tw"><table><thead><tr><th>${LX("الضابط","Control")}</th><th>${LX("وصف الخطر","Risk statement")}</th><th>${LX("الاحتمالية","Likelihood")}</th><th>${LX("الأثر","Impact")}</th><th>${LX("الدرجة","Score")}</th><th>${LX("المعالجة","Treatment")}</th><th>${LX("المسؤول","Owner")}</th></tr></thead><tbody>${rows}</tbody></table></div>`
    :`<div class="empty"><b>${LX("لا مخاطر بعد","No risks yet")}</b>${LX("تظهر هنا الضوابط التي قيّمتها جزئيًا أو غير ملتزمة.","Controls rated partial or non-compliant appear here.")}</div>`}</section>
   <section class="card c12"><h2>${LX("سجل الاستثناءات","Exceptions register")} (${E.length})</h2>
    <p class="lead">${LX("عندما يتعذّر تطبيق ضابط مؤقتًا، وثّق المبرر والإجراء البديل ومن اعتمده ومتى ينتهي. هذا ما يطلبه المدقق.","When a control can't be applied for now, record the justification, the compensating measure, who approved it and when it ends. This is what auditors ask for.")}</p>
    <div class="row" style="margin-bottom:10px"><select id="exc-new" aria-label="${LX("الضابط","Control")}" style="max-width:360px"><option value="">${LX("اختر ضابطًا لإضافة استثناء","Choose a control to add an exception")}</option>${gapsNoExc.map(g=>`<option value="${g.c.id}">${g.c.id} — ${esc(shortT(ctlTxt(g.c.id),70))}</option>`).join("")}</select><button class="btn sm" data-g="excadd">${LX("إضافة استثناء","Add exception")}</button></div>
    ${E.length?`<div class="tw"><table class="exc-t"><thead><tr><th>${LX("الضابط","Control")}</th><th>${LX("المبرر","Justification")}</th><th>${LX("الإجراء البديل","Compensating measure")}</th><th>${LX("اعتمده","Approved by")}</th><th>${LX("ينتهي في","Expires")}</th><th>${LX("الحالة","Status")}</th></tr></thead><tbody>${exRows}</tbody></table></div>`:`<p class="note">${LX("لا استثناءات مسجلة.","No exceptions recorded.")}</p>`}</section></div>`}
document.addEventListener("click",e=>{const t=e.target.closest("[data-g]");if(!t)return;const a=t.dataset.g;
  if(a==="evw")evidWord();else if(a==="evx")evidExcel();else if(a==="fullx")fullExcel();else if(a==="ics")calIcs();
  else if(a==="polsk")policySkeleton(t.dataset.id);
  else if(a==="excadd"){const v=($("#exc-new")||{}).value;if(!v){toast(LX("اختر ضابطًا أولًا","Choose a control first"));return}U.excNew=v;render();setTimeout(()=>{const f=document.getElementById("f-ctl-"+v+"-exw");if(f)f.focus()},60)}});
// register the new page
TABS_OK.add("risk");IC.risk='<path d="M12 3l9 16H3z"/><path d="M12 10v4M12 17h.01"/>';
HEAD.risk=["المخاطر والاستثناءات","حوّل الفجوات إلى سجل مخاطر بدرجات وخريطة حرارية، ووثّق الاستثناءات المعتمدة وتواريخ انتهائها."];
{const g=NAV.find(x=>x[1].some(y=>y[0]==="road"));if(g&&!g[1].some(y=>y[0]==="risk")){const i=g[1].findIndex(y=>y[0]==="road");g[1].splice(i+1,0,["risk","المخاطر والاستثناءات"])}}

// ---------- 7) Install as an app + offline (standalone version on https only) ----------
let pwaEvt=null;
if(!window.claude&&"serviceWorker" in navigator&&(location.protocol==="https:"||location.hostname==="localhost")){
  window.addEventListener("load",()=>{navigator.serviceWorker.register("sw.js").catch(()=>{})});
  window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();pwaEvt=e;pwaBtn()});
  window.addEventListener("appinstalled",()=>{pwaEvt=null;pwaBtn();toast(LX("ثُبّتت الأداة. افتحها من شاشة التطبيقات، وتعمل دون إنترنت.","Installed. Open it from your apps; it works offline."))})}
function pwaBtn(){let b=document.getElementById("instbtn");const row=document.querySelector(".rail-foot .row");if(!row)return;
  if(!pwaEvt){if(b)b.remove();return}
  if(!b){b=document.createElement("button");b.id="instbtn";b.className="icon-btn";b.innerHTML='<svg viewBox="0 0 24 24" width="16" height="16" style="stroke:currentColor;fill:none;stroke-width:1.9"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>';
    b.onclick=async()=>{if(!pwaEvt)return;pwaEvt.prompt();try{await pwaEvt.userChoice}catch(e){}pwaEvt=null;pwaBtn()};row.insertBefore(b,row.firstChild.nextSibling)}
  b.title=b.ariaLabel=LX("تثبيت كتطبيق يعمل دون إنترنت","Install as an app that works offline")}
