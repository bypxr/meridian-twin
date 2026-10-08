// Run: npm test   (Node 18 or newer, no dependencies)
const test = require('node:test');
const assert = require('node:assert/strict');
const Sim = require('../src/sim.js');
const M = require('../src/model.json');

const fresh = (o) => { const s = Sim.buildSchedule(); Sim.prepare(s, Sim.params(o)); return s; };
const profitAt = (brent, crack = 0.75) => Sim.network(fresh({ brent, crack })).profit;

test('schedule is deterministic', () => {
  const a = Sim.buildSchedule(), b = Sim.buildSchedule();
  assert.equal(JSON.stringify(a.legs.map(l => [l.id, l.dep, l.arr, l.acId])), JSON.stringify(b.legs.map(l => [l.id, l.dep, l.arr, l.acId])));
  assert.equal(a.aircraft.filter(x => !x.spare).length, 61, '61 scheduled aircraft plus spares');
  assert.equal(a.legs.length, 178);
});

test('calibration network earns about a 6% margin', () => {
  const n = Sim.network(fresh({ brent: 90, crack: 0.75 }));
  assert.ok(n.margin > 0.055 && n.margin < 0.065, 'margin ' + n.margin);
});

test('profit is a straight line in the Brent price', () => {
  const p60 = profitAt(60), p90 = profitAt(90), p120 = profitAt(120);
  assert.ok(Math.abs((p90 - p60) - (p120 - p90)) < 1, 'not linear');
  assert.ok(p120 < p90 && p90 < p60);
});

test('reported breakeven Brent gives zero profit', () => {
  for (const crack of [0.75, 1.355]) {
    const be = Sim.network(fresh({ brent: 90, crack })).breakevenBrent;
    assert.ok(Math.abs(profitAt(be, crack)) < 1, 'breakeven off at crack ' + crack);
  }
});

test('profitAtBrent agrees with a full re-price', () => {
  const s = fresh({ brent: 90, crack: 0.75 });
  assert.ok(Math.abs(Sim.profitAtBrent(s, 110).profit - profitAt(110)) < 1);
});

const STORM = { hub: 'ORD', start: 720, end: 960, sev: 1 };
test('storm plans never double book an aircraft and keep every flight accounted for', () => {
  const s = fresh({});
  const R = Sim.planStorm(s, STORM, 600);
  assert.equal(R.plans.length, 4);
  for (const p of R.plans) {
    const ids = Object.keys(p.legRes);
    assert.equal(ids.length, s.legs.length, p.id + ' lost flights');
    assert.equal(p.flown + p.cancelled, s.legs.length, p.id + ' flown plus cancelled');
    const byAc = {};
    for (const id of ids) { const r = p.legRes[id]; if (r.status === 'flown') (byAc[r.acId] = byAc[r.acId] || []).push(r); }
    for (const [ac, legs] of Object.entries(byAc)) {
      legs.sort((a, b) => a.dep - b.dep);
      for (let i = 1; i < legs.length; i++) assert.ok(legs[i].dep >= legs[i - 1].arr, p.id + ' double books ' + ac);
    }
  }
});

test('storm planning is deterministic and the best plan beats waiting it out', () => {
  const a = Sim.planStorm(fresh({}), STORM, 600), b = Sim.planStorm(fresh({}), STORM, 600);
  assert.deepEqual(a.plans.map(p => Math.round(p.pnl)), b.plans.map(p => Math.round(p.pnl)));
  const hold = a.plans.find(p => p.id === 'hold'), best = Math.max(...a.plans.map(p => p.pnl));
  assert.ok(best > hold.pnl, 'twin found no better plan');
  assert.ok(hold.stormCost > 0, 'a storm should cost money');
});

test('delay model file matches the reported July 2026 test', () => {
  assert.equal(M.meta.split, 'train Jul 2025 to May 2026, tune June 2026, test July 2026');
  assert.ok(M.results.logit_aircraft.auc > 0.75);
  assert.ok(M.results.logit_aircraft.auc > M.results.baseline.auc);
  for (const k of ['cong', 'cong_d', 'prop', 'late_k']) assert.ok(M.coef[k] > 0, k + ' should raise risk');
});
