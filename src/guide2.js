const fs=require('fs');const B=process.argv[2];
const ECC=JSON.parse(fs.readFileSync(B+'/ecc-data.js','utf8').trim().replace(/^const ECC=/,'').replace(/;\s*$/,''));
let raw=fs.readFileSync(process.argv[3],'utf8');
raw=raw.split(/\r?\n/).filter(l=>!/^(TLP: Clear|Document Classification: Public|Guide to Essential Cybersecurity Controls \(ECC\) Implementation|\d+)\s*$/.test(l.trim())).join(' ');
let t=raw.replace(/�||•/g,' • ').replace(/\s+/g,' ');
const subs=ECC.flatMap(d=>d.subs);
subs.forEach(s=>{[s.oe].forEach(x=>{if(x&&x.length>15)t=t.split(x).join(' ')})});
t=t.replace(/\b\d-\d+(?:-\d+)? ?Objective ?Controls?(?: \d-\d+-\d+)?/g,' ').replace(/\bObjective Controls\b/g,' ').replace(/\s+/g,' ');
const lo=t.toLowerCase();const norm=x=>x.replace(/\s+/g,' ').toLowerCase();
const ctls=subs.flatMap(s=>s.c);let pos=lo.indexOf('ecc implementation guidelines',3000);const found=[],miss=[];
const keysOf=e=>[[0,75],[15,85],[30,100],[50,120]].map(([a,b])=>e.slice(a,b)).filter(k=>k.length>=12);
const SPEC={'1-9-5':'1-9-5 end/termination of their employment with the entity','2-5-1':'2-5-1 identified, documented, and approved','2-5-2':'2-5-2 implemented.','2-5-3':'2-5-3 the following as a minimum','2-5-4':'2-5-4 management shall be periodically reviewed','4-1-1':'4-1-1 shall be identified, documented','4-2-4':'4-2-4 the cybersecurity requirements related to the use of hosting'};
ctls.forEach(c=>{const e=norm(c.en);let p=-1;for(const k of (SPEC[c.id]?[SPEC[c.id].toLowerCase()]:[]).concat([c.id+' '+e.slice(0,18)],keysOf(e))){p=lo.indexOf(k,pos);if(p>=0&&p-pos<60000)break;p=-1}
 if(p<0){miss.push(c.id);return}found.push([c,p]);pos=p+10});
global.FOUND=found;const out={};const HRE=/(Relevant cybersecurity tools|Control implementation guidelines|Expected deliverables):?/gi;
found.forEach(([c,p],i)=>{const end=i+1<found.length?found[i+1][1]:p+8000;let seg=t.slice(p,end);
 const subIds=(c.s||[]).map(z=>z.id);
 // token stream: headings and sub-control ids
 const toks=[];let m;const BS=String.fromCharCode(92);const ids=subIds.length?subIds.join('|'):'@@';const re=new RegExp(HRE.source+'|'+BS+'b('+ids+')'+BS+'b','gi');
 while((m=re.exec(seg)))toks.push({i:m.index,len:m[0].length,h:m[1]?m[1].toLowerCase():null,sid:m[2]||null});
 const o={t:[],g:[],d:[]};let cur=null,sid="";
 for(let k=0;k<toks.length;k++){const tk=toks[k];const nx=k+1<toks.length?toks[k+1].i:seg.length;
   if(tk.sid){sid=tk.sid;continue}
   cur=tk.h.startsWith('relevant')?'t':tk.h.startsWith('control')?'g':'d';
   let body=seg.slice(tk.i+tk.len,nx);
   body.split(' • ').map(x=>x.replace(/\s+/g,' ').replace(/\s\d-\d+-\d+(-\d+)?\s*$/,'').trim()).filter(x=>x.length>3).forEach(x=>o[cur].push(sid&&cur!=='t'?`[${sid}] `+x:x))}
 o.t=[...new Set(o.t)];out[c.id]=o});
const empt=ctls.filter(c=>out[c.id]&&!out[c.id].d.length).map(c=>c.id);
console.log('found',found.length,'miss',miss.join(','),'no-deliv',empt.join(','));
fs.writeFileSync(B+'/guide-map.json',JSON.stringify(out));console.log('bytes',JSON.stringify(out).length);
['2-12-3','1-9-4','3-1-4'].forEach(id=>{const o=out[id];console.log('\n##',id,'tools:',o.t.join(' | '));console.log(' deliv:\n   '+o.d.map(x=>x.slice(0,150)).join('\n   '))});
if(process.argv[4]){FOUND.forEach(([c,p],i)=>{if(process.argv[4].split(',').includes(c.id))console.log('@@',c.id,p,'next',FOUND[i+1]&&FOUND[i+1][0].id,FOUND[i+1]&&FOUND[i+1][1],'|',t.slice(p,p+160))})}
