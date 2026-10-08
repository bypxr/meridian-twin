// ---------- risk model tab ----------
function upcoming(){
  const out=[];
  sched.legs.forEach(l=>{const r=legState(l);if(r.status!=='flown')return;if(l.dep>=S.t&&l.dep<S.t+180)out.push({l,p:S.risk[l.id]||0})});
  out.sort((a,b)=>b.p-a.p);return out.slice(0,7);
}
function riskList(){
  const u=upcoming();
  if(!u.length)return '<p class="note">No departures in the next three hours.</p>';
  return u.map(x=>'<div class="act" data-fl="'+x.l.id+'" style="cursor:pointer"><span class="k" style="background:'+riskColor(x.p)+'22;color:'+riskColor(x.p)+'">'+pct(x.p,0)+'</span><span><b class="num">'+x.l.flight+'</b> '+x.l.from+' to '+x.l.to+' at '+Sim.hhmm(x.l.dep)+'</span></div>').join('');
}
function calChart(){
  const w=210,h=170,pad={l:30,r:8,t:8,b:24},mx=0.8;
  const X=v=>pad.l+v/mx*(w-pad.l-pad.r),Y=v=>h-pad.b-v/mx*(h-pad.t-pad.b);
  let s='<svg viewBox="0 0 '+w+' '+h+'" width="100%" role="img" aria-label="Predicted against actual late share in ten groups"><line x1="'+X(0)+'" y1="'+Y(0)+'" x2="'+X(mx)+'" y2="'+Y(mx)+'" stroke="#5b7399" stroke-dasharray="3 3"/>';
  [0,0.2,0.4,0.6,0.8].forEach(v=>{s+='<text x="'+X(v)+'" y="'+(h-10)+'" text-anchor="middle">'+(v*100)+'%</text><text x="'+(pad.l-4)+'" y="'+(Y(v)+3)+'" text-anchor="end">'+(v*100)+'%</text>'});
  M.cal.forEach(c=>{s+='<circle cx="'+X(c[0])+'" cy="'+Y(c[1])+'" r="4" fill="#4cc9f0"/>'});
  return s+'<text x="'+(w/2+10)+'" y="'+(h-1)+'" text-anchor="middle">predicted</text></svg>';
}
function hourChart(){
  const w=210,h=170,pad={l:30,r:8,t:8,b:24},H=M.byHour,mx=0.5,n=H.hour.length;
  const X=i=>pad.l+(i+.5)/n*(w-pad.l-pad.r),Y=v=>h-pad.b-v/mx*(h-pad.t-pad.b),bw=(w-pad.l-pad.r)/n-2;
  let s='<svg viewBox="0 0 '+w+' '+h+'" width="100%" role="img" aria-label="Late share by hour of day, actual bars and predicted line">';
  [0,0.2,0.4].forEach(v=>{s+='<text x="'+(pad.l-4)+'" y="'+(Y(v)+3)+'" text-anchor="end">'+(v*100)+'%</text>'});
  H.act.forEach((a,i)=>{s+='<rect x="'+(X(i)-bw/2)+'" y="'+Y(a)+'" width="'+bw+'" height="'+(h-pad.b-Y(a))+'" rx="1" fill="#2c4266"/>'});
  s+='<path d="'+H.pred.map((p,i)=>(i?'L':'M')+X(i)+','+Y(p)).join(' ')+'" stroke="#4cc9f0" stroke-width="2" fill="none"/>';
  [0,6,12,17].forEach(i=>{s+='<text x="'+X(i)+'" y="'+(h-10)+'" text-anchor="middle">'+H.hour[i]+'h</text>'});
  return s+'<text x="'+(w/2+10)+'" y="'+(h-1)+'" text-anchor="middle">departure hour</text></svg>';
}
function vRisk(){
  const R=M.results,m=M.meta,ci=M.aucCI95;
  const tr=(k,name,ship)=>'<tr'+(ship?' class="sel"':'')+' style="cursor:default"><td>'+name+'</td><td>'+R[k].auc.toFixed(3)+'</td><td>'+pct(R[k].top10,0)+'</td><td>'+R[k].lift.toFixed(1)+'x</td></tr>';
  $('body').innerHTML='<h2>Delay risk model <span class="badge g">real DOT data, tested July 2026</span></h2><p class="hint">Trained on '+(m.train/1e6).toFixed(1)+' million real US flights (DOT on time data, July 2025 to May 2026), tuned on June 2026, then tested on '+num(m.test)+' July 2026 flights it had never seen. It predicts, two hours before departure, an arrival 15 or more minutes late.</p>'+
  '<div class="tw"><table><thead><tr><th style="cursor:default">Tested on July 2026</th><th style="cursor:default">AUC</th><th style="cursor:default">Top tenth late</th><th style="cursor:default">Lift</th></tr></thead><tbody>'+
  tr('baseline','History by airport and hour')+tr('logit_schedule','Logistic, schedule only')+tr('logit_cong','Plus airport congestion')+tr('logit_aircraft','Plus same aircraft’s last leg (runs in this page)',1)+tr('gbm','Gradient boosting, same inputs')+tr('gbm26_weather','Gradient boosting plus weather')+'</tbody></table></div>'+
  '<p class="note" style="margin-top:6px">'+pct(m.testBase,0)+' of July flights ran late. Among the tenth the highlighted model flagged as riskiest, '+pct(R.logit_aircraft.top10,0)+' did, and flagging the riskiest fifth catches '+pct(R.logit_aircraft.caught20,0)+' of all late flights. AUC 0.5 is a coin flip; the 95% range from resampling days is '+ci.logit_aircraft[0].toFixed(3)+' to '+ci.logit_aircraft[1].toFixed(3)+'. The aircraft’s previous leg is the biggest single lift (+0.07 AUC). Weather adds only about 0.008 on top of boosting, so delays here are mostly knock on, not weather alone. The highlighted model scores every flight on the globe: slightly less accurate than boosting, but it is about 130 numbers anyone can audit.</p>'+
  '<div class="grid2" style="margin-top:10px"><div><label style="font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--mute)">Predicted against actual, by tenth</label>'+calChart()+'</div><div><label style="font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--mute)">Delays build all day</label>'+hourChart()+'</div></div>'+
  '<p class="note">Drift, shown honestly. July ran later than the months it trained on, so the raw model under predicted every tenth by 1 to 3 points. This page applies a one number base rate correction. That is the reason a live version retrains monthly.</p>'+
  '<h2 class="gap">Riskiest departures, next 3 hours</h2><p class="hint" style="margin-bottom:6px">Scored live on Meridian’s schedule. Risk climbs when earlier flights at the origin or destination ran late, or when the same aircraft arrives late, which is how a storm spreads.</p><div id="riskList">'+riskList()+'</div>'+
  '<div class="grid2" style="margin-top:10px">'+st('Expected late today',num(S.expLate)+' of '+sched.legs.length)+st('Routine delay cost',money(S.expCost),num(M.meanLateMin)+' min avg × $'+A4A+'/min')+'</div>'+
  '<p class="note">Limits, stated plainly. Flights are real, the airline is simulated, so the model is scored on Meridian’s schedule but proven on all US flights. Weather covers about half of 2026 flights. Crew rules and aircraft swaps here are simplified. A production model retrains on the client’s own data and gets a controlled trial before anyone acts on it.</p>';
  if(S.mode!=='risk'){S.mode='risk';renderModes()}
}

// ---------- value tab ----------
function probeStorm(cfg){const R=Sim.planStorm(sched,cfg,Math.max(T0,cfg.start-120));R.plans.forEach(decorate);if(S.storm)Sim.lock(sched,S.storm.now);return R}
let valueJob=0;
function runValue(){
  const job=++valueJob,N=36,rows=[];let seed=20261008;
  const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
  const sc=[];for(let i=0;i<N;i++){const s=8+Math.floor(rnd()*10),d=1+Math.floor(rnd()*rnd()*5.99);sc.push({hub:['ORD','ATL','DFW'][Math.floor(rnd()*3)],start:s*60,end:(s+d)*60,sev:Math.round((0.4+rnd()*0.6)*20)/20})}
  S.value={busy:true,done:0,N,rows};
  let i=0;
  (function step(){
    if(job!==valueJob)return;
    const R=probeStorm(sc[i]),hold=R.plans[0];let best=hold;R.plans.forEach(p=>{if(p.pnl>best.pnl)best=p});
    const px=R.plans.find(p=>p.id==='pax');
    rows.push({cfg:sc[i],hold:hold.stormCost,best:best.stormCost,bestId:best.id,holdStr:hold.stranded,bestStr:best.stranded,pax:px.stormCost,holdHrs:hold.paxDelayHours,bestHrs:best.paxDelayHours});
    i++;S.value.done=i;
    if(i<N){const pb=$('vprog');if(pb)pb.style.width=(i/N*100)+'%';setTimeout(step,10)}
    else{S.value.busy=false;if(S.tab==='value')renderBody()}
  })();
  if(S.tab==='value')renderBody();
}
const VA={days:30,cap:0.4,scale:1};
function valueOut(){
  const r=S.value.rows,mean=a=>a.reduce((x,y)=>x+y,0)/a.length;
  const sv=r.map(x=>x.hold-x.best),ms=mean(sv),ann=VA.days*ms*VA.cap*VA.scale;
  return '<div class="stat" style="border:1px solid rgba(61,220,151,.4)"><label>Estimated annual value</label><b class="pos" style="font-size:24px">'+money(ann)+'</b><small>'+VA.days+' storm days × '+money(ms)+' average saving × '+pct(VA.cap,0)+' captured × '+VA.scale.toFixed(1)+' fleet scale ('+num(61*VA.scale)+' aircraft)</small></div>';
}
function valueScatter(){
  const r=S.value.rows,w=440,h=220,pad={l:50,r:26,t:12,b:30},mx=Math.max.apply(null,r.map(x=>x.hold))*1.08;
  const X=v=>pad.l+v/mx*(w-pad.l-pad.r),Y=v=>h-pad.b-v/mx*(h-pad.t-pad.b);
  let s='<svg viewBox="0 0 '+w+' '+h+'" width="100%" role="img" aria-label="Cost of each simulated storm day: waiting it out against the twin’s plan"><path d="M'+X(0)+','+Y(0)+' L'+X(mx)+','+Y(mx)+' L'+X(mx)+','+Y(0)+' Z" fill="rgba(61,220,151,.06)"/><line x1="'+X(0)+'" y1="'+Y(0)+'" x2="'+X(mx)+'" y2="'+Y(mx)+'" stroke="#5b7399" stroke-dasharray="3 3"/>';
  for(let i=0;i<=3;i++){const v=mx*i/3;s+='<text x="'+X(v)+'" y="'+(h-14)+'" text-anchor="middle">'+money(v,1)+'</text><text x="'+(pad.l-5)+'" y="'+(Y(v)+3)+'" text-anchor="end">'+money(v,1)+'</text>'}
  s+='<text x="'+(pad.l+(w-pad.l-pad.r)/2)+'" y="'+(h-2)+'" text-anchor="middle">cost if we wait it out</text><text x="'+(pad.l+6)+'" y="'+(pad.t+8)+'">cost with the twin’s plan</text><text x="'+(w-pad.r-4)+'" y="'+(h-pad.b-8)+'" text-anchor="end" style="fill:#3ddc97">below the line = money saved</text>';
  r.forEach(x=>{s+='<circle cx="'+X(x.hold)+'" cy="'+Y(x.best)+'" r="4.5" fill="'+({ORD:'#4cc9f0',ATL:'#ffb454',DFW:'#b69cff'})[x.cfg.hub]+'" opacity=".9"><title>'+x.cfg.hub+' '+Sim.hhmm(x.cfg.start)+' for '+((x.cfg.end-x.cfg.start)/60)+'h, severity '+x.cfg.sev+'</title></circle>'});
  return s+'</svg>';
}
function vValue(){
  let h='<h2>What is this worth</h2><p class="hint">The twin replays a season of storm days at random hubs, hours, lengths and strengths. For each one it compares simply waiting it out with the lowest cost plan it can find.</p>';
  if(!S.value){h+='<button class="primary" id="vRun">Run 36 storm days</button>'}
  else if(S.value.busy){h+='<div class="prog"><i id="vprog" style="width:'+(S.value.done/S.value.N*100)+'%"></i></div><p class="note">Solving storm days…</p>'}
  else{
    const r=S.value.rows,mean=a=>a.reduce((x,y)=>x+y,0)/a.length,mh=mean(r.map(x=>x.hold)),mb=mean(r.map(x=>x.best)),wins=r.filter(x=>x.hold-x.best>1000).length;
    const hrs=mean(r.map(x=>x.holdHrs-x.bestHrs));
    h+='<div class="grid3">'+st('Waiting it out',money(mh),'average storm day')+st('With the twin',money(mb),'average storm day')+st('Saved',money(mh-mb),pct((mh-mb)/mh,0)+' lower')+'</div>'+
    '<div style="margin-top:8px">'+valueScatter()+'</div><p class="note" style="margin-top:2px"><span style="color:#4cc9f0">●</span> ORD <span style="color:#ffb454">●</span> ATL <span style="color:#b69cff">●</span> DFW. The twin found a cheaper plan on '+wins+' of '+r.length+' days and cut passenger delay by '+num(hrs)+' hours on an average day.</p>'+
    '<h2 class="gap">Turn it into an annual number</h2><p class="hint" style="margin-bottom:4px">Your assumptions, not mine. Move them.</p>'+
    slider('Storm days a year across the three hubs','vd',5,80,1,VA.days,v=>v+' days')+slider('Share of the gap a real ops team is not already capturing','vc',0.1,1,0.05,VA.cap,v=>(v*100).toFixed(0)+'%')+slider('Fleet scale against Meridian’s 61 aircraft','vs',1,15,0.5,VA.scale,v=>(+v).toFixed(1)+'x')+
    '<div id="vout">'+valueOut()+'</div>'+
    '<p class="note"><b>Read this honestly.</b> Waiting it out is the weakest possible baseline. Real controllers already cancel and swap by hand, which is what the capture slider is for. Fleet scaling is linear and rough. The right proof is a shadow pilot: run the twin beside the ops floor for a storm season and compare its plan with what was actually done.</p><button class="sm" id="vRun">Run again</button>';
  }
  $('body').innerHTML=h;
  const vr=$('vRun');if(vr)vr.onclick=runValue;
  $('body').querySelectorAll('input[data-k]').forEach(i=>i.oninput=()=>{const k=i.dataset.k,v=+i.value;VA[k==='vd'?'days':k==='vc'?'cap':'scale']=v;i.closest('.field').querySelector('.top b').textContent=k==='vd'?v+' days':k==='vc'?(v*100).toFixed(0)+'%':v.toFixed(1)+'x';$('vout').innerHTML=valueOut()});
}

// ---------- ask tab ----------
function localAnswer(key){
  const r=S.routes,n=S.net;
  if(key==='loss'){const l=r.filter(x=>x.profit<0);return l.length?'Money losing routes at Brent $'+S.P.brent+':\n'+l.map(x=>x.id.padEnd(8)+money(x.profit).padStart(9)+'  breakeven '+(x.breakevenBrent==null?'never':'$'+x.breakevenBrent.toFixed(0))).join('\n'):'None. Every route clears its costs at Brent $'+S.P.brent+'.'}
  if(key==='be')return 'The whole network breaks even at Brent $'+n.breakevenBrent.toFixed(0)+' (jet $'+n.breakevenJet.toFixed(2)+'/gal). Today it sits at $'+S.P.brent+', which leaves '+(n.breakevenBrent>S.P.brent?'$'+(n.breakevenBrent-S.P.brent).toFixed(0)+' of room.':'no room.');
  if(key==='exposed'){const e=r.filter(x=>x.breakevenBrent!=null).sort((a,b)=>a.breakevenBrent-b.breakevenBrent).slice(0,5);return 'Most exposed to oil (lowest breakeven Brent):\n'+e.map(x=>x.id.padEnd(8)+'$'+x.breakevenBrent.toFixed(0)+'  fuel is '+pct(x.fuelShare,0)+' of cost').join('\n')}
  if(key==='spike'){const a=withParams({brent:120},()=>Sim.network(sched));return 'At Brent $120 jet fuel is $'+(120/42+S.P.crack).toFixed(2)+'/gal. Daily profit moves from '+money(n.profit)+' to '+money(a.profit)+' ('+pct(a.margin)+' margin) and the fuel bill rises to '+money(a.fuel)+'.'}
  if(key==='storm'){const R=probeStorm({hub:'ORD',start:720,end:960,sev:1});const b=R.plans.slice().sort((x,y)=>y.pnl-x.pnl)[0];return 'A 4 hour ORD ground stop from noon costs about '+money(R.plans[0].stormCost)+' if we wait it out. The lowest cost plan is "'+b.name+'" at '+money(b.stormCost)+', with '+num(b.cancelledPax)+' passengers cancelled, '+num(b.stranded)+' of them with no seat on a later flight today.'}
}
const CHIPS=[['loss','Which routes lose money?'],['be','What Brent breaks us even?'],['exposed','Which routes are most exposed to oil?'],['spike','What if Brent hits $120?'],['storm','What does an ORD storm cost?']];
const CMDS=['Hit Atlanta with a 3 hour storm at 2pm and show me the cheapest way out','Set Brent to 115 and tell me which hub hurts most','Which hub is most fuel sensitive?'];
function chatHtml(){return S.chat.map(m=>'<div class="ans '+(m.q?'q':m.tool?'tool':'')+'">'+esc(m.t)+'</div>').join('')}
function vAsk(){
  let h='<h2>Ask the twin</h2><p class="hint">Quick answers come straight from the simulator.</p><div class="chips">'+CHIPS.map(c=>'<button class="sm" data-c="'+c[0]+'">'+c[1]+'</button>').join('')+'</div>';
  if(sample&&canTools)h+='<div class="box ai"><h3><span>Run the twin in plain English <span class="badge v">Claude with tools</span></span></h3><p class="hint" style="margin-bottom:6px">Claude can change the oil price, trigger storms and put plans on the globe. It cannot approve a plan. Figures come from tool results, never from Claude.</p><div class="chips">'+CMDS.map((c,i)=>'<button class="sm" data-cmd="'+i+'">'+c+'</button>').join('')+'</div><div style="display:flex;gap:6px"><input type="text" id="q" placeholder="Tell the twin what to do or ask a question" aria-label="Command"><button id="askBtn" class="primary" '+(S.busy?'disabled':'')+'>'+(S.busy?'Working':'Go')+'</button></div></div>';
  else if(sample)h+='<div class="box ai"><h3>Ask Claude</h3><div style="display:flex;gap:6px"><input type="text" id="q" placeholder="Ask about today’s network" aria-label="Question"><button id="askBtn" class="primary" '+(S.busy?'disabled':'')+'>'+(S.busy?'Working':'Ask')+'</button></div></div>';
  else if(sampleChecked)h+='<p class="note">Free text commands need Claude, which is not available in this view. The quick questions work everywhere.</p>';
  h+='<div id="chat">'+chatHtml()+'</div>';
  $('body').innerHTML=h;
  $('body').querySelectorAll('[data-c]').forEach(b=>b.onclick=()=>{S.chat.push({q:1,t:b.textContent},{t:localAnswer(b.dataset.c)});vAsk();const bd=$('body');bd.scrollTop=bd.scrollHeight});
  $('body').querySelectorAll('[data-cmd]').forEach(b=>b.onclick=()=>{$('q').value=CMDS[+b.dataset.cmd];askClaude()});
  const ab=$('askBtn');if(ab){ab.onclick=askClaude;$('q').onkeydown=e=>{if(e.key==='Enter')askClaude()}}
}
function logTool(t){S.chat.push({tool:1,t:'→ '+t});const c=$('chat');if(c&&S.tab==='ask'){c.innerHTML=chatHtml();const bd=$('body');bd.scrollTop=bd.scrollHeight}}
function planSummary(p){return {plan:p.id,name:p.name,stormCost:Math.round(p.stormCost),dayPnl:Math.round(p.pnl),passengersCancelled:p.cancelledPax,strandedOvernight:p.stranded,passengerDelayHours:Math.round(p.paxDelayHours),flightsOver60mLate:p.delayed60}}
function netSummary(){const n=S.net;return {brent:S.P.brent,crackSpread:S.P.crack,demand:S.P.demand,jetPerGal:+sched.P.jet.toFixed(2),revenue:Math.round(n.rev),fuel:Math.round(n.fuel),profit:Math.round(n.profit),margin:+n.margin.toFixed(4),loadFactor:+n.lf.toFixed(3),breakevenBrent:Math.round(n.breakevenBrent),routesLosingMoney:S.routes.filter(x=>x.profit<0).length}}
function hubSummary(){return ['ATL','ORD','DFW'].map(h=>{const r=S.routes.filter(x=>x.hub===h);let rev=0,pr=0,gal=0;sched.legs.forEach(l=>{if(sched.routeById[l.routeId].hub===h){rev+=l.e.rev;pr+=l.e.profit;gal+=l.e.gal}});return {hub:h,routes:r.length,revenue:Math.round(rev),profit:Math.round(pr),margin:+(pr/rev).toFixed(4),profitLostPer10DollarBrent:Math.round(gal*10/42),breakevenBrent:Math.round(((rev-(rev-pr-gal*sched.P.jet))/gal-S.P.crack)*42)}})}
function refreshAll(){renderKpis();renderBoard();showCard();renderModes()}
async function askClaude(){
  const q=($('q').value||'').trim();if(!q||S.busy||!sample)return;
  S.chat.push({q:1,t:q});S.busy=true;vAsk();
  const tools=[
   {name:'get_network',description:'Read network totals at the current assumptions, plus a per hub breakdown with fuel sensitivity. Returns revenue, fuel, profit, margin, breakeven Brent and hubs[].',execute:()=>{logTool('read the network');return {network:netSummary(),hubs:hubSummary()}}},
   {name:'get_routes',description:'List routes with daily profit, margin, miles and breakeven Brent. sort is profit, margin or breakevenBrent. Optional hub filter (ATL, ORD, DFW).',inputSchema:{type:'object',properties:{sort:{type:'string'},ascending:{type:'boolean'},limit:{type:'number'},hub:{type:'string'}}},execute:i=>{logTool('read routes'+(i.hub?' at '+i.hub:''));let r=S.routes.slice();if(i.hub)r=r.filter(x=>x.hub===String(i.hub).toUpperCase());const k=['profit','margin','breakevenBrent'].includes(i.sort)?i.sort:'profit';r.sort((a,b)=>(a[k]==null?1e9:a[k])-(b[k]==null?1e9:b[k]));if(!i.ascending)r.reverse();return r.slice(0,Math.min(15,Number(i.limit)||8)).map(x=>({route:x.id,miles:x.dist,profit:Math.round(x.profit),margin:+x.margin.toFixed(3),breakevenBrent:x.breakevenBrent==null?null:Math.round(x.breakevenBrent)}))}},
   {name:'set_assumptions',description:'CHANGES THE PAGE. Set Brent crude ($ per barrel, 40 to 160), crack spread ($ per gallon, 0.3 to 2.0) and or demand multiplier (0.8 to 1.15). Returns the new network totals and hub breakdown.',inputSchema:{type:'object',properties:{brent:{type:'number'},crack:{type:'number'},demand:{type:'number'}}},execute:i=>{if(typeof i.brent==='number')S.P.brent=Math.round(Math.max(40,Math.min(160,i.brent)));if(typeof i.crack==='number')S.P.crack=Math.max(0.3,Math.min(2,i.crack));if(typeof i.demand==='number')S.P.demand=Math.max(0.8,Math.min(1.15,i.demand));recompute();S.mode='profit';refreshAll();logTool('set Brent $'+S.P.brent+', crack $'+S.P.crack.toFixed(2)+', demand '+(S.P.demand*100).toFixed(0)+'%');return {network:netSummary(),hubs:hubSummary()}}},
   {name:'run_storm',description:'CHANGES THE PAGE. Trigger a ground stop on the globe and compare recovery plans. hub is ORD, ATL or DFW. startHour 8 to 18 in Central time (2pm is 14). hours 1 to 6. severity 0.3 to 1. Returns each plan with cost and passenger impact.',inputSchema:{type:'object',properties:{hub:{type:'string'},startHour:{type:'number'},hours:{type:'number'},severity:{type:'number'}},required:['hub']},execute:i=>{const hub=['ORD','ATL','DFW'].includes(String(i.hub).toUpperCase())?String(i.hub).toUpperCase():'ORD',s=Math.max(8,Math.min(18,Math.round(Number(i.startHour)||12))),d=Math.max(1,Math.min(6,Math.round(Number(i.hours)||4))),sv=Math.max(.3,Math.min(1,Number(i.severity)||1));runStorm({hub,start:s*60,end:(s+d)*60,sev:sv});S.preview='hold';S.approved=null;S.t=S.storm.now;S.boardHub=hub;S.stormHub=hub;S.mode='status';flyTo(AP[hub].lon+4,AP[hub].lat-3,2.2);computeRisk();refreshAll();logTool('ran a '+d+' hour ground stop at '+hub+' from '+Sim.hhmm(s*60));return {normalDayProfit:Math.round(S.storm.result.base.pnl),plans:S.storm.result.plans.map(planSummary)}}},
   {name:'show_plan',description:'CHANGES THE PAGE. Put one recovery plan on the globe and timeline for the user to review. plan is hold, profit, pax or reset. Does not approve it: only the user can approve.',inputSchema:{type:'object',properties:{plan:{type:'string'}},required:['plan']},execute:i=>{if(!S.storm)throw new Error('No storm is active. Call run_storm first.');const p=planById(String(i.plan));if(!p)throw new Error('Unknown plan id');S.preview=p.id;computeRisk();refreshAll();logTool('put "'+p.name+'" on the globe');return planSummary(p)}}
  ];
  try{
    const r=await sample('You operate Meridian Twin, a digital twin of a simulated airline with hubs at ATL, ORD and DFW. Use the tools to do what the user asks and to get every figure. Never do arithmetic or invent a number: quote tool results. You may propose a plan and show it, but you cannot approve one, so end by telling the user to approve it themselves if a decision is needed. Answer in under 110 words, plain language, no dashes or hyphens.'+(canTools?'':'\n\nYou have no tools in this view. Current data: '+JSON.stringify({network:netSummary(),hubs:hubSummary()}))+'\n\nUser: '+q,canTools?{tools,modelTier:'default',cache:false}:{cache:false});
    S.chat.push({t:r.text||'Done.'});
  }catch(e){S.chat.push({t:aiErr(e)})}
  S.busy=false;if(S.tab==='ask'){vAsk();const bd=$('body');bd.scrollTop=bd.scrollHeight}
}
