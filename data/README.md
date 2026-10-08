# Data

Raw data is not committed. Everything is public and free.

| Input | Where | Files used |
|---|---|---|
| Flight on time data | BTS TranStats, "Reporting Carrier On Time Performance (1987 to present)", prezipped monthly files: `https://transtats.bts.gov/PREZIP/On_Time_Reporting_Carrier_On_Time_Performance_1987_present_YYYY_M.zip` | July 2025 to July 2026, 13 files |
| Weather | Iowa Environmental Mesonet ASOS download, `https://mesonet.agron.iastate.edu/request/download.phtml` | Hourly METAR for the airports in the model, Jan to Jul 2026, one CSV |
| Brent | EIA, Europe Brent Spot Price FOB (RBRTE), daily, "Download data (CSV)" at `https://www.eia.gov/dnav/pet/hist/RBRTED.htm` | `brent.csv` |
| Jet fuel | EIA, US Gulf Coast Kerosene Type Jet Fuel Spot Price FOB, daily, `https://www.eia.gov/dnav/pet/hist/EER_EPJK_PF4_RGC_DPGD.htm` | `jet.csv` |
| Delay cost | Airlines for America, US passenger airline cost per block minute 2025: $98.41 | constant in `src/parts/00_core.js` |

Put the unzipped BTS CSVs in `data/raw/`, then follow the commands in the main README.
