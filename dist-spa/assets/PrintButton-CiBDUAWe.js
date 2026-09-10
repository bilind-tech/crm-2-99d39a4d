import{r as E,j as m,G as T,H as F,k as b,K as y}from"./index-DN-r4uqJ.js";import{g as B,c as S}from"./pdfjsWorker-B5GzDGhr.js";import{P as L}from"./printer-u2dvjkJv.js";S();const j=2;function w(){if(typeof navigator>"u")return!1;const t=navigator.userAgent;return/iPad|iPhone|iPod/.test(t)?!0:/Safari/.test(t)&&!/Chrome|Chromium|Edg\/|OPR\/|Firefox/.test(t)}function h(t,e){const n=e instanceof Error?e:new Error(String(e)),r=n.message||String(e)||"unbekannt",i=new Error(`${t} (${r})`);return i.cause=n,i}function C(t){if(t)try{const e=t.document;e.open(),e.write(U()),e.close();try{t.focus()}catch{}}catch{}}function I(t,e){if(t)try{const n=t.document;n.open(),n.write(z(e)),n.close()}catch{}}async function P(t,e){if(!e)throw new Error("Druck-Tab konnte nicht geöffnet werden (Popup-Blocker?). Bitte Popups für diese Seite zulassen.");const n=URL.createObjectURL(t);try{try{e.location.replace(n)}catch(i){try{e.location.href=n}catch(s){throw URL.revokeObjectURL(n),h("Druck-Tab konnte nicht auf PDF umgeleitet werden",s??i)}}const r=()=>{try{e.focus(),e.print()}catch{}};setTimeout(r,800),setTimeout(r,1800)}finally{setTimeout(()=>URL.revokeObjectURL(n),10*6e4)}}function U(){return`<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Drucken</title>
<style>
  html, body { margin:0; padding:0; height:100%; background:#525659; }
  body { font:14px -apple-system,BlinkMacSystemFont,system-ui,sans-serif; color:#fff; }
  #loader {
    position:fixed; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center;
    gap:14px; text-align:center; padding:24px;
  }
  #spinner {
    width:32px; height:32px; border-radius:999px; border:3px solid rgba(255,255,255,.28);
    border-top-color:#fff; animation:spin .8s linear infinite;
  }
  #status { max-width:360px; line-height:1.45; opacity:.95; }
  @keyframes spin { to { transform:rotate(360deg); } }
</style>
</head>
<body>
<div id="loader">
  <div id="spinner" aria-hidden="true"></div>
  <div id="status">PDF wird vorbereitet…</div>
</div>
</body>
</html>`}function z(t){return`<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Drucken</title>
<style>
  html, body { margin:0; padding:0; height:100%; background:#525659; }
  body { font:14px -apple-system,BlinkMacSystemFont,system-ui,sans-serif; color:#fff; }
  .wrap {
    position:fixed; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center;
    gap:10px; text-align:center; padding:24px;
  }
  .msg { max-width:420px; line-height:1.5; }
  .sub { opacity:.7; font-size:13px; }
</style>
</head>
<body>
<div class="wrap">
  <div class="msg">${String(t||"PDF konnte nicht vorbereitet werden.").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}</div>
  <div class="sub">Dieser Tab kann geschlossen werden.</div>
</div>
</body>
</html>`}function $(t){C(t)}function p(t,e){I(t,e)}async function A(t){let e;try{e=await B({data:new Uint8Array(t)}).promise}catch(r){throw h("PDF konnte nicht gelesen werden",r)}const n=[];try{for(let r=1;r<=e.numPages;r++)try{const i=await e.getPage(r),s=i.getViewport({scale:j}),c=document.createElement("canvas");c.width=Math.ceil(s.width),c.height=Math.ceil(s.height);const a=c.getContext("2d");if(!a)throw new Error("Canvas-Context nicht verfügbar");await i.render({canvasContext:a,viewport:s,canvas:c}).promise,n.push(c.toDataURL("image/png")),i.cleanup()}catch(i){throw h(`Seite ${r} konnte nicht gerendert werden`,i)}}finally{try{await e.cleanup(),await e.destroy()}catch{}}return n}function H(t){return`<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8" />
<title>Drucken</title>
<style>
  @page { size: A4; margin: 0; }
  html, body {
    width: 210mm;
    margin: 0;
    padding: 0;
    background: #fff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .page {
    width: 210mm;
    height: 297mm;
    box-sizing: border-box;
    overflow: hidden;
    page-break-after: always;
    break-after: page;
    /* entfernt unsichtbares Inline-Whitespace nach <img>,
       das sonst die effektive Höhe vergrößert und eine Phantom-Seite auslöst */
    line-height: 0;
    font-size: 0;
  }
  .page:last-child {
    page-break-after: auto;
    break-after: auto;
    height: auto;
  }
  .page img {
    display: block;
    width: 100%;
    height: auto;
    max-height: 297mm;
    object-fit: contain;
    object-position: top center;
  }
</style>
</head>
<body>
${t.map(n=>`<div class="page"><img src="${n}" alt="" /></div>`).join(`
`)}
</body>
</html>`}async function N(t){if(t.length===0)throw new Error("Keine Seiten zum Drucken");const e=document.createElement("iframe");e.setAttribute("aria-hidden","true"),e.setAttribute("tabindex","-1"),e.style.cssText="position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;",e.srcdoc=H(t),document.body.appendChild(e);const n=()=>{try{e.remove()}catch{}};await new Promise((r,i)=>{let s=!1;const c=()=>{s||(s=!0,r())};e.addEventListener("load",()=>{const a=e.contentWindow;if(!a){n(),i(new Error("Iframe-Fenster nicht verfügbar"));return}const f=Array.from(a.document.images);let g=f.length||1;const d=()=>{if(!(--g>0)){try{a.addEventListener("afterprint",()=>setTimeout(n,300))}catch{}setTimeout(n,6e4);try{a.focus(),a.print(),c()}catch(l){n(),i(l instanceof Error?l:new Error(String(l)))}}};if(f.length===0)d();else for(const l of f)l.complete?d():(l.addEventListener("load",d),l.addEventListener("error",d))}),e.addEventListener("error",()=>{n(),i(new Error("Druck-Vorschau konnte nicht geladen werden (Iframe-Fehler)"))})})}async function x(t){if(!t||t.byteLength===0)throw new Error("PDF-Inhalt ist leer");const e=await A(t);await N(e)}async function O(t,e){let n;try{n=await fetch(t)}catch(i){throw p(e??null,"PDF konnte nicht geladen werden."),h("PDF-Quelle nicht erreichbar (Blob-URL evtl. abgelaufen)",i)}if(!n.ok)throw p(e??null,"PDF konnte nicht geladen werden."),new Error(`PDF-Quelle antwortete HTTP ${n.status}`);if(w()){const i=await n.blob();await P(i,e??null);return}let r;try{r=await n.arrayBuffer()}catch(i){throw h("PDF-Inhalt konnte nicht gelesen werden",i)}await x(r)}async function k(t,e){if(w()){await P(t,e??null);return}let n;try{n=await t.arrayBuffer()}catch(r){throw h("PDF-Blob konnte nicht gelesen werden",r)}await x(n)}function v(){return w()}function K(t){const{label:e="Drucken",variant:n="outline",size:r="sm",className:i,disabled:s}=t,[c,a]=E.useState(!1),f=async l=>{if(l.stopPropagation(),l.preventDefault(),c)return;let o=null;if(v()&&(t.blob||t.url||t.getBlob))try{o=window.open("","_blank"),$(o)}catch{o=null}try{if(t.blob){a(!0),await k(t.blob,o);return}if(t.url){a(!0),await O(t.url,o);return}if(t.getBlob){a(!0);const u=await t.getBlob();await k(u,o);return}if(o)try{o.close()}catch{}y.error("PDF ist noch nicht bereit.")}catch(u){console.error(u);const D=u instanceof Error?u.message:String(u);if(o&&v())p(o,"PDF konnte nicht vorbereitet werden.");else if(o)try{o.close()}catch{}y.error(`Drucken fehlgeschlagen: ${D}`)}finally{a(!1)}},g=!!t.blob||!!t.url||!!t.getBlob,d=s||c||!g;return m.jsxs(T,{type:"button",variant:n,size:r,className:b("rounded-lg",i),onClick:f,disabled:d,"aria-label":e,title:e,children:[c?m.jsx(F,{className:b("h-4 w-4 animate-spin",r!=="icon"&&"mr-1.5")}):m.jsx(L,{className:b("h-4 w-4",r!=="icon"&&"mr-1.5")}),r!=="icon"&&e]})}export{K as P};
