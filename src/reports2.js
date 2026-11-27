// ===== Results by domain, comparison between periods, highest-risk list, GRC detailed report =====
const domStats=perFn=>ECC.map(d=>{const ids=d.subs.flatMap(x=>x.c).map(c=>c.id);const r={id:d.id,name:tx(d),app:0,c:0,p:0,x:0,none:0,paper:0};
  ids.forEach(id=>{const s=perFn(id);if(s==="na")return;r.app++;if(s==="c")r.c++;else if(s==="p")r.p++;else if(s==="x")r.x++;else r.none++;if(!perFn.snap&&isPaper(id))r.paper++});
  r.done=r.c+r.p+r.x;r.comp=r.done?Math.round(r.c/r.done*1000)/10:null;r.gaps=r.p+r.x;return r});
const curPer=Object.assign(id=>dst(id),{snap:false});
// ---------- results by main domain (home) ----------
function vDomainDist(){const D=domStats(curPer);if(!D.some(d=>d.done))return "";
  return `<section class="card c12"><h2>${LX("توزيع النتائج حسب المكونات الأساسية","Results by main domain")}</h2>
   <div class="ddist">${D.map(d=>`<div class="dd-row"><span class="dd-n"><b>${d.id}.</b> ${esc(d.name)}</span><span class="dd-bar"><i style="width:${d.comp??0}%"></i></span><span class="num dd-v">${d.comp==null?"—":d.comp+"%"}</span></div>`).join("")}</div>
   <div class="tw" style="margin-top:12px"><table><thead><tr><th>${LX("المكوّن","Domain")}</th><th>${LX("منطبق","Applicable")}</th><th>${LX("مُقيَّم","Assessed")}</th><th>${LX("ملتزم","Compliant")}</th><th>${LX("جزئي","Partial")}</th><th>${LX("غير ملتزم","Non-compliant")}</th><th>${LX("لم يُقيَّم","Not assessed")}</th><th>${LX("التزام ورقي","Paper")}</th><th>${LX("الالتزام","Compliance")}</th></tr></thead>
   <tbody>${D.map(d=>`<tr><td><b>${d.id}.</b> ${esc(d.name)}</td><td class="num">${d.app}</td><td class="num">${d.done}</td><td class="num">${d.c}</td><td class="num">${d.p}</td><td class="num">${d.x}</td><td class="num">${d.none}</td><td class="num">${d.paper||"—"}</td><td class="num"><b>${d.comp==null?"—":d.comp+"%"}</b></td></tr>`).join("")}</tbody></table></div></section>`}
// ---------- highest-risk controls (home) ----------
function vTopRisks(){const R=riskRows().slice(0,10);if(!R.length)return "";
  return `<section class="card c12"><h2>${LX("الضوابط الأعلى خطورة","Highest-risk controls")} <span class="tag meth">${LX("الدرجة: منهجية الأداة","Score: tool method")}</span><span class="act"><button class="btn sm ghost" data-act="tab" data-v="risk">${LX("سجل المخاطر كاملًا","Full risk register")}</button></span></h2>
   <div class="tw"><table><thead><tr><th>#</th><th>${LX("الضابط","Control")}</th><th>${LX("الخطر","Risk")}</th><th>${LX("الدرجة","Score")}</th><th>${LX("الحالة","Status")}</th><th>${LX("المسؤول","Owner")}</th></tr></thead>
   <tbody>${R.map((r,i)=>`<tr><td class="num">${i+1}</td><td>${idb(r.id)}</td><td>${esc(shortT(r.stmt,120))}${r.exc?` <span class="flag exc">${LX("مستثنى","Excepted")}</span>`:""}</td><td class="nw"><span class="sev ${r.lvl[0]}">${r.s} · ${r.lvl[1]}</span></td><td>${pill(dst(r.id))}</td><td class="nw">${esc(r.own||"—")}</td></tr>`).join("")}</tbody></table></div></section>`}
// ---------- comparison between periods: snapshots or the current state ----------
const snapGet=k=>k==="__now"?{at:today(),label:LX("الوضع الحالي","Current state"),per:Object.fromEntries(CTLS.map(c=>[c.id,dst(c.id)]))}:S.snaps[k];
function vDomainCompare(){const A=snapGet(U.cmpA),B=snapGet(U.cmpB);if(!A||!B)return "";
  const pa=Object.assign(id=>(A.per||{})[id]||"",{snap:true}),pb=Object.assign(id=>(B.per||{})[id]||"",{snap:true});
  const DA=domStats(pa),DB=domStats(pb);const tot=p=>{let c=0,d=0;CTLS.forEach(x=>{const s=p(x.id);if(s==="c")c++;if(s==="c"||s==="p"||s==="x")d++});return d?Math.round(c/d*1000)/10:null};
  const ta=tot(pa),tb=tot(pb),dlt=(a,b)=>a==null||b==null?"—":`<b class="${b>a?"up":b<a?"down":""}">${b>a?"▲ +":b<a?"▼ ":""}${Math.round((b-a)*10)/10}</b>`;
  return `<div class="box" style="margin-top:12px"><h3>${LX("المقارنة حسب المكونات الأساسية","Comparison by main domain")}</h3><div class="tw"><table class="cmp-t"><thead><tr><th>${LX("المكوّن","Domain")}</th><th>${esc(A.at)} ${esc(A.label||"")}</th><th>${esc(B.at)} ${esc(B.label||"")}</th><th>${LX("التغيّر (نقطة)","Change (pts)")}</th></tr></thead>
   <tbody>${DA.map((d,i)=>`<tr><td><b>${d.id}.</b> ${esc(d.name)}</td><td class="num">${d.comp==null?"—":d.comp+"%"}</td><td class="num">${DB[i].comp==null?"—":DB[i].comp+"%"}</td><td class="num">${dlt(d.comp,DB[i].comp)}</td></tr>`).join("")}
   <tr class="tot"><td><b>${LX("الإجمالي","Overall")}</b></td><td class="num"><b>${ta==null?"—":ta+"%"}</b></td><td class="num"><b>${tb==null?"—":tb+"%"}</b></td><td class="num">${dlt(ta,tb)}</td></tr></tbody></table></div></div>`}

// ---------- detailed report for the GRC team (Word) ----------
async function grcReport(){const en=U.lang==="en",s=stats(CTLS),D=domStats(curPer),rp=S.cfg.rep||{},yn=v=>({y:LX("نعم","Yes"),p:LX("جزئي","Partial"),n:LX("لا","No")})[v]||"—";
  const B=[{h1:LX("التقرير التفصيلي لفريق الحوكمة والمخاطر والالتزام","Detailed report for the GRC team")},{p:`ECC-2:2024 · ${S.cfg.entity||"—"} · ${today()}`},
   {note:LX("يعرض هذا التقرير كل ضابط بتقييمه وأدلته وفجواته ومخاطره. ترتيب الأولويات ودرجات المخاطر منهجية الأداة وليست نصًا رسميًا.","Every control with its assessment, evidence, gaps and risk. Priorities and risk scores are the tool's method, not official text.")},
   {table:[[LX("البند","Item"),LX("القيمة","Value")],[LX("الجهة","Entity"),S.cfg.entity||"—"],[LX("تاريخ التقييم","Assessment date"),S.cfg.date||today()],[LX("أعدّه","Prepared by"),rp.prep||S.cfg.assessor||"—"],[LX("التصنيف","Classification"),((CLS.find(x=>x[0]===(rp.cls||"internal"))||CLS[0])[en?2:1])]]},
   {h2:"1. "+LX("المؤشرات الرئيسية","Key indicators")},
   {table:[[LX("المؤشر","Indicator"),LX("القيمة","Value")],[LX("نسبة الالتزام","Compliance rate"),(s.comp??"—")+"%"],[LX("ملتزم / جزئي / غير ملتزم","Compliant / Partial / Non-compliant"),`${s.c} / ${s.p} / ${s.x}`],[LX("لم يُقيَّم","Not assessed"),String(s.none+s.w)],[LX("التزام ورقي","Paper compliance"),String(s.paper)],[LX("ممارسة غير موثقة","Undocumented practice"),String(s.undoc)],[LX("فجوات مفتوحة","Open gaps"),String(gapList().length)],[LX("استثناءات","Exceptions"),String(excRows().length)]]},
   {h2:"2. "+LX("التوزيع حسب المكونات الأساسية","Distribution by main domain")},
   {table:[[LX("المكوّن","Domain"),LX("منطبق","Applicable"),LX("ملتزم","Compliant"),LX("جزئي","Partial"),LX("غير ملتزم","Non-compliant"),LX("الالتزام","Compliance")]].concat(D.map(d=>[`${d.id}. ${d.name}`,String(d.app),String(d.c),String(d.p),String(d.x),d.comp==null?"—":d.comp+"%"]))},
   {h2:"3. "+LX("تفاصيل الضوابط","Control details")}];
  const RM=Object.fromEntries(riskRows().map(r=>[r.id,r]));
  ECC.forEach(d=>{B.push({h2:`${d.id}. ${tx(d)}`});d.subs.forEach(x=>{B.push({h3:`${x.id} ${tx(x)}`});
    x.c.forEach(c=>{const o=C(c.id),a=appOf(c.id),gap=isGap(c.id),g=GD(c.id),miss=gdMissing(c.id),risk=gap?RM[c.id]:null;
      B.push({p:`${c.id} — ${shortT(en?(c.en||c.ar):c.ar,400)}`,b:1});
      if(a.v==="na"){B.push({note:LX("لا ينطبق","Not applicable")+(a.why?": "+a.why:"")});return}
      const rows=[[LX("البند","Item"),LX("القيمة","Value")],[LX("الانطباق","Applicability"),en?AP_EN[a.v]:AP[a.v][0]],[LX("الحالة","Status"),stName(c.id)+(isPaper(c.id)?" · "+LX("التزام ورقي","Paper compliance"):"")+(isUndoc(c.id)?" · "+LX("ممارسة غير موثقة","Undocumented"):"")],
        [LX("موثّق / مطبّق / فعّال","Documented / Implemented / Effective"),`${yn(o.d)} / ${yn(o.i)} / ${yn(o.e)}`]];
      if(g.d.length)rows.push([LX("أدلة الدليل الإرشادي","Guide deliverables"),`${gdHave(c.id)}/${g.d.length}`]);
      if(o.ev_d)rows.push([LX("دليل التوثيق","Documentation evidence"),o.ev_d]);if(o.ev_i)rows.push([LX("دليل التطبيق","Implementation evidence"),o.ev_i]);if(o.ev_e)rows.push([LX("دليل الفاعلية","Effectiveness evidence"),o.ev_e]);
      if((o.att||[]).length)rows.push([LX("المرفقات","Attachments"),o.att.map(r=>r.name).join("، ")]);
      if(gap)rows.push([LX("المعالجة","Remediation"),`${LX("المرحلة","Phase")} ${phaseOf(c.id)} · ${LX("المسؤول","Owner")}: ${o.own||"—"} · ${LX("الموعد","Due")}: ${o.due||"—"} · ${o.rs?(RS.find(r=>r[0]===o.rs)||[0,""])[1]:LX("لم تبدأ","Not started")}`]);
      if(risk)rows.push([LX("الخطر","Risk"),`${risk.s} (${risk.lvl[1]}) · ${risk.trt}`]);
      if(o.exw||o.exu)rows.push([LX("استثناء","Exception"),`${o.exw||""}${o.exc?" · "+LX("بديل","Compensating")+": "+o.exc:""}${o.exu?" · "+LX("حتى","until")+" "+o.exu:""}`]);
      if(o.n)rows.push([LX("ملاحظات","Notes"),o.n]);if(o.rem)rows.push([LX("خطة المعالجة","Remediation plan"),o.rem]);
      B.push({table:rows});
      if(gap&&miss.length){B.push({p:LX("أدلة مطلوبة لم تُجمع بعد:","Evidence still needed:"),b:1});miss.slice(0,10).forEach(m=>B.push({li:m.t,mark:"☐"}))}})})});
  const RR=riskRows();B.push({h2:"4. "+LX("سجل المخاطر","Risk register")});
  B.push(RR.length?{table:[[LX("الضابط","Control"),LX("الخطر","Risk"),LX("الدرجة","Score"),LX("المعالجة","Treatment"),LX("المسؤول","Owner")]].concat(RR.map(r=>[r.id,shortT(r.stmt,140),`${r.s} · ${r.lvl[1]}`,r.trt,r.own||"—"]))}:{p:LX("لا مخاطر مفتوحة.","No open risks.")});
  const EX=excRows();B.push({h2:"5. "+LX("سجل الاستثناءات","Exceptions register")});
  B.push(EX.length?{table:[[LX("الضابط","Control"),LX("المبرر","Justification"),LX("الإجراء البديل","Compensating measure"),LX("اعتمده","Approved by"),LX("ينتهي","Expires"),LX("الحالة","Status")]].concat(EX.map(e=>[e.id,e.why||"—",e.comp||"—",e.appr||"—",e.until||"—",e.st[1]]))}:{p:LX("لا استثناءات.","No exceptions.")});
  const DOC=Object.values(S.docs);B.push({h2:"6. "+LX("سجل الوثائق","Document register")});
  B.push(DOC.length?{table:[[LX("الوثيقة","Document"),LX("الإصدار","Version"),LX("الاعتماد","Approved"),LX("المراجعة القادمة","Next review")]].concat(DOC.map(d=>[d.name||"",d.ver||"—",d.ad||"—",docNext(d)||"—"]))}:{p:LX("لا وثائق مسجلة.","No documents recorded.")});
  const SN=Object.values(S.snaps).sort((a,b)=>a.at<b.at?-1:1);B.push({h2:"7. "+LX("التقدم عبر الزمن","Progress over time")});
  B.push(SN.length?{table:[[LX("التاريخ","Date"),LX("اللقطة","Snapshot"),LX("الالتزام","Compliance"),LX("فجوات","Gaps")]].concat(SN.map(x=>[x.at,x.label||"—",(x.comp??"—")+"%",String(x.gaps)]))}:{p:LX("لا لقطات محفوظة.","No snapshots saved.")});
  await saveBlob(`ECC-${LX("تقرير-تفصيلي","detailed-report")}-${fileStamp()}.docx`,await buildDocx(B,{rtl:!en}));toast(LX("نُزّل التقرير التفصيلي","Detailed report downloaded"))}
document.addEventListener("click",e=>{const t=e.target.closest("[data-r2]");if(!t)return;const a=t.dataset.r2;
  if(a==="grc")grcReport();else if(a==="exec")makePDF("exec");else if(a==="cmpnow"){const k=Object.entries(S.snaps).sort((a,b)=>a[1].at<b[1].at?1:-1)[0];if(k){U.cmpA=k[0];U.cmpB="__now";render()}}});

// ---------- controls that still need assessment (roadmap page) ----------
function vUnassessed(){const L=CTLS.filter(c=>appOf(c.id).v!=="na"&&(!dst(c.id)||dst(c.id)==="w"));if(!L.length)return "";
  return `<section class="card"><h2>${LX("ضوابط تحتاج إلى تقييم","Controls that need assessment")} (${L.length})</h2>
   <p class="lead">${LX("هذه الضوابط لا تظهر في خارطة الفجوات لأنها لم تُقيَّم بعد أو قُيّمت طبقة واحدة منها فقط. قيّمها حتى لا تختفي فجوات حقيقية عن أنظار الفريق.","These controls don't appear in the gap roadmap because they haven't been assessed, or only one layer was. Assess them so real gaps don't stay hidden.")}</p>
   ${ECC.map(d=>{const x=L.filter(c=>c.dom===d.id);return x.length?`<div class="ua"><div class="note"><b>${d.id}.</b> ${esc(tx(d))} (${x.length})</div><div class="row">${x.map(c=>idb(c.id)+(dst(c.id)==="w"?'<span class="note">½</span>':"")).join(" ")}</div></div>`:""}).join("")}</section>`}
