(() => {
'use strict';
const K=globalThis.KMap,$=id=>document.getElementById(id),colors=['#655bcb','#168d8b','#c07c24','#c85678','#477dc3','#79892c','#9a59a4','#626d85'];
const storageKey='karnaugh-lab-v1';let state,paint='cycle',selected=new Set(),hintCell=null,missing=[],toastTimer,seedEdited=false,referenceGroups=[],answerView='mine';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const latex=s=>String(s).replace(/¬([A-E])/g,'\\overline{$1}').replace(/·/g,'').replace(/⊕/g,'\\oplus ');
function math(s){const tex=latex(s);return `<span class="math" data-latex="${esc(tex)}">${katex.renderToString(tex,{throwOnError:true,strict:'error',trust:false,output:'htmlAndMathml'})}</span>`;}
const mintermCache=new Map();
function minterm(i){if(!mintermCache.has(i))mintermCache.set(i,math(`m_{${i}}`));return mintermCache.get(i);}
const showingReference=()=>state.stage!=='fill'&&answerView==='reference';
const displayedGroups=()=>showingReference()?referenceGroups:state.groups;
const colorSlot=(c,j)=>showingReference()?j:state.groupColors[c.mask.toString()];
const groupColor=(c,j)=>colors[colorSlot(c,j)%colors.length];
function registerColor(c){const key=c.mask.toString();if(!Object.hasOwn(state.groupColors,key))state.groupColors[key]=state.nextColor++;}
function message(text,type=''){const el=$('feedback');el.innerHTML=String(text).split(/(m\d+)/g).map(s=>/^m\d+$/.test(s)?minterm(Number(s.slice(1))):esc(s)).join('');el.className='feedback '+type;}
function toast(text){$('toast').textContent=text;$('toast').classList.remove('hidden');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.add('hidden'),3300);}
function save(){try{localStorage.setItem(storageKey,JSON.stringify({...state,groups:state.groups.map(c=>c.mask.toString()),referenceMasks:referenceGroups.map(c=>c.mask.toString()),answerView}));$('saveStatus').textContent='当前进度已自动保存 · 所有计算都在本机完成。';}catch{$('saveStatus').textContent='当前浏览器未允许保存进度 · 离线练习仍可正常使用。';}}
function settings(){return {n:Number($('varCount').value),mode:$('mode').value,difficulty:$('difficulty').value,withX:$('withX').value==='yes'};}
function syncSettings(){const p=state.problem;$('varCount').value=p.n;$('mode').value=state.mode;$('difficulty').value=p.difficulty;$('withX').value=p.table.includes('X')?'yes':'no';$('seed').value=p.seed;seedEdited=false;}
function setup(problem,mode){const solvedCount=state?.solvedCount||0;state={problem,mode,stage:'fill',unlocked:false,answers:Array(problem.table.length).fill(null),checked:false,groups:[],groupColors:{},nextColor:0,assisted:false,solved:false,counted:false,attempts:0,solvedCount};referenceGroups=[];answerView='mine';selected.clear();hintCell=null;missing=[];syncSettings();render();message('');save();}
function newProblem(){const opts=settings(),seed=seedEdited&&$('seed').value.trim()?$('seed').value.trim():`${Date.now().toString(36)}-${Math.random().toString(36).slice(2,6)}`;try{const p=K.generate(opts.n,opts.mode,opts.difficulty,opts.withX,seed);setup(p,opts.mode);toast('新题已生成；输入题号可复现指定题目。');}catch(e){message(e.message,'error');}}
function render(){const p=state.problem,n=p.n,total=p.table.length,fill=state.stage==='fill',ref=showingReference();$('main').classList.toggle('five',n===5);$('maps').classList.toggle('reference-view',ref);
 $('problemTitle').textContent=p.title==='教材 2.12(3)'?'教材 2.12(3)':'本题函数';$('problemTag').textContent=`${n} 变量 / ${state.mode} / ${{easy:'入门',normal:'常规',hard:'进阶'}[p.difficulty]}`;
 $('source').innerHTML=math('F = '+p.source);$('constraint').innerHTML='<strong>输入约束</strong>　'+(p.table.includes('X')?math(p.constraint):'无');
 $('stageTitle').textContent=fill?'01 · 填写卡诺图':state.stage==='result'?'03 · 检验最简式':'02 · 交互合圈';
 $('stageDesc').textContent='';
 $('stageBadge').textContent=fill?`${state.answers.filter(v=>v!==null).length} / ${total}`:ref?'标准答案':`选中 ${selected.size} 格`;
 $('answerView').classList.toggle('hidden',fill);for(const [id,active] of [['viewMine',!ref],['viewReference',ref]]){$(id).classList.toggle('active',active);$(id).setAttribute('aria-pressed',String(active));}
 $('paintTools').classList.toggle('hidden',!fill);$('fillActions').classList.toggle('hidden',!fill);$('groupTools').classList.toggle('hidden',fill||ref);$('circleActions').classList.toggle('hidden',fill||ref);
 for(const id of ['addGroup','checkCover','groupHint','showSolution'])$(id).disabled=ref;
 for(const [id,stage] of [['stepFill','fill'],['stepGroup','group'],['stepResult','result']]){$(id).classList.toggle('active',state.stage===stage);$(id).disabled=stage!=='fill'&&!state.unlocked;}
 $('retryFill').disabled=!state.checked||!state.answers.some((v,i)=>v!==p.table[i]);$('undoGroup').disabled=!state.groups.length;$('clearGroups').disabled=!state.groups.length;$('clearSelection').disabled=!selected.size;
 $('wrapNote').textContent='';
 renderMaps();renderGroups();
}
function renderMaps(){const p=state.problem,fill=state.stage==='fill',ref=showingReference();
 const groupDrawings=displayedGroups().map((c,j)=>({c,j,outline:K.groupOutline(c,p.n)}));
 $('maps').innerHTML=K.layout(p.n).map(plane=>`<div class="map-block"><table class="kmap" aria-label="${p.n}变量卡诺图，${plane.rowLabel}行，${plane.colLabel}列"><thead><tr><th class="axis" scope="col">${plane.rowLabel}\\${plane.colLabel}</th>${plane.cols.map(s=>`<th scope="col">${s}</th>`).join('')}</tr></thead><tbody>${plane.cells.map((row,ri)=>`<tr><th scope="row">${plane.rows[ri]}</th>${row.map((i,ci)=>{
 const correct=state.answers[i]===p.table[i];const gs=groupDrawings.filter(({c})=>(c.mask&K.bit(i))!==0n);const val=fill?state.answers[i]:p.table[i];
 const cls=['cell',selected.has(i)?'selected':'',fill&&state.checked?(correct?'correct':'wrong'):'',missing.includes(i)?'uncovered':'',hintCell===i?'hint-cell':''].filter(Boolean).join(' ');
 const edges=!fill?gs.map(({c,j,outline})=>{const contains=(r,col)=>r>=0&&r<plane.cells.length&&col>=0&&col<plane.cols.length&&(c.mask&K.bit(plane.cells[r][col]))!==0n;const styles=[`--g:${groupColor(c,j)}`,`--offset:${2+(colorSlot(c,j)%4)*3}px`],edge=outline[i];
 // Open wrapped edges at the map boundary, and folded edges toward their partner.
 if(!edge.top)styles.push(`top:${contains(ri-1,ci)?-4:0}px`,'border-top-color:transparent','border-top-left-radius:0','border-top-right-radius:0');
 if(!edge.bottom)styles.push(`bottom:${contains(ri+1,ci)?-4:0}px`,'border-bottom-color:transparent','border-bottom-left-radius:0','border-bottom-right-radius:0');
 if(!edge.left)styles.push(`left:${contains(ri,ci-1)?-4:0}px`,'border-left-color:transparent','border-top-left-radius:0','border-bottom-left-radius:0');
 if(!edge.right)styles.push(`right:${contains(ri,ci+1)?-4:0}px`,'border-right-color:transparent','border-top-right-radius:0','border-bottom-right-radius:0');
 return `<span class="circle-segment" style="${styles.join(';')}"></span>`;}).join(''):'';
 const labels=gs.map(({j})=>j+1).join('、');return `<td><button type="button" class="${cls}" data-cell="${i}" aria-label="${plane.label?plane.label+'，':''}m${i}，${p.n}位输入 ${K.bits(i,p.n).join('')}，${val===null?'未填':val}${fill&&state.checked?(correct?'，正确':'，错误'):''}${!fill&&labels?'，圈 '+labels:''}" ${ref?'disabled':!fill?`aria-pressed="${selected.has(i)}"`:''}>${edges}<span class="value">${val===null?'·':val}</span><span class="index">${minterm(i)}</span>${fill&&state.checked?`<span class="mark" aria-hidden="true">${correct?'✓':'×'}</span>`:''}${!fill&&gs.length?`<span class="group-badges" aria-hidden="true">${gs.map(({c,j})=>`<i style="--g:${groupColor(c,j)}">${j+1}</i>`).join('')}</span>`:''}</button></td>`;
 }).join('')}</tr>`).join('')}</tbody></table></div>`).join('');
}
function renderGroups(){const p=state.problem,groups=displayedGroups(),ref=showingReference();$('groupsTitle').textContent=ref?'标准答案圈法':'我的合圈';$('groupCount').textContent=groups.length+' 圈';
 $('groupList').innerHTML=groups.length?groups.map((c,j)=>`<div class="group-row" style="--g:${groupColor(c,j)}"><div class="group-top"><span class="group-term">${j+1}. ${math(K.term(c,state.mode))}</span>${ref?'':`<button class="subtle danger" data-remove="${j}" aria-label="删除第${j+1}圈">删除</button>`}</div><div class="group-bottom">${c.size} 格 · ${c.literals} 文字 · ${K.indices(c.mask).map(minterm).join(' ')}${p.n===5&&K.groupGeometry(c,p.n).folded?' · 折叠合并':''}</div></div>`).join(''):'<div class="empty">等待添加合圈</div>';
 $('liveExpression').innerHTML=groups.length?math('F = '+K.expression(groups,state.mode)):'等待合圈';
 const {required}=K.masks(p.table,state.mode),covered=groups.reduce((m,c)=>m|c.mask,0n),done=K.pop(required&covered),need=K.pop(required);
 $('coverage').textContent=state.unlocked?`必需格覆盖 ${done} / ${need} · 当前 ${groups.length} 项、${groups.reduce((a,c)=>a+c.literals,0)} 文字`:'先完成填图，解锁合圈。';$('coverageBar').style.width=need?(done/need*100)+'%':'0%';
 $('stats').textContent=`核对 ${state.attempts} 次${state.assisted?' · 已使用辅助':''}${state.solved?' · 本题已达最优':''} · 已完成 ${state.solvedCount} 题`;
}
function hideResult(){$('result').classList.add('hidden');$('result').innerHTML='';missing=[];}
function invalidateGroups(){state.solved=false;hideResult();save();render();}
$('maps').addEventListener('click',e=>{const button=e.target.closest('[data-cell]');if(!button||showingReference())return;const i=Number(button.dataset.cell);
 if(state.stage==='fill'){const cycle=[null,0,1,'X'];const next=paint==='cycle'?cycle[(cycle.indexOf(state.answers[i])+1)%4]:paint==='empty'?null:paint==='X'?'X':Number(paint);state.answers[i]=next;state.unlocked=false;state.groups=[];state.solved=false;hideResult();hintCell=null;render();save();if(state.checked){const errors=state.answers.filter((v,j)=>v!==state.problem.table[j]).length;message(`修改已记录；当前错误 / 未填 ${errors} 格。${errors===0?'点击“提交并核对”进入合圈。':'继续修正后再次提交。'}`,errors?'warn':'success');}}
 else{selected.has(i)?selected.delete(i):selected.add(i);hintCell=null;render();}
 // Restore keyboard focus after rebuilding the map.
 document.querySelector(`[data-cell="${i}"]`)?.focus({preventScroll:true});
});
document.querySelectorAll('[data-paint]').forEach(b=>b.addEventListener('click',()=>{paint=b.dataset.paint;document.querySelectorAll('[data-paint]').forEach(el=>{el.classList.toggle('active',el===b);el.setAttribute('aria-pressed',String(el===b));});}));
$('newProblem').addEventListener('click',newProblem);
$('seed').addEventListener('input',()=>{seedEdited=true;});
$('fixedProblem').addEventListener('click',()=>{setup(K.fixed(),$('mode').value);toast('已载入四变量固定例题；保留所选训练类型。');});
function goStage(stage){if(stage!=='fill'&&!state.unlocked)return;answerView='mine';state.stage=stage;selected.clear();hintCell=null;hideResult();render();save();message('');if(stage==='result')checkCover();}
$('stepFill').onclick=()=>goStage('fill');$('stepGroup').onclick=()=>goStage('group');$('stepResult').onclick=()=>goStage('result');
$('checkFill').onclick=()=>{state.checked=true;state.attempts++;const errors=state.answers.filter((v,i)=>v!==state.problem.table[i]).length;hintCell=null;if(!errors){state.unlocked=true;state.stage='group';render();message('全部填对！现在圈选必需格，可借用 X 扩大圈。','success');}else{render();message(`本次错误 / 未填 ${errors} 格，正确 ${state.answers.length-errors} 格。红色 × 表示需要修改；绿色 ✓ 可保留。修正后再次提交。`,'error');}save();};
$('retryFill').onclick=()=>{let count=0;state.answers=state.answers.map((v,i)=>{if(v!==state.problem.table[i]){count++;return null;}return v;});state.checked=false;hintCell=null;render();message(`已清除 ${count} 个错误 / 未填格，保留正确内容。`);save();};
$('fillHint').onclick=()=>{state.assisted=true;const i=state.answers.findIndex((v,j)=>v!==state.problem.table[j]);if(i<0){message('每格都已正确，提交即可进入合圈。','success');return;}hintCell=i;const p=state.problem,b=K.bits(i,p.n),v=p.table[i],assign=b.map((v,j)=>'ABCDE'[j]+'='+v).join('，');message(`看金色边框 m${i}（${assign}）。\n${v==='X'?'代入约束左边得到 1，此组合禁止出现，所以应填 X。':`此输入满足约束；代入原函数 F 得到 ${p.raw[i]}，所以填 ${v}。`}`,'warn');render();save();};
$('showFill').onclick=()=>{state.assisted=true;state.answers=[...state.problem.table];state.checked=true;state.unlocked=true;state.stage='group';selected.clear();render();message('已展示填图答案，并解锁合圈。本题记为辅助练习。','warn');save();};
$('clearSelection').onclick=()=>{selected.clear();render();};
$('addGroup').onclick=()=>{if(showingReference())return;const result=K.checkGroup([...selected],state.problem.table,state.mode);if(!result.ok){message(result.message,'error');return;}if(state.groups.some(c=>c.mask===result.cube.mask)){message('这一圈已添加过；同一圈重复写不会增加有效覆盖。','warn');return;}
 registerColor(result.cube);state.groups.push(result.cube);selected.clear();invalidateGroups();message('','success');$('feedback').innerHTML=`合法 ${result.cube.size} 格圈 → ${math(K.term(result.cube,state.mode))}（${result.cube.literals} 文字）${state.problem.n===5&&K.groupGeometry(result.cube,5).folded?' · 折叠合并':''}`;};
function removeGroup(j){state.groups.splice(j,1);selected.clear();invalidateGroups();message('已删除该圈，可以重新选择。');}
$('groupList').onclick=e=>{const b=e.target.closest('[data-remove]');if(b)removeGroup(Number(b.dataset.remove));};
$('undoGroup').onclick=()=>{if(state.groups.length)removeGroup(state.groups.length-1);};
$('clearGroups').onclick=()=>{state.groups=[];selected.clear();invalidateGroups();message('已清空所有圈。');};
function checkCover(){answerView='mine';const result=K.assess(state.groups,state.problem.table,state.mode);state.stage='result';missing=result.missing||[];hintCell=null;selected.clear();hideResult();missing=result.missing||[];
 if(result.status==='illegal'){message(result.message,'error');render();return;}
 const opt=result.optimum;if(result.status==='incomplete'){message(`尚未覆盖 ${missing.length} 个必需格：${missing.map(i=>'m'+i).join('、')}。已用 ${result.terms} 项、${result.literals} 个文字。金色格需要再合圈。`,'warn');}
 else if(result.status==='covered'){message(`覆盖正确，但还不是最简。你的成本：${result.terms} 项 / ${result.literals} 文字；精确最优：${opt.terms} 项 / ${opt.literals} 文字。${result.terms>opt.terms?'先减少项数，再考虑文字数。':'项数已最少，试着扩大或替换圈，减少文字数。'}`,'warn');}
 else{if(!state.counted){state.solvedCount++;state.counted=true;}state.solved=true;message(`最简式通过！所有必需格已覆盖，且达到精确最优 ${opt.terms} 项、${opt.literals} 文字。${state.assisted?'本题使用过辅助。':'本题独立完成。'}不同的等成本最优表达式同样会被接受。`,'success');}
 render();save();$('result').classList.remove('hidden');$('result').innerHTML=`<h3>${result.status==='optimal'?'你的最简表达式':'当前表达式'}</h3><div class="formula">${math('F = '+K.expression(state.groups,state.mode))}</div>`;
}
$('checkCover').onclick=checkCover;
$('groupHint').onclick=()=>{state.assisted=true;const p=state.problem,all=K.legal(p.table,state.mode);let expandable=state.groups.map((c,j)=>({c,j,big:all.filter(d=>d.size>c.size&&(d.mask&c.mask)===c.mask).sort((a,b)=>b.size-a.size)[0]})).find(x=>x.big);
 if(expandable){hintCell=K.indices(expandable.big.mask&~expandable.c.mask)[0];message(`第 ${expandable.j+1} 圈可以扩大。观察金色 m${hintCell} 及其邻格；扩成完整矩形可消去更多变量。允许重叠与环绕。`,'warn');}
 else{const {required}=K.masks(p.table,state.mode),covered=state.groups.reduce((m,c)=>m|c.mask,0n),left=K.indices(required&~covered);if(left.length){hintCell=left[0];message(`m${hintCell} 尚未被覆盖。以它为起点，试着找包含尽可能多 ${state.mode==='SOP'?'1':'0'} / X 的合法大矩形。`,'warn');}else{const a=K.assess(state.groups,p.table,state.mode);message(a.status==='optimal'?'当前已经最简，直接检验即可。':'每个圈已无法单独扩大，但整体仍可能不最简。试着删除冗余圈，或换一套主蕴含项组合；局部极大不等于全局最优。','warn');}}
 render();save();};
function showSolution(){if(!state.unlocked)return;state.assisted=true;const p=state.problem,s=K.solve(p.table,state.mode);referenceGroups=[...s.groups];answerView='reference';selected.clear();hintCell=null;hideResult();render();save();const el=$('result');el.classList.remove('hidden');
 el.innerHTML=`<h3>标准答案 · 一种最简解</h3><div class="formula">${math('F = '+K.expression(s.groups,state.mode))}</div><p>${s.terms} 项、${s.literals} 文字</p>${p.seed==='2.12(3)'?`<p>错误式 ${math('B + AC + D')} 在 ABCD=1001（${minterm(9)}）时为 1，原函数为 0。</p>`:''}`;
 message('','warn');
}
$('showSolution').onclick=showSolution;
$('viewReference').onclick=showSolution;
$('viewMine').onclick=()=>{answerView='mine';selected.clear();hintCell=null;hideResult();render();save();message('');};
$('sharePage').onclick=async()=>{const url='https://tijianweijin.github.io/karnaugh_game/';try{await navigator.clipboard.writeText(url);toast('分享链接已复制，可粘贴到微信。');}catch{$('shareFallback').classList.remove('hidden');$('shareUrl').value=url;$('shareUrl').focus();$('shareUrl').select();toast('请复制下方链接。');}};
$('selfTest').onclick=()=>{try{let count=0;const assert=(ok,text)=>{count++;if(!ok)throw new Error(text);};const p=K.fixed(),s=K.solve(p.table,'SOP');assert(s.terms===3&&s.literals===5,'固定 SOP 成本');assert(p.table[9]===0,'m9 反例');const pos=K.solve(p.table,'POS');assert(pos.terms===2&&pos.literals===5,'固定 POS 成本');for(const mode of ['SOP','POS'])for(const n of [3,4,5]){const q=K.generate(n,mode,'normal',true,'self-check-v1'),sol=K.solve(q.table,mode);assert(q.table.includes('X'),'含 X 出题');assert(K.assess(sol.groups,q.table,mode).status==='optimal','最优覆盖');for(let i=0;i<q.table.length;i++)if(q.table[i]!=='X')assert(K.evaluateGroups(sol.groups,i,mode)===q.table[i],'真值等价');}assert(K.checkGroup([0,2,8,10],Array(16).fill(1),'SOP').ok,'四角环绕');assert(!K.checkGroup([0,5],Array(16).fill(1),'SOP').ok,'对角非法');assert(K.checkGroup([0,1,4,5],Array(32).fill(1),'SOP').ok,'五变量矩形');$('testOutput').textContent=`内置自检通过：${count} 项断言，包括固定样例、SOP / POS、三至五变量、真值等价、环绕与五变量合圈。`;toast('内置自检全部通过。');}catch(e){$('testOutput').textContent='自检失败：'+e.message;toast('自检发现问题。');}};
function restore(){try{const saved=JSON.parse(localStorage.getItem(storageKey)||'null');if(!saved)return false;const p=saved.problem;if(!p||![3,4,5].includes(p.n)||!['SOP','POS'].includes(saved.mode)||!['fill','group','result'].includes(saved.stage)||p.table.length!==2**p.n||p.table.some(v=>![0,1,'X'].includes(v))||saved.answers.length!==p.table.length||saved.answers.some(v=>![null,0,1,'X'].includes(v)))return false;
 const groups=(saved.groups||[]).map(m=>K.all(p.n).find(c=>c.mask===BigInt(m)));if(groups.some(c=>!c||!K.checkGroup(K.indices(c.mask),p.table,saved.mode).ok))return false;
 state={...saved,groups,groupColors:{},nextColor:0};for(const [key,value] of Object.entries(saved.groupColors||{}))if(Number.isSafeInteger(value)&&value>=0&&value<100000){state.groupColors[key]=value;state.nextColor=Math.max(state.nextColor,value+1);}for(const c of groups)registerColor(c);
 if(state.unlocked&&state.answers.some((v,i)=>v!==p.table[i]))return false;referenceGroups=(saved.referenceMasks||[]).map(m=>K.all(p.n).find(c=>c.mask===BigInt(m))).filter(Boolean);answerView=state.unlocked&&saved.answerView==='reference'?'reference':'mine';syncSettings();render();message('已恢复上次练习。');if(answerView==='reference')showSolution();else if(state.stage==='result')checkCover();return true;}catch{return false;}}
if(!restore()){const seed=Date.now().toString(36);setup(K.generate(4,'SOP','normal',true,seed),'SOP');}
})();
