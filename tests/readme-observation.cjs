'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {category,observe}=require('./readme-navigation.cjs');
const url='https://github.com/albertoreyescastro/agent-control-center/blob/'+'a'.repeat(40)+'/README.md';
const out=fs.mkdtempSync(path.join(os.tmpdir(),'readme-observation-'));
function page(states){let index=-1,waits=0;return{
 goto:async()=>{index++;if(states[index].transport)throw Error('transport');return{status:()=>states[index].status};},
 locator:()=>({waitFor:async()=>{if(!states[index].article)throw Error('article timeout');},isVisible:async()=>!!states[index].article}),
 url:()=>states[index].redirect||url,waitForTimeout:async()=>{waits++;},screenshot:async()=>{},
 calls:()=>index+1,waits:()=>waits};}
(async()=>{try{
 assert.equal(category(200,true,false),'ready');
 assert.equal(category(200,false,false),'render_unobserved');
 assert.equal(category(404,false,false),'resource_missing');
 for(const status of [401,403,429])assert.equal(category(status,false,false),'access_or_rate_limit');
 assert.equal(category(503,false,false),'github_unavailable');
 assert.equal(category(null,false,true),'navigation_unavailable');
 const ready=page([{status:200,article:true}]);await observe(ready,url,out,'ready');assert.equal(ready.calls(),1);
 const recovered=page([{status:503},{status:200,article:true}]);await observe(recovered,url,out,'recovered');assert.equal(recovered.calls(),2);assert.equal(recovered.waits(),1);
 for(const [label,states,calls] of [
  ['timeout',[{status:200}],1],['missing',[{status:404}],1],
  ['access',[{status:403},{status:403}],2],['transport',[{transport:true},{transport:true}],2],
  ['redirect',[{status:200,article:true,redirect:'https://github.com/login?diagnostic=untrusted'}],1]]){
  const p=page(states);await assert.rejects(()=>observe(p,url,out,label),/BLOCKED/);assert.equal(p.calls(),calls);
  const raw=fs.readFileSync(path.join(out,`navigation-${label}.json`),'utf8'),e=JSON.parse(raw);
  assert.equal(e.rendering_pass,false);assert.equal(e.status,'BLOCKED');assert(!raw.includes('untrusted'));assert(!raw.includes('diagnostic='));
 }
 assert(!fs.existsSync(path.join(out,'navigation-ready.json')));
 assert(!fs.existsSync(path.join(out,'navigation-recovered.json')));
 console.log('README observation regressions: PASS (ready, bounded retry, missing article, 404, access/rate limit, transport, redirect; unobserved never PASS)');
 }finally{fs.rmSync(out,{recursive:true,force:true});}})().catch(e=>{console.error(e);process.exitCode=1;});
