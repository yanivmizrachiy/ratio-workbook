import fs from 'node:fs';
import path from 'node:path';
import { CANONICAL_ASSET_DIR, JERUSALEM_ASSETS, canonicalAssetPath, verifyCanonicalAssets } from './jerusalem-assets.mjs';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const requested = process.argv[2] || path.join(root, 'preview', 'full-workbook.html');
const mainFile = path.resolve(requested);
const parsed = path.parse(mainFile);
const artifactFile = path.join(parsed.dir, `${parsed.name}-artifact${parsed.ext || '.html'}`);

const ARTWORK_META = Object.freeze({
  'cover_bg.jpg': { id: 'cover', alt: 'איור צבעוני ירושלמי בנושא יחס' },
  'ratio-jerusalem-v2-1-kotel.jpg': { id: 'kotel', alt: 'הכותל בירושלים עם ייצוג מתמטי של יחס' },
  'ratio-jerusalem-v2-2-tower-of-david.jpg': { id: 'tower-of-david', alt: 'מגדל דוד בירושלים עם ייצוג מתמטי של פרופורציה' },
  'ratio-jerusalem-v2-3-mahane-yehuda.jpg': { id: 'mahane-yehuda', alt: 'מחנה יהודה בירושלים עם ייצוג מתמטי של יחס' },
  'ratio-jerusalem-v2-5-old-city-alley.jpg': { id: 'old-city-alley', alt: 'סמטה בעיר העתיקה בירושלים עם ייצוג מתמטי של יחס' },
  'ratio-jerusalem-v2-6-knesset.jpg': { id: 'knesset', alt: 'הכנסת בירושלים עם ייצוג מתמטי של יחס' },
  'ratio-jerusalem-v2-7-windmill.jpg': { id: 'windmill', alt: 'טחנת הרוח בירושלים עם ייצוג מתמטי של יחס' },
});

function resolveArtwork() {
  const verification = verifyCanonicalAssets();
  const failures = verification.filter((item) => item.status !== 'ok');
  if (failures.length) {
    const details = failures.map((item) => {
      if (item.status === 'missing') return `- ${item.name}: missing`;
      return `- ${item.name}: SHA-256 mismatch (expected ${item.sha256}, got ${item.actual})`;
    }).join('\n');
    throw new Error(
      `Canonical Jerusalem artwork preflight failed. No placeholder will be rendered.\n${details}\n` +
      `The only accepted source is ${CANONICAL_ASSET_DIR}.`,
    );
  }

  return JERUSALEM_ASSETS.map((asset) => {
    const meta = ARTWORK_META[asset.name];
    if (!meta) throw new Error(`Missing presentation metadata for canonical asset ${asset.name}.`);
    const file = canonicalAssetPath(asset.name);
    return {
      ...asset,
      ...meta,
      file,
      dataUrl: `data:image/jpeg;base64,${fs.readFileSync(file).toString('base64')}`,
    };
  });
}

const artwork = resolveArtwork();
const imagePayload = JSON.stringify(artwork.map(({ id, alt, dataUrl }) => ({ id, alt, dataUrl })));

const css = `
.wb-page.wb-jerusalem-image-page{
  width:210mm!important;
  height:297mm!important;
  min-height:297mm!important;
  max-height:297mm!important;
  box-sizing:border-box!important;
  padding:0!important;
  margin:0 auto!important;
  border:0!important;
  border-radius:0!important;
  background:#fff!important;
  box-shadow:none!important;
  overflow:hidden!important;
  display:block!important;
  position:relative!important;
  break-after:page!important;
  page-break-after:always!important;
}
.wb-page.wb-jerusalem-image-page .wb-body{
  width:100%!important;
  height:100%!important;
  min-height:100%!important;
  max-height:100%!important;
  padding:0!important;
  margin:0!important;
  display:block!important;
  overflow:hidden!important;
}
.wb-page.wb-jerusalem-image-page img.wb-jerusalem-full-page-image{
  width:100%!important;
  height:100%!important;
  min-width:100%!important;
  min-height:100%!important;
  max-width:none!important;
  max-height:none!important;
  display:block!important;
  object-fit:cover!important;
  object-position:center center!important;
  padding:0!important;
  margin:0!important;
  border:0!important;
  border-radius:0!important;
  box-shadow:none!important;
  background:none!important;
}
.wb-page.wb-jerusalem-image-page .page-number{
  position:absolute!important;
  width:1px!important;
  height:1px!important;
  padding:0!important;
  margin:-1px!important;
  overflow:hidden!important;
  clip:rect(0,0,0,0)!important;
  clip-path:inset(50%)!important;
  white-space:nowrap!important;
  opacity:0!important;
  pointer-events:none!important;
}
@media print{
  .wb-page.wb-jerusalem-image-page{
    margin:0!important;
    box-shadow:none!important;
  }
}
`;

const marker = "    [].forEach.call(document.querySelectorAll('.wb-page .wb-body'),function(body){";
const guardedMarker = "    [].forEach.call(document.querySelectorAll('.wb-page:not([data-jerusalem-image-page]) .wb-body'),function(body){";
const injection = `
    (function attachJerusalemFullPages(){
      var artwork=${imagePayload};
      var originalPages=[].slice.call(document.querySelectorAll('.wb-page'));
      var total=originalPages.length;
      if(!total)fail('No workbook pages available for Jerusalem image insertion.');

      var anchors=artwork.map(function(_,imageIndex){
        return Math.max(0,Math.min(total-1,Math.round((imageIndex+1)*(total+1)/(artwork.length+1))-1));
      });

      artwork.forEach(function(item,imageIndex){
        var anchor=originalPages[anchors[imageIndex]];
        var page=document.createElement('section');
        page.className='wb-page wb-jerusalem-image-page';
        page.setAttribute('data-jerusalem-image-page',String(imageIndex+1));
        page.setAttribute('data-jerusalem-image-id',item.id);
        page.setAttribute('data-textbook-chapter',anchor.getAttribute('data-textbook-chapter')||'');

        var body=document.createElement('div');
        body.className='wb-body';

        var img=document.createElement('img');
        img.className='wb-jerusalem-full-page-image';
        img.setAttribute('src',item.dataUrl);
        img.setAttribute('alt',item.alt);
        img.setAttribute('data-jerusalem-image',String(imageIndex+1));
        img.setAttribute('draggable','false');
        body.appendChild(img);

        var number=document.createElement('span');
        number.className='page-number';
        number.setAttribute('aria-hidden','true');
        page.appendChild(body);
        page.appendChild(number);
        anchor.insertAdjacentElement('afterend',page);
      });

      var allPages=[].slice.call(document.querySelectorAll('.wb-page'));
      allPages.forEach(function(page,index){
        var number=page.querySelector('.page-number');
        if(number)number.textContent=String(index+1);
      });
      document.documentElement.dataset.jerusalemIllustrations=String(artwork.length);
      document.documentElement.dataset.jerusalemImagePages=String(artwork.length);
      document.documentElement.dataset.physicalPageCount=String(allPages.length);

      var metaNode=document.getElementById('ratio-build-meta');
      if(metaNode&&metaNode.textContent){
        try{
          var meta=JSON.parse(metaNode.textContent);
          meta.physicalPageCount=allPages.length;
          meta.jerusalemImagePages=artwork.length;
          metaNode.textContent=JSON.stringify(meta);
        }catch(_){/* verification will report malformed metadata */}
      }
    })();

`;

function inject(file) {
  if (!fs.existsSync(file)) throw new Error(`Missing generated workbook: ${file}`);
  let html = fs.readFileSync(file, 'utf8');
  if (html.includes('data-jerusalem-image-page')) {
    throw new Error(`Jerusalem full-page artwork is already injected into ${file}`);
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
console.log(JSON.stringify({
  status:'jerusalem-full-page-artwork-injected',
  images:artwork.length,
  canonicalAssetDir:CANONICAL_ASSET_DIR,
  files:artwork.map((item)=>({id:item.id,file:item.file,sha256:item.sha256})),
  main:mainFile,
  artifact:artifactFile,
},null,2));
