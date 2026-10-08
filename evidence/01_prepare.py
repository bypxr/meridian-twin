"""Step 1. Turn raw BTS On-Time Performance files plus ASOS weather into one feature table.

Inputs  : monthly BTS zips unzipped to RAW (csv), ASOS weather csv (optional)
Output  : OUT/flights.parquet

Prediction time is T = scheduled departure minus 120 minutes. Every feature is something an
operations team would know at T:
  cong_o   share of departures from the origin in the last 3 hours that left 15+ minutes late
  cong_d   share of arrivals into the destination in the last 3 hours that were 15+ minutes late
  late_ac  the delay of the same aircraft's previous leg, if it had landed (or at least left) by T
  slack    scheduled minutes between that previous leg landing and this leg leaving
  weather  observed conditions at origin and destination (18 airports, 2026 only)
"""
import sys, glob, re, numpy as np, pandas as pd
RAW = sys.argv[1]; OUT = sys.argv[2]; WX = sys.argv[3] if len(sys.argv) > 3 else None
COLS = ['FlightDate','Reporting_Airline','Tail_Number','Origin','Dest','CRSDepTime','DepDelay','DepDel15',
        'CRSArrTime','ArrDelay','ArrDel15','Cancelled','CancellationCode','Diverted','CRSElapsedTime','Distance',
        'WeatherDelay','NASDelay','LateAircraftDelay','CarrierDelay']
frames = []
for f in sorted(glob.glob(RAW + '/*.csv')):
    d = pd.read_csv(f, usecols=COLS, low_memory=False, dtype={'Reporting_Airline':'category','Origin':'category','Dest':'category','Tail_Number':'category','CancellationCode':'category'})
    for c in ('DepDelay','ArrDelay','DepDel15','ArrDel15','CRSElapsedTime','Distance','WeatherDelay','NASDelay','LateAircraftDelay','CarrierDelay'): d[c]=d[c].astype('float32')
    d['src'] = re.search(r'(\d{4})_(\d+)\.csv', f).group(0)[:-4]
    frames.append(d); print(f[-14:], len(d), flush=True)
import gc
d = pd.concat(frames, ignore_index=True); del frames; gc.collect()
for c in ('Reporting_Airline','Origin','Dest','Tail_Number','CancellationCode'): d[c]=d[c].astype('category')
d['FlightDate'] = pd.to_datetime(d.FlightDate)
d0 = d.FlightDate.min(); d['day'] = (d.FlightDate - d0).dt.days.astype('int32')
d['ym'] = d.FlightDate.dt.year * 100 + d.FlightDate.dt.month
hm = lambda s: (s.fillna(0).astype(int) % 2400 // 100) * 60 + (s.fillna(0).astype(int) % 100)
d['dep_m'] = hm(d.CRSDepTime).astype('int32'); d['arr_m'] = hm(d.CRSArrTime).astype('int32')

# ---- local clock offsets in hours relative to Central, estimated per month from schedule arithmetic
def offsets(g):
    diff = ((g.arr_m - g.dep_m - g.CRSElapsedTime + 720) % 1440) - 720
    pr = pd.DataFrame({'o': g.Origin, 'd': g.Dest, 'x': np.round(diff / 60.0)}).dropna()
    pr = pr.groupby(['o','d']).x.agg(['median','size']).reset_index().sort_values('size', ascending=False)
    off = {'ORD': 0.0}; changed = True
    while changed:
        changed = False
        for o, dd, m, n in pr.itertuples(index=False):
            if n < 20: continue
            if o in off and dd not in off: off[dd] = off[o] + m; changed = True
            elif dd in off and o not in off: off[o] = off[dd] - m; changed = True
    return off
OFF = {ym: offsets(g) for ym, g in d.groupby('ym')}
d['off_o'] = np.float32(0); d['off_d'] = np.float32(0)
for ym, off in OFF.items():
    m = (d.ym == ym).values
    d.loc[m, 'off_o'] = d.loc[m, 'Origin'].astype(str).map(off).fillna(0).astype('float32').values
    d.loc[m, 'off_d'] = d.loc[m, 'Dest'].astype(str).map(off).fillna(0).astype('float32').values
# schedule day offset for arrival (0 or 1) chosen so elapsed time matches
c0 = d.arr_m + 0 - d.dep_m
cand0 = np.abs(c0 - d.CRSElapsedTime - 60 * (d.off_d - d.off_o)); cand1 = np.abs(c0 + 1440 - d.CRSElapsedTime - 60 * (d.off_d - d.off_o))
d['arr_day'] = d.day + (cand1 < cand0).astype('int32')
# common "Central clock" minute axis
d['dep_abs'] = (d.day * 1440 + d.dep_m - d.off_o * 60).astype('float32')          # scheduled departure
d['arr_abs'] = (d.arr_day * 1440 + d.arr_m - d.off_d * 60).astype('float32')      # scheduled arrival
d = d.drop(columns=['CRSDepTime','CRSArrTime','Cancelled'] ,errors='ignore') if False else d
d['cancel'] = d.Cancelled == 1; d['ok'] = (~d.cancel) & (d.Diverted != 1) & d.ArrDelay.notna()
d['y'] = (d.ArrDelay >= 15).astype('int8')
d['dep_act'] = (d.dep_abs + d.DepDelay).astype('float32'); d['arr_act'] = (d.arr_abs + d.ArrDelay).astype('float32')

# ---- same aircraft, previous leg
d = d.drop(columns=['off_o','off_d','arr_day','day','CRSArrTime','CRSDepTime'], errors='ignore')
d = d.sort_values(['Tail_Number', 'dep_abs']).reset_index(drop=True); gc.collect()
tc = d.Tail_Number.cat.codes.values
same = (tc[1:] == tc[:-1]) & (tc[1:] >= 0)
prev = lambda c: np.r_[np.nan, d[c].values[:-1].astype('float64')]
dc = d.Dest.astype(str).values; oc = d.Origin.astype(str).values; cont = np.r_[False, same & (dc[:-1] == oc[1:])]; del dc, oc
slack = d.dep_abs.values - prev('arr_abs'); T = d.dep_abs.values.astype('float64') - 120.0
p_arr_act, p_dep_act, p_ad, p_dd = prev('arr_act'), prev('dep_act'), prev('ArrDelay'), prev('DepDelay'); gc.collect()
late = np.where(cont & (p_arr_act <= T), p_ad, np.where(cont & (p_dep_act <= T), p_dd, np.nan))
d['late_ac'] = np.where(cont & (slack > -30) & (slack < 720), late, np.nan).astype('float32')
d['slack'] = np.where(cont & (slack > -30) & (slack < 720), slack, np.nan).astype('float32'); del late, slack, p_arr_act, p_dep_act, p_ad, p_dd; gc.collect()
d['ac_known'] = d.late_ac.notna().astype('int8')

# ---- airport congestion at T, from flights already completed
def window_rate(keys, ev_time, ev_val, q_time, g0, k=8.0, win=180.0):
    out = np.full(len(q_time), np.nan)
    order = np.argsort(keys, kind='stable'); ks = keys[order]
    bounds = np.flatnonzero(np.r_[True, ks[1:] != ks[:-1], True])
    for a, b in zip(bounds[:-1], bounds[1:]):
        idx = order[a:b]
        e = ev_time[idx]; m = ~np.isnan(e)
        et = e[m]; ev = ev_val[idx][m]; o = np.argsort(et); et = et[o]; cs = np.r_[0, np.cumsum(ev[o])]
        q = q_time[idx]; lo = np.searchsorted(et, q - win, 'left'); hi = np.searchsorted(et, q, 'right')
        n = hi - lo; s = cs[hi] - cs[lo]; out[idx] = (s + g0 * k) / (n + k)
    return out
g0 = float(d.loc[d.ok, 'y'].mean())
d['cong_o'] = window_rate(d.Origin.cat.codes.values, d.dep_act.where(~d.cancel).values.astype('float64'),
                          (d.DepDel15.fillna(0)).values.astype('float64'), T, g0).astype('float32')
d['cong_d'] = window_rate(d.Dest.cat.codes.values, d.arr_act.where(d.ok).values.astype('float64'), d.y.values.astype('float64'), T, g0).astype('float32')

# ---- weather (optional): nearest observation at scheduled departure (origin) and arrival (dest)
for side in ('o', 'd'):
    for c in ('vis', 'precip', 'gust', 'ts', 'fz', 'sn', 'fg'): d[f'wx_{c}_{side}'] = np.nan
if WX:
    w = pd.read_csv(WX, encoding='utf-8-sig')
    w['t'] = pd.to_datetime(w.valid_utc, utc=True).dt.tz_convert('America/Chicago').dt.tz_localize(None)
    w['t'] = (w.t - d0).dt.total_seconds() / 60.0
    codes = w.weather_codes.fillna('')
    w['vis'] = w.visibility_mi; w['precip'] = w.precip_1hr_in.fillna(0); w['gust'] = w.wind_gust_kt.fillna(0)
    w['ts'] = codes.str.contains('TS').astype(float); w['fz'] = codes.str.contains('FZ').astype(float)
    w['sn'] = codes.str.contains(r'SN|SG|PL').astype(float); w['fg'] = codes.str.contains(r'FG|BR|HZ').astype(float)
    w = w.sort_values('t')
    for side, col, tc in (('o', 'Origin', 'dep_abs'), ('d', 'Dest', 'arr_abs')):
        sub = d.loc[d[col].astype(str).isin(w.station.unique()), [col, tc]].copy(); sub[col] = sub[col].astype(str); sub[tc] = sub[tc].astype('float64'); sub = sub.sort_values(tc)
        m = pd.merge_asof(sub.assign(t=sub[tc]), w[['station', 't', 'vis', 'precip', 'gust', 'ts', 'fz', 'sn', 'fg']],
                          left_on='t', right_on='t', left_by=col, right_by='station', direction='nearest', tolerance=90)
        for c in ('vis', 'precip', 'gust', 'ts', 'fz', 'sn', 'fg'): d.loc[sub.index, f'wx_{c}_{side}'] = m[c].values
d['hour'] = (d.dep_m // 60).astype('int8'); d['dow'] = d.FlightDate.dt.dayofweek.astype('int8')
keep = ['src','ym','FlightDate','Reporting_Airline','Tail_Number','Origin','Dest','hour','dow','Distance','CRSElapsedTime',
        'dep_abs','arr_abs','DepDelay','ArrDelay','y','ok','cancel','CancellationCode','Diverted','cong_o','cong_d',
        'late_ac','slack','ac_known','WeatherDelay','NASDelay','LateAircraftDelay','CarrierDelay'] + [c for c in d.columns if c.startswith('wx_')]
d[keep].to_parquet(OUT + '/flights.parquet', index=False)
print('rows', len(d), 'ok', int(d.ok.sum()), 'late share', round(g0, 4), 'ac_known', round(float(d.loc[d.ok,'ac_known'].mean()), 3))
chk = d.sample(200000, random_state=1); print('tz consistency', float((np.abs(chk.arr_abs - chk.dep_abs - chk.CRSElapsedTime) < 6).mean()))
