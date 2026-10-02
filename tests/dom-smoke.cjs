const fs=require('fs'),vm=require('vm'),assert=require('assert');
class Node {
 constructor(tag='div'){this.tag=tag;this.children=[];this.className='';this.dataset={};this.attributes={};this.listeners={};this.text='';this.disabled=false;this.namespaceURI='http://www.w3.org/2000/svg';
 this.classList={toggle:(name,on)=>{const names=new Set(this.className.split(' ').filter(Boolean));on?names.add(name):names.delete(name);this.className=[...names].join(' ')}};}
 set textContent(value){this.text=String(value);this.children=[]}get textContent(){return this.text+this.children.map(x=>x.textContent).join(' ')}
 append(...nodes){this.children.push(...nodes)}replaceChildren(...nodes){this.children=nodes;this.text=''}
 setAttribute(k,v){this.attributes[k]=String(v)}addEventListener(type,fn){this.listeners[type]=fn}getBoundingClientRect(){return {width:800,height:510}}
}
function surface(ids){
 const roots=Object.fromEntries(ids.map(x=>['#'+x,new Node()]));const core=new Node('button');core.className='core node';core.dataset.id='control';roots['.core']=core;
 const all=()=>[...new Set(Object.values(roots).flatMap(function walk(n){return [n,...n.children.flatMap(walk)]}))];
 const motion={matches:false,listeners:{},addEventListener:(t,fn)=>motion.listeners[t]=fn};
 const context=vm.createContext({window:{},document:{querySelector:s=>roots[s],querySelectorAll:s=>all().filter(n=>n.className.split(' ').includes(s.slice(1))),createElement:t=>new Node(t),createElementNS:(_,t)=>new Node(t)},matchMedia:()=>motion,innerWidth:1440,addEventListener:()=>{},console,fetch:undefined});
 return {roots,all,motion,context};
}
(async()=>{
 const p=surface(['stats','agents','graph','edges','inspector','queueCount','queue','events','lastUpdate','simulate','resetDemo','scenarioStatus']);
 for(const file of ['assets/demo-state.js','assets/app.js'])vm.runInContext(fs.readFileSync(file,'utf8'),p.context);
 assert(p.roots['#inspector'].textContent.includes('Adaptive router'));assert.equal(p.all().filter(n=>n.dataset.id?.startsWith('worker-')).length,6);
 p.roots['#simulate'].listeners.click();assert(p.roots['#scenarioStatus'].textContent.includes('No live action'));assert(p.roots['#simulate'].disabled);
 const fallback=p.all().find(n=>n.dataset.id==='worker-05');fallback.listeners.click();assert(p.roots['#inspector'].textContent.includes('independent reviewer'));
 p.motion.matches=true;p.motion.listeners.change();assert(!p.all().some(n=>n.tag==='animateMotion'));
 p.roots['#resetDemo'].listeners.click();assert(!p.roots['#simulate'].disabled);p.roots['.core'].listeners.click();assert(p.roots['#inspector'].textContent.includes('Adaptive router'));
 const worker=p.all().find(n=>n.dataset.id==='worker-01');worker.listeners.focus();assert(p.roots['#inspector'].textContent.includes('Local code worker'));worker.listeners.mouseenter();
 p.motion.matches=false;p.motion.listeners.change();assert(p.all().some(n=>n.tag==='animateMotion'));
 for(const mutation of [s=>s.mode='sanitized_snapshot',s=>s.agents[0].label='<img src=x onerror=alert(1)>',s=>s.agents.push(s.agents[0]),s=>s.queue_summary.queued=true,s=>s.secret='private',s=>s.agents[0].status='untrusted']){
   const bad=surface(['stats','agents','graph','edges','inspector','queueCount','queue','events','lastUpdate','simulate','resetDemo','scenarioStatus']);
   vm.runInContext(fs.readFileSync('assets/demo-state.js','utf8'),bad.context);mutation(bad.context.window.DEMO_STATE);vm.runInContext(fs.readFileSync('assets/app.js','utf8'),bad.context);
   assert(bad.roots['#simulate'].disabled);assert.equal(bad.roots['#agents'].children.length,0);assert(bad.roots['#scenarioStatus'].textContent.includes('rejected'));
 }
console.log('Demo interaction smoke: PASS (DOM harness; browser layout pending)');
})().catch(e=>{console.error(e);process.exit(1)});
