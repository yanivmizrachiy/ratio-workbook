import { readFile, writeFile } from 'node:fs/promises';

const path = 'site-shell.html';
let html = await readFile(path, 'utf8');

const canonicalScript = `<script>
(()=>{
 const frame=document.getElementById('workbookFrame'),reader=document.getElementById('reader'),stage=document.getElementById('readerStage'),prev=document.getElementById('prev'),next=document.getElementById('next'),select=document.getElementById('pageSelect'),status=document.getElementById('status'),printBtn=document.getElementById('printAll'),full=document.getElementById('full');
 let pages=[],index=0,ready=false;
 const doc=()=>frame.contentDocument;
 function fail(message){status.textContent='שגיאה בטעינת הדפים';prev.disabled=true;next.disabled=true;select.disabled=true;console.error('Ratio public reader:',message)}
 function installReaderMode(){
  const d=doc();if(!d)return false;
  if(d.documentElement.dataset.workbookError){fail(d.documentElement.dataset.workbookError);return false}
  if(d.documentElement.dataset.workbookReady!=='true')return false;
  pages=[...d.querySelectorAll('.wb-page')];
  if(!pages.length){fail('workbookReady=true but no .wb-page elements were rendered');return false}
  let style=d.getElementById('ratio-static-reader-style');
  if(!style){
   style=d.createElement('style');style.id='ratio-static-reader-style';
   style.textContent=`@media screen{html,body{width:100%!important;height:100%!important;margin:0!important;overflow:hidden!important;background:transparent!important}.wb-doc{display:block!important;position:relative!important;width:100%!important;height:100%!important;margin:0!important;padding:0!important;overflow:hidden!important;background:transparent!important}.wb-src{display:none!important}.wb-page{display:none!important;position:absolute!important;top:50%!important;left:50%!important;margin:0!important;zoom:1!important;transform-origin:center center!important}.wb-page.ratio-reader-current{display:flex!important}}`;
   d.head.appendChild(style);
  }
  select.innerHTML='';
  pages.forEach((p,i)=>{const o=document.createElement('option');const n=p.getAttribute('data-physical-page')||String(i+1);const chapter=p.getAttribute('data-textbook-chapter')||'';o.value=String(i);o.textContent=`עמוד ${n}${chapter?' — '+chapter:''}`;select.appendChild(o)});
  select.disabled=false;ready=true;go(0);return true;
 }
 function fit(){
  if(!ready||!pages[index])return;
  const p=pages[index];
  p.style.setProperty('zoom','1','important');
  p.style.setProperty('transform','translate(-50%,-50%) scale(1)','important');
  requestAnimationFrame(()=>{
   const pw=p.offsetWidth||794,ph=p.offsetHeight||1123,sw=Math.max(220,stage.clientWidth-24),sh=Math.max(320,stage.clientHeight-24),scale=Math.min(sw/pw,sh/ph,1);
   p.style.setProperty('transform',`translate(-50%,-50%) scale(${scale})`,'important');
  });
 }
 function sync(){const total=pages.length;status.textContent=`עמוד ${index+1} מתוך ${total}`;select.value=String(index);prev.disabled=index<=0;next.disabled=index>=total-1}
 function go(i){if(!ready||!pages.length)return;index=Math.max(0,Math.min(pages.length-1,i));pages.forEach((p,j)=>p.classList.toggle('ratio-reader-current',j===index));sync();fit()}
 function waitForWorkbook(){const started=Date.now();const probe=()=>{if(installReaderMode())return;if(Date.now()-started>20000){fail('Timed out waiting for workbookReady and .wb-page');return}setTimeout(probe,60)};probe()}
 frame.addEventListener('load',waitForWorkbook);
 if(frame.contentDocument?.readyState==='complete')waitForWorkbook();
 prev.addEventListener('click',()=>go(index-1));next.addEventListener('click',()=>go(index+1));select.addEventListener('change',()=>go(Number(select.value)));printBtn.addEventListener('click',()=>frame.contentWindow?.print());full.addEventListener('click',async()=>{if(document.fullscreenElement)await document.exitFullscreen();else await reader.requestFullscreen()});window.addEventListener('resize',fit);document.addEventListener('fullscreenchange',()=>{full.textContent=document.fullscreenElement?'יציאה ממסך מלא':'מסך מלא';setTimeout(fit,80)});reader.addEventListener('keydown',e=>{if(e.key==='ArrowLeft')go(index+1);if(e.key==='ArrowRight')go(index-1)})
})();
</script>`;

const scriptPattern = /<script>\s*\(\(\)=>\{[\s\S]*?\}\)\(\);\s*<\/script>/;
if (!scriptPattern.test(html)) throw new Error('Could not find public reader inline script in site-shell.html');
html = html.replace(scriptPattern, canonicalScript);

// No demo/help copy: keep only real titles and real controls.
html = html
  .replace('<h1>יחס ופרופורציה</h1><p>סרטון המחשה ודפי תרגול מוכנים לצפייה ולהדפסה.</p>', '<h1>יחס ופרופורציה</h1>')
  .replace('<p>סרטון קצר ומשלים לפני העבודה בדפים.</p>', '');

for (const required of [
  "dataset.workbookReady",
  "querySelectorAll('.wb-page')",
  "ratio-reader-current",
  "עמוד ${index+1} מתוך ${total}",
]) {
  if (!html.includes(required)) throw new Error(`Reader patch missing required marker: ${required}`);
}
for (const forbidden of ['ratio-editor-sidebar nav button','לא נמצאו דפים','דף A4 אחד בכל פעם, מותאם למסך','הדפים עצמם נשמרים כפי שפורסמו']) {
  if (html.includes(forbidden)) throw new Error(`Obsolete/demo reader marker still present: ${forbidden}`);
}

await writeFile(path, html, 'utf8');
console.log('site-shell.html: static .wb-page reader installed and demo copy removed');
