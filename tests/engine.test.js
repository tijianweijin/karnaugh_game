'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),{KMap:K}=require('../src/engine.js');
let assertions=0,problems=0;const started=Date.now(),lines=[];
function ok(condition,message){assertions++;assert.ok(condition,message);}
function eq(a,b,message){assertions++;assert.deepEqual(a,b,message);}
function log(s){lines.push(s);console.log(s);}
// Independent oracle: enumerate fixed-variable subsets in binary, then solve a
// numeric subset DP over required minterms. Does not call engine cube/cover code.
const independentCache={};
function independentCubes(n){if(independentCache[n])return independentCache[n];const cs=[];
 for(let fixed=0;fixed<2**n;fixed++)for(let value=0;value<2**n;value++)if((value&~fixed)===0){let mask=0n;const cells=[];for(let i=0;i<2**n;i++)if((i&fixed)===value){cells.push(i);mask|=1n<<BigInt(i);}let count=0;for(let b=fixed;b;b>>=1)count+=b&1;cs.push({mask,cells,literals:count});}
 return independentCache[n]=cs;
}
function oracle(table,mode){const n=Math.log2(table.length),target=mode==='SOP'?1:0,ids=table.map((v,i)=>v===target?i:-1).filter(i=>i>=0);assert(ids.length<=16);const relevant=independentCubes(n).filter(c=>c.cells.every(i=>table[i]===target||table[i]==='X')).map(c=>({cover:ids.reduce((m,i,j)=>c.cells.includes(i)?m|(1<<j):m,0),cost:1000+c.literals})).filter(c=>c.cover);
 const dp=new Float64Array(2**ids.length);dp.fill(Infinity);dp[0]=0;for(let s=0;s<dp.length;s++)if(Number.isFinite(dp[s]))for(const c of relevant){const next=s|c.cover;if(next!==s&&dp[s]+c.cost<dp[next])dp[next]=dp[s]+c.cost;}const cost=dp[dp.length-1];return [Math.floor(cost/1000),cost%1000];}
function verify(table,mode,useOracle=true){problems++;const s=K.solve(table,mode);if(useOracle)eq([s.terms,s.literals],oracle(table,mode),'independent minimum cost');eq(K.assess(s.groups,table,mode).status,'optimal','solver output accepted');for(let i=0;i<table.length;i++)if(table[i]!=='X')eq(K.evaluateGroups(s.groups,i,mode),table[i],'truth table equivalence');for(const c of s.groups)ok(K.checkGroup(K.indices(c.mask),table,mode).ok,'solution group legal');return s;}
const fixed=K.fixed();eq(fixed.table,[0,1,0,'X',1,1,1,'X',0,0,1,'X','X','X','X','X'],'fixed sample table');
let sop=verify(fixed.table,'SOP'),pos=verify(fixed.table,'POS');eq([sop.terms,sop.literals],[3,5]);eq([pos.terms,pos.literals],[2,5]);
const right=K.all(4).filter(c=>['B','A·C','¬A·D'].includes(K.term(c,'SOP'))),wrong=K.all(4).filter(c=>['B','A·C','D'].includes(K.term(c,'SOP')));
eq(K.assess(right,fixed.table,'SOP').status,'optimal','given correct expression');eq(K.evaluateGroups(wrong,9,'SOP'),1,'wrong D expression at m9');eq(fixed.table[9],0,'m9 original value');eq(K.assess(wrong,fixed.table,'SOP').status,'illegal','wrong D implicant rejected');
log('PASS fixed 2.12(3): full table, SOP 3/5, POS 2/5, rejects B+AC+D at m9.');
for(let n=3;n<=5;n++){
 eq(K.all(n).length,3**n,'all cube count');eq(new Set(K.all(n).map(c=>c.mask.toString())).size,3**n,'cube unique');
 eq(K.all(n).map(c=>c.mask.toString()).sort(),independentCubes(n).map(c=>c.mask.toString()).sort(),'independent cube enumeration');
 const maps=K.layout(n),flat=maps.flatMap(p=>p.cells.flat());eq([...flat].sort((a,b)=>a-b),Array.from({length:2**n},(_,i)=>i),'mapping is bijective');
 for(const map of maps)for(let r=0;r<map.cells.length;r++)for(let c=0;c<map.cols.length;c++){const i=map.cells[r][c];for(const neighbor of [map.cells[r][(c+1)%map.cols.length],map.cells[(r+1)%map.cells.length][c]]){let v=i^neighbor,b=0;while(v){b+=v&1;v>>=1;}eq(b,1,'Gray-code adjacent including wrap');}}
}
eq([K.layout(3)[0].rowLabel,K.layout(3)[0].colLabel],['C','AB'],'three-variable axes');eq([K.layout(4)[0].rowLabel,K.layout(4)[0].colLabel],['CD','AB'],'four-variable axes');eq([K.layout(5)[0].rowLabel,K.layout(5)[0].colLabel],['DE','ABC'],'five-variable axes');eq(K.layout(5)[0].cells[0],[0,4,12,8,24,28,20,16],'eight-column Gray mapping');
const folded=K.checkGroup([0,8,16,24],Array(32).fill(1),'SOP');ok(folded.ok,'folded five-variable cube');ok(K.groupGeometry(folded.cube,5).folded,'folded group recognized');ok(!K.checkGroup([4,12,8,24],Array(32).fill(1),'SOP').ok,'visually rectangular but invalid cube');
for(const n of [3,4])for(const c of K.all(n))ok(!K.groupGeometry(c,n).folded,'all three/four-variable cubes are cyclic rectangles');
const ones=Array(16).fill(1);for(const ids of [[0],[0,2],[0,8],[0,2,8,10],[0,1,2,3],[0,1,2,3,8,9,10,11],Array.from({length:16},(_,i)=>i)])ok(K.checkGroup(ids,ones,'SOP').ok,'legal wrap rectangle');
for(const ids of [[0,5],[0,1,2],[0,1,4,10],[0,1,2,4,5,6,8,9]])ok(!K.checkGroup(ids,ones,'SOP').ok,'illegal shape');
ok(K.checkGroup([0,1,4,5],Array(32).fill(1),'SOP').ok,'five-variable rectangle');ok(!K.checkGroup([0,1,4,7],Array(32).fill(1),'SOP').ok,'five-variable invalid cube');
ok(!K.checkGroup([0,1],['X','X',...Array(14).fill(0)],'SOP').ok,'X-only group rejected');ok(!K.checkGroup([0,1],[1,0,...Array(14).fill('X')],'SOP').ok,'opposite value rejected');
eq(K.assess([],fixed.table,'SOP').status,'incomplete');const singles=fixed.table.map((v,i)=>v===1?K.all(4).find(c=>c.mask===K.bit(i)):null).filter(Boolean);eq(K.assess(singles,fixed.table,'SOP').status,'covered','legal nonminimal cover');eq(K.assess([...right,right[0]],fixed.table,'SOP').status,'covered','redundant term not minimal');
log('PASS geometry: Gray order, 3–5 variable bijections, wrap, corners, cross-plane, invalid shapes, X-only, opposite values.');
// All ternary truth tables for 3 variables; both SOP/POS, including constants.
for(let code=0;code<3**8;code++){let value=code;const table=Array.from({length:8},()=>{const v=[0,1,'X'][value%3];value=Math.floor(value/3);return v;});for(const mode of ['SOP','POS'])verify(table,mode);}
log('PASS exhaustive 3-variable ternary tables: 6,561 tables × SOP/POS vs independent DP.');
const random=K.rng('independent-random-v1');
for(let j=0;j<220;j++){const n=j<160?4:5;const table=Array.from({length:2**n},()=>{const r=random();return r<.4?0:r<.75?1:'X';});for(const mode of ['SOP','POS']){const target=table.filter(v=>v===(mode==='SOP'?1:0)).length;verify(table,mode,target<=16);}}
log('PASS independent random tables: 160 four-variable + 60 five-variable, truth equivalence and cost oracle (up to 16 required cells).');
let variants=0;for(const n of [3,4,5])for(const mode of ['SOP','POS'])for(const difficulty of ['easy','normal','hard'])for(const withX of [false,true])for(let seed=0;seed<8;seed++){
 const p=K.generate(n,mode,difficulty,withX,'random-test-'+seed),s=verify(p.table,mode,p.table.filter(v=>v===(mode==='SOP'?1:0)).length<=16);variants++;
 eq(p.table.includes('X'),withX,'X option');ok(p.table.includes(0)&&p.table.includes(1),'nonconstant');ok(s.terms<K.pop(K.masks(p.table,mode).required),'simplification');ok(s.groups.some(c=>c.size>1),'nontrivial grouping');ok(p.sourceTermCount>s.terms||p.sourceTermCount===s.terms&&p.sourceLiteralCount>s.literals,'display expression is not already minimum');const range=difficulty==='easy'?[1,2]:difficulty==='normal'?[2,n===3?3:4]:[n===3?3:4,n===3?4:7];ok(s.terms>=range[0]&&s.terms<=range[1],'difficulty');
 const again=K.generate(n,mode,difficulty,withX,'random-test-'+seed);eq(again.table,p.table,'seed reproducibility');eq(again.source,p.source,'source reproducibility');
 // Evaluate generated display expressions independently with a tiny notation parser.
 const evaluate=(text,i)=>{const b=K.bits(i,n);const js=text.replace(/¬([A-E])/g,(_,v)=>String(1-b['ABCDE'.indexOf(v)])).replace(/[A-E]/g,v=>String(b['ABCDE'.indexOf(v)])).replace(/·/g,'&&').replace(/\+/g,'||');return Number(Boolean(Function('return ('+js+')')()));};
 for(let i=0;i<p.table.length;i++){eq(evaluate(p.source,i),p.raw[i],'display function equals generated source');const excluded=withX?evaluate(p.constraint.replace(/ = 0$/,''),i):0;eq(p.table[i],excluded?'X':p.raw[i],'constraint and X semantics');}
}
log('PASS random generation: 288 seeded problems across all 36 setting combinations; display expressions, constraints, difficulty, reproducibility.');
// Find a don't-care table with multiple equal-cost minimum covers.
let alternative=null;for(let j=0;j<800&&!alternative;j++){const t=Array.from({length:16},()=>{const r=random();return r<.3?0:r<.6?1:'X';}),s=K.solve(t,'SOP'),ps=s.primes;if(ps.length>16||s.terms<2)continue;let choices=[];for(let mask=1;mask<2**ps.length;mask++){let gs=ps.filter((_,i)=>mask&(1<<i));if(gs.length!==s.terms||gs.reduce((a,c)=>a+c.literals,0)!==s.literals)continue;const a=K.assess(gs,t,'SOP');if(a.status==='optimal')choices.push(gs);if(choices.length>=2){alternative={table:t,solutions:choices.map(g=>K.expression(g,'SOP')),cost:[s.terms,s.literals]};break;}}}
ok(alternative,'found and accepted multiple optimal X solutions');log('PASS nonunique optima: '+alternative.solutions.join(' / ')+'.');
const report={assertions,problems,generatorVariants:variants,durationMs:Date.now()-started,alternative,lines};fs.writeFileSync(require('node:path').join(__dirname,'test-results.json'),JSON.stringify(report,null,2));log(`ALL PASS: ${assertions} assertions / ${problems} solver cases / ${report.durationMs} ms.`);
