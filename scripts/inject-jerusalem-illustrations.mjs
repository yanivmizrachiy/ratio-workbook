import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const requested = process.argv[2] || path.join(root, 'preview', 'full-workbook.html');
const mainFile = path.resolve(requested);
const parsed = path.parse(mainFile);
const artifactFile = path.join(parsed.dir, `${parsed.name}-artifact${parsed.ext || '.html'}`);
const canonicalAssetDir = path.join(root, 'src', 'assets', 'jerusalem');

const REQUIRED_IMAGES = [
  {
    id: 'cover',
    canonical: 'cover_bg.jpg',
    alt: 'איור צבעוני ירושלמי בנושא יחס',
    sha256: '704cf13e05a6cacf5c2b793c6e47d097962450f34663ae7b1d8ae3fc0eea55d8',
  },
  {
    id: 'kotel',
    canonical: 'ratio-jerusalem-v2-1-kotel.jpg',
    alt: 'הכותל בירושלים עם ייצוג מתמטי של יחס',
    sha256: 'ce03a0f594346eeaae9c5ad91c764b9cf2341ce50911fe2436bc979e4bf7a5d1',
  },
  {
    id: 'tower-of-david',
    canonical: 'ratio-jerusalem-v2-2-tower-of-david.jpg',
    alt: 'מגדל דוד בירושלים עם ייצוג מתמטי של פרופורציה',
    sha256: 'ce39d3ceddc3acde2a3cb321070d55df1bf48128fb154139623f8c42185be40f',
  },
  {
    id: 'mahane-yehuda',
    canonical: 'ratio-jerusalem-v2-3-mahane-yehuda.jpg',
    alt: 'מחנה יהודה בירושלים עם ייצוג מתמטי של יחס',
    sha256: '73bbea70c539139985b10204deb12518d34a9cbbe3e706fbc571bd2dadf73615',
  },
  {
    id: 'old-city-alley',
    canonical: 'ratio-jerusalem-v2-5-old-city-alley.jpg',
    alt: 'סמטה בעיר העתיקה בירושלים עם ייצוג מתמטי של יחס',
    sha256: '527acc4209cd7c2b84cf985036eff28e1fd3682616cfbeafd3c329d35349fd3c',
  },
  {
    id: 'knesset',
    canonical: 'ratio-jerusalem-v2-6-knesset.jpg',
    alt: 'הכנסת בירושלים עם ייצוג מתמטי של יחס',
    sha256: '3985c4170afa48ccb8fc3a3345f0a70fc6daef1ee1a1c8a7a49e44ce5935d4ea',
  },
  {
    id: 'windmill',
    canonical: 'ratio-jerusalem-v2-7-windmill.jpg',
    alt: 'טחנת הרוח בירושלים עם ייצוג מתמטי של יחס',
    sha256: '0ab7c296bbbecc2f7ea4726897344c6aff23a0bc6ddc8e6b87b58f12503d8363',
  },
];

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function resolveArtwork() {
  const missing = [];
  const invalid = [];
  const artwork = [];

  for (const item of REQUIRED_IMAGES) {
    const file = path.join(canonicalAssetDir, item.canonical);
    if (!fs.existsSync(file)) {
      missing.push(item.canonical);
      continue;
    }
    const actualSha256 = sha256(file);
    if (actualSha256 !== item.sha256) {
      invalid.push(`${item.canonical}: expected ${item.sha256}, got ${actualSha256}`);
      continue;
    }
    artwork.push({
      ...item,
      file,
      dataUrl: `data:image/jpeg;base64,${fs.readFileSync(file).toString('base64')}`,
    });
  }

  if (missing.length || invalid.length) {
    const details = [
      missing.length ? `Missing canonical files:\n${missing.map((name) => `- ${name}`).join('\n')}` : '',
      invalid.length ? `SHA-256 mismatch:\n${invalid.map((line) => `- ${line}`).join('\n')}` : '',
    ].filter(Boolean).join('\n');
    throw new Error(
      `Canonical Jerusalem artwork preflight failed. No placeholder will be rendered.\n${details}\n` +
      `The only accepted source is ${canonicalAssetDir}.`,
    );
  }

  if (artwork.length !== REQUIRED_IMAGES.length) {
    throw new Error(`Jerusalem artwork count mismatch: expected ${REQUIRED_IMAGES.length}, got ${artwork.length}.`);
  }
  return artwork;
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
  canonicalAssetDir,
  files:artwork.map((item)=>({id:item.id,file:item.file,sha256:item.sha256})),
  main:mainFile,
  artifact:artifactFile,
},null,2));
