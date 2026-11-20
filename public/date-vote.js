/* Portable two-person ballots. Storage/tally is local; links are not authenticated live polls. */
(function(root){
 const invite=typeof module==='object'&&module.exports?require('./date-invite'):root.DateInvite;
 const object=v=>v&&typeof v==='object'&&!Array.isArray(v),choice=v=>v===null||Number.isInteger(v)&&v>=0&&v<3;
 function validate(v){
  if(!object(v)||Object.keys(v).some(k=>!['v','id','plans','host','guest','reply'].includes(k))||v.v!==1||typeof v.id!=='string'||!/^[a-f0-9]{32}$/.test(v.id)||!Array.isArray(v.plans)||v.plans.length!==3||new Set(v.plans).size!==3||!choice(v.host)||!choice(v.guest)||typeof v.reply!=='boolean'||v.reply&&v.guest===null)throw Error('This three-plan vote is incomplete or invalid.');
  const plans=v.plans.map(invite.decode),basis=p=>JSON.stringify([p.budgetCents,p.reserve||{},p.date]);
  if(plans.some(p=>basis(p)!==basis(plans[0])))throw Error('All vote options must keep the same budget, reserve and date.');
  return v;
 }
 function encode(v){validate(v);const bytes=new TextEncoder().encode(JSON.stringify(v));if(bytes.length>18000)throw Error('These plans are too large for a voting link. Remove long personal ideas and try again.');const base=typeof Buffer!=='undefined'?Buffer.from(bytes).toString('base64'):btoa(Array.from(bytes,b=>String.fromCharCode(b)).join(''));return base.replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
 function decode(token){
  if(typeof token!=='string'||!token||token.length>24000||!/^[A-Za-z0-9_-]+$/.test(token)||token.length%4===1)throw Error('This vote link is incomplete or too large.');
  try{const base=token.replace(/-/g,'+').replace(/_/g,'/'),bytes=typeof Buffer!=='undefined'?Buffer.from(base,'base64'):Uint8Array.from(atob(base),c=>c.charCodeAt(0));const v=validate(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes)));if(encode(v)!==token)throw Error();return v;}catch(error){throw Error(error.message||'This vote link cannot be read.');}
 }
 function identity(plan){return plan.picks.map(p=>p.category+':'+(p.venue?.id||p.place?.sourceUrl||p.id)).join('|');}
 function accept(local,reply){validate(local);validate(reply);if(!reply.reply||local.id!==reply.id||JSON.stringify(local.plans)!==JSON.stringify(reply.plans))throw Error('This reply belongs to a different set of plans. Open it on the device that created the vote.');return {...local,guest:reply.guest,reply:false};}
 function result(v){validate(v);if(v.host===null||v.guest===null)return 'Waiting for both choices.';return v.host===v.guest?`You both chose Plan ${v.host+1}!`:`A tie: you chose Plan ${v.host+1}, your partner chose Plan ${v.guest+1}. Pick a plan together or change your vote.`;}
 const api={validate,encode,decode,identity,accept,result};if(typeof module==='object'&&module.exports)module.exports=api;else root.DateVote=api;
})(typeof globalThis==='object'?globalThis:this);
