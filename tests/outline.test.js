'use strict';
const assert=require('node:assert/strict');
const {KMap:K}=require('../src/engine.js');
let count=0;
function eq(a,b,label){count++;assert.deepEqual(a,b,label);}
function outline(n,ids){const mask=ids.reduce((m,i)=>m|K.bit(i),0n),cube=K.all(n).find(c=>c.mask===mask);assert.ok(cube,'test fixture must be a Boolean cube');return K.groupOutline(cube,n);}
function edges(n,ids,expected){const actual=outline(n,ids);for(const [id,value] of Object.entries(expected))eq(actual[id],value,`${n} variables, cells ${ids}, m${id}`);eq(actual.filter(Boolean).length,ids.length,'one segment per selected cell');}
const closed={top:true,right:true,bottom:true,left:true};
for(const [n,last] of [[3,4],[4,8],[5,16]]){
 edges(n,[0,last],{0:{...closed,left:false},[last]:{...closed,right:false}});
 edges(n,[0],{0:closed});
}
for(const [n,last] of [[4,8],[5,16]]){
 edges(n,[0,2],{0:{...closed,top:false},2:{...closed,bottom:false}});
 edges(n,[0,2,last,last+2],{
  0:{...closed,top:false,left:false},2:{...closed,bottom:false,left:false},
  [last]:{...closed,top:false,right:false},[last+2]:{...closed,bottom:false,right:false}
 });
}
// Exact open/closed sides in the user's C=0 and C=1 annotated sketches.
for(const ids of [[0,8,24,16],[4,12,28,20]]){
 const expected={};ids.forEach((id,j)=>expected[id]={...closed,left:j===0,right:j===3});
 edges(5,ids,expected);
}
// Every extra, non-contiguous two-column adjacency opens toward the gap.
for(const [left,right] of [[0,8],[4,20],[12,28],[24,16]]){
 edges(5,[left,right],{[left]:{...closed,right:false},[right]:{...closed,left:false}});
}
// Horizontal fold and vertical wrap combine, including both open sides at corners.
const combined=outline(5,[0,2,8,10,16,18,24,26]);
for(const id of [0,8,16,24])eq(combined[id].top,false,'folded group wraps above');
for(const id of [2,10,18,26])eq(combined[id].bottom,false,'folded group wraps below');
eq(combined[0].left,true,'folded first column keeps left cap');
eq(combined[16].right,true,'folded last column keeps right cap');
// Complete straight rectangles retain end caps: they do not need wrap adjacency.
eq(outline(3,[0,1])[0].top,true,'two-row map keeps normal top cap');
eq(outline(3,[0,1])[1].bottom,true,'two-row map keeps normal bottom cap');
const row=outline(4,[0,4,12,8]);
eq(row[0].left,true,'whole row left cap');eq(row[8].right,true,'whole row right cap');
const full=outline(5,Array.from({length:32},(_,i)=>i));
eq(full[0],{top:true,right:false,bottom:false,left:true},'whole map top left cap');
eq(full[18],{top:false,right:true,bottom:true,left:false},'whole map bottom right cap');
console.log(`ALL OUTLINE PASS: ${count} assertions; 3–5 variable wrap, corners, exact C=0/C=1 sketches, folded pairs, combined fold/wrap, full rectangles.`);
