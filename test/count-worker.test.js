const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const planner=require('../public/planner'),journey=require('../public/journey'),towns=require('../data/towns.json'),options=require('../data/local-options.json');
journey.setTowns(towns);
test('background counts match server planning and retain request IDs so the UI can ignore stale replies',()=>{
 const replies=[],self={postMessage(value){replies.push(value);}};
 const context=vm.createContext({self,URL});
 context.importScripts=(...paths)=>paths.forEach(path=>vm.runInContext(fs.readFileSync('public'+path,'utf8'),context));
 vm.runInContext(fs.readFileSync('public/count-worker.js','utf8'),context);
 self.onmessage({data:{type:'setup',options,towns}});
 for(const [i,preferences]of [
  {budget:50,area:'paterson',journey:{format:'quick'}},
  {budget:150,area:'paterson',journey:{format:'evening',start:'17:00'}},
  {budget:100,area:'paterson',journey:{format:'full',start:'11:00'}}
 ].entries()){
  self.onmessage({data:{type:'count',id:i+1,preferences}});
  const expected=planner.prepare(preferences,options,false);
  assert.equal(replies[i].id,i+1);assert.equal(replies[i].result.combinationCount,expected.combinationCount);assert.equal(replies[i].result.error,expected.error);
 }
});
