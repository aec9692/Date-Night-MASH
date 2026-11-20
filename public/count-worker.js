importScripts('/date-costs.js','/date-combinations.js','/date-fit.js','/journey.js','/planner.js');
let catalog=[];
self.onmessage=event=>{
 const data=event.data;
 if(data.type==='setup'){catalog=data.options;MashJourney.setTowns(data.towns);return;}
 if(data.type==='count'){
  const result=MashPlanner.prepare(data.preferences,catalog,false);
  self.postMessage({id:data.id,result:{combinationCount:result.combinationCount,error:result.error}});
 }
};
