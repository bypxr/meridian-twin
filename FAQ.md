# Meridian Twin FAQ

Short answers to the questions an interviewer or a client is most likely to ask. Every figure traces to a script in `evidence/` or a test in `tests/`.

## The product

**What is Meridian Twin in one sentence?**

A digital copy of an airline's day that shows what a storm, a delay wave or a fuel spike will cost, tests thousands of ways out in under a second, and has Claude explain the best one so a controller can approve it.

**Is the data real?**

The flights, delays, weather and fuel prices are real public data: 7.5 million US flights from July 2025 to July 2026 (DOT), hourly airport weather (ASOS) and daily Brent and jet fuel prices through October 6, 2026 (EIA). The airline itself, Meridian Air, is simulated: real airports and distances, with fares, loads and costs set as planning assumptions so it earns about 6% at Brent $90.

**Why a simulated airline and not a real one?**

No airline publishes its crew, cost and fare data. A simulated carrier lets every number be checked end to end, and the model that scores it was proven on real flights. In a real engagement the twin is rebuilt on the client's own schedule, crew and cost data in the first nine weeks.

**What does Claude actually do, and what can't it do?**

Claude explains plans, drafts passenger notices, argues each option from a finance, customer and operations view, and can drive the page through tools. It never calculates a number (every figure comes from the simulator) and it cannot approve a plan. A person approves.

## The numbers

**How did you get $97k saved per storm day?**

I ran 36 seeded ground stops at ATL, ORD and DFW, from one to six hours. Waiting it out costs $347k on an average storm day. The twin's best plan costs $251k. The gap is $97k, or 28%, and the twin found a cheaper plan on all 36 days. At today's fuel price the gap is $110k, or 31%.

**How do you turn that into $1.2M a year?**

Base case: 30 storm days a year across three hubs, and a real ops team capturing 40% of the gap, since they already do better than waiting it out. Low case is 15 days at 20% ($0.3M). High case is 50 days at 60% ($2.9M). The assumptions are sliders on the Value tab.

**Isn't "waiting it out" a weak baseline?**

Yes, and I say so. That is why the annual figure only counts 20% to 60% of the gap. The pilot replaces this baseline with the client's actual decisions on past storm days, which is the number a finance team will sign.

**How accurate is the delay model?**

Tested on 612,038 July 2026 flights it never saw. AUC 0.767 (95% range 0.761 to 0.772). The riskiest tenth it flags ran 77% late against 28% overall, a 2.7x lift, and flagging the riskiest fifth catches 46% of late flights. A history only baseline scores 0.678.

**Why use the logistic model if gradient boosting scores 0.80?**

The logistic model is about 130 numbers, runs inside the page and anyone can audit it. Boosting is 0.03 AUC better and would run behind an API in production. Showing both is the honest trade off.

**Does weather matter?**

Less than people expect. Adding weather to boosting moves AUC from 0.794 to 0.802. The biggest single gain is the same aircraft's previous leg (+0.07). Most delay is knock on delay, which is exactly what a twin can see and weather alone cannot.

**Is the model biased by when it was trained?**

July 2026 ran later than the training months (28% late against 22%), so the raw model under predicts by 1 to 3 points in every tenth. I show that on the Risk tab, correct it with one base rate number, and the proposal retrains monthly.

**Where does the $98.41 per minute come from?**

Airlines for America's 2025 average US passenger airline cost per block minute. Applied to expected late flights and the 72 minute average delay of a late 2026 flight, routine delay exposure is about $418k a day for this network, so each 1% of late minutes is worth about $1.5M a year.

**What does today's fuel price mean for an airline?**

On October 6, 2026 Brent was $125 and Gulf Coast jet $4.34 a gallon, up about 104% and 127% since the end of 2025, with the refining margin at $1.36 against $0.46 on average in 2019 to 2025. At those prices this network loses about $300k a day, 42 of 49 routes are under water, and fares need to rise about 14.4% to earn 6% again. Every $10 on Brent moves annual profit by $32M.

**How do these numbers scale to a real airline?**

Linearly by fleet size as a first cut: a 300 aircraft airline is about $5.7M a year from storm recovery, $7.5M per 1% of late minutes and $159M per $10 on Brent. Real hubs differ, which is why the pilot measures one hub before anyone scales the claim.

## Deloitte fit

**Airlines aren't on Deloitte's sector list. Why this?**

It is a technology and AI platform with an energy price layer. The pattern is simulate the operation, optimize the response, let a language model explain it, keep a person in charge. That transfers directly: grid outage recovery and fuel cost exposure for energy, bed and theatre recovery for healthcare, emergency and transit disruption for government, outage triage for telecom.

**Don't airlines already buy recovery tools from vendors?**

Yes, large carriers run vendor recovery optimizers. The gap is integration and trust: connecting ops, crew, finance and fuel data, explaining a plan in plain language, and proving value before rollout. That is integrator and change work, which is where Deloitte wins, and it works alongside the vendor tools rather than replacing them.

**How would this make money for Deloitte?**

A fixed scope 26 week pilot at one hub, then a rollout across hubs, then the same accelerator reused in other sectors. The client pays for a measured saving, so the pitch is a business case, not a demo.

**What does the 26 week pilot look like?**

Discover (weeks 1 to 3), Connect the client's data (4 to 9), Model (8 to 15), Shadow run against real controller decisions (16 to 21), Assist with a human approving every plan (22 to 26). Each phase has a go or no go gate, and the last gate is a saving signed off by finance.

**What are the biggest risks?**

Data access and quality, controller trust, crew and union rules, model drift, and over claiming value. Each has a fix in the proposal: a data sprint first, shadow mode before advice, rules coded with the crew team, monthly retraining, and value measured against real past decisions.

## About the build

**What did you build it with?**

JavaScript for the simulator and page, Python with pandas and scikit learn for the delay model, D3 for the globe, and Claude for the advisor and as a coding partner. Code, tests and the full evidence pipeline are on GitHub.

**How do I know the numbers aren't made up?**

The simulator is deterministic and has eight automated tests: profit is exactly linear in Brent, reported breakevens give zero profit, no aircraft is ever double booked, and the model file matches the July 2026 test. Every script that produced a number is in the evidence folder.

**What would you build next?**

A replay of a real bad weather day at one hub against what actually happened, connecting passengers and crew pairings, and the boosting model behind an API with monthly retraining.
