// ---------- header ----------
function renderKpis(){
  const n=S.net,p=activePlan(),dd=dayToDate(S.t);
  const pr=p?p.pnl:n.profit;
  const k=[
   ['Daily revenue',money(n.rev),num(n.pax)+' passengers'],
   ['Fuel bill',money(n.fuel),pct(n.fuelShare,0)+' of cost'],
   ['Projected profit','<span class="'+cls(pr)+'">'+money(pr)+'</span>',p?'storm costs '+money(S.storm.result.base.pnl-p.pnl):pct(n.margin)+' margin'],
   ['Profit so far','<span class="'+cls(dd.v)+'">'+money(dd.v)+'</span>',dd.fl+' legs flown'+(dd.cx?', '+dd.cx+' cancelled':'')],
   ['Jet fuel','$'+sched.P.jet.toFixed(2)+'/gal','Brent $'+S.P.brent],
   ['Breakeven Brent','$'+n.breakevenBrent.toFixed(0),S.P.brent>=n.breakevenBrent?'<span class="neg">above breakeven</span>':'$'+(n.breakevenBrent-S.P.brent).toFixed(0)+' of room']];
  $('kpis').innerHTML=k.map(x=>'<div class="kpi"><label>'+x[0]+'</label><b>'+x[1]+'</b><small>'+x[2]+'</small></div>').join('');
}
let lastAlert='';
function renderClock(){
  $('clock').innerHTML='<small>Network time (Central)</small>'+Sim.hhmm(S.t)+(S.t>=1440?'<span style="font-size:12px;color:var(--mute)"> +1</span>':'');
  const p=activePlan();
  $('counts').textContent=(S.inAir||0)+' in the air'+(S.lateAir?' · '+S.lateAir+' running late':'')+(p?' · showing: '+p.name.toLowerCase():'');
  $('scrub').value=S.t;
  let a='';
  if(S.storm){const c=S.storm.cfg;a=S.t<c.start?'Ground stop at '+c.hub+' in '+Math.round(c.start-S.t)+' min':S.t<c.end?'GROUND STOP '+c.hub+' until '+Sim.hhmm(c.end):S.t<c.end+90?c.hub+' recovering, reduced rate':''}
  if(a!==lastAlert){lastAlert=a;$('alert').textContent=a;$('alert').hidden=!a}
}
const MODES=[['status','Status'],['risk','Delay risk'],['profit','Profit']];
function renderModes(){
  $('modeSeg').innerHTML=MODES.map(m=>'<button data-m="'+m[0]+'" class="'+(S.mode===m[0]?'on':'')+'">'+m[1]+'</button>').join('');
  $('modeSeg').querySelectorAll('button').forEach(b=>b.onclick=()=>{S.mode=b.dataset.m;renderModes()});
  const L={status:[['#e8eef9','on time'],['#ffb454','running late'],['#4cc9f0','hub or spare swap']],
    risk:[['#3ddc97','under 20% chance late'],['#ffb454','20 to 35%'],['#ff6b6b','over 35%']],
    profit:[['#3ddc97','flight or route earns'],['#ff6b6b','flight or route loses']]}[S.mode];
  $('legend').innerHTML=L.map(x=>'<span><i style="background:'+x[0]+'"></i>'+x[1]+'</span>').join('');
}

// ---------- story ----------
const STORY=[
 {t:'A normal day at Meridian Air',d:'61 aircraft, 178 flights, three hubs. Every number on this page comes from a simulator, so it can be checked. Drag the globe. Click any plane.',go(){clearStorm();S.P.brent=90;S.P.crack=0.75;S.mode='status';S.tab='overview';S.t=560;flyTo(-96,36,1.55)}},
 {t:'Oil is the swing factor',d:'On October 6, 2026 Brent is $125 and jet fuel is $4.34 a gallon, against about $2.90 when this network was priced to earn 6%. At today’s prices it loses money. The twin shows which routes go under first.',go(){clearStorm();S.P.brent=125;S.P.crack=1.36;S.mode='profit';S.tab='fuel';flyTo(-96,36,1.7)}},
 {t:'Which flights will run late today',d:'A model trained on 7 million real DOT flights scores every departure. In July 2026, a month it never saw, its riskiest tenth ran late 77% of the time, against 28% overall.',go(){clearStorm();S.P.brent=90;S.P.crack=0.75;S.mode='risk';S.tab='risk';S.t=900}},
 {t:'A storm closes Chicago',d:'Ground stop at O’Hare, noon to four. Delays roll down every aircraft’s day and crews run out of legal hours. This is the moment that costs airlines millions.',go(){S.P.brent=90;S.P.crack=0.75;S.mode='status';S.tab='storm';S.boardHub='ORD';recompute();runStorm({hub:'ORD',start:720,end:960,sev:1});S.preview='hold';S.approved=null;S.t=700;S.speed=180;$('speed').value='180';flyTo(-92,38,2.2)}},
 {t:'The twin finds better ways out',d:'It tests thousands of cancel and swap combinations in under a second and lays out the trade: money against passengers. Move the sliders to set your own priorities.',go(){if(!S.storm)STORY[3].go();S.tab='storm';S.preview='profit';S.t=Math.max(S.t,760)}},
 {t:'AI advises. A person decides.',d:'Claude argues the case from three seats and writes the brief, but it never invents a number and it cannot approve. Pick a plan and press Approve.',go(){if(!S.storm)STORY[3].go();S.tab='storm';if(!S.approved){S.preview='pax'}}},
 {t:'What this is worth',d:'Run a season of storm days and compare the twin with simply waiting it out. Then scale it to a real fleet with your own assumptions.',go(){S.tab='value';if(!S.value)runValue()}}
];
function clearStorm(){S.storm=null;S.preview=null;S.approved=null;S.council=null;S.notice=null;S.frontier=null;frontierJob++}
function renderStory(){
  const el=$('story');
  if(S.story<0){el.hidden=true;$('storyBtn').textContent='Play the 3 minute story';return}
  const s=STORY[S.story];
  el.hidden=false;$('storyBtn').textContent='Exit story';
  el.innerHTML='<div class="n">'+(S.story+1)+' / '+STORY.length+'</div><div class="tx"><b>'+s.t+'</b><span>'+s.d+'</span></div><div class="bt"><button class="sm" id="stB" '+(S.story===0?'disabled':'')+'>Back</button><button class="sm primary" id="stN">'+(S.story===STORY.length-1?'Finish':'Next')+'</button></div>';
  $('stB').onclick=()=>goStory(S.story-1);$('stN').onclick=()=>goStory(S.story+1);
}
function goStory(i){
  if(i>=STORY.length||i<0){S.story=-1;renderStory();return}
  S.story=i;STORY[i].go();
  if(!S.playing){S.playing=true;$('play').textContent='Pause'}
  recomputeLight();renderStory();renderTabs();renderBody();renderModes();renderBoard();showCard();
}
function recomputeLight(){Sim.prepare(sched,Sim.params(S.P));S.net=Sim.network(sched);S.routes=Sim.routeTable(sched);S.rbyId={};S.routes.forEach(r=>S.rbyId[r.id]=r);if(S.storm&&S.storm.result.brent!==S.P.brent){}computeRisk()}

// ---------- tabs ----------
const TABS=[['overview','Overview'],['routes','Routes'],['fuel','Fuel'],['storm','Storm'],['risk','Risk'],['value','Value'],['ask','Ask']];
function renderTabs(){
  $('tabs').innerHTML=TABS.map(t=>'<button data-t="'+t[0]+'" class="'+(S.tab===t[0]?'on':'')+'">'+t[1]+'</button>').join('');
  $('tabs').querySelectorAll('button').forEach(b=>b.onclick=()=>{S.tab=b.dataset.t;renderTabs();renderBody()});
}
function renderBody(){
  ({overview:vOverview,routes:vRoutes,fuel:vFuel,storm:vStorm,risk:vRisk,value:vValue,ask:vAsk})[S.tab]();
  renderKpis();
}
function go(tab){S.tab=tab;renderTabs();renderBody()}

function vOverview(){
  const n=S.net,r=S.routes,loss=r.filter(x=>x.profit<0),worst=loss.slice(-3).reverse();
  $('body').innerHTML='<h2>Today across the network</h2><p class="hint">'+sched.aircraft.filter(a=>!a.spare).length+' aircraft plus 6 spares, '+sched.legs.length+' flights, '+sched.routes.length+' routes from Atlanta, Chicago and Dallas.</p>'+
  '<div class="grid2">'+st('Revenue',money(n.rev))+st('Operating cost',money(n.fuel+n.nonfuel))+st('Profit','<span class="'+cls(n.profit)+'">'+money(n.profit)+'</span>',pct(n.margin)+' margin')+st('Load factor',pct(n.lf,0))+
  st('Expected late flights',num(S.expLate),'from the delay model')+st('Routine delay cost',money(S.expCost),'at $'+A4A+' a minute (A4A 2025)')+'</div>'+
  '<h2 class="gap">Three decisions this twin supports</h2>'+
  '<div class="box"><h3>1. Which routes earn their keep <button class="sm" data-go="routes">Open</button></h3><div style="font-size:12.5px;color:#c9d6ea">'+(loss.length?loss.length+' of '+r.length+' routes lose money at Brent $'+S.P.brent+'. Weakest: '+worst.map(x=>'<b class="num">'+x.id+'</b> '+money(x.profit)).join(', ')+'.':'Every route clears its costs at Brent $'+S.P.brent+'.')+'</div></div>'+
  '<div class="box"><h3>2. How exposed are we to oil <button class="sm" data-go="fuel">Open</button></h3><div style="font-size:12.5px;color:#c9d6ea">The network breaks even at Brent $'+n.breakevenBrent.toFixed(0)+'. Each $10 on Brent moves daily profit by '+money(n.B*10/42)+'.</div></div>'+
  '<div class="box"><h3>3. What to do when a hub shuts <button class="sm" data-go="storm">Open</button></h3><div style="font-size:12.5px;color:#c9d6ea">Trigger a ground stop and compare recovery plans on cost, passengers and tomorrow’s schedule. Or click a hub on the globe.</div></div>'+
  '<div class="box ai"><h3>Where the AI is <span class="badge v">Claude</span></h3><div style="font-size:12.5px;color:#c9d6ea">Claude reads FAA style advisories, argues each plan from three seats, drafts the passenger notice, and runs the twin from plain English. It never computes a figure: every number it cites is inserted by the simulator, and only a person can approve.</div></div>';
  $('body').querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>go(b.dataset.go));
}

function vRoutes(){
  const k=S.sort.k,d=S.sort.d;
  const rows=S.routes.slice().sort((a,b)=>{const x=a[k],y=b[k];if(x==null)return 1;if(y==null)return -1;return typeof x==='string'?d*x.localeCompare(y):d*(x-y)});
  const cols=[['id','Route'],['dist','Miles'],['profit','Profit'],['margin','Margin'],['breakevenBrent','BE Brent']];
  $('body').innerHTML='<h2>Route profitability</h2><p class="hint">Daily, both directions, at Brent $'+S.P.brent+'. BE Brent is the oil price where the route stops paying for itself. Click a route for what if options.</p>'+
  '<div id="rdetail">'+routeDetail()+'</div>'+
  '<div class="tw"><table><thead><tr>'+cols.map(c=>'<th data-k="'+c[0]+'">'+c[1]+(k===c[0]?(d>0?' ▲':' ▼'):'')+'</th>').join('')+'</tr></thead><tbody>'+
  rows.map(r=>'<tr data-r="'+r.id+'" class="'+(S.selRoute===r.id?'sel':'')+'"><td>'+r.id+'</td><td>'+r.dist+'</td><td class="'+cls(r.profit)+'">'+money(r.profit)+'</td><td class="'+cls(r.margin)+'">'+pct(r.margin)+'</td><td>'+(r.breakevenBrent==null?'never':'$'+r.breakevenBrent.toFixed(0))+'</td></tr>').join('')+'</tbody></table></div>';
  $('body').querySelectorAll('th').forEach(h=>h.onclick=()=>{const kk=h.dataset.k;S.sort=S.sort.k===kk?{k:kk,d:-S.sort.d}:{k:kk,d:kk==='id'?1:-1};vRoutes()});
  $('body').querySelectorAll('tbody tr').forEach(t=>t.onclick=()=>{
    S.selRoute=S.selRoute===t.dataset.r?null:t.dataset.r;
    if(S.selRoute){const ro=sched.routeById[S.selRoute],a=AP[ro.hub],b=AP[ro.spoke];flyTo((a.lon+b.lon)/2,(a.lat+b.lat)/2,2.1)}
    vRoutes();$('body').scrollTop=0});
}
// what if for one route: economics only, the schedule is not rebuilt
function gaugeWhatIf(id,type){
  const T=Sim.TYPES[type],P=sched.P;let rev=0,cost=0;
  sched.legs.filter(l=>l.routeId===id).forEach(l=>{
    const e=l.e,hrs=l.block/60,latent=e.lf>=0.86?e.pax*1.08:e.pax,pax=Math.min(Math.round(latent),Math.round(T.seats*0.96));
    rev+=pax*(e.fare+Sim.COST.ancillary);
    cost+=T.burn*hrs*P.jet+(T.crew+T.maint+T.own)*hrs+T.apt+Sim.COST.paxVar*pax+Sim.COST.overhead;
  });
  return rev-cost;
}
function routeDetail(){
  if(!S.selRoute)return '';
  const x=S.rbyId[S.selRoute],ro=sched.routeById[S.selRoute];let own=0,pax=0;
  sched.legs.filter(l=>l.routeId===ro.id).forEach(l=>{own+=l.e.own;pax+=l.e.pax});
  const alts=Object.keys(Sim.TYPES).filter(t=>t!==ro.type).map(t=>{const v=gaugeWhatIf(ro.id,t);return '<div class="act"><span class="k t">gauge</span><span>Fly it with the '+Sim.TYPES[t].seats+' seat '+t+': <b class="num '+cls(v)+'">'+money(v)+'</b> a day ('+(v-x.profit>=0?'+':'')+money(v-x.profit)+')</span></div>'}).join('');
  return '<div class="box"><h3><span>'+AP[ro.hub].n+' to '+AP[ro.spoke].n+'</span><span class="badge">'+ro.type+' · '+ro.freq+' a day</span></h3>'+
  '<div class="grid3">'+st('Profit','<span class="'+cls(x.profit)+'">'+money(x.profit)+'</span>')+st('Passengers',num(pax))+st('BE Brent',x.breakevenBrent==null?'never':'$'+x.breakevenBrent.toFixed(0))+'</div>'+
  '<div style="margin-top:8px"><div class="act"><span class="k c">cut</span><span>Drop the route: network profit moves by <b class="num '+cls(-x.profit)+'">'+money(-x.profit)+'</b> a day if the aircraft is redeployed. If it sits idle, '+money(own)+' of ownership cost stays.</span></div>'+alts+'</div>'+
  '<p class="note" style="margin-top:6px">Economics only. Gauge swaps assume demand spills up 8% on flights already 86% full. The schedule is not rebuilt.</p></div>';
}

const FMT={brent:v=>'$'+v+'/bbl',crack:v=>'$'+(+v).toFixed(2)+'/gal',demand:v=>(v*100).toFixed(0)+'% of plan',sigma:v=>(v*100).toFixed(0)+'% a year'};
function slider(label,k,min,max,step,val,f,ends){
  return '<div class="field"><div class="top"><span>'+label+'</span><b>'+f(val)+'</b></div><input type="range" data-k="'+k+'" min="'+min+'" max="'+max+'" step="'+step+'" value="'+val+'" aria-label="'+label+'">'+(ends?'<div class="ends"><span>'+ends[0]+'</span><span>'+ends[1]+'</span></div>':'')+'</div>';
}
function fx1(){
  const n=S.net,under=S.routes.filter(x=>x.profit<0).length;
  return '<div class="grid2">'+st('Jet fuel','$'+sched.P.jet.toFixed(2)+'/gal')+st('Daily fuel bill',money(n.fuel))+st('Daily profit','<span class="'+cls(n.profit)+'">'+money(n.profit)+'</span>',pct(n.margin)+' margin')+st('Routes under water',under+' of '+S.routes.length)+st('Fare rise for a 6% margin',n.margin>=0.06?'none needed':'+'+((((n.rev-n.profit)/0.94)/n.rev-1)*100).toFixed(1)+'%','at unchanged demand')+st('Fuel share of cost',pct(n.fuel/(n.rev-n.profit),0))+'</div>'+
  '<h2 class="gap">Profit against Brent</h2>'+lineChart();
}
function fx2(){
  const risk=Sim.oilRisk(sched,S.sigma,2000);
  return histChart(risk)+'<div class="grid2" style="margin-top:8px">'+st('Bad case (1 in 20)','<span class="'+cls(risk.p5)+'">'+money(risk.p5)+'</span>','daily profit')+st('Good case (1 in 20)','<span class="'+cls(risk.p95)+'">'+money(risk.p95)+'</span>','daily profit')+st('Chance of a loss day',pct(risk.pLoss,0))+st('Swing per $10 Brent',money(S.net.B*10/42),'daily profit')+'</div>';
}
function vFuel(){
  const p=S.P;
  $('body').innerHTML='<h2>Fuel and oil risk</h2><p class="hint">Jet fuel $/gal = Brent ÷ 42 + crack spread. Profit is a straight line in the jet price, so every breakeven here is exact. Anchored to US EIA spot prices through October 6, 2026: Brent $125 and Gulf Coast jet $4.34, so the crack spread is about $1.36 against $0.46 on average in 2019 to 2025.</p>'+
  '<div class="chips">'+[['Today, Oct 6 2026 · $125',125,1.36],['12 month average · $87',87,1.04],['Calibration · $90',90,0.75],['Slump · $60',60,0.75]].map(x=>'<button class="sm" data-b="'+x[1]+'" data-c="'+x[2]+'">'+x[0]+'</button>').join('')+'</div>'+
  slider('Brent crude','brent',40,160,1,p.brent,FMT.brent)+slider('Crack spread','crack',0.3,2,0.01,p.crack,FMT.crack)+slider('Demand','demand',0.8,1.15,0.01,p.demand,FMT.demand)+
  '<div id="fx1">'+fx1()+'</div>'+
  '<h2 class="gap">Oil price spread</h2><p class="hint" style="margin-bottom:6px">A scenario spread, not a forecast. 2,000 seeded draws around the Brent price above.</p>'+
  slider('Volatility','sigma',0.05,0.6,0.01,S.sigma,FMT.sigma)+'<div id="fx2">'+fx2()+'</div>';
  const b=$('body');
  b.querySelectorAll('[data-b]').forEach(x=>x.onclick=()=>{S.P.brent=+x.dataset.b;if(x.dataset.c)S.P.crack=+x.dataset.c;recompute();vFuel();renderKpis();showCard()});
  b.querySelectorAll('input[data-k]').forEach(i=>{
    i.oninput=()=>{const k=i.dataset.k,v=+i.value;
      i.closest('.field').querySelector('.top b').textContent=FMT[k](v);
      if(k==='sigma'){S.sigma=v;$('fx2').innerHTML=fx2();return}
      S.P[k]=v;recomputeLight();$('fx1').innerHTML=fx1();$('fx2').innerHTML=fx2();renderKpis();showCard()};
    i.onchange=()=>{if(i.dataset.k!=='sigma'&&S.storm){recompute();renderBoard()}};
  });
}
function lineChart(){
  const n=S.net,w=440,h=170,pad={l:46,r:12,t:12,b:22},x0=40,x1=160;
  const prof=b=>n.A-n.B*(b/42+S.P.crack);
  const y0=Math.min(prof(160),-0.3e6),y1=Math.max(prof(40),0.6e6);
  const X=b=>pad.l+(b-x0)/(x1-x0)*(w-pad.l-pad.r),Y=v=>pad.t+(y1-v)/(y1-y0)*(h-pad.t-pad.b);
  let s='<svg viewBox="0 0 '+w+' '+h+'" width="100%" role="img" aria-label="Daily profit against Brent price">';
  [-2e6,-1.6e6,-1.2e6,-0.8e6,-0.4e6,0,0.4e6,0.8e6].forEach(v=>{if(v<y0||v>y1)return;s+='<line x1="'+pad.l+'" x2="'+(w-pad.r)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="'+(v===0?'#5b7399':'#21314d')+'"/><text x="'+(pad.l-5)+'" y="'+(Y(v)+3)+'" text-anchor="end">'+money(v,1)+'</text>'});
  [40,70,100,130,160].forEach(b=>{s+='<text x="'+X(b)+'" y="'+(h-6)+'" text-anchor="middle">$'+b+'</text>'});
  [[125,'today'],[87,'12 mo avg']].forEach(a=>{s+='<line x1="'+X(a[0])+'" x2="'+X(a[0])+'" y1="'+(h-pad.b-6)+'" y2="'+(h-pad.b)+'" stroke="#8fa1bd"/><text x="'+X(a[0])+'" y="'+(h-pad.b-9)+'" text-anchor="middle">'+a[1]+'</text>'});
  s+='<path d="M'+X(40)+','+Y(prof(40))+' L'+X(160)+','+Y(prof(160))+'" stroke="#4cc9f0" stroke-width="2" fill="none"/>';
  if(n.breakevenBrent>x0&&n.breakevenBrent<x1)s+='<line x1="'+X(n.breakevenBrent)+'" x2="'+X(n.breakevenBrent)+'" y1="'+pad.t+'" y2="'+(h-pad.b)+'" stroke="#ff6b6b" stroke-dasharray="3 3"/><text x="'+(X(n.breakevenBrent)-4)+'" y="'+(pad.t+9)+'" text-anchor="end" style="fill:#ff6b6b">breakeven $'+n.breakevenBrent.toFixed(0)+'</text>';
  const bx=Math.max(x0,Math.min(x1,S.P.brent));
  s+='<circle cx="'+X(bx)+'" cy="'+Y(prof(bx))+'" r="5" fill="#ffb454" stroke="#070d18" stroke-width="2"/>';
  return s+'</svg>';
}
function histChart(r){
  const w=440,h=90,bins=r.hist,mx=Math.max.apply(null,bins),bw=(w-20)/bins.length;
  let s='<svg viewBox="0 0 '+w+' '+(h+18)+'" width="100%" role="img" aria-label="Spread of daily profit across oil price scenarios">';
  bins.forEach((c,i)=>{const v=r.lo+(i+.5)/bins.length*(r.hi-r.lo),bh=c/mx*(h-6);s+='<rect x="'+(10+i*bw+1)+'" y="'+(h-bh)+'" width="'+(bw-2)+'" height="'+bh+'" rx="1.5" fill="'+(v<0?'#ff6b6b':'#3ddc97')+'" opacity=".85"/>'});
  s+='<text x="10" y="'+(h+13)+'">'+money(r.lo,1)+' (loss)</text><text x="'+(w-10)+'" y="'+(h+13)+'" text-anchor="end">'+money(r.hi,1)+'</text>';
  return s+'</svg>';
}
