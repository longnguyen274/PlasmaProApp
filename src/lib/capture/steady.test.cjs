/* global __dirname */
const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');const ts=require('typescript');
const mod={exports:{}};
new Function('module','exports',ts.transpileModule(fs.readFileSync(path.join(__dirname,'steady.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(mod,mod.exports);
const {advanceHold,emptyHold,phoneQuiet,frameQuiet}=mod.exports;
const sample=(at,quiet=true)=>({at,quiet,source:'device_motion',reason:''});
let state=emptyHold(),fires=0;
for(let t=0;t<=4500;t+=100){const next=advanceHold(state,sample(t),t,true);state=next.state;fires+=Number(next.fire);if(t<3000)assert.equal(next.fire,false);}
assert.equal(fires,1,'Only one shutter after uninterrupted hold');
state=advanceHold(emptyHold(),sample(0),0,true).state;
state=advanceHold(state,sample(200),200,true).state;
assert.equal(advanceHold(state,sample(300,false),300,true).state.since,null);
assert.equal(advanceHold(state,sample(300,null),300,true).state.since,null);
assert.equal(advanceHold(state,sample(200),1500,true).state.since,null,'Stale signal resets');
assert.equal(advanceHold(state,sample(1000),900,true).state.since,null,'Future samples rejected');
assert.equal(advanceHold(state,sample(300),300,false).state.since,null,'Not acknowledged means no hold');
assert.equal(advanceHold(state,sample(4000),4000,true).progress,0,'Suspended event loop cannot finish old hold');
assert.equal(phoneQuiet(null,null),null);
assert.equal(phoneQuiet({x:0,y:0,z:0},{alpha:0,beta:0,gamma:0}),true);
assert.equal(phoneQuiet({x:1,y:0,z:0},{alpha:0,beta:0,gamma:0}),false);
assert.equal(phoneQuiet({x:0,y:0,z:0},{alpha:4,beta:0,gamma:0}),false);
assert.equal(phoneQuiet({x:NaN,y:0,z:0},{alpha:0,beta:0,gamma:0}),null);
const p=new Uint8ClampedArray(100*4).fill(90);
assert.equal(frameQuiet(null,p),null);assert.equal(frameQuiet(p,p),true);
assert.equal(frameQuiet(p,new Uint8ClampedArray(100*4).fill(160)),false);
console.log('PASS steady hold: motion/unknown/stale/gaps reset; confirmation required; one shutter; phone and frame signals');
