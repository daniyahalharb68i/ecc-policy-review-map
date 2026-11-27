// Standalone page (GitHub Pages): wraps the app with a document skeleton and a strict Content-Security-Policy.
// Only the tool's own two inline scripts run (allowed by hash), so any injected markup cannot execute script,
// and the page can only talk to the hosts it needs (libraries, fonts, the anonymous visit counter).
const fs=require('fs'),crypto=require('crypto'),B=process.argv[2];
// browsers normalise CRLF/CR to LF before hashing inline scripts, so normalise the page itself
const h=fs.readFileSync(B+'/out/index.html','utf8').replace(/\r\n?/g,"\n");
const hashes=[...h.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>"'sha256-"+crypto.createHash('sha256').update(m[1],'utf8').digest('base64')+"'");
const csp=["default-src 'self'",
  "script-src 'self' "+hashes.join(" ")+" https://cdnjs.cloudflare.com https://gc.zgo.at",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https://ecc-map.goatcounter.com",
  "connect-src 'self' https://ecc-map.goatcounter.com https://cdnjs.cloudflare.com https://fonts.googleapis.com https://fonts.gstatic.com",
  "worker-src 'self' blob: https://cdnjs.cloudflare.com",
  "manifest-src 'self'","media-src 'self' blob:","frame-src 'none'","object-src 'none'","base-uri 'none'","form-action 'none'"].join("; ");
fs.writeFileSync(B+'/out/test.html','<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1,viewport-fit=cover"><meta http-equiv="Content-Security-Policy" content="'+csp+'"><meta name="referrer" content="no-referrer"><style>:root{color-scheme:light}body{margin:0;font:14px system-ui}img{max-width:100%}[hidden]{display:none!important}</style></head><body>'+h+'</body></html>');
console.log('csp scripts',hashes.length);
