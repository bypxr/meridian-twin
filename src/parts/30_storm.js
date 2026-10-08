// ---------- storm tab ----------
const SAMPLE_ADVZY='ATCSCC ADVZY 041 ORD 10/08/2026 CDM GROUND STOP\nCTL ELEMENT: ORD\nELEMENT TYPE: APT\nADL TIME: 1512Z\nGROUND STOP PERIOD: 08/1700Z - 08/2100Z\nDEP FACILITIES INCLUDED: ALL CONTIGUOUS US\nPROBABILITY OF EXTENSION: HIGH (60 PERCENT)\nIMPACTING CONDITION: WEATHER / THUNDERSTORMS\nCOMMENTS: SOLID LINE OF TS MOVING THROUGH TERMINAL AREA. ARRIVAL RATE ZERO DURING PASSAGE.';
function aiErr(e){const c=e&&e.code;return c==='not_granted'?'Claude was not allowed for this page, so the AI features are off for this visit.':c==='rate_limited'?'Claude is busy or your usage limit was reached. Try again in a bit.':c==='cancelled'?'Stopped.':c==='refused'?'Claude declined that input.':c==='session_expired'?'Please sign in again to use Claude here.':'Claude could not finish that ('+(c||'error')+'). The simulator numbers are unaffected.'}
function aiBtn(id,label,busy,extra){
  if(sampleChecked&&!sample)return '<span class="note" style="margin:0">Claude is not available in this view. Open the page signed in to Claude to use this.</span>';
  return '<button class="ai '+(extra||'')+'" id="'+id+'" '+(busy||!sampleChecked?'disabled':'')+'>'+(busy?'Claude is working…':label)+'</button>';
}
function stormCfg(){const c=S.storm?S.storm.cfg:(S.formCfg||{hub:S.stormHub||'ORD',start:720,end:960,sev:1});if(!S.storm&&S.stormHub)c.hub=S.stormHub;return c}
function planCard(p,R){
  const act=(S.preview||S.approved)===p.id,ok=S.approved===p.id,best=bestId();
  return '<div class="plan '+(ok?'ok':(act?'on':''))+'"><h3><span><i style="background:'+PCOL[p.id]+'"></i>'+p.name+'</span>'+(ok?'<span class="badge g">approved</span>':(p.id===best?'<span class="badge">lowest cost</span>':''))+'</h3><p>'+p.note+'</p><div class="mx">'+
  '<div><label>Storm cost</label><b class="neg">'+money(p.stormCost)+'</b></div><div><label>Pax cancelled</label><b>'+num(p.cancelledPax)+'</b></div><div><label>No seat today</label><b>'+num(p.stranded)+'</b></div><div><label>Pax delay hrs</label><b>'+num(p.paxDelayHours)+'</b></div></div>'+
  '<div style="display:flex;gap:6px;margin-top:8px"><button class="sm" data-pv="'+p.id+'">'+(S.preview===p.id?'Showing on globe':'Show on globe')+'</button><button class="sm primary" data-ap="'+p.id+'">Approve</button></div></div>';
}
function bestId(){let b=null;allPlans().forEach(p=>{if(p.id!=='custom'&&(!b||p.pnl>b.pnl))b=p});return b?b.id:null}
function frontierChart(){
  if(!S.storm)return '';
  const w=440,h=220,pad={l:50,r:14,t:14,b:30},plans=allPlans(),pts=(S.frontier?S.frontier.pts:[]);
  const xs=plans.map(p=>p.cancelledPax).concat(pts.map(p=>p.x)),ys=plans.map(p=>p.stormCost).concat(pts.map(p=>p.y));
  const xm=Math.max(500,Math.max.apply(null,xs)*1.12),y0=Math.min.apply(null,ys)*0.9,y1=Math.max.apply(null,ys)*1.06;
  const X=v=>pad.l+v/xm*(w-pad.l-pad.r),Y=v=>pad.t+(y1-v)/(y1-y0)*(h-pad.t-pad.b);
  let s='<svg viewBox="0 0 '+w+' '+h+'" width="100%" role="img" aria-label="Storm cost against passengers cancelled for each recovery plan">';
  for(let i=0;i<=3;i++){const v=y0+(y1-y0)*i/3;s+='<line x1="'+pad.l+'" x2="'+(w-pad.r)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="#21314d"/><text x="'+(pad.l-5)+'" y="'+(Y(v)+3)+'" text-anchor="end">'+money(v,1)+'</text>'}
  for(let i=0;i<=4;i++){const v=xm*i/4;s+='<text x="'+X(v)+'" y="'+(h-14)+'" text-anchor="middle">'+num(v)+'</text>'}
  s+='<text x="'+(pad.l+(w-pad.l-pad.r)/2)+'" y="'+(h-2)+'" text-anchor="middle">passengers cancelled</text><text x="'+(w-pad.r)+'" y="'+(pad.t+2)+'" text-anchor="end">storm cost \u2191</text>';
  s+='<text x="'+(pad.l+8)+'" y="'+(h-pad.b-8)+'" style="fill:#3ddc97">↙ better</text>';
  pts.forEach(p=>{s+='<circle cx="'+X(p.x)+'" cy="'+Y(p.y)+'" r="3" fill="#b69cff" opacity=".32"/>'});
  plans.forEach(p=>{const on=(S.preview||S.approved)===p.id,cx=X(p.cancelledPax),cy=Y(p.stormCost);
    s+='<g data-pv="'+p.id+'" style="cursor:pointer"><circle cx="'+cx+'" cy="'+cy+'" r="'+(on?9:7)+'" fill="'+PCOL[p.id]+'" stroke="'+(on?'#fff':'#070d18')+'" stroke-width="2"/><text class="lbl" x="'+(cx>w-120?cx-12:cx+12)+'" y="'+(cy+4)+'" text-anchor="'+(cx>w-120?'end':'start')+'">'+(p.id==='custom'?'Yours':p.name.replace('Protect ','').replace(' the network','').replace(' and recover',''))+'</text></g>'});
  return s+'</svg>';
}
function actionList(p){
  if(!p)return '';
  const rots={};p.cxLegs.forEach(l=>{(rots[l.rotId]=rots[l.rotId]||[]).push(l)});
  const items=[];
  Object.keys(rots).forEach(k=>{const ls=rots[k],l=ls[0],r=p.legRes[l.id],pax=ls.reduce((a,x)=>a+x.e.pax,0),nxl=(p.next[l.id]||[]).map(x=>sched.legById[x]),nx=nxl[0];
    items.push({t:l.dep,h:'<div class="act"><span class="k '+(r.reason==='crew'?'t':'c')+'">'+(r.reason==='crew'?'crew out':'cancel')+'</span><span><b class="num">'+ls.map(x=>x.flight).join(' / ')+'</b> '+l.from+' to '+l.to+(ls.length>1?' and back':'')+', '+pax+' pax'+(nx?'. Rebook on '+nxl.map(x=>x.flight).join(' then ')+(nxl.length>1?' via '+nx.to:'')+' at '+Sim.hhmm(p.legRes[nx.id].dep):'. No seat path today')+'</span></div>'})});
  p.swaps.filter(l=>l.dir==='out').forEach(l=>{const r=p.legRes[l.id];items.push({t:l.dep,h:'<div class="act"><span class="k s">swap</span><span>Spare <b class="num">'+r.acId+'</b> flies <b class="num">'+l.flight+'</b> '+l.from+' to '+l.to+' at '+Sim.hhmm(r.dep)+'</span></div>'})});
  items.sort((a,b)=>a.t-b.t);
  if(!items.length)return '<p class="note">No cancellations or swaps. Every flight waits for the airport to reopen.</p>';
  const show=S.actAll?items:items.slice(0,6);
  return show.map(x=>x.h).join('')+(items.length>6?'<button class="sm ghost" id="actMore" style="margin-top:6px">'+(S.actAll?'Show fewer':'Show all '+items.length+' actions')+'</button>':'');
}
function vStorm(){
  const cfg=stormCfg(),dur=(cfg.end-cfg.start)/60,st0=S.storm;
  let h='<h2>Hub disruption</h2><p class="hint">A ground stop delays flights down every aircraft’s day and times out crews. The twin searches cancel and swap combinations and shows the trade. Nothing changes until a person approves.</p>';
  h+='<div class="box ai"><h3><span>Read an advisory <span class="badge v">Claude</span></span></h3><textarea id="advz" placeholder="Paste an FAA advisory, a TAF, or a plain forecast. Claude turns it into storm settings for you to confirm.">'+esc(S.advz||'')+'</textarea><div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px;align-items:center"><button class="sm" id="advzS">Use a sample FAA advisory</button>'+aiBtn('advzGo','Read it with Claude',S.intakeBusy,'sm')+(canImages?'<label class="sm" style="font-size:12px;color:var(--mute)">or a radar image <input type="file" id="advzImg" accept="image/*" style="max-width:170px;font-size:11px"></label>':'')+'</div>'+(S.intake?'<div class="voice" style="border-color:var(--violet)"><label>Claude read</label>'+esc(S.intake)+'</div>':'')+'</div>';
  h+='<div class="field"><div class="top"><span>Hub</span><select id="hubSel">'+['ORD','ATL','DFW'].map(x=>'<option '+(cfg.hub===x?'selected':'')+'>'+x+'</option>').join('')+'</select></div></div>'+
  slider('Ground stop begins','stS',8,18,1,cfg.start/60,v=>Sim.hhmm(v*60))+slider('Length','stD',1,6,1,dur,v=>v+' hours')+slider('Severity','stV',0.3,1,0.05,cfg.sev,v=>(+v).toFixed(2),['light','severe'])+
  '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="primary" id="runStorm">'+(st0?'Run again':'Run the storm')+'</button>'+(st0?'<button id="clearStorm">Clear</button>':'')+'</div>';
  if(st0){
    const R=st0.result,hold=R.plans[0];
    h+='<h2 class="gap">The trade</h2><p class="hint" style="margin-bottom:4px">A normal day earns '+money(R.base.pnl)+'. Waiting it out costs '+money(hold.stormCost)+'. Each faint dot is a different mix of priorities the twin solved'+(S.frontier&&!S.frontier.done?' (still solving)':'')+'. Click a plan to see it fly.</p><div id="frontier">'+frontierChart()+'</div>'+
    '<div class="box"><h3>Your priorities</h3>'+slider('What matters more','cS',0,1,0.05,S.custom.s,v=>v<0.34?'profit':v>0.66?'passengers':'balanced',['profit','passengers'])+slider('Protect tomorrow’s schedule','cU',0,1,0.05,S.custom.u,v=>v<0.34?'low':v>0.66?'high':'medium',['low','high'])+'</div>'+
    '<div id="plans">'+allPlans().map(p=>planCard(p,R)).join('')+'</div>';
    const ap=activePlan();
    if(ap)h+='<h2 class="gap">What '+(S.approved===ap.id?'the approved plan':'this plan')+' tells the ops floor</h2><div id="acts">'+actionList(ap)+'</div>';
    const a2=S.approved&&planById(S.approved);
    if(a2)h+='<div class="brief" style="border-color:var(--good)"><b>Approved: '+a2.name+'.</b> Against waiting it out: day P&L <b class="num '+cls(a2.pnl-hold.pnl)+'">'+(a2.pnl-hold.pnl>=0?'+':'')+money(a2.pnl-hold.pnl)+'</b>, passengers cancelled <b class="num">'+(a2.cancelledPax-hold.cancelledPax>=0?'+':'')+num(a2.cancelledPax-hold.cancelledPax)+'</b>, passenger delay <b class="num">'+(a2.paxDelayHours-hold.paxDelayHours>=0?'+':'')+num(a2.paxDelayHours-hold.paxDelayHours)+' hrs</b>.</div>';
    h+='<div class="box ai"><h3><span>Ask the council <span class="badge v">Claude × 4</span></span></h3><p class="hint" style="margin-bottom:8px">Three agents argue from finance, customer and network control. A duty manager weighs them and recommends. Every figure is inserted by the simulator.</p>'+aiBtn('councilBtn',S.council?'Convene again':'Convene the council',S.council&&S.council.busy)+councilHtml()+'</div>';
    if(a2&&a2.cxLegs.length)h+='<div class="box ai"><h3><span>Passenger notice <span class="badge v">Claude</span></span></h3><p class="hint" style="margin-bottom:8px">Draft the rebooking message for a cancelled flight under the approved plan.</p><div style="display:flex;gap:6px;flex-wrap:wrap"><select id="nSel">'+a2.cxLegs.slice(0,12).map(l=>'<option value="'+l.id+'">'+l.flight+' '+l.from+' to '+l.to+'</option>').join('')+'</select>'+aiBtn('noticeBtn','Draft the notice',S.notice&&S.notice.busy)+'</div>'+(S.notice&&S.notice.html?'<div class="ans" id="noticeOut">'+S.notice.html+'</div>':'<div class="ans" id="noticeOut" hidden></div>')+'</div>';
  }
  $('body').innerHTML=h;
  const b=$('body'),q=k=>b.querySelector('[data-k='+k+']');
  const rd=()=>({hub:$('hubSel').value,start:+q('stS').value*60,end:(+q('stS').value+ +q('stD').value)*60,sev:+q('stV').value});
  ['stS','stD','stV'].forEach(k=>{q(k).oninput=()=>{const v=+q(k).value;q(k).closest('.field').querySelector('.top b').textContent=k==='stS'?Sim.hhmm(v*60):k==='stD'?v+' hours':v.toFixed(2);S.formCfg=rd()}});
  $('hubSel').onchange=()=>{S.stormHub=$('hubSel').value;S.formCfg=rd()};
  $('advz').oninput=()=>{S.advz=$('advz').value};
  $('advzS').onclick=()=>{S.advz=SAMPLE_ADVZY;$('advz').value=SAMPLE_ADVZY};
  const ag=$('advzGo');if(ag)ag.onclick=readAdvisory;
  $('runStorm').onclick=()=>{const c=rd();S.stormHub=c.hub;S.boardHub=c.hub;runStorm(c);S.preview='hold';S.approved=null;S.mode='status';renderModes();S.t=S.storm.now;const a=AP[c.hub];flyTo(a.lon+4,a.lat-3,2.2);computeRisk();renderBody();renderBoard();showCard()};
  const cs=$('clearStorm');if(cs)cs.onclick=()=>{clearStorm();computeRisk();renderBody();renderBoard();showCard()};
  if(st0){
    ['cS','cU'].forEach(k=>{q(k).oninput=()=>{S.custom[k==='cS'?'s':'u']=+q(k).value;const v=+q(k).value;q(k).closest('.field').querySelector('.top b').textContent=k==='cS'?(v<0.34?'profit':v>0.66?'passengers':'balanced'):(v<0.34?'low':v>0.66?'high':'medium');
      runCustom();S.preview='custom';if(S.approved==='custom')S.approved=null;$('frontier').innerHTML=frontierChart();$('plans').innerHTML=allPlans().map(p=>planCard(p)).join('');const a=$('acts');if(a)a.innerHTML=actionList(activePlan());wirePlans();computeRisk();renderKpis();renderBoard()}});
    wirePlans();
    const cb=$('councilBtn');if(cb)cb.onclick=runCouncil;
    const nb=$('noticeBtn');if(nb)nb.onclick=draftNotice;
  }
}
function wirePlans(){}

// ---------- Claude: numbers only through placeholders ----------
const METRICS={stormCost:p=>money(p.stormCost),dayPnl:p=>money(p.pnl),cancelledPax:p=>num(p.cancelledPax),cancelledFlights:p=>num(p.cancelled),strandedOvernight:p=>num(p.stranded),rebookedSameDay:p=>num(p.rebooked),paxDelayHours:p=>num(p.paxDelayHours),flightsLate60:p=>num(p.delayed60),backToSchedule:p=>Sim.hhmm(p.backBy),flightsMovedToSpares:p=>num(p.spareLegs)};
function planFacts(){
  const o={};allPlans().forEach(p=>{const f={name:p.name};Object.keys(METRICS).forEach(k=>{f[k]=k==='backToSchedule'?Sim.hhmm(p.backBy):Math.round(k==='stormCost'?p.stormCost:k==='dayPnl'?p.pnl:k==='cancelledPax'?p.cancelledPax:k==='cancelledFlights'?p.cancelled:k==='strandedOvernight'?p.stranded:k==='rebookedSameDay'?p.rebooked:k==='paxDelayHours'?p.paxDelayHours:k==='flightsLate60'?p.delayed60:p.spareLegs)});o[p.id]=f});
  return o;
}
// returns safe html. Any digit Claude typed itself is flagged, never trusted.
function fill(txt){
  let bad=0;
  const raw=String(txt==null?'':txt);
  if(/\d/.test(raw.replace(/\{\w+\.\w+\}/g,'')))bad++;
  const html=esc(raw).replace(/\{(\w+)\.(\w+)\}/g,(m,a,b)=>{const p=planById(a),f=METRICS[b];if(!p||!f){bad++;return '<span class="neg">[unknown figure]</span>'}return '<b class="num">'+f(p)+'</b>'});
  return {html,bad};
}
const RULES='HARD RULES. Never type a digit. To cite any figure write a placeholder in curly braces: plan id, a dot, then a metric, for example {profit.stormCost} or {pax.strandedOvernight}. Plan ids: hold, profit, pax, reset, custom. Metrics: stormCost, dayPnl, cancelledPax, cancelledFlights, strandedOvernight, rebookedSameDay, paxDelayHours, flightsLate60, backToSchedule, flightsMovedToSpares. Plain language. No dashes or hyphens.';
const SEATS=[{id:'fin',name:'Finance',goal:'protect today’s profit and cash. You care most about stormCost and dayPnl.'},{id:'cx',name:'Customer',goal:'protect passengers. You care most about cancelledPax, strandedOvernight and paxDelayHours.'},{id:'ops',name:'Network control',goal:'get aircraft and crews back in position so tomorrow starts clean. You care most about backToSchedule, flightsLate60 and crew legality.'}];
function councilHtml(){
  const c=S.council;if(!c)return '';
  let h='',bad=0;
  SEATS.forEach(s=>{const v=c.seats[s.id];if(!v)return;
    if(v.busy){h+='<div class="voice"><b>'+s.name+'</b>thinking…</div>';return}
    if(v.err){h+='<div class="voice"><label>'+s.name+'</label>'+esc(v.err)+'</div>';return}
    const f=fill(v.argument);bad+=f.bad;const pk=planById(v.pick);
    h+='<div class="voice" style="border-color:'+(pk?PCOL[pk.id]:'var(--line)')+'"><b>'+s.name+(pk?' · backs '+pk.name:'')+'</b>'+f.html+'</div>'});
  if(c.chair){
    if(c.chair.busy)h+='<div class="brief">The duty manager is weighing the three cases…</div>';
    else if(c.chair.err)h+='<div class="brief">'+esc(c.chair.err)+'</div>';
    else{const hd=fill(c.chair.headline),pk=planById(c.chair.pick);bad+=hd.bad;
      const li=(c.chair.bullets||[]).slice(0,4).map(x=>{const f=fill(x);bad+=f.bad;return '<li>'+f.html+'</li>'}).join('');
      const ds=c.chair.dissent?fill(c.chair.dissent):null;if(ds)bad+=ds.bad;
      h+='<div class="brief"><span class="badge '+(bad?'r':'g')+'">'+(bad?'a figure could not be verified':'every figure inserted by the simulator')+'</span><div style="margin-top:6px"><b>'+(pk?'Duty manager recommends: '+pk.name+'. ':'')+hd.html+'</b></div><ul>'+li+'</ul>'+(ds?'<div class="note">What this gives up: '+ds.html+'</div>':'')+(pk?'<div style="margin-top:8px"><button class="sm" data-pv="'+pk.id+'">Show it on the globe</button> <span class="note">Only a person can approve.</span></div>':'')+'</div>'}
  }
  return h;
}
function ctxLine(){const c=S.storm.cfg;return 'Meridian Air is a simulated airline. A '+((c.end-c.start)/60)+' hour ground stop is hitting its '+AP[c.hub].n+' hub ('+c.hub+'). The simulator evaluated these recovery plans. Its results are the only truth:\n\n'+JSON.stringify(planFacts())+'\n\nPlan notes: hold = wait it out, no proactive changes. profit = cancel the rotations that lose most when delayed and use spares. pax = avoid cancellations, accept delay. reset = cancel early so aircraft are back in position. custom = the priorities the user set.\n\n'}
function redrawCouncil(){if(S.tab==='storm'){const b=$('body'),y=b.scrollTop;renderBody();b.scrollTop=y}}
async function runCouncil(){
  if(!sample||!S.storm)return;
  const st=S.storm,c={busy:true,seats:{},chair:null};S.council=c;
  SEATS.forEach(s=>c.seats[s.id]={busy:true});redrawCouncil();
  const base=ctxLine();
  await Promise.all(SEATS.map(async s=>{
    try{
      const r=await sample.json(base+'You sit in the '+s.name+' seat of the operations council. Your only job is to '+s.goal+' Pick the plan you would fight for and argue it in two sentences, naming what it costs the other seats.\n\nReply with only JSON: {"pick":"<plan id>","argument":"<two sentences>"}\n\n'+RULES,{modelTier:'quick',cache:false});
      c.seats[s.id]={pick:String(r&&r.pick||''),argument:String(r&&r.argument||'')};
    }catch(e){c.seats[s.id]={err:aiErr(e)}}
    if(S.council===c)redrawCouncil();
  }));
  if(S.council!==c||S.storm!==st)return;
  const said=SEATS.filter(s=>c.seats[s.id].argument).map(s=>s.name+' backs '+c.seats[s.id].pick+': '+c.seats[s.id].argument).join('\n');
  if(!said){c.busy=false;redrawCouncil();return}
  c.chair={busy:true};redrawCouncil();
  try{
    const r=await sample.json(base+'Three council seats have argued:\n'+said+'\n\nYou are the duty manager. Weigh them and recommend one plan to the operations director, who makes the final call. Be honest about what your pick gives up.\n\nReply with only JSON: {"pick":"<plan id>","headline":"<one sentence>","bullets":["<three short bullets>"],"dissent":"<one sentence on what this pick gives up and which seat loses>"}\n\n'+RULES,{cache:false});
    c.chair={pick:String(r&&r.pick||''),headline:String(r&&r.headline||''),bullets:Array.isArray(r&&r.bullets)?r.bullets.map(String):[],dissent:r&&r.dissent?String(r.dissent):''};
  }catch(e){c.chair={err:aiErr(e)}}
  c.busy=false;if(S.council===c)redrawCouncil();
}
async function draftNotice(){
  const p=S.approved&&planById(S.approved);if(!sample||!p)return;
  const l=sched.legById[$('nSel').value];if(!l)return;
  const nxl=(p.next[l.id]||[]).map(x=>sched.legById[x]),nx=nxl[0];
  const V={flight:l.flight,from:AP[l.from].n,to:AP[l.to].n,schedTime:Sim.hhmm(l.dep),newFlight:nx?nxl.map(x=>x.flight).join(' then ')+(nxl.length>1?' connecting in '+AP[nx.to].n:''):'',newTime:nx?Sim.hhmm(p.legRes[nx.id].dep):''};
  const sub=t=>esc(t).replace(/\{(\w+)\}/g,(m,k)=>V[k]!=null&&V[k]!==''?'<b class="num">'+esc(V[k])+'</b>':m);
  const n={busy:true,html:'Thinking…'};S.notice=n;redrawCouncil();
  try{
    const r=await sample('Write the text message and short email an airline sends a passenger whose flight was just cancelled because of a weather ground stop. Warm, direct, no blame, no marketing. Under 110 words in total. '+(nx?'They have been rebooked automatically on a later flight the same day.':'There is no later flight today, so offer rebooking tomorrow, a hotel voucher and a refund option.')+' Never type a digit or a flight number yourself. Use only these placeholders for facts: {flight} {from} {to} {schedTime}'+(nx?' {newFlight} {newTime}':'')+'. No dashes or hyphens. Start with "Text:" then "Email:".',{modelTier:'quick',cache:false,onText:({text})=>{n.html=sub(text);const o=$('noticeOut');if(o){o.hidden=false;o.innerHTML=n.html}}});
    n.html=sub(r.text);
  }catch(e){n.html=esc(aiErr(e))}
  n.busy=false;if(S.notice===n)redrawCouncil();
}
async function readAdvisory(){
  if(!sample)return;
  const txt=($('advz').value||'').trim(),fi=$('advzImg'),img=fi&&fi.files&&fi.files[0];
  if(!txt&&!img){S.intake='Paste an advisory or pick an image first.';redrawCouncil();return}
  S.intakeBusy=true;S.intake=null;redrawCouncil();
  try{
    const opt={modelTier:'quick',cache:false};if(img&&canImages)opt.images=img;
    const r=await sample.json('You turn aviation weather or traffic advisories into settings for an airline simulator. The airline has hubs at ORD, ATL and DFW only. Network time is US Central daylight time, which is UTC minus five hours. '+(img?'An image is attached, likely a weather radar or forecast map. ':'')+'Read the input and reply with only JSON: {"hub":"ORD|ATL|DFW","startHour":<whole hour 8 to 18, Central>,"hours":<1 to 6>,"severity":<0.3 light to 1.0 severe>,"why":"<one sentence on what you read and any assumption, such as extension risk>"}. If the input names a different airport, choose the nearest of the three hubs and say so.\n\nInput:\n'+(txt||'(image only)').slice(0,4000),opt);
    const hub=['ORD','ATL','DFW'].includes(r.hub)?r.hub:'ORD',s=Math.max(8,Math.min(18,Math.round(+r.startHour||12))),d=Math.max(1,Math.min(6,Math.round(+r.hours||4))),sv=Math.max(0.3,Math.min(1,+r.severity||1));
    S.formCfg={hub,start:s*60,end:(s+d)*60,sev:Math.round(sv*20)/20};S.stormHub=hub;
    if(S.storm){clearStorm();computeRisk();renderBoard()}
    S.intake=hub+', ground stop from '+Sim.hhmm(s*60)+' for '+d+' hours, severity '+sv.toFixed(2)+'. '+String(r.why||'')+' Check the settings below, then run the storm.';
    flyTo(AP[hub].lon,AP[hub].lat,2.1);
  }catch(e){S.intake=aiErr(e)}
  S.intakeBusy=false;redrawCouncil();
}
