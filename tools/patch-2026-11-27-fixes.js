// One-off patch (kept for traceability): fixes from the second evaluation, 2026-11-27.
const fs=require('fs'),path=require('path'),B=path.join(__dirname,'..','src');
function P(f,pairs){let s=fs.readFileSync(B+'/'+f,'utf8');for(const [a,b] of pairs){if(!s.includes(a)){console.log('MISSING in',f,':',a.slice(0,90));continue}s=s.split(a).join(b)}fs.writeFileSync(B+'/'+f,s);console.log('ok',f)}
// (3) jsPDF 2.5.1 → 4.2.1 (patched for CVE-2025-29907, CVE-2025-57810, CVE-2025-68428), pinned with SRI
P('pdf.js',[
 ['https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"]','https://cdnjs.cloudflare.com/ajax/libs/jspdf/4.2.1/jspdf.umd.min.js"]'],
 ['"https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js":"sha384-JcnsjUPPylna1s1fvi1u12X5qjY5OL56iySh75FdtrwhO/SWXgMjoVqcKyIIWOLk"','"https://cdnjs.cloudflare.com/ajax/libs/jspdf/4.2.1/jspdf.umd.min.js":"sha384-qovJwSBbRDPP5cEjCp8S0UP66wrvnjaa60XMOGzTNanrThcrGfXfnZkvgY8N1KT3"'],
]);
// (2) saved analyses keep whether each quote was found verbatim (the policy text itself is never saved)
P('events.js',[['case "anasave":{const a=U.anaRes;if(!a)break;const id2=uid();putDoc("ana",id2,{name:a.name,at:a.at,subs:a.subs,res:a.res});',
 'case "anasave":{const a=U.anaRes;if(!a)break;const id2=uid();const src=norm(a.txt||"");const res=JSON.parse(JSON.stringify(a.res));(res.items||[]).forEach(i=>{if(i.quote)i._found=src.includes(norm(i.quote).slice(0,80))});putDoc("ana",id2,{name:a.name,at:a.at,subs:a.subs,res});']]);
P('views.js',[['const found=i.quote?src.includes(norm(i.quote).slice(0,80)):null;','const found=i._found!=null?i._found:i.quote?(a.txt?src.includes(norm(i.quote).slice(0,80)):null):null;'],
 ['<span class="src">${found?`<span class="tag off">الاقتباس موجود حرفيًا في نص السياسة</span>`:`<span class="tag meth">لم يُعثر على الاقتباس حرفيًا — تحقّق يدويًا</span>`}</span>',
  '<span class="src">${found===null?`<span class="tag">تحليل محفوظ: لم يُتحقق من الاقتباس</span>`:found?`<span class="tag off">الاقتباس موجود حرفيًا في نص السياسة</span>`:`<span class="tag meth">لم يُعثر على الاقتباس حرفيًا — تحقّق يدويًا</span>`}</span>']]);
P('security.js',[['const SEC_STR={','const SEC_BOOL=["_found"];const SEC_STR={']]);
// (5) large files: count in one pass, group the hidden-items list by type, show at most 100 rows with a search box
P('redact.js',[
 ['const rdList=txt=>{const seen=new Set(),L=[];rdSpans(txt).forEach(f=>{if(seen.has(f.id))return;seen.add(f.id);const en=U.rd.ents[f.id];if(en)L.push(Object.assign({n:rdSpans(txt).filter(z=>z.id===f.id).length},en))});return L};',
  'const rdList=txt=>{const sp=rdSpans(txt),cnt=new Map();sp.forEach(f=>cnt.set(f.id,(cnt.get(f.id)||0)+1));const L=[];cnt.forEach((n,id)=>{const en=U.rd.ents[id];if(en)L.push(Object.assign({n},en))});return L};'],
 ['${L.length?`<details class="rd-list" ${L.length<=12?"open":""}><summary>العناصر المخفية (${L.length}) — غيّر اسم أي رمز أو استثنِ عنصرًا</summary><div class="tw"><table><thead><tr><th></th><th>النوع</th><th>النص الأصلي</th><th>يظهر للتحليل باسم</th><th>مرات</th></tr></thead><tbody>${L.map(e=>',
  '${L.length?`<details class="rd-list" ${L.length<=12?"open":""}><summary>العناصر المخفية (${L.length}) — غيّر اسم أي رمز أو استثنِ عنصرًا</summary>${rdGroups(L)}${L.length>100?`<div class="row" style="margin:8px 0"><input id="rd-q" type="search" placeholder="ابحث في العناصر المخفية" value="${esc(U.rdQ||"")}" style="max-width:320px"><span class="note">يعرض الجدول أول 100 عنصر${U.rdQ?" مطابق":""} من ${L.length}.</span></div>`:""}<div class="tw"><table><thead><tr><th></th><th>النوع</th><th>النص الأصلي</th><th>يظهر للتحليل باسم</th><th>مرات</th></tr></thead><tbody>${rdFilter(L).slice(0,100).map(e=>'],
]);
fs.appendFileSync(B+'/redact.js',`
// grouped summary for large documents: one row per type, with a switch to hide or show all of that type
function rdGroups(L){if(L.length<=30)return "";const g={};L.forEach(e=>{const k=e.type;(g[k]=g[k]||{n:0,on:0,uniq:0});g[k].uniq++;g[k].n+=e.n;if(e.on)g[k].on++});
  return \`<div class="rd-groups">\${Object.entries(g).sort((a,b)=>b[1].n-a[1].n).map(([k,v])=>\`<label class="rd-g"><input type="checkbox" data-rd="grp" data-v="\${esc(k)}" \${v.on===v.uniq?"checked":""}><b>\${esc(rdTypeName(k))}</b><span class="num">\${v.uniq} \${LX("قيمة","values")} · \${v.n} \${LX("موضعًا","places")}</span></label>\`).join("")}</div>\`}
const rdFilter=L=>{const q=(U.rdQ||"").trim().toLowerCase();const S0=L.slice().sort((a,b)=>b.n-a.n);return q?S0.filter(e=>e.val.toLowerCase().includes(q)||e.tok.toLowerCase().includes(q)):S0};
document.addEventListener("change",e=>{const t=e.target.closest("[data-rd=grp]");if(!t)return;Object.values(U.rd.ents).forEach(en=>{if(en.type===t.dataset.v)en.on=t.checked});render()});
document.addEventListener("input",e=>{if(e.target.id!=="rd-q")return;U.rdQ=e.target.value;clearTimeout(U._rdqT);U._rdqT=setTimeout(()=>{render();const q=document.getElementById("rd-q");if(q){q.focus();q.setSelectionRange(q.value.length,q.value.length)}},250)});
`);
fs.appendFileSync(B+'/extras.css',`
.rd-groups{display:flex;flex-wrap:wrap;gap:8px;margin:8px 0}
.rd-g{display:inline-flex;gap:8px;align-items:center;border:1px solid var(--line);border-radius:6px;padding:6px 10px;cursor:pointer;font-size:.86rem}
.rd-g .num{color:var(--muted)}
`);
fs.appendFileSync(B+'/dict-supa.js',`
Object.assign(I18N.d,{"تحليل محفوظ: لم يُتحقق من الاقتباس":"Saved analysis: quote not verified","ابحث في العناصر المخفية":"Search hidden items","يعرض الجدول أول # عنصر من #.":"The table shows the first # of #.","يعرض الجدول أول # عنصر مطابق من #.":"The table shows the first # matching of #.","قيمة":"values","موضعًا":"places"});
`);
