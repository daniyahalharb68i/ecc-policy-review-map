const fs=require('fs'),B=process.argv[2];const r=f=>fs.readFileSync(B+'/'+f,'utf8');const has=f=>fs.existsSync(B+'/'+f);
const files=['core.js','i18n.js','views.js','pdf.js','features.js','redact.js','redact-export.js','analytics.js','events.js'].filter(has);
const app=files.map(r).join('\n');
const data=['logo.js','data.js','ccc-ar.js','i18n-dict.js','dict-supa.js'].filter(has).map(r).join('\n');
const css=['app.css','theme.css','palette.css','extras.css','s6.css'].filter(has).map(r).join('');
let h=r('shell.html').replace('/*CSS*/',()=>css).replace('/*DATA*/',()=>data).replace('/*APP*/',()=>app).replace('/*FAV*/',()=>has('logo-fav.txt')?r('logo-fav.txt'):'').replace('/*MARK*/',()=>has('logo-mark.txt')?r('logo-mark.txt'):'');
fs.mkdirSync(B+'/out',{recursive:true});fs.writeFileSync(B+'/out/index.html',h);console.log('bytes',h.length,'files',files.join(','));
try{new Function(app);console.log('syntax ok')}catch(e){console.log('SYNTAX ERROR',e.message)}
