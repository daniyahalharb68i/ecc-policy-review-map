// ===== Language: Arabic (default) / English =====
// Content (controls, objectives, guide) switches by field (tx); interface wording is translated after each render
// from a dictionary keyed by the Arabic text with numbers replaced by "#".
U.lang="ar";try{if(localStorage.getItem("ecc_lang")==="en")U.lang="en"}catch(e){}
const tx=o=>!o?"":U.lang==="en"?(o.en||o.ar||""):(o.ar||o.en||"");
const AR_RE=/[؀-ۿ]/;
const NUM_RE=/\d+(?:[.,:\-\/]\d+)*/g;
const trKey=s=>s.replace(/\s+/g," ").trim().replace(NUM_RE,"#");
const DICT=(typeof I18N!=="undefined"&&I18N.d)||{};
// same dictionary keyed without diacritics, so text already stripped for display still translates
const MARKS_RE=/[ً-ْٰـ]/g;
const DICT_N={};Object.keys(DICT).forEach(k=>{DICT_N[k.replace(MARKS_RE,"")]=DICT[k]});
const PHR=Object.entries((typeof I18N!=="undefined"&&I18N.p)||{}).sort((a,b)=>b[0].length-a[0].length);
function tr(s){if(U.lang!=="en"||!s||!AR_RE.test(s))return s;
  const lead=s.match(/^\s*/)[0],trail=s.match(/\s*$/)[0],core=s.replace(/\s+/g," ").trim();
  const nums=core.match(NUM_RE)||[];const k0=trKey(core);let v=DICT[k0];if(v==null)v=DICT_N[k0.replace(MARKS_RE,"")];
  if(v!=null){let i=0;v=v.replace(/#/g,()=>nums[i]!=null?nums[i++]:"#");return lead+v+trail}
  let out=core;for(const [a,b] of PHR){if(out.includes(a))out=out.split(a).join(b)}return lead+out+trail}
function applyLang(root){const en=U.lang==="en";document.documentElement.lang=en?"en":"ar";document.documentElement.dir=en?"ltr":"rtl";
  const app=document.querySelector(".app");if(app)app.dir=en?"ltr":"rtl";const lb=$("#lang");if(lb){lb.textContent=en?"ع":"EN";lb.title=en?"العربية":"English"}
  document.querySelectorAll("[data-nca]").forEach(a=>{a.href=`https://nca.gov.sa/${en?"en":"ar"}/regulatory-documents/controls-list/${a.dataset.nca}/`});
  if(!en)return;root=root||app||document.body;
  const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode:n=>{const p=n.parentElement;if(!p||/^(TEXTAREA|SCRIPT|STYLE|OPTION)$/.test(p.tagName)&&p.tagName!=="OPTION"||p.closest("[data-notr],.rp-prev"))return NodeFilter.FILTER_REJECT;return AR_RE.test(n.nodeValue)?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_SKIP}});
  const ns=[];while(w.nextNode())ns.push(w.currentNode);ns.forEach(n=>{n.nodeValue=tr(n.nodeValue)});
  root.querySelectorAll("[placeholder],[title],[aria-label]").forEach(el=>{["placeholder","title","aria-label"].forEach(a=>{const v=el.getAttribute(a);if(v&&AR_RE.test(v))el.setAttribute(a,tr(v))})})}
// Static shell text (footer, brand, rail buttons) is not re-rendered, so remember its original Arabic
// and put it back before every language switch; otherwise English would stick after returning to Arabic.
const SHELL_ORIG=[];
(function(){document.querySelectorAll("footer, .brand, .rail-foot, .head .tag, #menu").forEach(root=>{
  const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);while(w.nextNode())SHELL_ORIG.push([w.currentNode,"#text",w.currentNode.nodeValue]);
  [root,...root.querySelectorAll("[title],[aria-label],[placeholder]")].forEach(el=>["title","aria-label","placeholder"].forEach(a=>{if(el.hasAttribute&&el.hasAttribute(a))SHELL_ORIG.push([el,a,el.getAttribute(a)])}))})})();
function restoreShell(){SHELL_ORIG.forEach(([n,k,v])=>{if(k==="#text")n.nodeValue=v;else n.setAttribute(k,v)})}
function setLang(l){restoreShell();U.lang=l;try{localStorage.setItem("ecc_lang",l)}catch(e){}U.repLang=null;render()}
const aiLang=()=>U.lang==="en"?"\n- Write every output value in clear professional English. Keep control IDs exactly as given.":"";
