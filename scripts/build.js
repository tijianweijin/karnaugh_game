const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),source=path.join(root,'src');const vendor=path.join(root,'node_modules/katex');
// Keep the renderer and WOFF2 fonts inside the HTML, with no network dependency.
const mathCss=fs.readFileSync(path.join(vendor,'dist/katex.min.css'),'utf8').replace(/src:[^;}]+/g,src=>{const match=src.match(/url\((?:["'])?(fonts\/[^\s"')]+\.woff2)(?:["'])?\)/);if(!match)return src;const data=fs.readFileSync(path.join(vendor,'dist',match[1])).toString('base64');return 'src:url(data:font/woff2;base64,'+data+') format("woff2")';});
const license=fs.readFileSync(path.join(vendor,'LICENSE'),'utf8');
const page=fs.readFileSync(path.join(source,'page.html'),'utf8').replace('/* MATH CSS */',()=>mathCss).replace('/* PAGE CSS */',()=>fs.readFileSync(path.join(source,'page.css'),'utf8')).replace('/* MATH JS */',()=>fs.readFileSync(path.join(vendor,'dist/katex.min.js'),'utf8').replace(/<\/script/gi,'<\\/script')).replace('/* MATH LICENSE */',()=>license).replace('/* ENGINE */',()=>fs.readFileSync(path.join(source,'engine.js'),'utf8')).replace('/* UI */',()=>fs.readFileSync(path.join(source,'ui.js'),'utf8'));
fs.mkdirSync(path.join(root,'docs'),{recursive:true});fs.writeFileSync(path.join(root,'docs','index.html'),page,'utf8');console.log('Built standalone HTML ('+Buffer.byteLength(page)+' bytes).');
