const fs=require('fs');const t=fs.readFileSync(process.argv[2],'utf8').replace(/\s+/g,' ');
const re=/[^.:]{0,160}\bECC\b[^.:]{0,200}[.:]/g;const res=[];const seen=new Set();let m;
while((m=re.exec(t))){let s=m[0].replace(/\b\d-\d+-[PT]-\d+(-\d+)*\b/g,'').replace(/\s+/g,' ').trim();
 const ids=[...s.matchAll(/\b(\d-\d+(?:-\d+){0,2})\b/g)].map(x=>x[1]).filter(x=>!/^\d-\d+-[PT]/.test(x));
 if(!ids.length||!/ECC (control|controls|Subdomain|subdomain|Subcontrol)|in the ECC|of the ECC|controls in the ECC/.test(s))continue;
 const who=/\bCSP\b/.test(s)&&!/\bCST\b/.test(s)?'P':/\bCST\b/.test(s)&&!/\bCSP\b/.test(s)?'T':'';
 const k=s;if(seen.has(k))continue;seen.add(k);res.push({ecc:[...new Set(ids)],who,q:s.slice(0,260)})}
fs.writeFileSync(process.argv[3],JSON.stringify(res));console.log(res.length);res.forEach(r=>console.log(r.ecc.join(','),r.who,'|',r.q.slice(0,140)));
