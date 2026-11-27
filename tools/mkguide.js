const fs=require('fs');const B=process.argv[2];const g=JSON.parse(fs.readFileSync(B+'/guide-map.json','utf8'));
const ECC=JSON.parse(fs.readFileSync(B+'/ecc-data.js','utf8').trim().replace(/^const ECC=/,'').replace(/;\s*$/,''));
const names=[...ECC.map(d=>d.en),...ECC.flatMap(d=>d.subs.map(s=>s.en)),'Cybersecurity Resilience','Third-Party and Cloud Computing Cybersecurity','Cybersecurity Defense','Cybersecurity Governance','Cybersecurity Event Logs and Monitoring Management','Information System and Processing Facilities Protection','Networks Security Management','Cybersecurity Incident and Threat Management','Third-Party Cybersecurity','Cloud Computing and Hosting Cybersecurity','Physical Security','Web Application Security','Mobile Devices Security','Data and Information Protection','Backup and Recovery Management','Vulnerabilities Management','Penetration Testing','Cryptography','Email Protection','Identity and Access Management','Asset Management'].filter(Boolean);
const uniq=[...new Set(names)].sort((a,b)=>b.length-a.length);
const esc=x=>x.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
// a sentence end followed by a subdomain/domain heading or objective leftovers = page/section leakage
const tail=new RegExp('([.)])\\s+(?:\\d-\\d+\\s+)?(?:To ensure|Objective|Controls|'+uniq.map(esc).join('|')+')\\b.*$');
const tailObj=new RegExp('\\s+(?:'+uniq.map(esc).join('|')+')\\s+To ensure\\b.*$');
const tailName=new RegExp('\\s+(?:'+uniq.map(esc).join('|')+')\\s*$');
const tailNoPunct=new RegExp('\\s+\\d-\\d+(?:\\s+(?:To ensure|Objective|Controls|[A-Z][a-z]+)).*$');
const FIX=[[/(?<!(?:control|controls|Control|Controls|subcontrol|Subcontrol|subcontrols|ECC|and|of|in|to))\s\d-\d+-\d+(?:-\d+)?(?=\s+(?:[a-z]|◦|o\s))/g,''],[/\s+Compliance with Cybersecurity Standard controls, Laws and Regulations\b.*$/,''],[/\s+\d-\d+-\d+(?:-\d+)?\s+\S{1,3}$/,''],[/\bNeedto-use\b/g,'Need-to-use'],[/\bMultiFactor\b/g,'Multi-Factor'],[/^([a-z])/,m=>m.toUpperCase()],[/\bentit (?=strategic|cybersecurity)/g,"entity's "],[/\bthirdparty\b/g,'third-party'],[/\bsectorrelated\b/g,'sector-related'],[/\binDepth\b/g,'in-Depth'],[/Guide to Essential Cybersecurity Controls \(ECC\) Implementation/g,'']];
function cl(x){let y=x.replace(/\s+/g,' ').trim();
  y=y.replace(tailObj,'');
  y=y.replace(tail,'$1');
  y=y.replace(tailNoPunct,'');
  for(let i=0;i<2;i++){const m=y.match(tailName);if(m&&m.index>30)y=y.slice(0,m.index)}
  y=y.replace(/(\s+\d-\d+(?:-\d+)*)+\s*$/,'');
  FIX.forEach(([a,b])=>{y=y.replace(a,b)});
  y=y.replace(/\s+o\s+/g,' ◦ ').replace(/\s+/g,' ').trim();return y}
// tools: merge fragments that start lowercase or are only "Template"-like into the previous item
function tools(arr){const out=[];arr.map(cl).forEach(x=>{if(!x)return;if(out.length&&(/^[a-z]/.test(x)||/^(Template|Policy Template|Procedures Template|Register Template)\.?$/.test(x)))out[out.length-1]=(out[out.length-1]+' '+x).trim();else out.push(x)});
  return [...new Set(out.flatMap(x=>x.split(/(?<=Template\.?)\s+(?=[A-Z])/)).map(x=>x.replace(/\.$/,'').trim()).filter(x=>x.length>3))]}
// sentence whose start is missing in the PDF text layer (GECC-2:2026, PDF page 126); restored from the owner's screenshot of that page on 2026-11-17
const KNOWN_GAPS=[[/^\[2-13-3-3\] approved channels/,"[2-13-3-3] Report to NCA the occurrence of a cybersecurity incident through NCA's approved channels"],[/incident reporting is@nca\.gov\.sa and follow/,'incident reporting "is@nca.gov.sa", and follow'],[/membership "info@nca\.gov\.sa follow up/,'membership "info@nca.gov.sa" and follow up']];
const G={};Object.entries(g).forEach(([k,o])=>{G[k]={t:tools(o.t),g:o.g.map(cl).map(x=>KNOWN_GAPS.reduce((y,[a,b])=>y.replace(a,b),x)).filter(x=>x.replace(/^\[[\d-]+\]\s*/,"").length>8),d:[...new Set(o.d.map(cl).filter(x=>x.replace(/^\[[\d-]+\]\s*/,"").length>8))]}});
let d=fs.readFileSync(B+'/data.js','utf8').replace(/\nconst GUIDE=.*$/s,'');d+='\nconst GUIDE='+JSON.stringify(G)+';\n';fs.writeFileSync(B+'/data.js',d);
fs.writeFileSync(B+'/guide-clean.json',JSON.stringify(G,null,1));
let n=0;Object.values(G).forEach(o=>n+=o.d.length);console.log('deliverables',n,'bytes',d.length);
console.log(G['1-1-1'].t,G['1-1-2'].t,G['2-1-6'].d.slice(-1),G['2-5-3'].t);
