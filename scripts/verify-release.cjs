'use strict';
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const failures=[];
const checked=new Set();
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.name.startsWith('.')||['node_modules','tests','docs','scripts'].includes(e.name)?[]:e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);}
const files=walk(root);
for(const file of files){
 const ext=path.extname(file);if(!['.html','.css','.svg','.js'].includes(ext))continue;
 const text=fs.readFileSync(file,'utf8');let refs=[];
 if(['.html','.svg'].includes(ext))refs.push(...[...text.matchAll(/(?:src|href|action|poster)=["']([^"']+)["']/g)].map(x=>x[1]));
 if(['.html','.css','.svg'].includes(ext))refs.push(...[...text.matchAll(/url\(["']?([^\)"']+)/g)].map(x=>x[1]));
 if(ext==='.js')refs.push(...[...text.matchAll(/["'`]((?:\/?(?:assets|pages|translations)\/)[^"'`\s<>$]+\.(?:svg|png|jpg|webp|css|js|json|woff2))/g)].map(x=>x[1]));
 for(let ref of refs){
  if(/^(?:#|data:|mailto:|tel:|javascript:|https?:|\/\/)/.test(ref)||ref.includes('${'))continue;
  ref=ref.split(/[?#]/)[0];if(!ref||ref==='/api/contact')continue;
  const base=['.css','.svg'].includes(ext)?path.dirname(file):root;
  const target=ref==='/'?path.join(root,'index.html'):ref.startsWith('/')?path.join(root,ref.slice(1)):path.resolve(base,ref);
  if(!target.startsWith(root+path.sep)||!fs.existsSync(target))failures.push(`${path.relative(root,file)} -> ${ref}`);
  else checked.add(path.relative(root,target));
 }
}
const prohibited=['faq.html','integrations.html','use-cases.html','use-case-legal.html','use-case-finance.html','use-case-business.html','assets/homepage-tools-workflow.js','assets/tools/allybi-tools-qa.js'];
for(const f of prohibited)if(fs.existsSync(path.join(root,f)))failures.push(`Retired content included: ${f}`);
if(failures.length){console.error([...new Set(failures)].join('\n'));process.exitCode=1;}
else console.log(`Release verified: ${files.length} runtime files, ${checked.size} local dependencies, no retired pages or missing static references.`);
