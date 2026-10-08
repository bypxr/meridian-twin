const Sim=require('../src/sim.js');const s=Sim.buildSchedule();
function scen(){let seed=20261008;const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};const sc=[];for(let i=0;i<36;i++){const st=8+Math.floor(rnd()*10),d=1+Math.floor(rnd()*rnd()*5.99);sc.push({hub:['ORD','ATL','DFW'][Math.floor(rnd()*3)],start:st*60,end:(st+d)*60,sev:Math.round((0.4+rnd()*0.6)*20)/20})}return sc}
const out={};
for(const [lab,b,c] of [['calibration',90,0.75],['today',125.44,1.355]]){
  Sim.prepare(s,Sim.params({brent:b,crack:c,demand:1}));
  let sh=0,sb=0,wins=0,hrs=0,rows=[];
  for(const cfg of scen()){const R=Sim.planStorm(s,cfg,Math.max(360,cfg.start-120));const hold=R.plans[0];let best=hold;R.plans.forEach(p=>{if(p.pnl>best.pnl)best=p});rows.push([hold.stormCost,best.stormCost,best.id]);sh+=hold.stormCost;sb+=best.stormCost;if(hold.stormCost-best.stormCost>1000)wins++;hrs+=hold.paxDelayHours-best.paxDelayHours}
  const n=36,mh=sh/n,mb=sb/n,sv=mh-mb;
  const ids={};rows.forEach(r=>ids[r[2]]=(ids[r[2]]||0)+1);
  out[lab]={mh:Math.round(mh),mb:Math.round(mb),save:Math.round(sv),pct:+(sv/mh*100).toFixed(1),wins,hrs:Math.round(hrs/n),annualBase:Math.round(30*sv*0.4),low:Math.round(15*sv*0.2),high:Math.round(50*sv*0.6),ids};
}
console.log(JSON.stringify(out,null,1));
