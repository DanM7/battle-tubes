# Battle Tubes: Strategy Guide

How to beat the CPU on the ladder, built from the current controls and tuning
(`src/config.js`) plus what veteran players learned from Road Rash 1 and 2.

## Controls

| Action | Keyboard (1P) | Touch |
| --- | --- | --- |
| Lean left / right | ← / → (or A / D) | ◀ ▶ |
| Duck (hold) | ↓ (or S) | ▼ |
| High punch (head) | R | HI |
| Mid kick (body) | F | MID |
| Low kick (tube) | V | LOW |
| Dodge | Tap lean **away** from the attacker just before the hit lands | same |

You start every round as the left rider with your opponent on your right.
Tubes can't pass through each other; they bump and drift apart. The only way to
switch sides is to jump clean over your opponent off the wake.

## The numbers that matter

Distances are center-to-center between the two tubes. Tubes touch at **180**.

| Attack | Windup | Total commitment | Reach | Hits | Damage |
| --- | --- | --- | --- | --- | --- |
| High punch | 0.20 s | 0.65 s | ~255 | Head (balance) | 22 |
| Mid kick | 0.25 s | 0.67 s | ~345 | Body (balance) | 14 |
| Low kick | 0.32 s | 0.82 s | ~370 | Tube (air) | 14, **28** if target is punching |

- **Two ways to lose:** balance hits 0 (knocked off) or tube air hits 0 (popped).
- **Balance regenerates** 4/s once you've gone 1.5 s without damage. **Air never
  regenerates**; only health kits restore it. Your tube is drawn smaller as it loses
  air and flashes red ("LOW AIR!") below 35.
- **Endurance** (the orange bar under balance) pays for everything you do. Out of 100:
  a punch costs 12, a mid kick 14, a low kick 16, a successful dodge 10, and holding
  duck drains 8/s. It comes back at 16/s once you've gone 0.6 s without spending any.
  An attack every 1.5 s is sustainable for an average rider; mashing empties the bar
  in under 4 seconds.
- **Gassed:** below 30 endurance the bar flashes red ("GASSED!") and your attacks get
  slower and weaker, down to 1.5x windup and recovery and 60% damage at 0. You stay
  gassed until it's back to 50. Running out never knocks you off, but a gassed rider
  is easy to punish.
- **Punching is one-handed** from windup through recovery (your tube outline turns
  orange). A low kick landing in that window does double tube damage.
- **Duck** drops your head under punches. Mid and low kicks still hit you, and you
  can't attack while ducked.
- **Dodge:** your *first* tap away after the enemy starts winding up counts, and it
  must land in the last 0.18 s of their windup (or during the hit). Tap too early and
  you've burned your dodge. A dodged or ducked attack adds 0.25 s to the attacker's
  recovery, which is your free hit.
- **Faster attacks win trades.** If both riders swing, the punch lands first and
  cancels a slower kick.
- **The river changes width.** In wide and medium stretches the tow rope stops you
  before the bank, so the shore can't touch you, and there's room for both riders
  side by side on the flat water outside a wake. In **narrow** stretches (visible
  ahead as the banks pinch in), the bank is inside rope reach.
- **The shore** (narrow water only): scraping drains 4 balance/s *and* blocks
  regeneration. Slamming into it fast (hard turns, getting shoved) costs a chunk more
  ("SLAMMED!").
- **Health kits:** small +10, big +25 to **both balance and tube air**. They float into
  view about 3 seconds before they reach you. Whoever's tube is over the kit when it
  arrives gets it.

### Boat speed and the wake

The boat changes speed every 7–13 seconds, and every round starts slow. By default
you judge the speed from how fast the banks rush past and how big the wake is. With
**Debug Mode** on (gear button under P1's name), a speed gauge at the top shows the
current speed and flashes **SPEEDING UP!** or **SLOWING DOWN** about 2.5 seconds
before a change.

In 1 Player you pick a rider, then a mode. **1999 (Easy)** only uses slow and medium speeds,
so the water is flat or has a small wake and jumps are rare. **2010 (Hard)** only
stays slow for the first 3–5 seconds of each round, then switches between medium and
full throttle and never slows back down until the next round: big wakes, big air and
stomps. That slow opening is the calmest water you'll get, so use it to land early
damage. (2 Players is coming soon.)

1999 has its own, shorter crew, and your rider is shorter too. Each 1999 rider
fights exactly like their 2010 counterpart, so the scouting reports below still apply.

| 2010 | 1999 | Style |
| --- | --- | --- |
| Burton (6'2") | Mike (5'8") | Rammer |
| Chillo (6'0") | Billy (5'5") | Rookie |
| Barf (5'10") | Dan (5'7") | Sub-boss: mixes the four styles above |
| Moni (5'9") | RJ (5'2") | Passive strafer |
| Franzi (5'8") | Rob (5'0") | Close-range spammer |
| B-Nap (5'7") | Adam (4'8") | Final boss |

| Speed | Wake | Turn fling | Jumps |
| --- | --- | --- | --- |
| Slow | None (flat water) | 1x | No |
| Medium | Small | 1.15x | Only with a very fast slide |
| Full throttle | Big | 1.3x | Any fast cut back in over a crest |

- **The wake** raises all the water between its two crests, which sit about two
  tube-widths either side of the centerline, just outside where you start. Between
  the crests you ride high and level. Past a crest, the outer face tilts you and
  slides you down and away to the flat water outside (wide enough for both tubes);
  the rope pulls you back.
- **Jumping:** ride up an outer face and over the crest with enough sideways speed
  and you launch. Heading out over a crest never launches you; you just slide down
  the face. The faster you're moving, the higher and farther you fly. Turns,
  knockback and dodges all give you that speed. A turn flinging you outward and then
  the rope swinging you back in is the classic launch.
- **In the air** you can't attack or be hit, can't grab health kits, and only have
  a little lean control.
- **Going over:** if you're above your opponent's head while you pass over them, you
  land on their other side and you've swapped sides.
- **STOMP:** come down mostly on top of them, after having cleared their head, and
  they lose **30 balance and 15 tube air**. That's more than any single attack.
  Glancing landings just bump off.
- Turns at full throttle fling harder and arrive sooner. (In Debug Mode the turn
  banner appears from farther away to give you the same reaction time.)

### Choosing your rider

You pick the mode first, then your rider, because each mode has its own crew. The top
row of the grid is your own riders: tap a **+** to make one (up to 4 per mode), then
set their name, height (4'6" to 6'6"), grip and trunks. They're saved in the browser.
Every opponent from that mode is on the grid below, locked until you beat them in that
mode (beating Billy in 1999 doesn't unlock Chillo in 2010). Jeff, a bonus rider who
isn't on the ladder, unlocks in both modes once you've beaten the final boss in both
1999 and 2010. Every unlockable rider also has a password: enter it on the main menu's
**Password** screen to unlock them in both modes, or enter **CROM** to unlock every
rider at once (`UNLOCK_ALL_PASSWORD` in `src/config.js`). **BRAP** unlocks hard mode
(2010) without beating anyone on Easy. Every opponent's name, colors, height, grip,
description and unlock rule are in `src/characters.js`. Cheat passwords (`CHEATS` in
`src/config.js`) work the same way: **GETLOW** turns on invincibility, and **EUGE**
makes you a giant (double height and double attack damage). Both add an ON/OFF switch
to the in-game Settings panel.

Riders are a trade between **reach** (height), **endurance** (shorter is better) and
**grip** (how much damage you take). Rider select shows each rider's grip and endurance
as 1 to 5 boxes. Trunks color is cosmetic.

Custom riders share **5 build points** between height and grip (`CUSTOM.buildPoints`
in `src/config.js`). Grip costs its value minus 1 (grip 1 is free, grip 5 costs 4).
Height costs by band, and the same band sets the endurance rating:

| Height | Cost | Endurance |
| --- | --- | --- |
| 4'6"–5'0" | 0 | 5 |
| 5'1"–5'5" | 1 | 4 |
| 5'6"–5'10" | 2 | 3 |
| 5'11"–6'2" | 3 | 2 |
| 6'3"–6'6" | 4 | 1 |

So a 6'6" rider can have grip 2 at most, and grip 5 means 5'5" or shorter. The +
buttons dim when you can't afford the next step. Opponents don't follow the budget:
B-Nap's 5'7" with grip 5 is a boss build. Between matches, **Back** on the ladder screen returns you to
rider select to switch riders; you keep your place on the ladder.

- **Height:** each inch adds a little under 1% to every attack's reach. A new custom
  rider starts at 5'8" in 2010 and 5'3" in 1999, the baseline for the reach numbers
  in this guide.
- **Grip:** grip 3 takes normal damage. Each point above cuts damage taken by 6%
  (grip 5: -12%); each point below adds 6% (grip 1: +12%).
- **Endurance and size:** every endurance cost scales with height and recovery scales
  the other way, about 1.2% per 1% of height. Compared with a 5'9" rider, a 6'6" rider
  spends about 18% more and recovers 15% slower; a 4'8" rider spends about 23% less and
  recovers faster.
- **Tall and loose** can sit at the edge of an opponent's range and still land kicks,
  but loses trades up close and has to pace their attacks.
- **Short and sticky** has to get close, so the opponents who keep their distance
  (Moni, and Barf when he's mimicking him) are the hardest fights. In exchange, every
  hit, scrape and stomp hurts less.
- **Unlocked opponents** play with their own height, grip and weight (Burton keeps
  his 1.8x weight in bumps; B-Nap has grip 5). You can end up fighting your own twin
  on the ladder.

### Height and weight

Taller riders reach a little farther with every attack; shorter riders a little less.
Taller riders also have bigger hitboxes. You can still hit anyone: attacks aim at the
target's own head and body, and ducking works against everyone. The game doesn't show
heights; the ladder figures are drawn to scale, and these are the numbers behind them.

| 2010 rider | Height | Reach vs a 5'8" rider | Notes |
| --- | --- | --- | --- |
| Burton | 6'2" | +5% (low kick ~380) | 1.8x heavier: shrugs off knockback and wins bumps |
| Chillo | 6'0" | +4% | |
| Barf | 5'10" | +3% | |
| Moni | 5'9" | +1% | |
| Franzi | 5'8" | even | |
| B-Nap | 5'7" | -1% | Shortest on the 2010 ladder, but only just |

| 1999 rider | Height | Reach vs a 5'3" rider |
| --- | --- | --- |
| Mike | 5'8" | +5% |
| Dan | 5'7" | +4% |
| Billy | 5'5" | +2% |
| RJ | 5'2" | -1% |
| Rob | 5'0" | -3% |
| Adam | 4'8" | -6% |

## What Road Rash taught us

Road Rash veterans agree that the difference between players isn't button speed.
It's **positioning, timing, reading the road, and knowing your rival**.

- **Use the environment, not just your fists.** Road Rash guides consistently say the
  kick's real value is shoving a rival into oncoming cars or obstacles at the right
  moment ([Road Rash II FAQ][rr2-faq], [Road Rash guide][rr1-faq]). In Battle Tubes
  the hazard is the **shore**: knockback and bumps push your opponent into it, and a
  boat turn can pin them there.
- **Timing beats mashing.** In Road Rash you stole a rival's club by punching *as they
  swung* ([Genesis manual][rr1-manual]). Here the same idea is ducking a punch or
  catching a puncher one-handed with a low kick.
- **Read the road ahead.** One Road Rash FAQ author mapped every tenth of a mile of
  every track as left, right or straight so he always knew what was coming
  ([Road Rash guide][rr1-faq]). In Battle Tubes, watch the river bend up ahead: by
  the time the bend reaches the boat, you should already be leaning. (Debug Mode
  adds a "BOAT TURNING" banner if you want the warning spelled out.)
- **Know who you're fighting.** Road Rash showed the nearest rival's name so you could
  decide whether to engage. Tough riders were better kicked away than fought, and the
  AI would drop back when its health was low and return once recovered
  ([Extent of the Jam analysis][eotj]). Speedrunners sorted the AI into types:
  harmless "idiots", aggressive attack spammers, passive strafers, and rammers trying
  to kick you off the road ([TASVideos][tas]). The Battle Tubes CPUs use those same
  archetypes.
- **Make them miss.** TAS players noted that missed attacks push the AI into worse
  positions ([TASVideos][tas]). Here, every dodge or duck buys you 0.25 s of
  punishment time.
- **Hit, then hit again.** Road Rash 3 guides note that a struck rider falls back and
  quickly comes alongside again, ready to be hit once more ([Road Rash 3 guide][rr3-faq]).
  In Battle Tubes knockback separates you, and the CPU drifts back into range on its
  own. Have your next attack ready instead of chasing.

## Core tactics

### Spacing is everything
- **Under 255** (tubes nearly touching): all three attacks reach. This is the punch
  zone, and also where you're easiest to punish.
- **255–345:** mid kick and low kick only. Safe from punches.
- **345–370:** low kick only. Poking a tube from max range is very hard to answer.
- **Over 370:** nothing reaches. Use it to recover balance.

Leaning on a straight is slow, so plan your spacing a second or two ahead. These
ranges are for an average-height rival; add a little against Burton and subtract a
little against Franzi and B-Nap.

### Turns decide fights
The boat flings both riders opposite to its turn, so a **left turn throws everyone
right**. In wide water a turn just swings you out to the end of the rope. In narrow
water it throws you into the bank. You're always on the left, which means:

- **Left turns are your opportunity.** Your opponent is thrown into the right shore
  and pinned there, scraping. You're on the inside, so lean *with* the turn to drive
  into them. The bump pushes them harder into the shore, their balance can't
  regenerate, and they can barely move. Throw punches.
- **Right turns are your danger.** You're the one being thrown into the left shore.
  When "RIGHT TURN AHEAD" flashes, start leaning right *before* the turn, then keep
  leaning against the fling. On easy and medium turns you can hold off the shore. On
  hard turns you can't fully, but leaning still slows you enough to avoid the slam
  damage.

### Full throttle: go airborne
- **Set up stomps from outside the wake.** Get flung past the crest by a turn, then
  lean back in as the rope pulls you. You'll cross the crest fast, heading straight
  at your opponent. Big jumps clear their head and come down on top of them.
- **Short hops don't stomp.** If your jump doesn't get above their head you just
  bump into them in the air.
- **Escape a pin.** In narrow water, a jump over your opponent swaps sides and takes
  you off your shore. Against Burton this is the best way out.
- **Watch for incoming jumpers.** A rider coming at you over the crest can land on
  you. Lean away so they come down beside you, not on top of you.

### Punish windows (your best damage)
1. **Duck a punch, then low kick.** The puncher stays one-handed through a long
   recovery, so your low kick does 28 tube damage. Two of those and the tube is half
   gone.
2. **Dodge a kick, then punch.** The extra recovery after a whiff gives your 0.20 s
   punch time to land.
3. **Make punches whiff with spacing.** Sit at 255–370 and a punch can't reach you,
   but your low kick still reaches them. Start it as soon as you see their punch
   windup and it lands while they're still one-handed.

### Meter management
- **Pick a meter and commit.** Balance regenerates and air doesn't, so damage to the
  tube is permanent. Against defensive or retreating CPUs, air is the more reliable
  target.
- **Disengage like Road Rash AI.** If your balance is low, get out past 370 and let it
  regenerate. Keep off your shore while you do (scraping blocks regeneration).
- **Health kits restore air too.** A big kit can save a nearly popped tube.
- **Pace yourself.** Throw fewer, better-timed attacks and let endurance refill between
  them. Dodging is cheaper than attacking but not free, so a pure defensive game wears
  you down too. When a rival is gassed, their attacks are slow enough to duck or dodge
  on reaction: that's the time to press.

### Health kit control
Riders can't pass each other, so **a kit on your side of your opponent is yours** if
you get there. Kits between you are contested; use a bump to win them. The CPU only
chases kits on its own side of you, or ones right between you.

## CPU scouting reports

The ladder order is always the same, in both modes:

| Rung | 2010 | 1999 |
| --- | --- | --- |
| 1 | Chillo | Billy |
| 2 | Franzi | Rob |
| 3 | Burton | Mike |
| 4 | Moni | RJ |
| 5 (sub-boss) | Barf | Dan |
| 6 (boss) | B-Nap | Adam |

Each rung's CPU reacts faster and attacks more often than the one before. Each
rider's personality decides **how** they fight. The reports below are in ladder
order.

### Chillo: the rookie idiot (6'0")
Wobbles back and forth at no fixed distance, swings all three attacks evenly, and
**often attacks when you're nowhere near him**. Barely defends. Doesn't ram you or
retreat.
- Let him whiff. Every swing at empty water is free recovery time for you, and he
  never rests, so his wild swinging soon leaves him gassed.
- Punch freely: Chillo rarely ducks. Good practice for duck-then-low-kick timing.

### Franzi: the close-range spammer (5'8")
Sits tube to tube (~190) and **attacks nonstop**, mostly punches. She's your height,
so her reach matches yours, and her defense is poor.
- She's always one-handed. Duck the punch and low kick her for double tube damage.
- Back out past ~260 and her punches can't reach, while your mid and low kicks still
  can. She has to come back in, often mid-windup.
- **She never stops to rest**, so she gasses within the first few seconds of a round
  and stays gassed. Survive the opening flurry by ducking and keeping your distance
  (don't burn your own endurance trading with her), then go after her once her
  attacks slow down.

### Burton: the rammer (6'2")
The biggest rider on the river. He **leans into you constantly** to push you toward
your bank. He's 1.8x heavier, so your bumps and knockback barely move him, and he
leans harder than anyone. Mostly mid kicks, with the longest reach in the game.
- In wide water his shoving is harmless; the rope stops you before the bank. Trade
  with him there.
- When the banks pinch in, expect to get pinned and scraped. Lean right *before* the
  narrows and fight him with duck-and-low-kick: being pinned beside him keeps you in
  range.
- A right turn in narrow water plus Burton pushing is the most dangerous moment in the
  game. Brace early.
- He's big, so he tires fast. He eases off his attacks below 30 endurance (he keeps
  shoving), which is your window to hit back.

### Moni: the passive strafer (5'9")
Keeps his distance (~380, outside punch range) and **slides in and out** around it.
Mostly mid kicks with some low kicks, almost never punches. **Ducks punches hard**
and dodges low kicks decently, but **mid kicks usually connect** — that's his hole.
**Backs off when his balance drops below 35** and won't attack while retreating. He
also paces himself, pausing his attacks whenever his endurance drops below 40.
- Don't spam punches: he ducks most of them. Close on his strafe and mid kick.
- When he retreats he drifts toward his own (right) bank. In narrow water, follow
  and pin him there: no regen and steady scrape damage. Left turns make this brutal.
- Low kicks from max range still work sometimes; air damage sticks even when he
  recovers balance.

### Barf: the sub-boss (5'10", Dan in 1999)
He has no style of his own. He **fights like one of the four riders below him**,
Chillo, Franzi, Burton or Moni, and switches to a different one at random every 5–10
seconds and at the start of every round. There's no on-screen tell, so you have to
read him.

| If he's... | He's copying | Do this |
| --- | --- | --- |
| Swinging at empty water, drifting in and out | Chillo | Punch freely, let him whiff |
| Glued to your tube, punching nonstop | Franzi | Duck and low kick, or back out past ~260 |
| Leaning into you, shoving you toward your bank | Burton | Trade in wide water, brace before the narrows |
| Hanging back (~380), mid kicking, retreating when hurt | Moni | Mid kick him (he ducks punches), chase into his bank |

- **Spend the first second or two of each style reading him** before you commit. His
  spacing gives it away fastest.
- **Don't get comfortable.** A plan that's working can turn wrong when he switches.
  Rushing in on a "Moni" who's just become "Franzi" walks you into a punch flurry.
- His reactions match his rung (sharper than any of the four originals), but his body
  doesn't change. As "Burton" he shoves with normal weight, so his pushes are easier
  to resist than the real Burton's.

### B-Nap: the final boss (5'7")
Just a hair shorter than you, but uses everything, reacts the most, takes 10%
less damage, **retreats below 30 balance**, and goes after almost every health kit it
can reach. He only shoves you when you're already near the bank in narrow water.
- **Deny kits.** Get between B-Nap and the kit, or steer kits on your side into your
  own tube. Every kit you take is one he can't.
- When he retreats he stops attacking, so chase him into his shore and keep him pinned.
  He also pauses his attacks to recover below 40 endurance and rarely gets gassed.
- Tube damage is your best bet: it doesn't regenerate and he can only refill it with
  kits you're denying.
- Expect more ducks and dodges. Throw fewer, better-timed attacks, ideally right after
  he whiffs.

## Quick checklist

1. Read the river ahead. Left bend: attack. Right bend: brace. (This flips if you've
   jumped to the right side.)
2. Feel the speed: fast banks and big ridges mean full throttle. Look for a fast run
   over the crest at your opponent.
3. Watch the banks. In narrow water, stay off your own shore.
4. Duck punches, low kick the one-handed puncher.
5. Dodge late, not early (one tap counts).
6. Hold 255–370 against punchers, close in against kickers.
7. Back off past 370 to regenerate. Grab kits on your side.
8. Watch the orange bar. Don't swing yourself into GASSED; punish rivals who do.

[rr1-manual]: https://oldgamesdownload.com/wp-content/uploads/Road_Rash_Manual_Genesis_EN.pdf
[rr1-faq]: https://gamefaqs.gamespot.com/genesis/586425-road-rash/faqs/55386
[rr2-faq]: https://gamefaqs.gamespot.com/genesis/586426-road-rash-ii/faqs/14312
[rr3-faq]: https://gamefaqs.gamespot.com/genesis/586427-road-rash-3/faqs/55117
[eotj]: https://www.extentofthejam.com/RoadRashAnalysis/index.html
[tas]: https://tasvideos.org/Forum/Topics/17594
