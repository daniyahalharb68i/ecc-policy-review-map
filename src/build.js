const fs=require('fs'),B=process.argv[2];const r=f=>fs.readFileSync(B+'/'+f,'utf8');
const files=['core.js','i18n.js','views.js','pdf.js','features.js','events.js'].filter(f=>fs.existsSync(B+'/'+f));
const app=files.map(r).join('\n');
const data=r('data.js')+(fs.existsSync(B+'/i18n-dict.js')?'\n'+r('i18n-dict.js'):'');
let h=r('shell.html').replace('/*CSS*/',()=>r('app.css')+(fs.existsSync(B+'/theme.css')?r('theme.css'):'')+(fs.existsSync(B+'/palette.css')?r('palette.css'):'')+(fs.existsSync(B+'/extras.css')?r('extras.css'):'')).replace('/*DATA*/',()=>data).replace('/*APP*/',()=>app);
fs.mkdirSync(B+'/out',{recursive:true});fs.writeFileSync(B+'/out/index.html',h);console.log('bytes',h.length,'files',files.join(','));
try{new Function(app);console.log('syntax ok')}catch(e){console.log('SYNTAX ERROR',e.message)}
