(function(root){
'use strict';
const vars='ABCDE';
const bit=i=>1n<<BigInt(i);
const indices=mask=>{const out=[];for(let i=0;mask;i++,mask>>=1n)if(mask&1n)out.push(i);return out;};
const bits=(i,n)=>Array.from({length:n},(_,j)=>(i>>(n-1-j))&1);
const pop=mask=>indices(mask).length;
function cubes(n){
 const out=[];const visit=p=>{if(p.length<n){for(const v of [-1,0,1])visit([...p,v]);return;}
 let mask=0n;for(let i=0;i<2**n;i++)if(p.every((v,j)=>v<0||v===bits(i,n)[j]))mask|=bit(i);
 out.push({pattern:p,mask,literals:p.filter(v=>v>=0).length,size:pop(mask)});};visit([]);return out;
}
const cache={};const all=n=>cache[n]||(cache[n]=cubes(n));
function term(c,mode){const p=c.pattern.map((v,j)=>v<0?'':((mode==='SOP'?v===0:v===1)?'¬':'')+vars[j]).filter(Boolean);return p.length?(mode==='SOP'?p.join('·'):'('+p.join(' + ')+')'):(mode==='SOP'?'1':'0');}
function expression(cs,mode){return cs.length?cs.map(c=>term(c,mode)).join(mode==='SOP'?' + ':' · '):(mode==='SOP'?'0':'1');}
function masks(table,mode){let required=0n,allowed=0n;const target=mode==='SOP'?1:0;table.forEach((v,i)=>{if(v===target)required|=bit(i);if(v===target||v==='X')allowed|=bit(i);});return {required,allowed};}
function legal(table,mode){const {required,allowed}=masks(table,mode),n=Math.log2(table.length);return all(n).filter(c=>(c.mask&allowed)===c.mask&&(c.mask&required)!==0n);}
function solve(table,mode){
 const {required}=masks(table,mode);const candidates=legal(table,mode);
 const primes=candidates.filter(c=>!candidates.some(d=>d.size>c.size&&(c.mask&d.mask)===c.mask));
 const choices=Array.from({length:table.length},(_,i)=>primes.map((c,j)=>(c.mask&bit(i))?j:-1).filter(j=>j>=0));
 const memo=new Map();let states=0;
 function go(rem){if(rem===0n)return {terms:0,literals:0,groups:[]};if(memo.has(rem))return memo.get(rem);states++;
 let options=null;for(const i of indices(rem)){if(!options||choices[i].length<options.length)options=choices[i];}
 let best={terms:Infinity,literals:Infinity,groups:[]};
 for(const j of options){const c=primes[j],rest=go(rem&~c.mask),t=rest.terms+1,l=rest.literals+c.literals;
 if(t<best.terms||t===best.terms&&l<best.literals)best={terms:t,literals:l,groups:[c,...rest.groups]};}
 memo.set(rem,best);return best;
 }
 return {...go(required),primes,states};
}
function checkGroup(selected,table,mode){
 const ids=[...new Set(selected)];if(!ids.length)return {ok:false,message:'先选择一组格子。'};
 if(ids.some(i=>!Number.isInteger(i)||i<0||i>=table.length))return {ok:false,message:'格子索引越界。'};
 const size=ids.length;if((size&(size-1))!==0)return {ok:false,message:`选了 ${size} 格；每圈必须为 1、2、4、8、16 或 32 格。`};
 let mask=ids.reduce((m,i)=>m|bit(i),0n);const n=Math.log2(table.length),c=all(n).find(c=>c.mask===mask);
 if(!c)return {ok:false,message:n===5?'这些格子不能合并：变化变量须包含完整的 0/1 组合。':'这些格子不是合法矩形；对角、斜线或缺角不能合圈。'};
 const opposite=mode==='SOP'?0:1;const bad=ids.filter(i=>table[i]===opposite);
 if(bad.length)return {ok:false,message:`圈内含反值 ${opposite}：m${bad.join('、m')}。${mode==='SOP'?'与或式圈 1':'或与式圈 0'}，可借用 X。`,bad};
 if(!ids.some(i=>table[i]!== 'X'))return {ok:false,message:'这一圈只有 X，没有必需格；不能作为有效覆盖项。'};
 return {ok:true,cube:c,message:`合法 ${size} 格圈 → ${term(c,mode)}（${c.literals} 个文字）`};
}
function assess(groups,table,mode){
 const checks=groups.map(c=>checkGroup(indices(c.mask),table,mode));if(checks.some(c=>!c.ok))return {status:'illegal',message:'存在不合法圈，请先修正。'};
 const {required}=masks(table,mode),covered=groups.reduce((m,c)=>m|c.mask,0n),missing=indices(required&~covered);
 const optimum=solve(table,mode),terms=groups.length,literals=groups.reduce((v,c)=>v+c.literals,0);
 return {status:missing.length?'incomplete':terms===optimum.terms&&literals===optimum.literals?'optimal':'covered',missing,terms,literals,optimum};
}
function evaluateGroups(groups,i,mode){const hit=groups.some(c=>(c.mask&bit(i))!==0n);return mode==='SOP'?Number(hit):Number(!hit);}
function fixed(){const n=4,raw=Array.from({length:16},(_,i)=>{const [A,B,C,D]=bits(i,n);return Number((!A&&B&&!C)||((A!==B)&&C&&!D)||(!A&&!C&&D));});const excluded=Array.from({length:16},(_,i)=>{const [A,B,C,D]=bits(i,n);return !!((A&&B)||(C&&D));});return {n,raw,table:raw.map((v,i)=>excluded[i]?'X':v),source:'¬A·B·¬C + (A ⊕ B)·C·¬D + ¬A·¬C·D',constraint:'A·B + C·D = 0',title:'教材 2.12(3)',seed:'2.12(3)',difficulty:'normal'};}
function rng(seed){let x=2166136261;for(const c of String(seed))x=Math.imul(x^c.charCodeAt(0),16777619);return ()=>{x+=0x6D2B79F5;let t=Math.imul(x^(x>>>15),1|x);t^=t+Math.imul(t^(t>>>7),61|t);return ((t^(t>>>14))>>>0)/4294967296;};}
function generate(n,mode,difficulty,withX,seed){
 const r=rng(`${seed}/${n}/${mode}/${difficulty}/${withX}`),pick=a=>a[Math.floor(r()*a.length)];
 const ranges={easy:[1,2],normal:[2,n===3?3:4],hard:[n===3?3:4,n===3?4:7]},[lo,hi]=ranges[difficulty];
 for(let attempt=0;attempt<1800;attempt++){
 const pool=all(n).filter(c=>c.literals>=(difficulty==='easy'?1:2)&&c.literals<=n-1);
 const sourceGroups=Array.from({length:lo+Math.floor(r()*(hi-lo+2))},()=>pick(pool));
 const raw=Array.from({length:2**n},(_,i)=>evaluateGroups(sourceGroups,i,mode));
 let forbidden=[];if(withX){const xs=all(n).filter(c=>c.literals>=2&&c.literals<=n-1);forbidden=Array.from({length:difficulty==='hard'?2:1},()=>pick(xs));}
 const xmask=forbidden.reduce((m,c)=>m|c.mask,0n),table=raw.map((v,i)=>(xmask&bit(i))?'X':v);
 const {required}=masks(table,mode);if(pop(required)<2||table.filter(v=>v===(mode==='SOP'?0:1)).length<2)continue;
 const best=solve(table,mode);if(best.terms<lo||best.terms>hi||!best.groups.some(c=>c.size>1)||best.terms>=pop(required))continue;
 // Present an expression that actually has something left to simplify.
 // Splitting a cube on a free variable preserves its full truth table.
 const dedup=cs=>[...new Map(cs.map(c=>[c.mask.toString(),c])).values()];
 let shown=dedup(sourceGroups);const minimalCost=cs=>cs.length===best.terms&&cs.reduce((a,c)=>a+c.literals,0)===best.literals;
 if(minimalCost(shown)){const c=shown.find(c=>c.pattern.includes(-1)),j=c.pattern.indexOf(-1);shown=dedup([...shown.filter(d=>d!==c),...all(n).filter(d=>d.pattern.every((v,k)=>k===j?v>=0:v===c.pattern[k]))]);}
 if(shown.length<best.terms||shown.length===best.terms&&shown.reduce((a,c)=>a+c.literals,0)<=best.literals)shown=all(n).filter(c=>c.size===1&&raw[indices(c.mask)[0]]===(mode==='SOP'?1:0));
 return {n,raw,table,source:expression(shown,mode),sourceTermCount:shown.length,sourceLiteralCount:shown.reduce((a,c)=>a+c.literals,0),constraint:withX?expression(dedup(forbidden),'SOP')+' = 0':'无约束（所有输入组合均可能出现）',seed:String(seed),difficulty,title:'随机练习'};
 }
 throw new Error('未能生成符合难度的题目，请更换题号重试。');
}
function layout(n){const gray=[0,1,3,2],gray3=[0,1,3,2,6,7,5,4],rows=n===3?[0,1]:gray,cols=n===5?gray3:gray,lowBits=n===3?1:2;return [{label:'',rowLabel:n===3?'C':n===4?'CD':'DE',colLabel:n===5?'ABC':'AB',rows:rows.map(x=>x.toString(2).padStart(lowBits,'0')),cols:cols.map(x=>x.toString(2).padStart(n===5?3:2,'0')),cells:rows.map(rv=>cols.map(cv=>(cv<<lowBits)|rv))}];}
function groupGeometry(c,n){const map=layout(n)[0],rs=new Set(),cs=new Set();map.cells.forEach((row,r)=>row.forEach((i,col)=>{if(c.mask&bit(i)){rs.add(r);cs.add(col);}}));const consecutive=(set,total)=>set.size===total||[...set].some(start=>Array.from({length:set.size},(_,j)=>(start+j)%total).every(x=>set.has(x)));return {folded:!consecutive(rs,map.rows.length)||!consecutive(cs,map.cols.length)};}
// Border visibility belongs to each circle, so overlapping circles stay independent.
function groupOutline(c,n){
 const map=layout(n)[0],height=map.rows.length,width=map.cols.length,rs=new Set(),cs=new Set(),out=[];
 const contains=(r,col)=>Boolean(c.mask&bit(map.cells[r][col]));
 map.cells.forEach((row,r)=>row.forEach((i,col)=>{if(contains(r,col)){rs.add(r);cs.add(col);}}));
 const folded=groupGeometry(c,n).folded;
 // A full-height/width rectangle needs no wrap; only split edge pieces open outward.
 const wrapRows=rs.size<height&&rs.has(0)&&rs.has(height-1);
 const wrapCols=!folded&&cs.size<width&&cs.has(0)&&cs.has(width-1);
 const foldJoin=(r,col,direction)=>map.cols.some((code,k)=>{
  if((k-col)*direction<=0||!contains(r,k))return false;
  const difference=parseInt(code,2)^parseInt(map.cols[col],2);
  return difference>0&&(difference&(difference-1))===0;
 });
 map.cells.forEach((row,r)=>row.forEach((i,col)=>{if(!contains(r,col))return;
  out[i]={top:!(r>0?contains(r-1,col):wrapRows&&contains(height-1,col)),
   bottom:!(r<height-1?contains(r+1,col):wrapRows&&contains(0,col)),
   left:!(folded?foldJoin(r,col,-1):col>0?contains(r,col-1):wrapCols&&contains(r,width-1)),
   right:!(folded?foldJoin(r,col,1):col<width-1?contains(r,col+1):wrapCols&&contains(r,0))};
 }));
 return out;
}
root.KMap={bit,bits,indices,pop,all,term,expression,masks,legal,solve,checkGroup,assess,evaluateGroups,fixed,generate,layout,groupGeometry,groupOutline,rng};
})(typeof module!=='undefined'?module.exports:globalThis);
