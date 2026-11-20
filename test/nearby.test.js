const {test}=require('node:test');
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const payload={towns:require('../data/towns.json'),options:require('../data/local-options.json')};
class Element {
 constructor(){this.children=[];this.handlers={};this.value='';this.disabled=false;this.hidden=false;this.textContent='';}
 append(...items){this.children.push(...items);}
 replaceChildren(...items){this.children=[...items];}
 addEventListener(name,handler){this.handlers[name]=handler;}
 setAttribute(name,value){this[name]=value;}
}
function open(fetch){
 const ids=['form','town','radius','search','status','results','retry'];
 const nodes=Object.fromEntries(ids.map(id=>['#nearby-'+id,new Element()]));
 nodes['#nearby-radius'].value='5';
 const context=vm.createContext({document:{querySelector:id=>nodes[id],createElement:()=>new Element(),addEventListener(){}},fetch,AbortController,setTimeout,clearTimeout,Intl,URLSearchParams,URL,Event});
 vm.runInContext(fs.readFileSync('public/places.js','utf8'),context);
 vm.runInContext(fs.readFileSync('public/directions.js','utf8'),context);
 vm.runInContext(fs.readFileSync('public/nearby.js','utf8'),context);
 return Object.fromEntries(ids.map(id=>[id,nodes['#nearby-'+id]]));
}
const flush=()=>new Promise(resolve=>setImmediate(resolve));

test('nearby dropdown loads all 43 supported towns and every town can find its local ideas',async()=>{
 const html=fs.readFileSync('public/index.html','utf8');
 assert.match(html,/src="\/nearby.js"/);assert.match(html,/id="nearby-retry"/);
 const ui=open(async url=>{assert.equal(url,'/api/options');return {ok:true,json:async()=>payload};});
 assert.equal(ui.town.disabled,true);await flush();
 const names=ui.town.children.slice(1).map(o=>o.value);
 assert.equal(names.length,43);assert.equal(new Set(names).size,43);
 assert.deepEqual(names,Object.keys(payload.towns.towns).sort((a,b)=>a.localeCompare(b)));
 assert.equal(ui.town.disabled,false);assert.equal(ui.search.disabled,false);
 for(const name of names){
  ui.town.value=name;ui.form.handlers.submit({preventDefault(){}});
  assert.equal(ui.results.hidden,false,name);
  assert.ok(ui.results.children.length>0,name);
  assert.ok(ui.results.children.some(item=>item.children[2].textContent.startsWith('Same town')),name);
  const link=ui.results.children[0].children[3];
  assert.equal(new URL(link.href).searchParams.has('origin'),false);
 }
});

test('failed loading disables the empty dropdown and retry restores the complete list',async()=>{
 let attempts=0;
 const ui=open(async()=>{if(++attempts===1)throw Error('Offline');return {ok:true,json:async()=>payload};});
 await flush();assert.equal(ui.town.disabled,true);assert.equal(ui.retry.hidden,false);assert.match(ui.status.textContent,/Retry/);
 await ui.retry.handlers.click();
 assert.equal(ui.town.children.length,44);assert.equal(ui.town.disabled,false);assert.equal(ui.retry.hidden,true);
 assert.equal(attempts,2);
});

test('missing coordinate data produces a readable recovery state instead of an empty working-looking menu',async()=>{
 const ui=open(async()=>({ok:true,json:async()=>({options:payload.options})}));
 await flush();assert.equal(ui.search.disabled,true);assert.equal(ui.town.disabled,true);assert.equal(ui.retry.hidden,false);assert.match(ui.status.textContent,/Could not load towns/);
});
