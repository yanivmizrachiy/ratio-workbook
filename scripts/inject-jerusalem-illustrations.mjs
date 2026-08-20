import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const requested = process.argv[2] || path.join(root, 'preview', 'full-workbook.html');
const mainFile = path.resolve(requested);
const parsed = path.parse(mainFile);
const artifactFile = path.join(parsed.dir, `${parsed.name}-artifact${parsed.ext || '.html'}`);
const spriteFile = path.join(root, 'src', 'assets', 'jerusalem', 'jerusalem-ratio-sprite.jpg');

if (!fs.existsSync(spriteFile)) throw new Error(`Missing Jerusalem illustration sprite: ${spriteFile}`);
const spriteData = fs.readFileSync(spriteFile).toString('base64');
const spriteUrl = `data:image/jpeg;base64,${spriteData}`;

const css = `
.jr-illustration{flex:0 0 auto;align-self:center;display:block;overflow:hidden;border:1px solid rgba(31,42,68,.18);border-radius:13px;background-image:url('${spriteUrl}');background-repeat:no-repeat;background-size:100% 700%;box-shadow:0 3px 12px rgba(15,23,42,.11);break-inside:avoid;page-break-inside:avoid}
@media print{.jr-illustration{box-shadow:none;border-color:rgba(31,42,68,.22)}}
`;

const marker = "    [].forEach.call(document.querySelectorAll('.wb-page .wb-body'),function(body){";
const guardedMarker = "    [].forEach.call(document.querySelectorAll('.wb-page:not([data-has-jerusalem-illustration]) .wb-body'),function(body){";
const injection = `
    (function attachJerusalemIllustrations(){
      var IMAGE_COUNT=7;
      var GAP=12;
      var MIN_H=118;
      var MAX_H=218;
      var ASPECT=360/508;
      var pages=[].slice.call(document.querySelectorAll('.wb-page'));
      var used=Object.create(null);
      var inserted=0;

      function freeSpace(body){
        var cs=getComputedStyle(body);
        var padT=parseFloat(cs.paddingTop)||0;
        var padB=parseFloat(cs.paddingBottom)||0;
        var kids=body.children;
        var contentH=0;
        if(kids.length){contentH=kids[kids.length-1].getBoundingClientRect().bottom-kids[0].getBoundingClientRect().top;}
        var avail=body.clientHeight-padT-padB-28;
        return avail-contentH;
      }

      function candidateOrder(desired){
        return pages.map(function(page,index){
          return {page:page,index:index,distance:Math.abs(index-desired),free:freeSpace(page.querySelector('.wb-body'))};
        }).filter(function(item){return !used[item.index];}).sort(function(a,b){
          var aFit=a.free>=MIN_H+GAP+4?0:1;
          var bFit=b.free>=MIN_H+GAP+4?0:1;
          if(aFit!==bFit)return aFit-bFit;
          var aScore=a.distance*18-Math.min(a.free,260);
          var bScore=b.distance*18-Math.min(b.free,260);
          return aScore-bScore;
        });
      }

      for(var imageIndex=0;imageIndex<IMAGE_COUNT;imageIndex++){
        var desired=Math.max(0,Math.min(pages.length-1,Math.round((imageIndex+1)*(pages.length+1)/(IMAGE_COUNT+1))-1));
        var candidates=candidateOrder(desired);
        var placed=false;
        for(var c=0;c<candidates.length;c++){
          var item=candidates[c];
          if(item.free<MIN_H+GAP+4)continue;
          var body=item.page.querySelector('.wb-body');
          var height=Math.min(MAX_H,Math.floor(item.free-GAP-4));
          if(height<MIN_H)continue;
          var fig=document.createElement('div');
          fig.className='jr-illustration';
          fig.setAttribute('aria-hidden','true');
          fig.setAttribute('data-jerusalem-illustration',String(imageIndex+1));
          fig.style.height=height+'px';
          fig.style.width=Math.floor(height*ASPECT)+'px';
          fig.style.backgroundPosition='50% '+String(imageIndex*(100/(IMAGE_COUNT-1)))+'%';
          body.appendChild(fig);
          if(body.scrollHeight<=body.clientHeight+2){
            used[item.index]=true;
            item.page.setAttribute('data-has-jerusalem-illustration',String(imageIndex+1));
            inserted++;
            placed=true;
            break;
          }
          fig.remove();
        }
        if(!placed)fail('Could not place Jerusalem illustration '+String(imageIndex+1)+' without A4 overflow.');
      }
      document.documentElement.dataset.jerusalemIllustrations=String(inserted);
      if(inserted!==IMAGE_COUNT)fail('Jerusalem illustration count mismatch: '+String(inserted)+' / '+String(IMAGE_COUNT));
    })();

`;

function inject(file) {
  if (!fs.existsSync(file)) throw new Error(`Missing generated workbook: ${file}`);
  let html = fs.readFileSync(file, 'utf8');
  if (html.includes('data-jerusalem-illustration')) {
    throw new Error(`Jerusalem illustrations are already injected into ${file}`);
  }
  if (!html.includes(marker)) throw new Error(`Paginator marker not found in ${file}`);
  html = html.replace(marker, injection + guardedMarker);

  if (html.includes('</head>')) {
    html = html.replace('</head>', `<style>${css}</style>\n</head>`);
  } else {
    const metaMarker = '<script id="ratio-build-meta"';
    if (!html.includes(metaMarker)) throw new Error(`Build metadata marker not found in ${file}`);
    html = html.replace(metaMarker, `<style>${css}</style>\n${metaMarker}`);
  }

  fs.writeFileSync(file, html, 'utf8');
}

inject(mainFile);
inject(artifactFile);
console.log(JSON.stringify({status:'jerusalem-illustrations-injected',images:7,main:mainFile,artifact:artifactFile},null,2));
