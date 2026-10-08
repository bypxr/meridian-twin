# Model card: Meridian Twin delay risk

**Task.** Two hours before a scheduled departure, give the chance the flight arrives 15 or more minutes late.

**Data.** US DOT BTS Reporting Carrier On Time Performance, July 2025 to July 2026, all reporting carriers (7.5M flights). Cancelled and diverted flights are left out of the target. ASOS hourly weather (Iowa Environmental Mesonet) for January to July 2026, used only in a benchmark.

**Split (out of time).** Train July 2025 to May 2026 (6.3M flights). Tune June 2026. Test July 2026 (612,038 flights), released by BTS in September 2026 and never seen in training or tuning.

**Inputs, all known at prediction time.**
- Origin and destination airport (top 45 plus "other"), departure hour, day of week, distance
- `cong`: share of departures from the origin in the 3 hours before the prediction time that left 15+ minutes late (smoothed)
- `cong_d`: the same for arrivals into the destination
- Same aircraft (tail number) previous leg: its delay if it had left by the prediction time, the scheduled turn, and the delay left after a 35 minute minimum turn

**Results on July 2026.** Base late share 28.3%.

| Model | AUC (95% range, days resampled) | Riskiest tenth late | Lift |
|---|---|---|---|
| History by airport and hour | 0.678 | 47% | 1.7x |
| Logistic, schedule only | 0.680 | 48% | 1.7x |
| Plus congestion | 0.693 | 58% | 2.0x |
| **Plus previous leg (shipped, runs in the page)** | **0.767 (0.761 to 0.772)** | **77%** | **2.7x** |
| Gradient boosting, same inputs | 0.799 | 82% | 2.9x |
| Gradient boosting plus weather (2026 only) | 0.802 | 83% | 2.9x |

Brier score of the shipped model: 0.160. Flagging the riskiest 20% of flights catches 46% of late arrivals.

**Why ship the logistic, not boosting.** It is about 130 numbers, runs in the browser, and anyone can audit it. Boosting is 0.03 AUC better and would be the production choice behind an API.

**Calibration and drift.** July was heavier than the training months. The raw model under predicts in every tenth by 1 to 3 points (for example 74% predicted against 77% actual in the riskiest tenth). The page adds a single base rate shift (+0.14 on the log odds). This is why a live model retrains monthly and monitors calibration.

**Use in the twin.** The model was trained on real flights and is scored on the simulated airline's schedule. Ambient values (average congestion and average previous leg delay) are used where the simulation has no routine noise, so a quiet day sits near the real average and a storm pushes risk up through real mechanisms.

**Not for.** Real operational decisions without retraining on the operator's own data and a shadow trial. It does not model crew, maintenance or ATC programmes directly.
