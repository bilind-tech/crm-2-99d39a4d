function n(e){return new Promise((o,a)=>{const r=new FileReader;r.onload=()=>o(r.result),r.onerror=()=>a(r.error??new Error("FileReader-Fehler")),r.readAsDataURL(e)})}export{n as b};
