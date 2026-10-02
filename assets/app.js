'use strict';
const $ = s => document.querySelector(s);
const motion = matchMedia('(prefers-reduced-motion: reduce)');
function validateDemo(s) {
  const closed=(x,keys)=>x && typeof x==='object' && !Array.isArray(x) && Object.keys(x).length===keys.length && keys.every(k=>Object.hasOwn(x,k));
  if(!closed(s,['schema_version','generated_at','mode','agents','queue_summary']) || s.schema_version!=='1.0' || s.mode!=='demo' || typeof s.generated_at!=='string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(s.generated_at) || !Number.isFinite(Date.parse(s.generated_at)))throw Error('Invalid demo');
  // This fixed topology has six positions; exported snapshots are a separate contract.
  if(!Array.isArray(s.agents)||s.agents.length!==6)throw Error('Invalid demo topology');
  s.agents.forEach((a,i)=>{
    const suffix=String(i+1).padStart(2,'0');
    if(!closed(a,['id','label','status','role','surface','quota_state']) || a.id!=='worker-'+suffix || a.label!=='Worker '+suffix || !['online','busy','offline','limited','unknown'].includes(a.status) || !['code worker','independent reviewer','fallback worker','unknown'].includes(a.role) || !['local','cloud','cloud_async','hybrid','unknown'].includes(a.surface) || a.quota_state!=='unknown')throw Error('Invalid demo worker');
  });
  if(!closed(s.queue_summary,['queued','running','blocked']) || Object.values(s.queue_summary).some(x=>!Number.isInteger(x)||x<0||x>1000000))throw Error('Invalid demo counts');
  return s;
}
try {
const state = validateDemo(JSON.parse(JSON.stringify(window.DEMO_STATE)));
const baseline = JSON.parse(JSON.stringify(state));
const names = ['Local code worker','Cloud reviewer','Cloud review worker','API review worker','Fallback engineer','Reserve code worker'];
const events = [];
let selected = 'control';
function element(tag, text, cls) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (cls) node.className = cls;
  return node;
}
function card(label, value) {
  const node = element('div', undefined, 'inspect-card');
  node.append(element('small', label), element('b', value));
  return node;
}
function stats() {
  const a = state.agents;
  const values = [[a.filter(x => ['online','busy'].includes(x.status)).length, 'eligible · simulated'],
    [a.filter(x => x.status === 'busy').length, 'busy · simulated'],
    [a.filter(x => x.status === 'offline').length, 'offline · simulated'],
    [Object.values(state.queue_summary).reduce((s,x) => s+x,0), 'queue · simulated'],
    [a.filter(x => x.status === 'limited').length, 'limited · simulated']];
  $('#stats').replaceChildren(...values.map(([value,label]) => {
    const node = element('div',undefined,'stat');
    node.append(element('b',value),element('small',label));return node;
  }));
}
function inspect(id) {
  selected = id;
  document.querySelectorAll('.node').forEach(n => {
    n.classList.toggle('active', n.dataset.id === id);
    n.setAttribute('aria-pressed', String(n.dataset.id === id));
  });
  const panel = $('#inspector');
  panel.replaceChildren(element('p','SIMULATED INSPECTOR','eyebrow'));
  if (id === 'control') {
    panel.append(element('h2','Adaptive router'));
    const grid = element('div',undefined,'inspect-grid');
    grid.append(card('Eligibility','Capability + health'),card('Capacity','Independent quota pools'),
      card('Recovery','Lease + bounded attempts'),card('Promotion','Human merge gate'));
    panel.append(grid,element('p','The scenario illustrates routing concepts using fixed demo data. No worker is invoked.','muted'));
  } else {
    const a = state.agents.find(x => x.id === id);if (!a) return;
    const index = baseline.agents.findIndex(x => x.id === id);
    panel.append(element('h2',names[index]),element('div',a.status+' · simulated','inspect-status'));
    const grid = element('div',undefined,'inspect-grid');
    grid.append(card('Role',a.role),card('Surface',a.surface),card('Quota remaining','Not observable'),
      card('Token usage','Not observable'),card('Status evidence','Client-only scenario'),card('Data source','Simulated'));
    panel.append(grid);
  }
  panel.append(element('p','Public output contains generic aliases and aggregates. Private prompts, identifiers and operational logs stay behind the exporter boundary.','privacy-note'));
}
function renderAgents() {
  $('#agents').replaceChildren(...state.agents.map((a,i) => {
    const n = element('button',undefined,`node status-${a.status} position-${i+1}`);
    n.dataset.id = a.id;
    n.setAttribute('aria-label',`${names[i]}, ${a.status}, simulated`);
    n.append(element('i',undefined,'status-pin'),element('b',names[i]),element('small',`${a.status} · ${a.surface}`));
    n.addEventListener('click',() => inspect(a.id));
    n.addEventListener('focus',() => inspect(a.id));
    n.addEventListener('mouseenter',() => {if (innerWidth > 800) inspect(a.id);});
    return n;
  }));
}
function draw() {
  const svg = $('#edges'), r = $('#graph').getBoundingClientRect();
  const positions = [[16,20],[50,14],[84,20],[84,78],[50,86],[16,78]];
  svg.replaceChildren();
  state.agents.forEach((a,i) => {
    const [px,py] = positions[i], x=px/100*r.width, y=py/100*r.height;
    const line = document.createElementNS('http://www.w3.org/2000/svg','line');
    for (const [key,val] of Object.entries({x1:r.width/2,y1:r.height/2,x2:x,y2:y,class:'edge'})) line.setAttribute(key,val);
    svg.append(line);
    if (a.status === 'busy' && !motion.matches) {
      const circle = document.createElementNS(svg.namespaceURI,'circle');
      circle.setAttribute('r','3');circle.setAttribute('class','packet');
      const animation = document.createElementNS(svg.namespaceURI,'animateMotion');
      animation.setAttribute('dur','2s');animation.setAttribute('repeatCount','indefinite');
      animation.setAttribute('path',`M ${r.width/2} ${r.height/2} L ${x} ${y}`);
      circle.append(animation);svg.append(circle);
    }
  });
}
function lists() {
  $('#queueCount').textContent = '3 DEMO ENTRIES';
  const rows = [['running','Independent review','Cloud reviewer','1 / 2'],['queued','Resilience check','Awaiting route','0 / 2'],['blocked','Security review','Circuit fenced','1 / 2']];
  $('#queue').replaceChildren(...rows.map(([status,task,worker,attempt]) => {
    const n=element('div',undefined,'queue-row');
    n.append(element('i',undefined,`qpin ${status}`),element('strong',task+' · simulated'),element('span',worker),element('span',attempt));return n;
  }));
  $('#events').replaceChildren(...events.slice(-5).reverse().map((text,i) => {
    const n=element('div',undefined,'event-row');
    n.append(element('time',`STEP ${events.length-i}`),element('span',text));return n;
  }));
}
function render() {stats();renderAgents();lists();inspect(selected);draw();}
$('#simulate').addEventListener('click',() => {
  if (state.agents[1].status !== 'busy') return;
  state.agents[1].status = 'offline';state.agents[4].status='busy';state.agents[4].role='independent reviewer';
  events.push('Simulated lease expiry detected.','Simulated eligible fallback selected. Independent review role preserved.');
  $('#scenarioStatus').textContent='Simulation: cloud reviewer unavailable; fallback engineer carries the review role. No live action.';
  $('#simulate').disabled=true;render();
});
$('#resetDemo').addEventListener('click',() => {
  state.agents = JSON.parse(JSON.stringify(baseline.agents));events.length=0;
  events.push('Simulated task accepted. Human merge gate stays closed.');
  $('#scenarioStatus').textContent='Simulation ready. No private telemetry connection.';
  $('#simulate').disabled=false;render();
});
$('.core').addEventListener('click',() => inspect('control'));
$('.core').addEventListener('focus',() => inspect('control'));
motion.addEventListener('change',draw);addEventListener('resize',draw);
events.push('Simulated task accepted. Human merge gate stays closed.');
$('#lastUpdate').textContent='Fixed demo data · no live telemetry';
render();
} catch {
  for(const id of ['stats','agents','edges','queue','events','inspector'])$('#'+id).replaceChildren();
  $('#simulate').disabled=true;$('#resetDemo').disabled=true;
  $('#lastUpdate').textContent='Demo unavailable';
  $('#scenarioStatus').textContent='Demo payload rejected. No telemetry or worker connection.';
}
