// Cross-check each cleaned guide item against an independent (layout-mode) extraction.
const fs=require('fs');const B=process.argv[2];const G=JSON.parse(fs.readFileSync(B+'/guide-clean.json','utf8'));
const lay=fs.readFileSync(process.argv[3],'utf8');
const pages=lay.split('\f');
// drop bullet markers ("o", "◦", private-use bullets) and the one apostrophe fix before comparing
const N=s=>s.replace(/(^|\s)[o◦](?=\s)/g,' ').replace(/entity's (?=strategic|cybersecurity)/g,'entit ').toLowerCase().replace(/[^a-z0-9]+/g,'');
const pn=pages.map(N);const all=pn.join('');
const bad=[];let total=0,ok=0;
Object.entries(G).forEach(([k,o])=>['t','g','d'].forEach(f=>o[f].forEach(x=>{total++;
  const y=x.replace(/^\[[\d-]+\]\s*/,'').replace(/[◦]/g,' ');
  const parts=y.split(/\s◦\s|\s{2,}/).map(N).filter(p=>p.length>=12);
  // an item passes if every chunk of ~40 chars is found somewhere in the layout text
  const chunks=[];const n=N(y);for(let i=0;i<n.length;i+=40)chunks.push(n.slice(i,i+40));
  const miss=chunks.filter(c=>c.length>=15&&!all.includes(c));
  if(!miss.length){ok++;return}
  const first=miss[0];let page=-1;
  // locate page by the first chunk that *is* found
  const hit=chunks.find(c=>c.length>=15&&all.includes(c));if(hit)page=pn.findIndex(p=>p.includes(hit))+1;
  bad.push({k,f,page,miss:miss.length,of:chunks.length,x:y.slice(0,160)});
})));
console.log('items',total,'verified',ok,'unverified',bad.length);
fs.writeFileSync(B+'/verify.json',JSON.stringify(bad,null,1));
bad.slice(0,40).forEach(b=>console.log(b.k,b.f,'p'+b.page,b.miss+'/'+b.of,'|',b.x));
