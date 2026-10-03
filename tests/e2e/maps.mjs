// Map verification uses actual PMTiles, the shipped worker, and real glyph/sprite requests.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { PMTiles } from 'pmtiles';

export async function runMapChecks(browser,base,slug,check){
 const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage();
 const errors=[],responses=[];
 page.on('pageerror',(e)=>errors.push(e.message));
 page.on('response',(res)=>responses.push({url:res.url(),status:res.status()}));
 page.on('console',(msg)=>{if(msg.type()==='error'&&msg.text().startsWith('map error'))errors.push(msg.text());});
 try{
  await page.goto(`${base}/?type=football_pitch&view=map`,{waitUntil:'networkidle'});
  const map=page.getByRole('region',{name:'Space locations map'}).filter({visible:true});
  await map.locator('.maplibregl-canvas').waitFor();
  await page.waitForFunction(()=>[...document.querySelectorAll('[data-map-status]')].some((el)=>el.dataset.mapStatus==='ready'&&el.getBoundingClientRect().height>0),null,{timeout:40000});
  check('Phone map renders real Ghana vector tiles',responses.some((r)=>r.url.includes('.pmtiles')&&r.status===206));
  check('Map loads the shipped MapLibre worker',responses.some((r)=>r.url.includes('/maplibre/maplibre-gl-worker.mjs')&&r.status===200));
  check('Map glyphs and sprites load successfully',responses.some((r)=>r.url.includes('/fonts/')&&r.status===200)&&responses.some((r)=>r.url.includes('/sprites/')&&r.status===200));
  const canvas=await map.locator('canvas').boundingBox();check('Phone map has a usable canvas',canvas&&canvas.width>=300&&canvas.height>=300);
  const marker=map.locator('button[data-cell]').first();await marker.click();
  await map.getByText('Shown as an area.',{exact:false}).waitFor();
  check('Map marker opens matching listing links',await map.locator(`a[href='/s/${slug}']`).isVisible());
  check('Phone map has OpenStreetMap attribution',await map.locator('a[href="https://www.openstreetmap.org/copyright"]').count()>0);
  check('Phone map fits the screen',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await mkdir('artifacts/qa',{recursive:true});await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:'artifacts/qa/real-ghana-map-phone.png',fullPage:true});
  await page.setViewportSize({width:1440,height:1000});
  await page.goto(`${base}/?type=football_pitch&view=map`,{waitUntil:'networkidle'});
  await page.waitForFunction(()=>[...document.querySelectorAll('[data-map-status]')].some((el)=>el.dataset.mapStatus==='ready'&&el.getBoundingClientRect().height>0),null,{timeout:40000});
  check('Desktop map loads alongside search results',await page.locator('.maplibregl-canvas').count()>0);
  await page.screenshot({path:'artifacts/qa/real-ghana-map-desktop.png',fullPage:true});
  await page.goto(`${base}/s/${slug}`,{waitUntil:'networkidle'});
  await page.waitForFunction(()=>document.querySelector('[data-map-status]')?.dataset.mapStatus==='ready',null,{timeout:40000});
  check('Public listing map loads its approximate Ghana location',await page.locator('button[data-cell]').getByText('Around here',{exact:true}).count()===1);
  check('Working maps have no runtime or resource errors',errors.length===0);
  // Simulate an unavailable object/CDN, then restore it and retry in place.
  await page.route('**/*.pmtiles',route=>route.abort());
  await page.goto(`${base}/s/${slug}`,{waitUntil:'networkidle'});
  await page.getByRole('button',{name:'Retry map',exact:true}).waitFor({timeout:40000});
  check('Failed map displays a usable fallback and retry',true);
  await page.unroute('**/*.pmtiles');
  await page.getByRole('button',{name:'Retry map',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('[data-map-status]')?.dataset.mapStatus==='ready',null,{timeout:40000});
  check('Map retry recovers after the tile source returns',true);
 }finally{await context.close();}
}
if(import.meta.url===pathToFileURL(process.argv[1]).href){
 const base=process.env.E2E_BASE_URL??'http://localhost:3200';
 const tileUrl=process.env.SPACE_MAP_TILES_URL;
 assert.ok(tileUrl,'Set SPACE_MAP_TILES_URL to the same archive used by the site');
 const archive=new PMTiles(tileUrl),header=await archive.getHeader(),metadata=await archive.getMetadata();
 assert.equal(header.tileType,1,'Basemap must contain MVT vector tiles');
 assert.ok(header.minLon<=-3.2&&header.maxLon>=1.2&&header.minLat<=4.8&&header.maxLat>=11.2,'Archive must cover Ghana');
 assert.ok(metadata.vector_layers?.some((x)=>x.id==='roads'),'Archive must have Protomaps roads');
 for(const [lon,lat] of [[-0.187,5.6037],[-1.6244,6.6885],[-0.8393,9.4075]]){
  const z=12,n=2**z,x=Math.floor((lon+180)/360*n),r=lat*Math.PI/180,y=Math.floor((1-Math.asinh(Math.tan(r))/Math.PI)/2*n);
  assert.ok((await archive.getZxy(z,x,y))?.data.byteLength>0,'Ghana tiles must exist at Accra, Kumasi and Tamale');
 }
 const slug=process.env.MAP_LISTING_SLUG;assert.ok(slug,'Set MAP_LISTING_SLUG to a published football_pitch listing');
 const checks=[];const check=(name,valid)=>{assert.ok(valid,name);checks.push(name);console.log('PASS '+name);};
 const binary=process.env.BROWSER_EXECUTABLE_PATH;
 const browser=await chromium.launch({headless:true,...(binary?{executablePath:binary}:{}),args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{await runMapChecks(browser,base,slug,check);await writeFile('artifacts/qa/map-results.json',JSON.stringify({checks,archive:{maxZoom:header.maxZoom,coverage:'Ghana',sourceVersion:metadata.version},liveDeployment:!['localhost','127.0.0.1'].includes(new URL(base).hostname)},null,2));}finally{await browser.close();}
}
