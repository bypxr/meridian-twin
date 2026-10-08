from playwright.sync_api import sync_playwright

html = """<!doctype html><html><head><meta charset="utf-8"><title>Speaker notes</title>
<style>
@page { size: 8.5in 11in; margin: 0 }
:root { --ink:#0B1F33; --mute:#51606F; --line:#D8DEE4; --soft:#F3F6F8; --acc:#0E7C66; --acc2:#E7F3EF; }
* { box-sizing:border-box; margin:0; padding:0 }
body { font-family:'Inter',sans-serif; color:var(--ink); font-size:10pt; line-height:1.4 }
.page { width:8.5in; height:11in; padding:0.45in 0.55in 0.4in; display:flex; flex-direction:column; gap:0.14in; page-break-after:always; overflow:hidden }
.page:last-child { page-break-after:auto }
header { display:flex; justify-content:space-between; align-items:flex-end; border-bottom:2.5px solid var(--ink); padding-bottom:0.1in }
.ttl { font-family:'Inter Display','Inter'; font-weight:800; font-size:21pt; letter-spacing:-0.02em; line-height:1 }
.ttl span { color:var(--acc) }
.meta { text-align:right; font-size:8.6pt; color:var(--mute); line-height:1.45 }
.meta b { color:var(--ink); font-size:9.6pt }
h2 { font-size:7.8pt; letter-spacing:0.12em; text-transform:uppercase; color:var(--acc); font-weight:700; margin-bottom:5px }
.time { display:grid; grid-template-columns:4fr 2fr 6fr 4fr 9fr; gap:3px; font-size:7.8pt; text-align:center }
.time div { background:var(--soft); border-radius:4px; padding:4px 3px; line-height:1.25 }
.time b { display:block; font-size:8.4pt }
.time .live { background:var(--ink); color:#fff }
.say { background:var(--acc2); border-radius:6px; padding:10px 13px; font-size:11.8pt }
.say b { color:var(--acc) }
.slide { display:grid; grid-template-columns:0.62in 1fr; gap:0.1in; padding:10px 0; border-bottom:1px solid var(--line) }
.slide:last-of-type { border-bottom:none }
.slide .no { font-family:'Inter Display','Inter'; font-weight:800; font-size:18pt; line-height:1 }
.slide .no small { display:block; font-family:'Inter'; font-weight:500; font-size:7.6pt; color:var(--mute); margin-top:3px }
.slide h3 { font-size:11pt; margin-bottom:2px }
.slide p { font-size:11.6pt; line-height:1.45 }
.slide .do { color:var(--mute); font-size:8.8pt; margin-top:2px }
.slide .do b { color:var(--ink) }
.steps { counter-reset:s }
.st { display:grid; grid-template-columns:0.3in 1.12in 1fr; gap:0.08in; padding:5px 0; border-bottom:1px solid var(--line); align-items:start }
.st:last-child { border-bottom:none }
.st::before { counter-increment:s; content:counter(s); width:19px; height:19px; border-radius:50%; background:var(--ink); color:#fff; font-size:8.6pt; font-weight:700; text-align:center; line-height:19px }
.st .a { font-weight:700; font-size:9.4pt }
.st .b { font-size:9.4pt }
.st .b i { color:var(--mute); font-style:normal }
.qa { display:grid; grid-template-columns:1fr; gap:0 }
.q { padding:4px 0; border-bottom:1px solid var(--line); font-size:9.3pt }
.q:last-child { border-bottom:none }
.q b { display:block; font-size:9.4pt }
.cols { display:grid; grid-template-columns:1.25fr 1fr; gap:0.22in }
.nums { display:grid; grid-template-columns:auto 1fr; gap:2px 10px; font-size:9pt }
.nums div:nth-child(odd) { font-weight:800; font-variant-numeric:tabular-nums; white-space:nowrap }
.nums div:nth-child(even) { color:var(--mute) }
ul { list-style:none }
li { position:relative; padding-left:12px; margin-bottom:3px; font-size:9.2pt }
.page:first-child li { font-size:10.8pt; margin-bottom:5px }
li::before { content:''; position:absolute; left:0; top:0.5em; width:5px; height:5px; border-radius:50%; background:var(--acc) }
.warn { background:#FFF5E0; border-radius:6px; padding:8px 11px; font-size:9.2pt }
.warn b { color:#8A5A00 }
footer { margin-top:auto; font-size:7.8pt; color:var(--mute); display:flex; justify-content:space-between }
</style></head><body>

<div class="page">
<header>
  <div class="ttl">Speaker notes <span>Front</span></div>
  <div class="meta"><b>Thursday, October 8, 11:00 to 11:45 am</b><br>Bank of America Career Services<br>Meridian Twin, Option D</div>
</header>

<section>
  <h2>The 45 minutes</h2>
  <div class="time">
    <div><b>0 to 4</b>Slides 1 and 2</div>
    <div><b>4 to 6</b>Slide 3</div>
    <div class="live"><b>6 to 20</b>Live product</div>
    <div><b>20 to 24</b>Slides 4 and 5</div>
    <div><b>24 to 45</b>Their questions</div>
  </div>
</section>

<section class="say"><b>Say first, about 20 seconds.</b> "Airlines lose money in three places: storms, routine delays and fuel. I built a digital twin of an airline that shows what each one costs and tests the way out. I would rather show you than tell you."</section>

<section>
  <h2>Slide by slide</h2>
  <div class="slide"><div class="no">1<small>Cover</small></div><div>
    <h3>Three numbers, then move on</h3>
    <p>"$97k saved per storm day. The riskiest tenth of flights runs late 77% of the time, against 28% overall. $5.7M a year for a 300 aircraft airline. It is a simulated airline, so these are estimates."</p></div></div>
  <div class="slide"><div class="no">2<small>The problem</small></div><div>
    <h3>Why an airline</h3>
    <p>"The pain is easy to see: $347k on a storm day, $418k a day in routine delays, and fuel. At the October 6 jet price of $4.34 a gallon this airline loses about $300k a day. I chose airlines, but the pattern carries to energy, healthcare, government and telecom."</p></div></div>
  <div class="slide"><div class="no">3<small>Launch</small></div><div>
    <h3>Hand over to the product</h3>
    <p>"Let me show you instead of telling you." Press Launch. The demo is on the back of this page.</p>
    <div class="do"><b>Keys:</b> arrows move, L opens the live product, F opens the FAQ, N shows notes, Esc comes back.</div></div></div>
  <div class="slide"><div class="no">4<small>The value</small></div><div>
    <h3>Be modest on purpose</h3>
    <p>"This is storm recovery only. I counted 30 storm days a year and only 40% of the gap. That is $1.2M a year for this airline, $2.9M at 150 aircraft, $5.7M at 300. The pilot replaces my estimate with a number your finance team signs."</p></div></div>
  <div class="slide"><div class="no">5<small>Close</small></div><div>
    <h3>End on the ask, then stop talking</h3>
    <p>"One hub. 26 weeks. A saving finance can sign off. That is how I would turn this from a demo into something a client pays for. I would love your thoughts on where it breaks."</p></div></div>
</section>

<section>
  <h2>Three things to land</h2>
  <ul>
    <li><b>Builder.</b> Working product, 8 automated tests, public code, a model tested on a month it never saw.</li>
    <li><b>Sector insight.</b> Airlines lose money in storms, delays and fuel, and the saving can be measured.</li>
    <li><b>Judgement.</b> A person approves every plan, and I say where the limits are before I am asked.</li>
  </ul>
</section>

<footer><span>Turn over for the demo path and answers</span><span>Pratyush Mudgal</span></footer>
</div>

<div class="page">
<header>
  <div class="ttl">Speaker notes <span>Back</span></div>
  <div class="meta"><b>Demo path and answers</b><br>Keep this side facing you</div>
</header>

<section>
  <h2>Live demo, about 14 minutes</h2>
  <div class="steps">
    <div class="st"><div class="a">Fuel tab</div><div class="b">Click <b>Oct 6 2026 spot</b>. <i>The top bar turns red: about a $300k loss a day, 42 of 49 routes under water, fares would need to rise 14.4%.</i> "This is the fuel layer."</div></div>
    <div class="st"><div class="a">Risk tab</div><div class="b">Show the model table and the riskiest departures. <i>"Two hours before each flight, it scores the chance of running late. Tested on July 2026, a month it never saw."</i></div></div>
    <div class="st"><div class="a">Storm tab</div><div class="b">Run the storm at O'Hare, noon to four. <i>"Waiting costs about $347k. The twin tries thousands of plans and prices each one."</i></div></div>
    <div class="st"><div class="a">Compare plans</div><div class="b">Show the four plans and approve one. <i>"A person approves every plan."</i></div></div>
    <div class="st"><div class="a">Ask Claude</div><div class="b">Ask why this plan is best. <i>"Claude explains it in plain words and drafts the passenger notice."</i></div></div>
    <div class="st"><div class="a">Come back</div><div class="b">Press Esc or the Slides button, go to slide 4.</div></div>
  </div>
</section>

<div class="warn"><b>Before you walk in.</b> The Ask Claude features only work on the claude.ai version of the link, and you need to be signed in to claude.ai. The GitHub link shows everything else. If wifi fails, the QR codes on your handout still work from a phone.</div>

<section>
  <h2>If they push</h2>
  <div class="qa">
    <div class="q"><b>Is the data real?</b>The delay model uses real US flights and weather, and fuel uses real EIA prices. The airline itself is simulated, set to a 6% profit margin.</div>
    <div class="q"><b>Isn't waiting a weak baseline?</b>Yes. Real teams already beat it, which is why I count only 40% of the gap and call it an estimate.</div>
    <div class="q"><b>Brent is about $105, not $125.</b>$125 is the physical spot price from the EIA, and $105 is the futures price. Airlines buy jet fuel in the physical market. My results depend only on the jet price, $4.34.</div>
    <div class="q"><b>Why a simple model?</b>The one in the app is explainable and runs in the page, with AUC 0.767. A boosted model reaches 0.799, and 0.802 with weather. That is the next step.</div>
    <div class="q"><b>Does Claude make the decision?</b>No. Claude explains and drafts. A person approves every plan.</div>
    <div class="q"><b>What would you build next?</b>Replay a real bad weather day against what happened, add crew pairings, and put the model behind an API with monthly retraining.</div>
  </div>
</section>

<section class="cols">
  <div>
    <h2>Numbers to know cold</h2>
    <div class="nums">
      <div>$97k</div><div>saved per storm day, 28%</div>
      <div>36 of 36</div><div>storms where the twin won</div>
      <div>$347k, $251k</div><div>waiting against the twin's plan</div>
      <div>77%, 28%</div><div>riskiest tenth against overall late rate</div>
      <div>0.767</div><div>AUC, on 612,038 flights from July 2026</div>
      <div>6.3M</div><div>real flights used for training</div>
      <div>$1.2M</div><div>a year, 61 aircraft. $5.7M at 300</div>
      <div>$4.34</div><div>jet fuel, October 6, about a $300k loss a day</div>
    </div>
  </div>
  <div>
    <h2>If you go blank</h2>
    <ul>
      <li>Say the problem again in one sentence.</li>
      <li>Say what the twin does: predict, simulate, explain, approve.</li>
      <li>Ask them what they would want to see next.</li>
    </ul>
  </div>
</section>

<footer><span>github.com/bypxr/meridian-twin</span><span>pratyushmudgal.lovable.app</span></footer>
</div>
</body></html>"""

open('speaker_notes.html','w').write(html)
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(); pg.set_content(html); pg.wait_for_timeout(300)
    for i,h in enumerate(pg.evaluate("[...document.querySelectorAll('.page')].map(e=>[e.scrollHeight,e.clientHeight])")): print('page',i+1,h)
    pg.pdf(path='Speaker_Notes_Front_and_Back.pdf', width='8.5in', height='11in', print_background=True, prefer_css_page_size=True)
    b.close()
