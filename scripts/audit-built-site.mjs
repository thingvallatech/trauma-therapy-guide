import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
async function walk(folder) {
  const entries = await readdir(folder,{withFileTypes:true});
  return (await Promise.all(entries.map(entry => entry.isDirectory() ? walk(join(folder,entry.name)) : join(folder,entry.name)))).flat();
}
const files=await walk('dist');
const fileSet=new Set(files);
const htmlFiles=files.filter(file=>file.endsWith('.html'));
const failures=[];
function exists(path) {
  const clean=decodeURIComponent(path).replace(/^\//,'').replace(/\/$/,'');
  return fileSet.has(`dist/${clean}`) || fileSet.has(`dist/${clean}/index.html`) || (!clean && fileSet.has('dist/index.html'));
}
for(const file of htmlFiles) {
  const html=await readFile(file,'utf8');
  const route='/'+file.replace(/^dist\//,'').replace(/index\.html$/,'');
  for(const match of html.matchAll(/\b(?:href|src)="([^"<>]+)"/g)) {
    const raw=match[1].replaceAll('&amp;','&');
    if(/^(?:data:|mailto:|tel:|sms:|javascript:|#)/.test(raw))continue;
    const url=new URL(raw,`https://traumatherapy.guide${route}`);
    if(url.origin!=='https://traumatherapy.guide')continue;
    if(!exists(url.pathname)) failures.push(`${route} → ${url.pathname}`);
  }
  // Search URLs live in a JSON attribute, not an anchor until someone searches.
  for(const match of html.matchAll(/&quot;url&quot;:&quot;([^&]+)&quot;/g)) if(!exists(new URL(match[1], 'https://traumatherapy.guide').pathname))failures.push(`${route} search → ${match[1]}`);
  if(!route.startsWith('/es/')&&!route.startsWith('/admin/')&&!route.includes('404')&&!exists('/es'+route)) failures.push(`${route} has no Spanish counterpart`);
}
if(failures.length){console.error([...new Set(failures)].join('\n'));process.exitCode=1;}
else console.log(`Audited ${htmlFiles.length} HTML pages: local links/assets, search destinations and EN/ES route parity passed.`);
