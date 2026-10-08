// ---------- aircraft timeline ----------
const BX={l:74,w:1200,r:10};
const bx=t=>BX.l+(t-T0)/(T1-T0)*(BX.w-BX.l-BX.r);
function renderBoard(){
  const hub=S.boardHub,acs=sched.aircraft.filter(a=>a.base===hub),rowH=17,top=22,h=top+acs.length*rowH+6,p=activePlan();
  const idx={};acs.forEach((a,i)=>idx[a.id]=i);
  let s='<svg viewBox="0 0 '+BX.w+' '+h+'" width="100%" role="img" aria-label="Timeline of every aircraft based at '+hub+'">';
  for(let t=360;t<=T1;t+=60){s+='<line x1="'+bx(t)+'" x2="'+bx(t)+'" y1="'+(top-4)+'" y2="'+h+'" stroke="#16233a"/>';if(t%120===0)s+='<text x="'+bx(t)+'" y="12" text-anchor="middle">'+Sim.hhmm(t)+'</text>'}
  if(S.storm&&S.storm.cfg.hub===hub){const c=S.storm.cfg;s+='<rect x="'+bx(c.start)+'" y="'+(top-4)+'" width="'+(bx(c.end)-bx(c.start))+'" height="'+(h-top+4)+'" fill="rgba(255,107,107,.13)"/><rect x="'+bx(c.end)+'" y="'+(top-4)+'" width="'+(bx(c.end+90)-bx(c.end))+'" height="'+(h-top+4)+'" fill="rgba(255,180,84,.07)"/><text x="'+(bx(c.start)+4)+'" y="'+(top+6)+'" style="fill:#ff9d9d">ground stop</text>'}
  acs.forEach((a,i)=>{const y=top+i*rowH;s+='<text x="6" y="'+(y+11)+'" style="fill:'+(a.spare?'#4cc9f0':'#8fa1bd')+'">'+a.id+(a.spare?' spare':'')+'</text><line x1="'+BX.l+'" x2="'+(BX.w-BX.r)+'" y1="'+(y+rowH-1)+'" y2="'+(y+rowH-1)+'" stroke="#111c30"/>'});
  let nLate=0,nCx=0,nSw=0;
  sched.legs.forEach(l=>{
    const r=legState(l),home=idx[l.acId],row=r.status==='flown'&&r.acId!=null&&idx[r.acId]!=null?idx[r.acId]:home;
    if(home==null&&row==null)return;
    const sel=S.selFlight===l.id,spoke=l.from===hub?l.to:l.from;
    if(r.status!=='flown'){nCx++;const y=top+home*rowH+2,x=bx(l.dep),w=Math.max(3,bx(l.arr)-x);
      s+='<rect class="leg" data-fl="'+l.id+'" x="'+x+'" y="'+y+'" width="'+w+'" height="'+(rowH-5)+'" rx="2" fill="rgba(255,107,107,.12)" stroke="#ff6b6b" stroke-dasharray="3 2" '+(sel?'stroke-width="2"':'')+'><title>'+l.flight+' '+l.from+' to '+l.to+' cancelled</title></rect>';
      if(w>26)s+='<text x="'+(x+w/2)+'" y="'+(y+9)+'" text-anchor="middle" style="fill:#ff9d9d;pointer-events:none">'+spoke+'</text>';return}
    const late=r.delay>=15,y=top+row*rowH+2,x=bx(r.dep),w=Math.max(3,bx(r.arr)-x);
    if(late){nLate++;const gy=top+home*rowH+2;s+='<rect x="'+bx(l.dep)+'" y="'+gy+'" width="'+Math.max(3,bx(l.arr)-bx(l.dep))+'" height="'+(rowH-5)+'" rx="2" fill="none" stroke="#33486b" stroke-dasharray="2 2"/>'}
    if(r.moved)nSw++;
    const fill=r.moved?'#1d6f8a':late?'#8a5a1c':'#274064',stroke=sel?'#fff':(r.moved?'#4cc9f0':late?'#ffb454':'#3a5a8c');
    s+='<rect class="leg" data-fl="'+l.id+'" x="'+x+'" y="'+y+'" width="'+w+'" height="'+(rowH-5)+'" rx="2" fill="'+fill+'" stroke="'+stroke+'" '+(sel?'stroke-width="2"':'')+'><title>'+l.flight+' '+l.from+' to '+l.to+' '+Sim.hhmm(r.dep)+(late?' (+'+Math.round(r.delay)+' min)':'')+'</title></rect>';
    if(w>26)s+='<text x="'+(x+w/2)+'" y="'+(y+9)+'" text-anchor="middle" style="fill:#dfe8f7;pointer-events:none">'+spoke+'</text>';
  });
  s+='<line id="nowLine" x1="0" x2="0" y1="'+(top-6)+'" y2="'+h+'" stroke="#4cc9f0" stroke-width="1.5"/></svg>';
  $('board').innerHTML='<div class="hd"><div><h2>Aircraft timeline · '+AP[hub].n+'</h2><div class="note" style="margin:0">One row per aircraft. '+(p?'Showing "'+p.name+'": '+nLate+' late, '+nCx+' cancelled, '+nSw+' flown by a spare.':'A normal day. Run a storm to watch delays roll down each row.')+' Click a flight to find it on the globe.</div></div><div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><div class="lg"><span><i style="background:#274064;border:1px solid #3a5a8c"></i>on time</span><span><i style="background:#8a5a1c;border:1px solid #ffb454"></i>late</span><span><i style="border:1px dashed #ff6b6b"></i>cancelled</span><span><i style="background:#1d6f8a;border:1px solid #4cc9f0"></i>spare swap</span></div><div class="seg">'+['ORD','ATL','DFW'].map(x=>'<button data-hub="'+x+'" class="'+(hub===x?'on':'')+'">'+x+'</button>').join('')+'</div></div></div><div class="bw">'+s+'</div>';
  moveNow();
}
function moveNow(){const n=$('nowLine');if(n){const x=bx(Math.max(T0,Math.min(T1,S.t)));n.setAttribute('x1',x);n.setAttribute('x2',x)}}

// ---------- loop ----------
let last=performance.now(),tick=0;
function frame(now){
  const dt=Math.min(100,now-last);last=now;
  if(S.playing){S.t+=dt/1000*S.speed/60;if(S.t>=T1)S.t=T0+60}
  S.zoom+=(S.zoomT-S.zoom)*Math.min(1,dt/200);
  if(S.fly){const f=S.fly,k=Math.min(1,dt/240);S.rot[0]+=(f.lon-S.rot[0])*k;S.rot[1]+=(f.lat-S.rot[1])*k;if(Math.abs(f.lon-S.rot[0])+Math.abs(f.lat-S.rot[1])<0.05)S.fly=null}
  draw(now);renderClock();moveNow();
  const k=Math.floor(now/500);
  if(k!==tick){tick=k;renderKpis();if(S.selFlight)showCard();if(S.tab==='risk'&&k%4===0){const rl=$('riskList');if(rl)rl.innerHTML=riskList()}}
  requestAnimationFrame(frame);
}
function init(){
  $('foot').innerHTML='Built by Pratyush Mudgal as a working prototype. Meridian Air is not a real airline. Airports and distances are real. Fares, loads and costs are planning assumptions, set so the network earns about a 6% margin. Delay cost uses the Airlines for America 2025 figure of $98.41 per block minute. Fuel presets come from US EIA spot prices for October 6, 2026. Brent spot is the physical price, well above the Brent futures price quoted in headlines (near $105). The delay model is trained on public US DOT on time data from July 2025 to June 2026 and tested on July 2026. The simulator is deterministic. Claude never computes a figure and cannot approve a plan.';
  recompute();renderTabs();renderBody();renderModes();renderStory();
  $('play').onclick=()=>{S.playing=!S.playing;$('play').textContent=S.playing?'Pause':'Play'};
  $('scrub').oninput=e=>{S.t=+e.target.value};
  $('speed').onchange=e=>{S.speed=+e.target.value};
  $('storyBtn').onclick=()=>{if(S.story>=0){S.story=-1;renderStory()}else goStory(0)};
  window.addEventListener('resize',()=>{resize()});resize();if(W<600)S.zoomT=0.98;
  renderBoard();
  // one listener for everything that gets re-rendered
  $('body').addEventListener('click',e=>{
    const b=$('body'),pv=e.target.closest('[data-pv]'),ap=e.target.closest('[data-ap]'),fl=e.target.closest('[data-fl]');
    const after=()=>{const y=b.scrollTop;computeRisk();renderBody();b.scrollTop=y;renderBoard();showCard()};
    if(ap){S.approved=ap.dataset.ap;S.preview=S.approved;S.notice=null;after()}
    else if(pv){S.preview=pv.dataset.pv;after()}
    else if(e.target.id==='actMore'){S.actAll=!S.actAll;after()}
    else if(fl){S.selFlight=fl.dataset.fl;const l=sched.legById[S.selFlight];if(l&&S.t<l.dep)S.t=l.dep+2;showCard();renderBoard()}
  });
  $('board').addEventListener('click',e=>{
    const hb=e.target.closest('[data-hub]'),fl=e.target.closest('[data-fl]');
    if(hb){S.boardHub=hb.dataset.hub;renderBoard()}
    else if(fl){S.selFlight=fl.dataset.fl;const l=sched.legById[S.selFlight],r=legState(l);if(r.status==='flown'&&(S.t<r.dep||S.t>=r.arr))S.t=r.dep+(r.arr-r.dep)*0.4;const a=AP[l.from],c=AP[l.to];flyTo((a.lon+c.lon)/2,(a.lat+c.lat)/2);showCard();renderBoard()}
  });
  if(window.claude&&window.claude.use){
    const done=()=>{sampleChecked=true;if(S.tab==='ask'||S.tab==='storm')renderBody()};
    window.claude.use('sample').then(async s=>{sample=s||null;if(sample&&sample.limits){try{const L=await sample.limits();canTools=!!L.tools;canImages=!!L.images}catch(e){}}done()}).catch(done);
  }else sampleChecked=true;
  window.__twin={S,Sim,sched,recompute,renderBody,runValue,goStory};
  requestAnimationFrame(frame);
}
init();
