import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const main=path.resolve(process.argv[2]||path.join(root,"preview","full-workbook.html"));
const parsed=path.parse(main);
const artifact=path.join(parsed.dir,`${parsed.name}-artifact${parsed.ext||".html"}`);

const fronts=[
  {name:"front1.jpg",alt:"כריכת חוברת יחס"},
  {name:"front2.jpg",alt:"עמוד פתיחה ירושלמי"}
].map(x=>({
  alt:x.alt,
  src:`data:image/jpeg;base64,${fs.readFileSync(path.join(root,"src","assets","front",x.name)).toString("base64")}`
}));

const css=`
.wb-page.wb-front-page{
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
.wb-page.wb-front-page .wb-body{
 width:100%!important;
 height:100%!important;
 min-height:100%!important;
 max-height:100%!important;
 padding:0!important;
 margin:0!important;
 display:block!important;
 overflow:hidden!important;
}
.wb-page.wb-front-page img{
 width:100%!important;
 height:100%!important;
 min-width:100%!important;
 min-height:100%!important;
 max-width:none!important;
 max-height:none!important;
 display:block!important;
 object-fit:cover!important;
 object-position:center!important;
 padding:0!important;
 margin:0!important;
 border:0!important;
 border-radius:0!important;
 box-shadow:none!important;
 background:none!important;
}
.wb-page.wb-front-page .page-number{
 position:absolute!important;
 width:1px!important;
 height:1px!important;
 overflow:hidden!important;
 opacity:0!important;
 pointer-events:none!important;
}
`;

const marker="    [].forEach.call(document.querySelectorAll('.wb-page:not([data-jerusalem-image-page]) .wb-body'),function(body){";

const injection=`
    (function attachFrontPages(){
      var f=${JSON.stringify(fronts)};
      var first=document.querySelector('.wb-page');
      if(!first)fail('No workbook pages available for front-page insertion.');

      f.forEach(function(item,i){
        var page=document.createElement('section');
        page.className='wb-page wb-front-page';
        page.setAttribute('data-front-page',String(i+1));
        page.setAttribute('data-textbook-chapter',first.getAttribute('data-textbook-chapter')||'יחס בסיסי');

        var body=document.createElement('div');
        body.className='wb-body';

        var img=document.createElement('img');
        img.src=item.src;
        img.alt=item.alt;
        img.setAttribute('draggable','false');

        var number=document.createElement('span');
        number.className='page-number';
        number.setAttribute('aria-hidden','true');

        body.appendChild(img);
        page.appendChild(body);
        page.appendChild(number);
        first.insertAdjacentElement('beforebegin',page);
      });

      var pages=[].slice.call(document.querySelectorAll('.wb-page'));
      pages.forEach(function(p,i){
        var n=p.querySelector('.page-number');
        if(n)n.textContent=String(i+1);
      });

      document.documentElement.dataset.frontPages='2';
      document.documentElement.dataset.physicalPageCount=String(pages.length);

      var meta=document.getElementById('ratio-build-meta');
      if(meta&&meta.textContent){
        try{
          var j=JSON.parse(meta.textContent);
          j.frontPages=2;
          j.physicalPageCount=pages.length;
          meta.textContent=JSON.stringify(j);
        }catch(_){}
      }
    })();

`;

function patch(file){
  if(!fs.existsSync(file))throw new Error(`Missing generated workbook: ${file}`);
  let html=fs.readFileSync(file,"utf8");
  if(!html.includes(marker))throw new Error(`Front-page marker not found: ${file}`);
  if(!html.includes("data-front-page"))html=html.replace(marker,injection+marker);
  html=html.replace("</head>",`<style>${css}</style>\n</head>`);
  fs.writeFileSync(file,html,"utf8");
}

patch(main);
patch(artifact);
console.log("front-pages-injected");
