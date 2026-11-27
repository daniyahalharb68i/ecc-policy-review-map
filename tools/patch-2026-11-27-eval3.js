// One-off patch (kept for traceability): fixes from the third evaluation (2026-11-27).
const fs=require('fs'),path=require('path'),B=path.join(__dirname,'..','src');
let bad=0;
function P(f,pairs){let s=fs.readFileSync(B+'/'+f,'utf8');for(const [a,b] of pairs){if(!s.includes(a)){console.log('MISSING in',f,':',a.slice(0,100));bad++;continue}s=s.split(a).join(b)}fs.writeFileSync(B+'/'+f,s);console.log('ok',f)}

// 1. Team-space icon was missing from the menu (the svg held the text "undefined")
// 5. PBKDF2 600,000 iterations (current OWASP guidance) for new team/backup files; v1 files (310,000) still open.
//    v2 also binds the header (format, salt, iv) to the ciphertext as AES-GCM additional data.
P('teamspace.js',[
 ['const TS_MAGIC="ECCTEAM1",TS_ITER=310000,TS_HKEY="__team_handle";',
  'const TS_MAGIC="ECCTEAM2",TS_MAGIC_V1="ECCTEAM1",TS_ITER=600000,TS_ITER_V1=310000,TS_HKEY="__team_handle";\nIC.team=\'<circle cx="9" cy="8" r="3.2"/><path d="M3 19c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5"/><circle cx="17" cy="9" r="2.4"/><path d="M15.5 13.7c.5-.1 1-.2 1.5-.2 2.5 0 4.5 1.7 4.5 4.5"/>\';'],
 ['async function tsKey(pw,salt){const base=await crypto.subtle.importKey("raw",enc.encode(pw),"PBKDF2",false,["deriveKey"]);\n  return crypto.subtle.deriveKey({name:"PBKDF2",salt,iterations:TS_ITER,hash:"SHA-256"}',
  'async function tsKey(pw,salt,iter){const base=await crypto.subtle.importKey("raw",enc.encode(pw),"PBKDF2",false,["deriveKey"]);\n  return crypto.subtle.deriveKey({name:"PBKDF2",salt,iterations:iter||TS_ITER,hash:"SHA-256"}'],
 ['const ct=new Uint8Array(await crypto.subtle.encrypt({name:"AES-GCM",iv},await tsKey(pw,salt),bytes));\n  const out=new Uint8Array(8+16+12+ct.length);out.set(enc.encode(TS_MAGIC),0);out.set(salt,8);out.set(iv,24);out.set(ct,36);return out}',
  'const head=new Uint8Array(36);head.set(enc.encode(TS_MAGIC),0);head.set(salt,8);head.set(iv,24);\n  const ct=new Uint8Array(await crypto.subtle.encrypt({name:"AES-GCM",iv,additionalData:head},await tsKey(pw,salt,TS_ITER),bytes));\n  const out=new Uint8Array(36+ct.length);out.set(head,0);out.set(ct,36);return out}'],
 ['async function tsDecrypt(buf,pw){const b=new Uint8Array(buf);if(new TextDecoder().decode(b.slice(0,8))!==TS_MAGIC)throw new Error("format");\n  try{return new Uint8Array(await crypto.subtle.decrypt({name:"AES-GCM",iv:b.slice(24,36)},await tsKey(pw,b.slice(8,24)),b.slice(36)))}catch(e){throw new Error("password")}}',
  'async function tsDecrypt(buf,pw){const b=new Uint8Array(buf);const m=new TextDecoder().decode(b.slice(0,8));if(m!==TS_MAGIC&&m!==TS_MAGIC_V1)throw new Error("format");const v2=m===TS_MAGIC;\n  try{return new Uint8Array(await crypto.subtle.decrypt(Object.assign({name:"AES-GCM",iv:b.slice(24,36)},v2?{additionalData:b.slice(0,36)}:{}),await tsKey(pw,b.slice(8,24),v2?TS_ITER:TS_ITER_V1),b.slice(36)))}catch(e){throw new Error("password")}}'],
]);
P('security.js',[
 ['ecc:{ext:["ecc"],sig:b=>new TextDecoder().decode(b.slice(0,8))==="ECCTEAM1"}}','ecc:{ext:["ecc"],sig:b=>/^ECCTEAM[12]$/.test(new TextDecoder().decode(b.slice(0,8)))}}'],
 ['iter=310000;U.lockKey=','iter=600000;U.lockKey='],
]);

// 6. Detailed-report file name repeated "ECC" when no entity name is set
P('reports2.js',[['await saveBlob(`ECC-${LX("تقرير-تفصيلي","detailed-report")}-${fileStamp()}.docx`','await saveBlob(`${S.cfg.entity?"ECC-":""}${LX("تقرير-تفصيلي","detailed-report")}-${fileStamp()}.docx`']]);

// 2. Risk-register drop-downs squeezed to 22px on phones
fs.appendFileSync(B+'/extras.css','\n/* risk register and other tables: drop-downs keep a readable width; the table scrolls sideways instead */\n.tw select{min-width:92px}\n');
console.log(bad?bad+' MISSING':'all applied');
