const Sim=window.Sim, GEO=window.GEO, M=window.MODEL;
const $=id=>document.getElementById(id);
const sched=Sim.buildSchedule();
const AP=Sim.AIRPORTS;
const T0=360,T1=1620;            // clock runs 05:00 to 03:00 next day
const A4A=98.41;                 // $ per block minute, Airlines for America 2025
const S={P:{brent:90,crack:0.75,demand:1},t:500,speed:180,playing:true,rot:[-96,30],zoom:1,zoomT:1.55,mode:'status',
  selFlight:null,selRoute:null,storm:null,preview:null,approved:null,tab:'overview',sort:{k:'profit',d:-1},
  sigma:0.25,custom:{s:0.5,u:0},frontier:null,council:null,notice:null,intake:null,chat:[],busy:false,
  boardHub:'ORD',value:null,story:-1,risk:{}};
let sample=null,sampleChecked=false,canTools=false,canImages=false;

// ---------- formatting ----------
const money=(v,d)=>{const a=Math.abs(v),s=v<0?'-':'';if(a>=1e9)return s+'$'+(a/1e9).toFixed(2)+'B';if(a>=1e6)return s+'$'+(a/1e6).toFixed(d==null?2:d)+'M';if(a>=1e3)return s+'$'+(a/1e3).toFixed(a>=1e5?0:1)+'k';return s+'$'+a.toFixed(0)};
const pct=(v,d)=>(v*100).toFixed(d==null?1:d)+'%';
const cls=v=>v>=0?'pos':'neg';
const num=v=>Math.round(v).toLocaleString('en-US');
const esc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const st=(a,b,c)=>'<div class="stat"><label>'+a+'</label><b>'+b+'</b>'+(c?'<small>'+c+'</small>':'')+'</div>';
const row=(a,b)=>'<div class="row"><span>'+a+'</span><span class="num">'+b+'</span></div>';
const PCOL={hold:'#8fa1bd',profit:'#3ddc97',pax:'#4cc9f0',reset:'#ffb454',custom:'#b69cff'};

// ---------- model ----------
function decorate(p){
  const R=p.legRes,cx=sched.legs.filter(l=>R[l.id]&&R[l.id].status==='cancelled').sort((a,b)=>a.dep-b.dep);
  const flown=sched.legs.filter(l=>R[l.id].status==='flown'),free={},next={};let reb=0,str=0;
  const cap=m=>free[m.id]==null?Sim.TYPES[m.type].seats-m.e.pax:free[m.id];
  cx.forEach(l=>{
    let need=l.e.pax;
    // same route first, then one stop through another hub, earliest arrival first
    const opts=[];
    flown.forEach(m=>{if(m.from!==l.from||R[m.id].dep<l.dep)return;
      if(m.to===l.to)opts.push({arr:R[m.id].arr,legs:[m]});
      else flown.forEach(n=>{if(n.from===m.to&&n.to===l.to&&R[n.id].dep>=R[m.id].arr+45)opts.push({arr:R[n.id].arr,legs:[m,n]})})});
    opts.sort((a,b)=>a.arr-b.arr);
    if(opts.length)next[l.id]=opts[0].legs.map(x=>x.id);
    for(const o of opts){if(need<=0)break;const k=Math.min(need,Math.min.apply(null,o.legs.map(cap)));if(k<=0)continue;o.legs.forEach(m=>{free[m.id]=cap(m)-k});need-=k;reb+=k}
    str+=need;
  });
  p.rebooked=reb;p.stranded=str;p.next=next;p.cxLegs=cx;
  p.swaps=sched.legs.filter(l=>R[l.id].moved&&R[l.id].status==='flown');
  return p;
}
function customW(){const c=S.custom;return {delay:1.2*c.s,cancel:1300*c.s,tail:800*c.u}}
function runCustom(){
  if(!S.storm)return;
  Sim.lock(sched,S.storm.now);
  const r=Sim.solveW(sched,S.storm.cfg,customW());
  r.id='custom';r.name='Your priorities';r.note='Built live from the two sliders above.';r.stormCost=S.storm.result.base.pnl-r.pnl;
  S.storm.custom=decorate(r);
}
function runStorm(cfg){
  const now=Math.max(T0,cfg.start-120);
  S.storm={cfg,now};
  S.storm.result=Sim.planStorm(sched,cfg,now);
  S.storm.result.plans.forEach(decorate);
  runCustom();
  S.frontier=null;S.council=null;S.notice=null;
  startFrontier();
}
function allPlans(){return S.storm?S.storm.result.plans.concat(S.storm.custom?[S.storm.custom]:[]):[]}
function planById(id){return allPlans().find(p=>p.id===id)||null}
function recompute(){
  Sim.prepare(sched,Sim.params(S.P));
  S.net=Sim.network(sched);
  S.routes=Sim.routeTable(sched);
  S.rbyId={};S.routes.forEach(r=>S.rbyId[r.id]=r);
  if(S.storm){const cfg=S.storm.cfg;runStorm(cfg)}
  computeRisk();
}
function activePlan(){const id=S.preview||S.approved;return id?planById(id):null}
function legState(l){
  const p=activePlan();
  if(p){const r=p.legRes[l.id];if(r)return r}
  return {status:'flown',dep:l.dep,arr:l.arr,delay:0,acId:l.acId};
}
function dayToDate(t){
  const p=activePlan(),P=sched.P;let v=0,fl=0,cx=0;
  sched.legs.forEach(l=>{const r=legState(l),e=l.e;
    if(r.status==='flown'){if(r.arr<=t){v+=e.profit-(p?Sim.delayCost(l,r.delay,P):0);fl++}}
    else if(l.dep<=t){v-=Sim.cancelCost(e,P);cx++}});
  return {v,fl,cx};
}
// delay risk: logistic model trained on real DOT flights (Jul 2025 to Jun 2026), tested on July 2026, scored on each simulated flight
// Features known two hours before departure: congestion at the origin and destination, the same aircraft's previous leg, airport, hour, day, distance.
function scoreRisk(l,f){
  const c=M.coef,A=M.amb,h=Math.max(5,Math.min(22,Math.floor(l.dep/60)%24));
  let z=M.intercept+M.shift+(c['o_'+l.from]!=null?c['o_'+l.from]:c.o_OTH)+(c['d_'+l.to]!=null?c['d_'+l.to]:c.d_OTH)+(c['h_'+h]||0)+(c.w_3||0)+c.dist_k*(sched.routeById[l.routeId].dist/1000)+c.cong*f.cong+c.cong_d*f.congD;
  if(f.known){
    const d=Math.max(f.late,0),lateK=Math.min(A.late_k+d/60,5),prop=A.prop+Math.max(d-Math.max(f.slack-35,0),0)/60;
    z+=c.ac_known+c.late_k*lateK+c.slack_h*Math.min(f.slack,720)/60+c.prop*Math.min(prop,5);
  }
  return 1/(1+Math.exp(-z));
}
function computeRisk(){
  const byO={},byD={},byAc={},A=M.amb;
  sched.legs.forEach(l=>{
    const r=legState(l);
    (byO[l.from]=byO[l.from]||[]).push({t:r.status==='flown'?r.dep:l.dep,late:(r.status!=='flown'||r.delay>=15)?1:A.cong});
    if(r.status==='flown')(byD[l.to]=byD[l.to]||[]).push({t:r.arr,late:r.delay>=15?1:A.cong_d});
    (byAc[r.acId||l.acId]=byAc[r.acId||l.acId]||[]).push(l);
  });
  const prev={};
  Object.keys(byAc).forEach(k=>{const a=byAc[k].sort((x,y)=>x.dep-y.dep);for(let i=1;i<a.length;i++)prev[a[i].id]=a[i-1]});
  let exp=0;const risk={},congMap={};
  sched.legs.forEach(l=>{
    let s=0,n=0,s2=0,n2=0;
    byO[l.from].forEach(x=>{if(x.t>=l.dep-300&&x.t<l.dep-120){s+=x.late;n++}});
    (byD[l.to]||[]).forEach(x=>{if(x.t>=l.dep-300&&x.t<l.dep-120){s2+=x.late;n2++}});
    const cong=(s+M.g0*8)/(n+8),congD=(s2+M.g0*8)/(n2+8);congMap[l.id]=cong;
    const f={cong,congD,known:false,late:0,slack:0},pl=prev[l.id];
    if(!pl){f.known=true;f.slack=360}  // first flight of the day: a rested aircraft, treated like a long turn
    if(pl){const pr=legState(pl);if(pr.status==='flown'&&pr.dep<=l.dep-120){f.known=true;f.late=pr.delay;f.slack=l.dep-pl.arr}}
    risk[l.id]=scoreRisk(l,f);exp+=risk[l.id];
  });
  S.risk=risk;S.cong=congMap;S.expLate=exp;S.expCost=exp*M.meanLateMin*A4A;
}
function riskColor(p){return p<0.2?'#3ddc97':p<0.35?'#ffb454':'#ff6b6b'}
function withParams(P2,fn){const keep=Object.assign({},S.P),ks=S.storm;Object.assign(S.P,P2);Sim.prepare(sched,Sim.params(S.P));let out;try{out=fn()}finally{S.P=keep;Sim.prepare(sched,Sim.params(S.P));if(ks)Sim.lock(sched,ks.now)}return out}

// frontier: many priority mixes, solved in small chunks so the page stays smooth
let frontierJob=0;
function startFrontier(){
  const job=++frontierJob,st=S.storm,pts=[],grid=[];
  for(let u=0;u<=1;u+=0.5)for(let s=0;s<=1.0001;s+=0.1)grid.push([s,u]);
  let i=0;
  (function step(){
    if(job!==frontierJob||S.storm!==st)return;
    const end=Math.min(grid.length,i+3);
    Sim.lock(sched,st.now);
    for(;i<end;i++){const g=grid[i],r=Sim.solveW(sched,st.cfg,{delay:1.2*g[0],cancel:1300*g[0],tail:800*g[1]});pts.push({x:r.cancelledPax,y:st.result.base.pnl-r.pnl})}
    S.frontier={pts:pts.slice(),done:i>=grid.length};
    if(S.tab==='storm'&&$('frontier'))$('frontier').innerHTML=frontierChart();
    if(i<grid.length)setTimeout(step,30);
  })();
}
