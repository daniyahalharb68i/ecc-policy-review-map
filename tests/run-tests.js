// Builds a test page (the real app + tests/selftest.js), serves it on a local port, runs it in headless Edge/Chrome,
// and waits for the page to post its results back. Exit code 1 if any test fails.
// Usage:  node tests/run-tests.js          → run headless and print results
//         node tests/run-tests.js --open   → serve the page and print its URL, to watch the tests in a normal browser
const fs=require("fs"),path=require("path"),http=require("http"),{execFileSync,spawn}=require("child_process");
const root=path.resolve(__dirname,".."),src=path.join(root,"src"),out=path.join(__dirname,"out");
execFileSync(process.execPath,[path.join(src,"build.js"),src],{stdio:"ignore"});           // same build as production
const app=fs.readFileSync(path.join(src,"out","index.html"),"utf8"),tests=fs.readFileSync(path.join(__dirname,"selftest.js"),"utf8");
const page='<!doctype html><html><head><meta charset=utf8><title>running</title></head><body><script>window.__TEST__=1</script>'+app
  +'<script>setTimeout(function(){var s=document.createElement("script");s.textContent='+JSON.stringify(tests)+';document.body.appendChild(s)},1500)</script></body></html>';
fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,"app-tests.html"),page);
const open=process.argv.includes("--open");let browser=null;
const os=require("os"),prof=fs.mkdtempSync(path.join(os.tmpdir(),"ecc-tests-"));
// close only the browser process this script started (and its child processes), never other browser windows
const killBrowser=()=>{if(!browser)return;try{if(process.platform==="win32")execFileSync("taskkill",["/PID",String(browser.pid),"/T","/F"],{stdio:"ignore"});else browser.kill()}catch(e){}};
const finish=(code,txt)=>{if(txt)console.log(txt);killBrowser();server.close();setTimeout(()=>{try{fs.rmSync(prof,{recursive:true,force:true})}catch(e){}process.exit(code)},300)};
const server=http.createServer((req,res)=>{
  if(req.method==="POST"&&req.url==="/result"){let b="";req.on("data",c=>b+=c);req.on("end",()=>{res.end("ok");if(!open)finish(/^FAIL|\nFAIL|CRASH/.test(b)?1:0,b);else console.log(b)});return}
  if(req.url==="/"||req.url.startsWith("/?")){res.writeHead(200,{"content-type":"text/html; charset=utf-8"});res.end(page);return}
  res.writeHead(404);res.end()});
server.listen(0,"127.0.0.1",()=>{const url="http://localhost:"+server.address().port+"/";
  if(open){console.log("Open "+url+" (Ctrl+C to stop)");return}
  const browsers=["C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe","C:/Program Files/Microsoft/Edge/Application/msedge.exe","C:/Program Files/Google/Chrome/Application/chrome.exe","/usr/bin/google-chrome","/usr/bin/chromium","/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"];
  const exe=browsers.find(b=>fs.existsSync(b));if(!exe){console.error("No Edge/Chrome found. Run with --open and use any browser.");finish(2)}
  browser=spawn(exe,["--headless=new",...(process.env.CI?["--no-sandbox"]:[]),"--disable-gpu","--no-first-run","--no-default-browser-check","--user-data-dir="+prof,url],{stdio:"ignore"});
  setTimeout(()=>finish(2,"Timed out: the tests did not report back within 180 s."),180000)});
