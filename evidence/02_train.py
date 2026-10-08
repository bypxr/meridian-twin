"""Step 2. Train and test the delay risk model on 2026 data with an out of time split.

Train Jul 2025 to May 2026 (11 months, so every season but summer 2026 is seen), tune on June 2026, TEST on July 2026 (never seen, released by BTS on 21 Sep 2026).
Target: arrival 15 or more minutes late. Cancelled and diverted flights are left out.
Prediction time: two hours before scheduled departure. Output: model.json and metrics.json
"""
import sys, json, numpy as np, pandas as pd, scipy.sparse as sp
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.metrics import roc_auc_score, brier_score_loss
IN, OUT = sys.argv[1], sys.argv[2]
d = pd.read_parquet(IN + '/flights.parquet'); d = d[d.ok].copy()
for c in ('Origin', 'Dest', 'Reporting_Airline'): d[c] = d[c].astype(str)
TWIN = ['ATL','ORD','DFW','JFK','BOS','DCA','PHL','MIA','MCO','DTW','MSP','DEN','PHX','LAS','LAX','SFO','SEA','BNA']
tr = d[d.ym <= 202605].copy(); va = d[d.ym == 202606].copy(); te = d[d.ym == 202607].copy(); del d; import gc; gc.collect()
wx = [c for c in tr.columns if c.startswith('wx_')]
top = list(dict.fromkeys(TWIN + list(tr.Origin.value_counts().head(45).index)))
for f in (tr, te):
    f['o'] = np.where(f.Origin.isin(top), f.Origin, 'OTH'); f['dd'] = np.where(f.Dest.isin(top), f.Dest, 'OTH')
    f['h'] = f.hour.clip(5, 22)
    # delay still left on the aircraft after the scheduled turn (35 minutes is the working minimum turn)
    f['prop'] = np.where(f.ac_known == 1, np.clip(f.late_ac - np.maximum(f.slack - 35, 0), 0, 300), 0.0) / 60.0
    f['late_k'] = np.where(f.ac_known == 1, np.clip(f.late_ac, -30, 300), 0.0) / 60.0
    f['slack_h'] = np.where(f.ac_known == 1, np.clip(f.slack, 0, 720), 0.0) / 60.0
    f['dist_k'] = f.Distance / 1000.0
NEED = ['y','ym','FlightDate','Origin','Dest','o','dd','h','hour','dow','dist_k','cong_o','cong_d','late_k','slack_h','prop','ac_known','ArrDelay'] + wx
tr = tr[NEED].copy(); te = te[NEED].copy(); gc.collect()
g0 = float(tr.y.mean()); print('rows', len(tr), len(va), len(te), 'base late share train', round(g0, 4), 'test', round(float(te.y.mean()), 4))
cats_o = sorted(tr.o.unique()); cats_d = sorted(tr.dd.unique())

def onehot(vals, cats, prefix):
    idx = pd.Categorical(vals, categories=cats).codes; n = len(idx); ok = idx >= 0
    return sp.csr_matrix((np.ones(ok.sum(), dtype=np.float32), (np.flatnonzero(ok), idx[ok])), shape=(n, len(cats))), [prefix + str(c) for c in cats]

def design(f, groups):
    mats, names = [], []
    def add(m, n): mats.append(m); names.extend(n)
    def dense(cols):
        add(sp.csr_matrix(np.column_stack([f[c].values.astype(np.float32) for c in cols])), list(cols))
    if 'sched' in groups:
        add(*onehot(f.o.values, cats_o, 'o_')); add(*onehot(f.dd.values, cats_d, 'd_'))
        add(*onehot(f.h.values, list(range(5, 23)), 'h_')); add(*onehot(f.dow.values, list(range(7)), 'w_'))
        dense(['dist_k'])
    if 'cong' in groups:
        tmp = f[['cong_o', 'cong_d']].rename(columns={'cong_o': 'cong'}); add(sp.csr_matrix(tmp.values.astype(np.float32)), ['cong', 'cong_d'])
    if 'ac' in groups: dense(['ac_known', 'prop', 'late_k', 'slack_h'])
    return sp.hstack(mats, format='csr'), names

def rep(y, p, extra=None):
    o = np.argsort(-p); n = len(p); t10 = y[o[:n // 10]].mean()
    r = dict(auc=round(float(roc_auc_score(y, p)), 4), brier=round(float(brier_score_loss(y, p)), 4),
             top10=round(float(t10), 4), lift=round(float(t10 / y.mean()), 2), caught20=round(float(y[o[:n // 5]].sum() / y.sum()), 3))
    return r
y = te.y.values; R = {}; P = {}
# baseline: history of the origin by hour
b = tr.groupby(['o', 'h']).y.mean().rename('b').reset_index()
P['baseline'] = te.merge(b, on=['o', 'h'], how='left').b.fillna(g0).values
fits = {}
for name, groups in (('logit_schedule', ['sched']), ('logit_cong', ['sched', 'cong']), ('logit_aircraft', ['sched', 'cong', 'ac'])):
    Xtr, names = design(tr, groups); Xte, _ = design(te, groups)
    m = LogisticRegression(C=0.5, max_iter=400).fit(Xtr, tr.y); P[name] = m.predict_proba(Xte)[:, 1]; fits[name] = (m, names)
    print(name, rep(y, P[name]), flush=True); del Xtr, Xte; gc.collect()
# gradient boosting benchmarks, with and without weather
base = ['o', 'dd', 'h', 'dow', 'dist_k', 'cong_o', 'cong_d', 'late_k', 'slack_h', 'prop', 'ac_known']
def gx(f, cols):
    out = []
    for c in cols:
        if c in ('o', 'dd'): out.append(pd.Categorical(f[c].values, categories=cats_o if c == 'o' else cats_d).codes.astype(np.float32))
        else: out.append(f[c].values.astype(np.float32))
    return np.column_stack(out)
rs = np.random.default_rng(1)
tr26 = tr[tr.ym >= 202601]
full = tr.iloc[np.sort(rs.choice(len(tr), 3000000, replace=False))]
for name, cols, rows in (('gbm', base, full), ('gbm26', base, tr26), ('gbm26_weather', base + wx, tr26)):
    gb = HistGradientBoostingClassifier(max_iter=250, learning_rate=0.08, categorical_features=[0, 1], random_state=0).fit(gx(rows, cols), rows.y.values)
    P[name] = gb.predict_proba(gx(te, cols))[:, 1]; print(name, rep(y, P[name]), flush=True); del gb; gc.collect()
R = {k: rep(y, v) for k, v in P.items()}
# weather subset: July flights where origin weather exists
sub = te.wx_vis_o.notna().values
R_sub = {k: rep(y[sub], v[sub]) for k, v in P.items()}
# uncertainty: resample days
rng = np.random.default_rng(0); days = te.FlightDate.dt.day.values; ci = {}
for k in ('baseline', 'logit_schedule', 'logit_aircraft', 'gbm', 'gbm26', 'gbm26_weather'):
    a = []
    for _ in range(60):
        pick = rng.choice(31, 31); idx = np.concatenate([np.flatnonzero(days == (j + 1)) for j in pick])
        a.append(roc_auc_score(y[idx], P[k][idx]))
    ci[k] = [round(float(np.percentile(a, 2.5)), 4), round(float(np.percentile(a, 97.5)), 4)]
# calibration of the shipped logistic
p = P['logit_aircraft']; bins = np.quantile(p, np.linspace(0, 1, 11)); cal = []
for i in range(10):
    mk = (p >= bins[i]) & ((p <= bins[i + 1]) if i == 9 else (p < bins[i + 1]))
    cal.append([round(float(p[mk].mean()), 4), round(float(y[mk].mean()), 4), int(mk.sum())])
m, names = fits['logit_aircraft']
coef = dict(zip(names, [round(float(c), 4) for c in m.coef_[0]]))
late = tr[tr.ym >= 202601]; late = late[late.y == 1]
byh = te.assign(p=p).groupby('hour').agg(pred=('p', 'mean'), act=('y', 'mean')).round(4)
hub = {h: round(float(te[te.Origin == h].y.mean()), 4) for h in ('ATL', 'ORD', 'DFW')}
out = {'intercept': round(float(m.intercept_[0]), 4), 'coef': coef, 'g0': round(g0, 4),
       'meta': {'source': 'US DOT BTS Reporting Carrier On-Time Performance, Jul 2025 to Jul 2026 (7.5M flights), plus ASOS weather Jan to Jul 2026 for the weather benchmark',
                'train': int(len(tr)), 'valid': int(len(va)), 'test': int(len(te)), 'testBase': round(float(y.mean()), 4),
                'target': 'arrival delay of 15 minutes or more', 'predictionTime': 'two hours before scheduled departure',
                'split': 'train Jul 2025 to May 2026, tune June 2026, test July 2026'},
       'results': R, 'resultsWeatherSubset': R_sub, 'aucCI95': ci, 'cal': cal,
       'byHour': {'hour': [int(h) for h in byh.index], 'pred': byh.pred.tolist(), 'act': byh.act.tolist()},
       'congQ': [round(float(q), 3) for q in np.quantile(te.cong_o, [.1, .5, .9, .99])],
       'meanLateMin': round(float(late.ArrDelay.mean()), 1), 'medLateMin': round(float(late.ArrDelay.median()), 1), 'hubLate': hub}
json.dump(out, open(OUT + '/model.json', 'w')); json.dump({k: out[k] for k in ('results', 'resultsWeatherSubset', 'aucCI95', 'cal', 'meta', 'hubLate', 'meanLateMin', 'medLateMin')}, open(OUT + '/metrics.json', 'w'), indent=1)
print(json.dumps({k: out[k] for k in ('results', 'aucCI95', 'meanLateMin', 'medLateMin', 'hubLate')}, indent=1)); print('cal', cal)
print({k: v for k, v in coef.items() if k in ('cong', 'cong_d', 'prop', 'late_k', 'slack_h', 'ac_known', 'dist_k')}, out['intercept'])
