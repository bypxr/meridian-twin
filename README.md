# Meridian Twin

A digital twin of a simulated airline. It shows what a storm, a fuel spike or a bad delay day costs, finds a cheaper way out, and lets Claude explain it in plain language. A person always approves the plan.

Built by Pratyush Mudgal for the Deloitte AI Innovation Analyst interview, October 2026.

**Live demo:** [bypxr.github.io/meridian-twin](https://bypxr.github.io/meridian-twin/) opens the five slide pitch with the live product inside (arrow keys to move, L for the live product, F for the FAQ, N for speaker notes). The product alone: [app/index.html](https://bypxr.github.io/meridian-twin/app/index.html). Both are single self contained files. The Ask tab and AI briefings use Claude, so they work in the claude.ai hosted version; everything else runs anywhere, offline included.

> Meridian Air is not a real airline. Airports, distances, flight delays and fuel prices are real public data. Fares, loads and costs are planning assumptions, set so the network earns about a 6% margin at Brent $90.

## The impact, in numbers

| What it does | Result in this twin (61 aircraft) | How it was measured |
|---|---|---|
| Storm recovery | **$97k saved per storm day** (28% of the storm's cost), better plan found on **36 of 36** test storms, 2,194 passenger delay hours cut per storm day | `evidence/04_value_study.js`, 36 seeded storms at ATL, ORD, DFW |
| Same, at today's fuel | **$110k per storm day** (31%), 36 of 36 | same study at Brent $125.44, crack $1.355 |
| Annual storm value | $0.3M low, **$1.2M base**, $2.9M high | 15, 30, 50 storm days a year × 20%, 40%, 60% of the gap a real ops team captures |
| Delay risk model | **AUC 0.767** on 612,038 July 2026 flights it never saw. Its riskiest tenth ran **77% late** against 28% overall (2.7x). Flagging the riskiest fifth catches 46% of late flights | `evidence/02_train.py`, real US DOT data |
| Routine delay exposure | about $418k a day, so each 1% of late minutes cut is worth **$1.5M a year** | expected late flights × 72 min average × $98.41 per block minute (Airlines for America) |
| Fuel risk | **$32M** of annual profit moves with every $10 on Brent. At today's prices (Brent $125, jet $4.34) the network **loses about $300k a day** and needs fares **14.4%** higher to earn 6% again; 42 of 49 routes are under water | `Sim.network`, exact because profit is linear in the jet price |

Scaled to airline size (base case, calibration fuel):

| Fleet | Storm recovery a year | 1% fewer late minutes | $10 on Brent |
|---|---|---|---|
| 61 aircraft (this twin) | $1.2M | $1.5M | $32M |
| 150 | $2.9M | $3.8M | $80M |
| 300 | $5.7M | $7.5M | $159M |
| 800 | $15.2M | $20.0M | $424M |

Scaling is linear in fleet size. That is a simplification: hub structure and storm exposure differ by airline, which is exactly what a pilot measures.

## What is in here

```
app/index.html          the built prototype (open it, nothing to install)
app/pitch.html          five slide pitch with the live prototype and FAQ built in
pitch/                  slide layer, FAQ source, build_pitch.py
src/                    simulator (sim.js), UI parts, page template, trained model, build.py
evidence/
  01_prepare.py         BTS on time data + ASOS weather -> flights.parquet (7.5M flights, Jul 2025 to Jul 2026)
  02_train.py           baseline, logistic ladder, gradient boosting; out of time test on July 2026
  03_fuel.py            EIA Brent and Gulf Coast jet spot prices -> today's fuel, crack spread, trailing averages
  04_value_study.js     36 seeded storms, twin plan against waiting it out, at two fuel prices
  results/              metrics.json, model_raw.json, fuel_summary.json, value_study.json
tests/sim.test.js       determinism, linear profit, exact breakevens, no double booked aircraft, model sanity
data/README.md          where to download every input (raw data is not committed)
MODEL_CARD.md           what the delay model is, how it was tested, where it fails
FAQ.md                  the questions an interviewer or a client will ask
```

## Run it

```bash
npm test                      # 8 simulator and model checks, no dependencies (Node 18+)
python3 src/build.py          # rebuild app/index.html after editing src/
python3 pitch/build_pitch.py  # rebuild app/pitch.html
npm run value                 # rerun the storm value study

# full evidence pipeline (Python 3.10+, pandas, pyarrow, scikit-learn, scipy; about 8 GB RAM)
python3 evidence/01_prepare.py data/raw data/out data/raw/asos.csv
python3 evidence/02_train.py data/out evidence/results
python3 evidence/03_fuel.py data/raw/brent.csv data/raw/jet.csv
```

## How it works

1. **Simulator.** 61 aircraft and 6 spares fly 178 flights a day from ATL, ORD and DFW to 16 real airports. Every flight carries revenue, fuel, crew, ownership and delay cost. It is deterministic, so every number can be checked.
2. **Storm recovery.** A ground stop pushes delays down each aircraft's day and runs crews out of legal hours. The optimizer tests cancel and swap combinations and returns four plans: wait it out, protect profit, protect passengers, reset the network.
3. **Delay risk.** A logistic model trained on 6.3 million real US flights scores every simulated departure two hours ahead, using congestion at both airports and the same aircraft's previous leg.
4. **Fuel.** Jet = Brent ÷ 42 + crack spread, anchored to EIA spot prices through October 6, 2026.
5. **Claude.** Explains plans, drafts passenger notices and can drive the page through tools. It never computes a number and cannot approve a plan.

## Honest limits

- The airline is simulated. The value study compares the twin with waiting it out, which is a weak baseline; real ops teams already do better than that, which is why the capture rate is 20% to 60%, not 100%.
- Crew legality and aircraft swaps are simplified. Maintenance, gates and connecting passengers are not modelled.
- Weather adds only about 0.008 AUC on top of the other inputs, and covers about half of 2026 flights.
- July 2026 ran later than the training months (28% late against 22%), so the raw model underpredicts by 1 to 3 points per tenth. The page applies a one number base rate correction. A live version retrains monthly.
- No controller has used it. The proposal's first gate is a shadow run against real decisions.

## License

MIT. Data sources: US DOT Bureau of Transportation Statistics, US EIA, Iowa Environmental Mesonet ASOS archive, Airlines for America.
