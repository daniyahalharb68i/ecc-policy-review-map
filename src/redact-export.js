// ===== Cleaned copy in the same format as the uploaded file (Word stays Word, PDF stays PDF) =====
// Word: text is replaced inside the document XML, so formatting, tables, headers and footers stay as they are.
// PDF: every page is redrawn as an image with the hidden parts covered, so the hidden text is truly gone (not just covered).
const RD_PARTS=/^word\/(document|header\d*|footer\d*|footnotes|endnotes|comments)\.xml$/;
// cleaned replacement of one string → list of {s,e,tok} on that string
function rdHits(str){if(!str)return [];return rdSpans(str).map(f=>{const en=U.rd.ents[f.id];return en&&en.on?{s:f.s,e:f.e,tok:"["+en.tok+"]"}:null}).filter(Boolean)}
async function rdDocx(file){const z=await JSZip.loadAsync(file);const W="http://schemas.openxmlformats.org/wordprocessingml/2006/main";let n=0;
  for(const path of Object.keys(z.files).filter(p=>RD_PARTS.test(p))){
    const xml=await z.file(path).async("string");const doc=new DOMParser().parseFromString(xml,"application/xml");if(doc.getElementsByTagName("parsererror").length)continue;
    const paras=[...doc.getElementsByTagNameNS(W,"p")];
    for(const p of paras){const ts=[...p.getElementsByTagNameNS(W,"t")];if(!ts.length)continue;
      const parts=ts.map(t=>t.textContent);const full=parts.join("");const hits=rdHits(full);if(!hits.length)continue;
      // map each character of the paragraph to its <w:t> node
      const starts=[];let acc=0;parts.forEach(s=>{starts.push(acc);acc+=s.length});
      const nodeAt=pos=>{let i=starts.length-1;while(i>0&&starts[i]>pos)i--;return i};
      const out=parts.slice();
      hits.sort((a,b)=>b.s-a.s).forEach(h=>{const a=nodeAt(h.s),b=nodeAt(Math.max(h.s,h.e-1));
        for(let i=b;i>=a;i--){const s0=starts[i],txt=out[i]==null?"":out[i];const from=Math.max(0,h.s-s0),to=Math.min(parts[i].length,h.e-s0);
          out[i]=i===a?txt.slice(0,from)+h.tok+txt.slice(to):txt.slice(to)}n++});
      ts.forEach((t,i)=>{t.textContent=out[i];t.setAttributeNS("http://www.w3.org/XML/1998/namespace","xml:space","preserve")})}
    z.file(path,new XMLSerializer().serializeToString(doc))}
  // document properties can carry names: clear author, last editor, company
  for(const p of ["docProps/core.xml","docProps/app.xml"]){const f=z.file(p);if(!f)continue;let x=await f.async("string");
    x=x.replace(/<(dc:creator|cp:lastModifiedBy|Company|Manager)>[\s\S]*?<\/\1>/g,"<$1></$1>").replace(/<(dc:title|dc:subject|cp:keywords|dc:description)>([\s\S]*?)<\/\1>/g,(m,t,v)=>`<${t}>${esc(rdClean(v.replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">")))}</${t}>`);z.file(p,x)}
  return {blob:await z.generateAsync({type:"blob",mimeType:"application/vnd.openxmlformats-officedocument.wordprocessingml.document"}),n}}
async function rdPdf(file,onp){await loadScript(PDFJS+"pdf.min.js");for(const s of PDF_LIBS.slice(1))await loadScript(s);
  const lib=await pdfLib();const blankPages=new Set((onp&&onp.blank)||[]);
  const src=await lib.getDocument({data:await file.arrayBuffer()}).promise;let pdf=null,n=0;
  const ink=getComputedStyle(document.documentElement).getPropertyValue("--bg").trim()||"#10291F";
  for(let pn=1;pn<=src.numPages;pn++){if(onp)onp(pn,src.numPages);const page=await src.getPage(pn);const vp=page.getViewport({scale:2});
    const cv=document.createElement("canvas");cv.width=Math.ceil(vp.width);cv.height=Math.ceil(vp.height);const ctx=cv.getContext("2d");
    ctx.fillStyle="#fff";ctx.fillRect(0,0,cv.width,cv.height);
    if(blankPages.has(pn)){ // scanned page: withheld instead of exported unchecked
      ctx.fillStyle="#10291F";ctx.font='600 30px "IBM Plex Sans Arabic","Inter Tight",sans-serif';ctx.textAlign="center";ctx.direction="rtl";
      ctx.fillText("صفحة محجوبة: ممسوحة ضوئيًا ولم يُتحقق من خلوّها من المعلومات الحساسة",cv.width/2,cv.height/2);
      ctx.font='400 24px "Inter Tight",sans-serif';ctx.fillText("Page withheld: scanned image, not checked for sensitive data",cv.width/2,cv.height/2+44);
      const wmm0=vp.width/2*25.4/72,hmm0=vp.height/2*25.4/72;if(!pdf)pdf=new window.jspdf.jsPDF({unit:"mm",format:[wmm0,hmm0],orientation:wmm0>hmm0?"l":"p",compress:true});else pdf.addPage([wmm0,hmm0],wmm0>hmm0?"l":"p");
      pdf.addImage(cv.toDataURL("image/jpeg",.9),"JPEG",0,0,wmm0,hmm0);continue}
    await page.render({canvasContext:ctx,viewport:vp}).promise;
    const tc=await page.getTextContent();const items=tc.items.filter(i=>i.str);
    // page text with item boundaries, so a hit can be traced back to the items it covers
    let full="";const pos=items.map(it=>{const s=full.length;full+=it.str+" ";return s});
    const hits=rdHits(full);
    hits.forEach(h=>{items.forEach((it,k)=>{const s0=pos[k],s1=s0+it.str.length;const a=Math.max(h.s,s0),b=Math.min(h.e,s1);if(a>=b)return;
      const m=lib.Util.transform(vp.transform,it.transform);const fh=Math.hypot(m[2],m[3]);const w=it.width*vp.scale;const x0=m[4],yb=m[5];
      const rtl=it.dir==="rtl"||/[؀-ۿ]/.test(it.str);
      // measure real glyph widths (as a ratio of the whole item) instead of assuming equal-width characters
      const fam=((tc.styles||{})[it.fontName]||{}).fontFamily||"sans-serif";ctx.font=`100px ${fam}`;
      const mw=t=>ctx.measureText(t).width,tot=mw(it.str)||1;
      let f0=mw(it.str.slice(0,a-s0))/tot,f1=mw(it.str.slice(0,b-s0))/tot;if(rtl){const t=f0;f0=1-f1;f1=1-t}
      const pad=fh*.35,bx=x0+w*f0-pad,bw=w*(f1-f0)+pad*2,by=yb-fh*1.02,bh=fh*1.3;
      ctx.fillStyle=ink;ctx.fillRect(bx,by,bw,bh);
      if(a===h.s){ctx.fillStyle="#F4F0E6";let fs=Math.min(bh*.62,26);ctx.font=`500 ${fs}px "IBM Plex Sans Arabic","Inter Tight",sans-serif`;
        while(fs>7&&ctx.measureText(h.tok).width>bw-4){fs-=1;ctx.font=`500 ${fs}px "IBM Plex Sans Arabic","Inter Tight",sans-serif`}
        ctx.textBaseline="middle";ctx.textAlign="center";ctx.direction="rtl";ctx.fillText(h.tok,bx+bw/2,by+bh/2)}});n++});
    const wmm=vp.width/2*25.4/72,hmm=vp.height/2*25.4/72;
    if(!pdf)pdf=new window.jspdf.jsPDF({unit:"mm",format:[wmm,hmm],orientation:wmm>hmm?"l":"p",compress:true});else pdf.addPage([wmm,hmm],wmm>hmm?"l":"p");
    pdf.addImage(cv.toDataURL("image/jpeg",.9),"JPEG",0,0,wmm,hmm)}
  pdf.setProperties({title:rdClean(U.anaName||"")+" (sanitized)",creator:"ECC Policy Review Map",author:""});
  return {blob:pdf.output("blob"),n}}
async function rdDownload(){const f=U.anaFile,base=(rdClean(U.anaName||"")||"policy").replace(/[\\/:*?"<>|]+/g,"_").slice(0,60)+"-sanitized";
  if(!f){save(base+".txt","﻿"+rdClean(U.anaTxt),"text/plain;charset=utf-8");return}
  const ext=(f.name.split(".").pop()||"").toLowerCase();U.rdBusy="…";render();
  try{let r;
    if(ext==="docx"){if(!window.JSZip)throw new Error("zip");r=await rdDocx(f)}
    else if(ext==="pdf"){const sc=await rdScanned(f);
      if(sc.length&&!U.rdScanOk){U.rdBusy=null;U.confirm={msg:`${sc.length} صفحة لا تحوي نصًا قابلًا للاستخراج (ممسوحة ضوئيًا: ${sc.slice(0,12).join("، ")}${sc.length>12?"…":""})، فلا يمكن إخفاء ما فيها آليًا. ستُستبدل بصفحة «محجوبة» في النسخة المنقّاة. راجع الأصل يدويًا أو استخدم OCR قبل مشاركة هذه الصفحات.`,yes:"تصدير مع حجب الصفحات الممسوحة",soft:true,fn:()=>{U.rdScanOk=sc;rdDownload()}};render();return}
      const op=(i,t)=>{U.rdBusy=`${i}/${t}`;const b=$("#rd-busy");if(b)b.textContent=U.rdBusy};op.blank=U.rdScanOk||[];U.rdScanOk=null;r=await rdPdf(f,op)}
    else{const t=rdClean(await f.text());r={blob:new Blob(["﻿"+t],{type:"text/plain;charset=utf-8"}),n:1}}
    U.rdBusy=null;render();
    if(window.claude&&U.dl){await U.dl.save({filename:base+"."+ext,data:r.blob})}else dlFile(base+"."+ext,r.blob);
    toast(ext==="pdf"?"نُزّلت نسخة PDF منقّاة بنفس شكل الأصل":ext==="docx"?"نُزّل ملف Word منقّى بنفس التنسيق":"نُزّلت النسخة المنقّاة")}
  catch(e){U.rdBusy=null;render();toast("تعذّر إنشاء الملف بنفس الصيغة، فنُزّلت نسخة نصية.");save(base+".txt","﻿"+rdClean(U.anaTxt),"text/plain;charset=utf-8")}}

// pages with (almost) no extractable text are treated as scanned images
async function rdScanned(file){const lib=await pdfLib();const d=await lib.getDocument({data:await file.arrayBuffer(),isEvalSupported:false}).promise;const out=[];
  for(let p=1;p<=d.numPages;p++){const t=(await (await d.getPage(p)).getTextContent()).items.map(i=>i.str).join("");if(t.replace(/\s/g,"").length<15)out.push(p)}return out}
