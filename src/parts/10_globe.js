// ---------- globe ----------
const cv=$('globe'),ctx=cv.getContext('2d');
let W=0,H=0,DPR=1;
const proj=d3.geoOrthographic().clipAngle(90).precision(0.5);
const path=d3.geoPath(proj,ctx);
const land={type:'MultiPolygon',coordinates:GEO.land};
const borders={type:'MultiLineString',coordinates:GEO.borders};
const states={type:'MultiLineString',coordinates:GEO.states};
const sphere={type:'Sphere'},grat=d3.geoGraticule10();
const routeGeo={};
sched.routes.forEach(r=>{routeGeo[r.id]={type:'LineString',coordinates:[[AP[r.hub].lon,AP[r.hub].lat],[AP[r.spoke].lon,AP[r.spoke].lat]]}});
const interp={};
sched.legs.forEach(l=>{const a=AP[l.from],b=AP[l.to];interp[l.id]=d3.geoInterpolate([a.lon,a.lat],[b.lon,b.lat])});
function resize(){
  const s=$('stage');DPR=Math.min(2,window.devicePixelRatio||1);
  W=s.clientWidth;H=s.clientHeight;cv.width=W*DPR;cv.height=H*DPR;
}
let hits=[];
function draw(now){
  const base=Math.min(W,H)*0.46,cy=H/2-6;
  proj.scale(base*S.zoom).translate([W/2,cy]).rotate([-S.rot[0],-S.rot[1]]);
  ctx.setTransform(DPR,0,0,DPR,0,0);ctx.clearRect(0,0,W,H);
  const cen=[S.rot[0],S.rot[1]],R=proj.scale();
  // atmosphere
  const g=ctx.createRadialGradient(W/2,cy,R*0.98,W/2,cy,R*1.09);
  g.addColorStop(0,'rgba(76,201,240,.28)');g.addColorStop(1,'rgba(76,201,240,0)');
  ctx.beginPath();ctx.arc(W/2,cy,R*1.09,0,6.3);ctx.fillStyle=g;ctx.fill();
  ctx.beginPath();path(sphere);ctx.fillStyle='#0a1424';ctx.fill();
  ctx.beginPath();path(grat);ctx.strokeStyle='rgba(120,160,220,.07)';ctx.lineWidth=.6;ctx.stroke();
  ctx.beginPath();path(land);ctx.fillStyle='#1a2b46';ctx.fill();
  ctx.beginPath();path(borders);ctx.strokeStyle='rgba(140,175,230,.22)';ctx.lineWidth=.5;ctx.stroke();
  if(S.zoom>1.3){ctx.beginPath();path(states);ctx.strokeStyle='rgba(140,175,230,.13)';ctx.lineWidth=.5;ctx.stroke()}
  // night side. Network time is Central (UTC minus 5). Sun sits a little south of the equator in October.
  const utc=(S.t+300)/60,sunLon=-(utc-12)*15,night=d3.geoCircle().center([sunLon+180,6]).radius(90)();
  ctx.beginPath();path(night);ctx.fillStyle='rgba(2,6,14,.42)';ctx.fill();
  // routes
  const sel=S.selRoute;
  sched.routes.forEach(r=>{
    const x=S.rbyId[r.id];if(!x)return;
    const c=x.profit<0?'255,107,107':(x.margin>0.08?'61,220,151':'147,164,191'),on=sel===r.id;
    ctx.beginPath();path(routeGeo[r.id]);
    ctx.strokeStyle='rgba('+c+','+(on?0.95:(S.mode==='profit'?(x.profit<0?0.6:0.3):0.13))+')';ctx.lineWidth=on?2.4:(S.mode==='profit'?1.1:0.7);ctx.stroke();
  });
  // storm cell
  if(S.storm){
    const cfg=S.storm.cfg,h=AP[cfg.hub],act=S.t>=cfg.start&&S.t<cfg.end,soon=S.t<cfg.start;
    if(d3.geoDistance([h.lon,h.lat],cen)<1.45&&S.t<cfg.end+90){
      const ph=(now/1400)%1,rad=2.2+2.6*cfg.sev;
      for(let k=0;k<3;k++){
        const f=(ph+k/3)%1,c=d3.geoCircle().center([h.lon,h.lat]).radius(rad*(0.35+0.75*f))();
        ctx.beginPath();path(c);ctx.strokeStyle=act?'rgba(255,107,107,'+(0.75*(1-f))+')':'rgba(255,180,84,'+(0.5*(1-f))+')';ctx.lineWidth=1.3;ctx.stroke();
      }
      const c0=d3.geoCircle().center([h.lon,h.lat]).radius(rad)();
      ctx.beginPath();path(c0);ctx.fillStyle=act?'rgba(255,107,107,.20)':soon?'rgba(255,180,84,.10)':'rgba(255,180,84,.06)';ctx.fill();
    }
  }
  // airports
  hits=[];
  Object.keys(AP).forEach(k=>{
    const a=AP[k];if(d3.geoDistance([a.lon,a.lat],cen)>1.5)return;
    const p=proj([a.lon,a.lat]);if(!p)return;
    if(a.hub){ctx.beginPath();ctx.arc(p[0],p[1],7+1.5*Math.sin(now/600),0,6.3);ctx.strokeStyle='rgba(76,201,240,.35)';ctx.lineWidth=1;ctx.stroke()}
    ctx.beginPath();ctx.arc(p[0],p[1],a.hub?4:2.3,0,6.3);ctx.fillStyle=a.hub?'#4cc9f0':'#8ea6c9';ctx.fill();
    if(a.hub||S.zoom>1.25){ctx.fillStyle=a.hub?'#e8eef9':'#b9c8df';ctx.font=(a.hub?'600 12px':'500 10.5px')+' IBM Plex Mono,monospace';ctx.fillText(k,p[0]+8,p[1]-6)}
    hits.push({t:'ap',id:k,x:p[0],y:p[1]});
  });
  // flights
  let inAir=0,late=0;
  sched.legs.forEach(l=>{
    const r=legState(l);if(r.status!=='flown')return;
    if(S.t<r.dep||S.t>=r.arr)return;
    inAir++;if(r.delay>=15)late++;
    const pr=(S.t-r.dep)/(r.arr-r.dep),e=pr<.5?2*pr*pr:1-2*(1-pr)*(1-pr);
    const ll=interp[l.id](e);if(d3.geoDistance(ll,cen)>1.5)return;
    const p=proj(ll);if(!p)return;
    const q=proj(interp[l.id](Math.max(0,e-0.07)));
    let col='#e8eef9';
    if(S.mode==='risk')col=riskColor(S.risk[l.id]||0);
    else if(S.mode==='profit')col=l.e.profit>=0?'#3ddc97':'#ff6b6b';
    else if(r.delay>=15)col='#ffb454';
    let ang=0;
    if(q){
      const gr=ctx.createLinearGradient(q[0],q[1],p[0],p[1]);gr.addColorStop(0,'rgba(255,255,255,0)');gr.addColorStop(1,col);
      ctx.beginPath();ctx.moveTo(q[0],q[1]);ctx.lineTo(p[0],p[1]);ctx.strokeStyle=gr;ctx.globalAlpha=.7;ctx.lineWidth=1.3;ctx.stroke();ctx.globalAlpha=1;
      ang=Math.atan2(p[1]-q[1],p[0]-q[0]);
    }
    const isSel=S.selFlight===l.id,sz=(isSel?6.5:4.6)*Math.min(1.5,Math.max(.85,S.zoom/1.5));
    ctx.save();ctx.translate(p[0],p[1]);ctx.rotate(ang);
    ctx.beginPath();ctx.moveTo(sz,0);ctx.lineTo(-sz*.7,sz*.62);ctx.lineTo(-sz*.35,0);ctx.lineTo(-sz*.7,-sz*.62);ctx.closePath();
    ctx.fillStyle=col;ctx.shadowColor=col;ctx.shadowBlur=isSel?12:5;ctx.fill();ctx.restore();
    if(r.moved){ctx.beginPath();ctx.arc(p[0],p[1],7,0,6.3);ctx.strokeStyle='#4cc9f0';ctx.lineWidth=1.2;ctx.stroke()}
    if(isSel){ctx.beginPath();ctx.arc(p[0],p[1],11,0,6.3);ctx.strokeStyle='#4cc9f0';ctx.lineWidth=1.5;ctx.stroke()}
    hits.push({t:'fl',id:l.id,x:p[0],y:p[1]});
  });
  S.inAir=inAir;S.lateAir=late;
}
// interaction
let drag=null;
function nearest(x,y,max){let best=null,bd=max;hits.forEach(h=>{const dd=Math.hypot(h.x-x,h.y-y)-(h.t==='fl'?4:0);if(dd<bd){bd=dd;best=h}});return best}
cv.addEventListener('pointerdown',e=>{cv.setPointerCapture(e.pointerId);drag={x:e.clientX,y:e.clientY,rot:S.rot.slice(),moved:false}});
cv.addEventListener('pointermove',e=>{
  const r=cv.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top,tip=$('tip');
  if(drag){
    const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
    if(Math.abs(dx)+Math.abs(dy)>4)drag.moved=true;
    if(drag.moved){const k=0.3/S.zoom;S.rot=[drag.rot[0]-dx*k,Math.max(-80,Math.min(80,drag.rot[1]+dy*k))];S.fly=null;tip.hidden=true}
    return;
  }
  const h=nearest(x,y,14);
  if(!h){tip.hidden=true;return}
  let tx;
  if(h.t==='fl'){const l=sched.legById[h.id],rs=legState(l);tx=l.flight+'  '+l.from+' to '+l.to+(rs.delay>=15?'  +'+Math.round(rs.delay)+'m':'')+'  risk '+pct(S.risk[l.id]||0,0)}
  else tx=h.id+'  '+AP[h.id].n+(AP[h.id].hub?'  (hub, click to aim a storm)':'');
  tip.textContent=tx;tip.hidden=false;
  tip.style.left=Math.min(W-tip.offsetWidth-8,x+14)+'px';tip.style.top=Math.max(4,y-30)+'px';
});
cv.addEventListener('pointerleave',()=>{$('tip').hidden=true});
cv.addEventListener('pointerup',e=>{
  if(!drag)return;const d=drag;drag=null;if(d.moved)return;
  const r=cv.getBoundingClientRect(),h=nearest(e.clientX-r.left,e.clientY-r.top,18);
  if(!h){S.selFlight=null;showCard();return}
  if(h.t==='fl'){S.selFlight=h.id;showCard();return}
  S.selFlight=null;showCard();
  if(AP[h.id].hub){S.stormHub=h.id;S.boardHub=h.id;S.tab='storm';renderTabs();renderBody();renderBoard();flyTo(AP[h.id].lon,AP[h.id].lat,2.1)}
});
cv.addEventListener('wheel',e=>{e.preventDefault();S.zoomT=Math.max(0.9,Math.min(6,S.zoomT*(e.deltaY<0?1.12:0.89)))},{passive:false});
function flyTo(lon,lat,z){S.fly={lon,lat};if(z)S.zoomT=W<600?Math.min(z,1.5):z}

function showCard(){
  const c=$('card');
  if(!S.selFlight){c.hidden=true;return}
  const l=sched.legById[S.selFlight],r=legState(l),e=l.e,P=sched.P,T=Sim.TYPES[l.type];
  const dc=r.status==='flown'?Sim.delayCost(l,r.delay,P):0;
  const be=((e.rev-e.nonfuel)/e.gal-P.crack)*42,rk=S.risk[l.id]||0;
  const status=r.status==='cancelled'?'<span class="neg">Cancelled ('+(r.reason==='crew'?'crew timed out':'planned')+')</span>':(S.t<r.dep?'Scheduled':S.t>=r.arr?'Arrived':'Airborne');
  const prof=r.status==='flown'?e.profit-dc:-Sim.cancelCost(e,P);
  c.innerHTML='<button class="x" aria-label="Close" id="cx">×</button><h3>'+l.flight+' <span class="num" style="font-weight:500">'+l.from+' to '+l.to+'</span></h3>'+
  '<div style="color:var(--mute);margin-bottom:6px">'+T.seats+' seat '+l.type+' · tail '+(r.acId||l.acId)+(r.moved?' <span class="acc">(spare swapped in)</span>':'')+'</div>'+
  row('Status',status)+row('Scheduled',Sim.hhmm(l.dep)+' to '+Sim.hhmm(l.arr))+
  (r.status==='flown'?row('Actual',Sim.hhmm(r.dep)+' to '+Sim.hhmm(r.arr)+(r.delay>=15?' <span class="amb">+'+Math.round(r.delay)+'m</span>':'')):'')+
  row('Delay risk (model)','<span style="color:'+riskColor(rk)+'">'+pct(rk,0)+'</span>')+
  row('Passengers',e.pax+' ('+pct(e.lf,0)+' full)')+row('Revenue',money(e.rev))+row('Fuel',money(e.fuel)+' · '+num(e.gal)+' gal')+
  row('Other costs',money(e.nonfuel))+(dc?row('Delay cost',money(dc)):'')+
  row('Leg profit','<b class="'+cls(prof)+'">'+money(prof)+'</b>')+row('Breakeven Brent','$'+be.toFixed(0));
  c.hidden=false;$('cx').onclick=()=>{S.selFlight=null;showCard();renderBoard()};
}
