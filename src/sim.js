/* Meridian Twin simulator core.
   Deterministic. No randomness at run time except the seeded Monte Carlo draw.
   Every number the page shows comes from here. Claude never computes figures. */
(function (root) {
  'use strict';
  const Sim = {};
  const DAY = 1440;

  // ---------- network data (real airports, synthetic carrier) ----------
  const AIRPORTS = {
    ATL: { n: 'Atlanta', lat: 33.6407, lon: -84.4277, hub: true },
    ORD: { n: 'Chicago O\'Hare', lat: 41.9742, lon: -87.9073, hub: true },
    DFW: { n: 'Dallas Fort Worth', lat: 32.8998, lon: -97.0403, hub: true },
    JFK: { n: 'New York JFK', lat: 40.6413, lon: -73.7781 },
    BOS: { n: 'Boston', lat: 42.3656, lon: -71.0096 },
    DCA: { n: 'Washington National', lat: 38.8512, lon: -77.0402 },
    PHL: { n: 'Philadelphia', lat: 39.8744, lon: -75.2424 },
    MIA: { n: 'Miami', lat: 25.7959, lon: -80.2871 },
    MCO: { n: 'Orlando', lat: 28.4312, lon: -81.3081 },
    DTW: { n: 'Detroit', lat: 42.2162, lon: -83.3554 },
    MSP: { n: 'Minneapolis', lat: 44.8848, lon: -93.2223 },
    DEN: { n: 'Denver', lat: 39.8561, lon: -104.6737 },
    PHX: { n: 'Phoenix', lat: 33.4342, lon: -112.0116 },
    LAS: { n: 'Las Vegas', lat: 36.084, lon: -115.1537 },
    LAX: { n: 'Los Angeles', lat: 33.9416, lon: -118.4085 },
    SFO: { n: 'San Francisco', lat: 37.6213, lon: -122.379 },
    SEA: { n: 'Seattle', lat: 47.4502, lon: -122.3088 },
    BNA: { n: 'Nashville', lat: 36.1263, lon: -86.6774 },
    SCE: { n: 'State College', lat: 40.8493, lon: -77.8487 }
  };

  // Planning assumptions. Labeled in the UI. Adjustable in code, not hidden.
  const TYPES = {
    E175: { seats: 76, burn: 560, speed: 430, crew: 760, maint: 520, own: 900, apt: 1500, turn: 35, delayMin: 40, gnd: 2.5 },
    A320: { seats: 150, burn: 790, speed: 470, crew: 1150, maint: 700, own: 1250, apt: 2250, turn: 45, delayMin: 68, gnd: 4.0 },
    A321: { seats: 190, burn: 930, speed: 470, crew: 1250, maint: 780, own: 1500, apt: 2600, turn: 50, delayMin: 78, gnd: 4.8 }
  };

  const COST = { paxVar: 17, ancillary: 25, overhead: 2300, fareBase: 40, farePerMile: 0.105, taxi: 30, duty: 840 };

  // hub, spoke, round trips per day, aircraft type
  const SPEC = [
    ['ATL', 'MIA', 3, 'A320'], ['ATL', 'MCO', 2, 'A320'], ['ATL', 'JFK', 3, 'A321'], ['ATL', 'BOS', 2, 'A320'],
    ['ATL', 'DCA', 2, 'A320'], ['ATL', 'PHL', 2, 'A320'], ['ATL', 'DTW', 2, 'A320'], ['ATL', 'BNA', 2, 'E175'],
    ['ATL', 'ORD', 3, 'A321'], ['ATL', 'DFW', 2, 'A321'], ['ATL', 'DEN', 2, 'A320'], ['ATL', 'LAX', 2, 'A321'],
    ['ATL', 'SFO', 1, 'A321'], ['ATL', 'SCE', 1, 'E175'], ['ATL', 'MSP', 2, 'A320'], ['ATL', 'LAS', 1, 'A320'],
    ['ATL', 'PHX', 1, 'A320'],
    ['ORD', 'JFK', 3, 'A321'], ['ORD', 'BOS', 2, 'A320'], ['ORD', 'DCA', 2, 'A320'], ['ORD', 'PHL', 2, 'A320'],
    ['ORD', 'DTW', 2, 'E175'], ['ORD', 'MSP', 2, 'A320'], ['ORD', 'DEN', 3, 'A320'], ['ORD', 'LAS', 2, 'A320'],
    ['ORD', 'LAX', 2, 'A321'], ['ORD', 'SFO', 2, 'A321'], ['ORD', 'SEA', 2, 'A320'], ['ORD', 'PHX', 1, 'A320'],
    ['ORD', 'BNA', 1, 'E175'], ['ORD', 'DFW', 2, 'A320'], ['ORD', 'SCE', 2, 'E175'], ['ORD', 'MIA', 1, 'A320'],
    ['ORD', 'MCO', 1, 'A320'],
    ['DFW', 'DEN', 2, 'A320'], ['DFW', 'PHX', 2, 'A320'], ['DFW', 'LAS', 2, 'A320'], ['DFW', 'LAX', 3, 'A321'],
    ['DFW', 'SFO', 1, 'A320'], ['DFW', 'SEA', 1, 'A320'], ['DFW', 'MSP', 2, 'A320'], ['DFW', 'MIA', 2, 'A321'],
    ['DFW', 'MCO', 1, 'A320'], ['DFW', 'BNA', 2, 'A320'], ['DFW', 'JFK', 2, 'A321'], ['DFW', 'DCA', 1, 'A320'],
    ['DFW', 'BOS', 1, 'A320'], ['DFW', 'PHL', 1, 'A320'], ['DFW', 'DTW', 1, 'A320']
  ];

  // market yield by spoke (fare multiplier) and base load factor
  const SPOKE_YIELD = { JFK: 1.1, BOS: 1.07, DCA: 1.05, PHL: 1.02, SFO: 1.1, SEA: 1.02, LAX: 1.04, DEN: 0.98, MSP: 1.0, DTW: 0.99,
    MIA: 0.94, MCO: 0.9, LAS: 0.92, PHX: 0.96, BNA: 1.0, SCE: 1.2, ATL: 0.97, ORD: 0.99, DFW: 0.98 };
  const SPOKE_LF = { MIA: 0.87, MCO: 0.89, LAS: 0.88, JFK: 0.87, BOS: 0.85, SCE: 0.8, PHX: 0.84, DEN: 0.84 };

  function hash01(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return ((h >>> 0) % 100000) / 100000;
  }
  function haversineMi(a, b) {
    const R = 3958.8, rad = Math.PI / 180;
    const dLat = (b.lat - a.lat) * rad, dLon = (b.lon - a.lon) * rad;
    const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(x));
  }
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

  // ---------- schedule ----------
  Sim.buildSchedule = function () {
    const routes = [], rotations = [], aircraft = [], legs = [];
    SPEC.forEach(([hub, spoke, freq, type]) => {
      const dist = haversineMi(AIRPORTS[hub], AIRPORTS[spoke]);
      const ky = (SPOKE_YIELD[spoke] || 1) * (hub === 'ATL' || hub === 'ORD' || hub === 'DFW' ? 1 : 1);
      const isHubHub = !!AIRPORTS[spoke].hub;
      const yieldMult = ky * (isHubHub ? 0.97 : 1) * (0.96 + 0.08 * hash01(hub + spoke + 'y'));
      const lf = clamp((SPOKE_LF[spoke] || 0.82) + (hash01(hub + spoke + 'l') - 0.5) * 0.06, 0.7, 0.93);
      routes.push({ id: hub + '-' + spoke, hub, spoke, dist, freq, type, yieldMult, lf });
    });
    const T = TYPES;
    const block = (r, type) => Math.round(r.dist / T[type].speed * 60 + COST.taxi);
    ['ATL', 'ORD', 'DFW'].forEach(hub => {
      const reqs = [];
      routes.filter(r => r.hub === hub).forEach(r => {
        const b = block(r, r.type), dur = 2 * b + T[r.type].turn;
        for (let k = 0; k < r.freq; k++) {
          let pref = 360 + (k + 0.5) * (780 / r.freq);
          pref = Math.min(pref, DAY - dur - 25);
          reqs.push({ r, pref, b, dur });
        }
      });
      reqs.sort((a, b) => a.pref - b.pref || a.r.id.localeCompare(b.r.id));
      const fleet = [];
      reqs.forEach(q => {
        const type = q.r.type;
        let best = null;
        fleet.forEach(ac => {
          if (ac.type !== type) return;
          if (ac.ready <= q.pref + 45 && ac.ready + 0 <= DAY - q.dur - 15) {
            if (!best || ac.ready > best.ready) best = ac;
          }
        });
        if (!best) { best = { type, ready: 0, rots: [] }; fleet.push(best); }
        let dep = Math.round(Math.max(q.pref, best.ready) / 5) * 5;
        if (dep + q.dur > DAY - 10) { best = { type, ready: 0, rots: [] }; fleet.push(best); dep = Math.round(q.pref / 5) * 5; }
        best.rots.push({ r: q.r, dep, b: q.b });
        best.ready = dep + q.b + T[type].turn + q.b + T[type].turn;
      });
      fleet.forEach((ac, i) => {
        const acId = hub + '-' + String(i + 1).padStart(2, '0');
        const A = { id: acId, type: ac.type, base: hub, spare: false, rots: [] };
        ac.rots.forEach((x, j) => {
          const rotId = acId + '-r' + (j + 1);
          const out = { id: rotId + 'o', from: hub, to: x.r.spoke, dep: x.dep, block: x.b, arr: x.dep + x.b, type: ac.type, routeId: x.r.id, rotId, acId, dir: 'out' };
          const bdep = out.arr + T[ac.type].turn;
          const back = { id: rotId + 'b', from: x.r.spoke, to: hub, dep: bdep, block: x.b, arr: bdep + x.b, type: ac.type, routeId: x.r.id, rotId, acId, dir: 'back' };
          const rot = { id: rotId, acId, routeId: x.r.id, hub, legs: [out, back], locked: false };
          A.rots.push(rot); rotations.push(rot); legs.push(out, back);
        });
        aircraft.push(A);
      });
      for (let s = 1; s <= 2; s++) aircraft.push({ id: hub + '-S' + s, type: 'A320', base: hub, spare: true, rots: [] });
    });
    legs.sort((a, b) => a.dep - b.dep || a.id.localeCompare(b.id));
    legs.forEach((l, i) => { l.flight = 'MA ' + (101 + i); });
    const routeById = {};
    routes.forEach(r => { routeById[r.id] = r; });
    const legById = {};
    legs.forEach(l => { legById[l.id] = l; });
    return { airports: AIRPORTS, types: TYPES, routes, routeById, rotations, aircraft, legs, legById };
  };

  // ---------- economics ----------
  Sim.params = function (o) {
    const P = Object.assign({ brent: 90, crack: 0.75, demand: 1.0, rebook: 110, goodwill: 35 }, o || {});
    P.jet = P.brent / 42 + P.crack;
    return P;
  };
  Sim.prepare = function (sched, P) {
    sched.legs.forEach(l => {
      const T = TYPES[l.type], r = sched.routeById[l.routeId], hrs = l.block / 60;
      const lf = clamp(r.lf * P.demand, 0.4, 0.98);
      const pax = Math.round(T.seats * lf);
      const fare = (COST.fareBase + COST.farePerMile * r.dist) * r.yieldMult;
      const gal = T.burn * hrs;
      l.e = {
        pax, lf, fare, rev: pax * (fare + COST.ancillary), gal, fuel: gal * P.jet,
        crew: T.crew * hrs, maint: T.maint * hrs, own: T.own * hrs, apt: T.apt,
        paxv: COST.paxVar * pax, ovh: COST.overhead
      };
      l.e.cost = l.e.fuel + l.e.crew + l.e.maint + l.e.own + l.e.apt + l.e.paxv + l.e.ovh;
      l.e.nonfuel = l.e.cost - l.e.fuel;
      l.e.profit = l.e.rev - l.e.cost;
    });
    sched.P = P;
    return sched;
  };

  // ---------- disruption ----------
  function applyStorm(leg, dep, storm) {
    if (!storm) return dep;
    const { hub, start, end, sev } = storm, rec = 90;
    let d = dep;
    if (leg.from === hub) {
      if (d >= start && d < end) d = end;
      if (d >= end && d < end + rec) d += Math.round(sev * 30 * (1 - (d - end) / rec));
    }
    if (leg.to === hub) {
      const arr = d + leg.block;
      if (arr >= start && arr < end) d = end - leg.block + Math.round(sev * 5);
      else if (arr >= end && arr < end + rec) d += Math.round(sev * 20 * (1 - (arr - end) / rec));
    }
    return d;
  }

  function runChain(rots, ctx, cancel) {
    const out = [];
    let ready = 0;
    for (const r of rots) {
      if (cancel.has(r.id)) { r.legs.forEach(l => out.push({ leg: l, status: 'cancelled', reason: 'planned' })); continue; }
      let t = ready;
      const tent = [];
      for (const l of r.legs) {
        let dep = Math.max(l.dep, t);
        dep = applyStorm(l, dep, ctx.storm);
        const arr = dep + l.block;
        tent.push({ leg: l, dep, arr });
        t = arr + TYPES[l.type].turn;
      }
      const lastArr = tent[tent.length - 1].arr;
      if (!r.locked && lastArr > r.legs[0].dep - 60 + COST.duty) { r.legs.forEach(l => out.push({ leg: l, status: 'cancelled', reason: 'crew' })); continue; }
      tent.forEach(x => out.push({ leg: x.leg, status: 'flown', dep: x.dep, arr: x.arr }));
      ready = t;
    }
    return out;
  }

  function delayCost(leg, delay, P) {
    const T = TYPES[leg.type], e = leg.e;
    return T.delayMin * delay + e.pax * delay * 0.38 + (delay >= 180 ? e.pax * 75 : 0) + T.gnd * delay * P.jet;
  }

  function score(outs, P, W) {
    let pnl = 0, paxDelayMin = 0, canPax = 0, tail = 0, lastArr = -1;
    for (const o of outs) {
      const e = o.leg.e;
      if (o.status === 'cancelled') {
        pnl -= e.own + e.ovh + 0.6 * e.crew + e.pax * (P.rebook + P.goodwill);
        canPax += e.pax;
      } else {
        const delay = o.dep - o.leg.dep;
        pnl += e.profit - delayCost(o.leg, delay, P);
        paxDelayMin += e.pax * delay;
        if (o.arr > lastArr) { lastArr = o.arr; tail = Math.max(0, o.arr - o.leg.arr); }
      }
    }
    return { pnl, paxDelayMin, canPax, tail, J: -pnl + W.delay * paxDelayMin + W.cancel * canPax + W.tail * tail };
  }

  function subsetsBest(chain, ctx, P, W) {
    const cand = chain.rots.filter(r => !r.locked);
    if (!cand.length) return;
    const n = Math.min(cand.length, 7);
    const pool = cand.slice(0, n);
    let bestJ = Infinity, bestSet = null, bestK = 99;
    for (let mask = 0; mask < (1 << n); mask++) {
      const cs = new Set();
      let k = 0;
      for (let i = 0; i < n; i++) if (mask & (1 << i)) { cs.add(pool[i].id); k++; }
      const J = score(runChain(chain.rots, ctx, cs), P, W).J;
      if (J < bestJ - 1e-6 || (Math.abs(J - bestJ) <= 1e-6 && k < bestK)) { bestJ = J; bestSet = cs; bestK = k; }
    }
    chain.cancel = bestSet;
  }

  function solve(sched, ctx, W, optimize) {
    const P = sched.P;
    const chains = {};
    sched.aircraft.forEach(ac => { chains[ac.id] = { ac, rots: ac.rots.slice(), cancel: new Set() }; });
    const ids = Object.keys(chains);
    const J = c => score(runChain(c.rots, ctx, c.cancel), P, W).J;
    let moves = 0;
    if (optimize) {
      for (let pass = 0; pass < 2; pass++) {
        // spare aircraft pass (greedy)
        ids.filter(id => chains[id].ac.spare).forEach(sid => {
          const sp = chains[sid];
          for (let it = 0; it < 8; it++) {
            let best = null;
            const Js = J(sp);
            ids.forEach(cid => {
              const c = chains[cid];
              if (c.ac.spare || cid === sid) return;
              c.rots.forEach(r => {
                if (r.locked || r.hub !== sp.ac.base) return;
                const Jc = J(c);
                const c2 = { rots: c.rots.filter(x => x !== r), cancel: new Set([...c.cancel].filter(x => x !== r.id)) };
                const s2 = { rots: sp.rots.concat([r]).sort((a, b) => a.legs[0].dep - b.legs[0].dep), cancel: sp.cancel };
                const d = (J(c2) + J(s2)) - (Jc + Js);
                if (d < -50 && (!best || d < best.d)) best = { d, c, r, s2 };
              });
            });
            if (!best) break;
            best.c.rots = best.c.rots.filter(x => x !== best.r);
            best.c.cancel.delete(best.r.id);
            sp.rots = best.s2.rots;
            moves++;
          }
        });
        ids.forEach(id => subsetsBest(chains[id], ctx, P, W));
      }
    }
    // final assembly
    const legRes = {};
    let all = [];
    ids.forEach(id => {
      const c = chains[id];
      const outs = runChain(c.rots, ctx, c.cancel);
      outs.forEach(o => {
        const delay = o.status === 'flown' ? o.dep - o.leg.dep : 0;
        legRes[o.leg.id] = { status: o.status, reason: o.reason || null, dep: o.dep, arr: o.arr, delay, acId: id, moved: id !== o.leg.acId };
      });
      all = all.concat(outs);
    });
    const sc = score(all, P, { delay: 0, cancel: 0, tail: 0 });
    // summary metrics
    let flown = 0, cancelled = 0, delayed60 = 0, onTime = 0, extraGal = 0, crewCx = 0, plannedCx = 0, backBy = 0, delayCostSum = 0, paxMoved = 0;
    let rev = 0, fuel = 0, other = 0;
    all.forEach(o => {
      const e = o.leg.e;
      if (o.status === 'flown') {
        flown++;
        const d = o.dep - o.leg.dep;
        if (d >= 60) delayed60++;
        if (d < 15) onTime++; else backBy = Math.max(backBy, o.arr);
        extraGal += TYPES[o.leg.type].gnd * d;
        delayCostSum += delayCost(o.leg, d, P);
        rev += e.rev; fuel += e.fuel + TYPES[o.leg.type].gnd * d * P.jet; other += e.nonfuel;
      } else {
        cancelled++;
        if (o.reason === 'crew') crewCx++; else plannedCx++;
        other += e.own + e.ovh + 0.6 * e.crew + e.pax * (P.rebook + P.goodwill);
      }
    });
    const hasRes = Object.values(legRes).filter(x => x.moved && x.status === 'flown').length;
    return {
      legRes, pnl: sc.pnl, paxDelayHours: sc.paxDelayMin / 60, cancelledPax: sc.canPax,
      flown, cancelled, delayed60, onTimePct: flown ? onTime / flown : 1, extraGal, crewCx, plannedCx, backBy,
      delayCost: delayCostSum, spareLegs: hasRes, rev, fuel, other
    };
  }

  Sim.baseline = function (sched) {
    return solve(sched, { storm: null }, { delay: 0, cancel: 0, tail: 0 }, false);
  };

  const PLANS = [
    { id: 'hold', name: 'Hold and recover', note: 'No proactive changes. Flights wait out the ground stop. Crew time outs cancel what cannot be flown.', W: { delay: 0, cancel: 0, tail: 0 }, opt: false },
    { id: 'profit', name: 'Protect profit', note: 'Cancels the rotations that lose the most money when delayed, and uses spare aircraft where they pay back.', W: { delay: 0, cancel: 0, tail: 0 }, opt: true },
    { id: 'pax', name: 'Protect passengers', note: 'Weights passenger delay and cancellations heavily. Uses spares first, cancels last.', W: { delay: 1, cancel: 1100, tail: 0 }, opt: true },
    { id: 'reset', name: 'Reset the network', note: 'Cancels early to bring every aircraft back to schedule, so tomorrow starts clean.', W: { delay: 0, cancel: 0, tail: 700 }, opt: true }
  ];

  Sim.planStorm = function (sched, storm, now) {
    sched.rotations.forEach(r => { r.locked = r.legs[0].dep < now; });
    const ctx = { storm };
    const base = Sim.baseline(sched);
    const plans = PLANS.map(p => {
      const res = solve(sched, ctx, p.W, p.opt);
      res.id = p.id; res.name = p.name; res.note = p.note;
      res.stormCost = base.pnl - res.pnl;
      return res;
    });
    return { storm, now, base, plans };
  };

  // ---------- summaries ----------
  Sim.network = function (sched) {
    const t = { rev: 0, fuel: 0, nonfuel: 0, profit: 0, gal: 0, pax: 0, seats: 0, legs: sched.legs.length };
    sched.legs.forEach(l => {
      const e = l.e;
      t.rev += e.rev; t.fuel += e.fuel; t.nonfuel += e.nonfuel; t.profit += e.profit; t.gal += e.gal;
      t.pax += e.pax; t.seats += TYPES[l.type].seats;
    });
    t.margin = t.rev ? t.profit / t.rev : 0;
    t.lf = t.seats ? t.pax / t.seats : 0;
    t.fuelShare = t.fuel / (t.fuel + t.nonfuel);
    // linear in jet price: profit(jet) = A - B * jet
    t.B = t.gal; t.A = t.rev - t.nonfuel;
    t.breakevenJet = t.A / t.B;
    t.breakevenBrent = (t.breakevenJet - sched.P.crack) * 42;
    return t;
  };

  Sim.routeTable = function (sched) {
    const m = {};
    sched.legs.forEach(l => {
      const k = l.routeId, e = l.e;
      const x = m[k] || (m[k] = { id: k, rev: 0, nonfuel: 0, gal: 0, legs: 0 });
      x.rev += e.rev; x.nonfuel += e.nonfuel; x.gal += e.gal; x.legs++;
    });
    const jet = sched.P.jet, crack = sched.P.crack;
    return Object.values(m).map(x => {
      const r = sched.routeById[x.id];
      const profit = x.rev - x.nonfuel - x.gal * jet;
      const A = x.rev - x.nonfuel;
      const beJet = A / x.gal;
      return { id: x.id, hub: r.hub, spoke: r.spoke, dist: Math.round(r.dist), legs: x.legs, rev: x.rev, profit, margin: x.rev ? profit / x.rev : 0,
        breakevenBrent: A > 0 ? (beJet - crack) * 42 : null, fuelShare: x.gal * jet / (x.gal * jet + x.nonfuel) };
    }).sort((a, b) => b.profit - a.profit);
  };

  // Seeded scenario spread of Brent (lognormal) through the linear profit relation. Not a forecast.
  Sim.oilRisk = function (sched, sigma, n) {
    n = n || 2000;
    const net = Sim.network(sched), P = sched.P;
    let s = 123456789;
    const rnd = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return (s + 0.5) / 4294967296; };
    const gauss = () => Math.sqrt(-2 * Math.log(rnd())) * Math.cos(2 * Math.PI * rnd());
    const vals = [];
    let loss = 0;
    for (let i = 0; i < n; i++) {
      const brent = P.brent * Math.exp(sigma * gauss() - 0.5 * sigma * sigma);
      const jet = brent / 42 + P.crack;
      const profit = net.A - net.B * jet;
      vals.push(profit);
      if (profit < 0) loss++;
    }
    vals.sort((a, b) => a - b);
    const q = p => vals[Math.min(n - 1, Math.floor(p * n))];
    const lo = vals[0], hi = vals[n - 1], bins = 24, hist = new Array(bins).fill(0);
    vals.forEach(v => { hist[Math.min(bins - 1, Math.floor((v - lo) / (hi - lo + 1e-9) * bins))]++; });
    return { p5: q(0.05), p50: q(0.5), p95: q(0.95), pLoss: loss / n, lo, hi, hist, net, sigma };
  };

  Sim.profitAtBrent = function (sched, brent) {
    const net = Sim.network(sched);
    const jet = brent / 42 + sched.P.crack;
    const profit = net.A - net.B * jet;
    const rev = net.rev;
    return { profit, margin: rev ? profit / rev : 0, jet };
  };

  // position of a leg along its great circle, with soft takeoff and landing
  Sim.progress = function (res, t) {
    if (!res || res.status !== 'flown') return null;
    if (t < res.dep || t >= res.arr) return null;
    const p = (t - res.dep) / (res.arr - res.dep);
    return p < 0.5 ? 2 * p * p : 1 - 2 * (1 - p) * (1 - p);
  };

  Sim.solveW = function (sched, storm, W) { return solve(sched, { storm }, W, true); };
  Sim.lock = function (sched, now) { sched.rotations.forEach(r => { r.locked = r.legs[0].dep < now; }); };
  Sim.delayCost = delayCost;
  Sim.cancelCost = function (e, P) { return e.own + e.ovh + 0.6 * e.crew + e.pax * (P.rebook + P.goodwill); };
  Sim.AIRPORTS = AIRPORTS; Sim.TYPES = TYPES; Sim.COST = COST; Sim.DAY = DAY; Sim.PLANS = PLANS;
  Sim.haversineMi = haversineMi;
  Sim.hhmm = function (m) {
    m = Math.round(m);
    const h = Math.floor(m / 60) % 24, mm = ((m % 60) + 60) % 60;
    return String(h).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = Sim; else root.Sim = Sim;
})(typeof window !== 'undefined' ? window : globalThis);
