/* global __dirname */
const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const ts=require('typescript');
function load(name,dependencies){const mod={exports:{}};new Function('require','module','exports',ts.transpileModule(fs.readFileSync(path.join(__dirname,name+'.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(key=>dependencies[key],mod,mod.exports);return mod.exports;}
const steady=load('steady',{});
const flush=()=>new Promise(resolve=>setImmediate(resolve));
(async()=>{
 let removed=0,asked=0,handler,available=true,granted=true;
 const sensor={isAvailableAsync:async()=>available,requestPermissionsAsync:async()=>{asked++;return{granted};},setUpdateInterval:n=>assert.equal(n,200),addListener:fn=>{handler=fn;return{remove:()=>removed++};}};
 const {observeSteady}=load('observeSteady',{'expo-sensors':{DeviceMotion:sensor},'./steady':steady});
 const samples=[];const stop=observeSteady(s=>samples.push(s));await flush();
 handler({acceleration:{x:0,y:0,z:0,timestamp:1},rotationRate:{alpha:0,beta:0,gamma:0,timestamp:1}});
 assert.equal(samples.at(-1).quiet,true);assert.equal(samples.at(-1).source,'device_motion');
 const before=samples.length;handler({acceleration:{x:0,y:0,z:0,timestamp:1},rotationRate:null});assert.equal(samples.length,before,'Duplicate sensor sample ignored');
 handler({acceleration:{x:0,y:0,z:0,timestamp:2},rotationRate:null});assert.equal(samples.at(-1).quiet,null);
 stop();assert.equal(removed,1);const count=samples.length;handler({acceleration:{x:0,y:0,z:0,timestamp:3},rotationRate:null});assert.equal(samples.length,count);
 granted=false;observeSteady(s=>samples.push(s));await flush();assert.equal(samples.at(-1).quiet,null);assert.match(samples.at(-1).reason,/quyền/);
 available=false;const priorAsked=asked;observeSteady(s=>samples.push(s));await flush();assert.equal(asked,priorAsked);assert.match(samples.at(-1).reason,/cảm biến/);
 available=true;granted=true;const oldHandler=handler;const cancel=observeSteady(s=>samples.push(s));cancel();await flush();assert.equal(handler,oldHandler,'Cancelled setup never subscribes');
 console.log('PASS native motion adapter: availability, permission, sample freshness, unknown rotation, cleanup and async cancellation');
})().catch(e=>{console.error(e);process.exitCode=1;});
