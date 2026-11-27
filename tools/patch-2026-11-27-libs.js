// One-off patch (kept for traceability): every external library on its latest release, pinned with SRI.
// pdf.js 3.11.174 → 6.5.438 (fixes CVE-2024-4367), JSZip 3.10.1 → 3.10.2. jsPDF 4.2.1 and html2canvas 1.4.1 are already latest.
const fs=require('fs'),path=require('path'),B=path.join(__dirname,'..','src');
function P(f,pairs){let s=fs.readFileSync(B+'/'+f,'utf8');for(const [a,b] of pairs){if(!s.includes(a)){console.log('MISSING in',f,':',a.slice(0,90));continue}s=s.split(a).join(b)}fs.writeFileSync(B+'/'+f,s);console.log('ok',f)}
const OLD_JSZ="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js",NEW_JSZ="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.2/jszip.min.js";
const SRI_JSZ="sha384-DdGlNq+wVXAn83gXqwyeFHB7iyXy6L0rLrNzgDmhKWPjiJLg9vj6qosYmZmkMfQ+";
const PDF6="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/6.5.438/";
P('pdf.js',[
 ['"'+OLD_JSZ+'":"sha384-+mbV2IY1Zk/X1p/nWllGySJSUN8uMs+gUAN10Or95UBH0fpj6GfKgPmgC5EXieXG"','"'+NEW_JSZ+'":"'+SRI_JSZ+'"'],
 ['"https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js":"sha384-/1qUCSGwTur9vjf/z9lmu/eCUYbpOTgSjmpbMQZ1/CtX2v/WcAIKqRv+U1DUCG6e"','"'+PDF6+'pdf.min.mjs":"sha384-6MTG6VynDVMfHzijur0VKc9BdrA6HaXHZd+pK6iGWh2acDj3CibR0CRwHizMoy1N"'],
 ['"https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js":"sha384-SnzOobpRMLXZ52iJvZm/C0fYw0OQemTXzTjIsdsfMcrCtCEe9qgzxTd3RSklO5x2"','"'+PDF6+'pdf.worker.min.mjs":"sha384-/+r9qqXFj/8aZJ0d2yiuf6sqAR9T1UyN6NdZoI8cMvzccicdUNx62wDS8JsPedce"'],
 // loadScript can load an ES module (pdf.js 4+ ships only modules); integrity is enforced for modules too
 ['const loadScript=src=>new Promise((ok,no)=>{if([...document.scripts].some(s=>s.src===src))return ok();const s=document.createElement("script");',
  'const loadScript=(src,mod)=>new Promise((ok,no)=>{if([...document.scripts].some(s=>s.src===src))return ok();const s=document.createElement("script");if(mod)s.type="module";'],
]);
P('shell.html',[['<script src="'+OLD_JSZ+'" integrity="sha384-+mbV2IY1Zk/X1p/nWllGySJSUN8uMs+gUAN10Or95UBH0fpj6GfKgPmgC5EXieXG" crossorigin="anonymous"></script>','<script src="'+NEW_JSZ+'" integrity="'+SRI_JSZ+'" crossorigin="anonymous"></script>']]);
P('features.js',[
 ['const PDFJS="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/";','const PDFJS="'+PDF6+'";'],
 ['const u=PDFJS+"pdf.worker.min.js";','const u=PDFJS+"pdf.worker.min.mjs";'],
 ['async function pdfLib(){await loadScript(PDFJS+"pdf.min.js");const lib=window.pdfjsLib;',
  // the module build sets globalThis.pdfjsLib once evaluated; wait for it
  'async function pdfLib(){await loadScript(PDFJS+"pdf.min.mjs",true);for(let i=0;i<50&&!window.pdfjsLib;i++)await new Promise(r=>setTimeout(r,20));const lib=window.pdfjsLib;if(!lib)throw new Error("pdfjs");'],
]);
