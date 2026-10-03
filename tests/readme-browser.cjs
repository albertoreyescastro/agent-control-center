/* GitHub-native README QA, isolated from the application's local-only browser tests. */
'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
module.exports=async function(browser,out){
 const event=JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH,'utf8'));
 const head=event.pull_request?event.pull_request.head.sha:process.env.GITHUB_SHA;
 assert(/^[a-f0-9]{40}$/.test(head));
 const url=`https://github.com/albertoreyescastro/agent-control-center/blob/${head}/README.md`;
 const results=[];
 for(const width of [1200,390])for(const colorScheme of ['light','dark']){
  const context=await browser.newContext({viewport:{width,height:1000},colorScheme,reducedMotion:'reduce'});
  const page=await context.newPage();
  await require('./readme-navigation.cjs').observe(page,url,out,`${width}-${colorScheme}`);
  const article=page.locator('article');
  await page.waitForFunction(()=>{const a=document.querySelector('article');return a&&a.querySelectorAll('img').length===8&&[...a.querySelectorAll('img')].every(i=>i.complete&&i.naturalWidth>0);},{},{timeout:30000});
  assert(await article.locator('img').evaluateAll(images=>images.every(i=>!!i.alt.trim())), 'alt text');
  const sources=await article.locator('img').evaluateAll(images=>images.map(i=>i.currentSrc));
  for(const name of ['hero','live-demo','control-plane','trust-boundary'])assert(sources.some(s=>s.endsWith(`/docs/readme/${name}${width<600?'-narrow':''}.svg`)),`responsive ${name}`);
  const links=await article.locator('a').evaluateAll(nodes=>nodes.map(n=>({href:n.getAttribute('href'),label:n.textContent,anchor:!n.getAttribute('href').startsWith('#')||!!document.getElementById('user-content-'+n.getAttribute('href').slice(1))||!!document.getElementById(n.getAttribute('href').slice(1))})));
  assert(links.every(x=>x.anchor),'internal anchors');
  const demoUrl='https://albertoreyescastro.github.io/agent-control-center/';
  const banner=article.locator('img[alt^="LIVE DEMO"]');
  assert.equal(await banner.locator('xpath=ancestor::a').getAttribute('href'),demoUrl);
  const gallery=article.locator('img[alt^="Three clickable views"]');
  assert((await gallery.evaluate(i=>i.currentSrc)).endsWith(`/docs/readme/preview-gallery${width<600?'-narrow':''}.jpg`));
  const dimensions=await gallery.evaluate(i=>({w:i.naturalWidth,h:i.naturalHeight,width:i.getBoundingClientRect().width,height:i.getBoundingClientRect().height}));
  assert.equal(dimensions.w,width<600?800:1440);assert.equal(dimensions.h,width<600?1190:860);
  assert(Math.abs(dimensions.width/dimensions.height-dimensions.w/dimensions.h)<0.01,'gallery aspect ratio');
  assert.equal(await gallery.locator('xpath=ancestor::a').getAttribute('href'),demoUrl);
  for(const caption of ['Interactive scenario lab ↗','Adaptive orchestration graph ↗','Fail-closed publication boundary ↗'])assert.equal(await article.getByRole('link',{name:caption,exact:true}).getAttribute('href'),demoUrl);
  const secondary=article.getByRole('link',{name:'ARCHITECTURE ↓',exact:true});
  assert(!(await secondary.evaluate(n=>!!n.closest('strong'))),'secondary navigation is quiet');
  const prominence=await banner.evaluate(i=>({width:i.getBoundingClientRect().width,y:i.getBoundingClientRect().top}));
  const navPosition=await secondary.boundingBox();assert(prominence.width>width*0.65);assert(prominence.y<navPosition.y);
  const hero=article.locator('img[alt^="Agent Control Center"]');
  const heroBox=await hero.boundingBox(),ctaBox=await banner.boundingBox();
  assert(Math.abs(heroBox.x-ctaBox.x)<1&&Math.abs(heroBox.width-ctaBox.width)<1,'hero/CTA alignment');
  assert(ctaBox.height<heroBox.height*0.6,'hero retains visual dominance');
  assert(Math.abs(ctaBox.width/ctaBox.height-(width<600?480/184:960/136))<0.01,'CTA aspect ratio');
  const svgPage=await context.newPage();
  const svg=fs.readFileSync(path.join(__dirname,`../docs/readme/live-demo${width<600?'-narrow':''}.svg`),'utf8');
  assert(!svg.includes('\uFE0F'),'plain text arrow');
  await svgPage.setContent(svg);
  const clippedText=await svgPage.locator('svg').evaluate(root=>{const {width,height}=root.viewBox.baseVal;return [...root.querySelectorAll('text')].filter(t=>{const b=t.getBBox();return b.x<0||b.y<0||b.x+b.width>width||b.y+b.height>height;}).map(t=>t.textContent);});
  assert.deepEqual(clippedText,[],'CTA typography not clipped in Chrome');await svgPage.close();
  await banner.locator('xpath=ancestor::a').focus();assert(await banner.locator('xpath=ancestor::a').evaluate(n=>document.activeElement===n),'CTA keyboard focus');
  await page.keyboard.press('Tab');assert(await secondary.evaluate(n=>document.activeElement===n),'CTA to secondary navigation via Tab');
  await page.keyboard.press('Shift+Tab');assert(await banner.locator('xpath=ancestor::a').evaluate(n=>document.activeElement===n),'return to CTA via keyboard');
  await gallery.scrollIntoViewIfNeeded();
  const tileTargets=await gallery.evaluate(i=>{const r=i.getBoundingClientRect();const spots=innerWidth<600?[[.25,.28],[.75,.28],[.25,.80]]:[[.16,.45],[.5,.45],[.84,.45]];return spots.map(([x,y])=>document.elementFromPoint(r.x+r.width*x,r.y+r.height*y)?.closest('a')?.getAttribute('href'));});
  assert(tileTargets.every(h=>h===demoUrl),'all three screenshot tiles click through');
  const galleryShot=await page.screenshot({path:path.join(out,`readme-gallery-${width}-${colorScheme}.jpg`),type:'jpeg',quality:85});
  console.log(`README_GALLERY_${width}_${colorScheme}_BEGIN`);console.log(galleryShot.toString('base64'));console.log(`README_GALLERY_${width}_${colorScheme}_END`);
  assert.equal(await article.locator('details').count(),2);
  for(const summary of await article.locator('summary').all()){await summary.focus();await page.keyboard.press('Enter');assert(await summary.evaluate(n=>n.parentElement.open));await page.keyboard.press('Enter');assert(!(await summary.evaluate(n=>n.parentElement.open)));}
  await article.getByRole('link',{name:'ARCHITECTURE ↓',exact:true}).click();
  assert((await page.url()).endsWith('#architecture'));
  await page.goto(url+'#engineering-the-space-between-agents',{waitUntil:'domcontentloaded'});
  await article.getByRole('link',{name:'SCENARIOS ↓',exact:true}).click();
  assert((await page.url()).endsWith('#scenarios'));
  await article.getByRole('link',{name:'SECURITY / TRUST MODEL ↓',exact:true}).click();assert((await page.url()).endsWith('#security-and-trust-model'));
  const overflow=await page.evaluate(()=>Math.max(0,document.documentElement.scrollWidth-innerWidth));assert.equal(overflow,0,'page overflow');
  const tableOverflow=await article.locator('table').evaluateAll(nodes=>nodes.map(n=>Math.max(0,n.scrollWidth-n.clientWidth)));assert(tableOverflow.every(n=>n===0),'README table overflow');
  const theme=await page.evaluate(()=>({background:getComputedStyle(document.body).backgroundColor,color:getComputedStyle(document.querySelector('article')).color}));
  await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
  // Scroll the README's hero into view without removing GitHub context.
  await article.locator('picture').first().scrollIntoViewIfNeeded();
  const shot=await page.screenshot({path:path.join(out,`readme-${width}-${colorScheme}.jpg`),type:'jpeg',quality:90});
  console.log(`README_IMAGE_${width}_${colorScheme}_BEGIN`);console.log(shot.toString('base64'));console.log(`README_IMAGE_${width}_${colorScheme}_END`);
  await banner.locator('xpath=ancestor::a').press('Enter');await page.waitForURL(demoUrl,{timeout:30000});
  assert.equal(await page.locator('#lab').count(),1,'keyboard CTA opens the canonical interactive demo');
  results.push({width,colorScheme,theme,head,images:'PASS',gallery_dimensions:dimensions,cta_prominence:'PASS',hero_alignment:'PASS',cta_text_clipping:'PASS',plain_arrow:'PASS',cta_keyboard_navigation:'PASS',tile_links:'PASS',alt_text:'PASS',responsive_sources:'PASS',anchors:'PASS',details_keyboard:'PASS',tables:'PASS',overflow});
  await context.close();
 }
 const demoContext=await browser.newContext();const demoPage=await demoContext.newPage();
 const response=await demoPage.goto('https://albertoreyescastro.github.io/agent-control-center/',{waitUntil:'networkidle'});
 assert(response.ok(),'canonical live demo loads');assert.equal(new URL(demoPage.url()).pathname,'/agent-control-center/');
 assert.equal(await demoPage.locator('#lab').count(),1);await demoContext.close();
 assert.notEqual(results[0].theme.background,results[1].theme.background,'GitHub light/dark background changes');
 fs.writeFileSync(path.join(out,'readme-results.json'),JSON.stringify(results,null,2));
 console.log('GitHub README rendering: PASS '+JSON.stringify(results));
};

// A separate blocking check: external unavailability stays visible as BLOCKED,
// while any assertion on a loaded README stays a rendering failure. No blanket skip.
if(require.main===module){
 (async()=>{
  const out=process.env.QA_OUTPUT||'readme-evidence';fs.mkdirSync(out,{recursive:true});
  const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
  const browser=await chromium.launch({headless:true,...(process.env.QA_CHROME_CHANNEL?{channel:process.env.QA_CHROME_CHANNEL}:{})});
  try{await module.exports(browser,out);}
  catch(error){
   const result=error.observation||{status:'FAIL',rendering_pass:false,reason:'loaded_readme_assertion_or_browser_infrastructure'};
   fs.writeFileSync(path.join(out,'observation-status.json'),JSON.stringify(result,null,2));
   if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,`\nGitHub README observation: **${result.status}**. Rendering PASS was not established. Inspect the separate check and evidence artifact.\n`);
   throw error;
  }finally{await browser.close();}
 })().catch(error=>{console.error(error);process.exitCode=1;});
}
