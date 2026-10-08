"""Step 3. Fuel layer from US EIA daily spot prices.
Inputs (download as CSV from EIA): Europe Brent spot (RBRTE) and US Gulf Coast kerosene jet fuel spot (EER_EPJK_PF4_RGC_DPG).
Crack spread here = jet $/gal minus Brent $/bbl / 42. Output: results/fuel_summary.json
Run: python evidence/03_fuel.py BRENT.csv JET.csv
"""
import sys, json, pandas as pd
def load(p, name):
    f = pd.read_csv(p, skiprows=4); f.columns = ['day', name]; f['day'] = pd.to_datetime(f.day); return f
b = load(sys.argv[1], 'brent'); j = load(sys.argv[2], 'jet')
f = b.merge(j, on='day').sort_values('day').dropna(); f['crack'] = f.jet - f.brent / 42
last = f.iloc[-1]; y = f[f.day > last.day - pd.Timedelta(days=365)]
pre = f[(f.day >= '2019-01-01') & (f.day < '2026-01-01')]
ytd0 = f[f.day <= '2025-12-31'].iloc[-1]
y26 = f[f.day >= '2026-01-01']
out = {'asOf': str(last.day.date()), 'brent': round(last.brent, 2), 'jet': round(last.jet, 3), 'crack': round(last.crack, 3),
       'trailing12': {k: round(float(y[k].mean()), 3) for k in ('brent', 'jet', 'crack')},
       'crackAvg2019to2025': round(float(pre.crack.mean()), 3),
       'brentChangeSince2025': round(float(last.brent / ytd0.brent - 1), 3), 'jetChangeSince2025': round(float(last.jet / ytd0.jet - 1), 3),
       'brent2026Low': [str(y26.loc[y26.brent.idxmin(), 'day'].date()), float(y26.brent.min())],
       'brent2026High': [str(y26.loc[y26.brent.idxmax(), 'day'].date()), float(y26.brent.max())]}
os_ = __import__('os'); os_.makedirs('evidence/results', exist_ok=True)
json.dump(out, open('evidence/results/fuel_summary.json', 'w'), indent=1); print(json.dumps(out, indent=1))
