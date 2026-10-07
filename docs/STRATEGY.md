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

You start every round as the left rider (red) with your opponent on your right.
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
  regenerates**; only health kits restore it.
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
- **The river changes width.** Wide stretches are so broad that the tow rope stops
  you long before the bank, so the shore can't touch you. In medium and **narrow**
  stretches (visible ahead as the banks pinch in), the bank is inside rope reach.
- **The shore** (narrow water only): scraping drains 4 balance/s *and* blocks
  regeneration. Slamming into it fast (hard turns, getting shoved) costs a chunk more
  ("SLAMMED!").
- **Health kits:** small +10, big +25 to **both balance and tube air**. They float into
  view about 3 seconds before they reach you. Whoever's tube is over the kit when it
  arrives gets it.

### Boat speed and the wake

The boat changes speed every 7–13 seconds. The gauge under the turn banner shows
the current speed and flashes **SPEEDING UP!** or **SLOWING DOWN** about 2.5 seconds
before a change. Every round starts slow.

In 1 Player you pick a mode first. **1999 (Easy)** only uses slow and medium speeds,
so the water is flat or has a small wake and jumps are rare. **2010 (Hard)** adds full
throttle, with big wakes, big air and stomps. 2 Players always uses all three speeds.

1999 has its own, shorter crew, and you're shorter too (5'3" instead of 5'8"). Each
1999 rider fights exactly like their 2010 counterpart, so the scouting reports below
still apply.

| 2010 | 1999 | Style |
| --- | --- | --- |
| Burton (6'5") | Mike (5'8") | Rammer |
| Chillo (6'1") | Billy (5'5") | Rookie |
| Barf (5'9") | Dan (5'7") | Sub-boss: mixes the four styles above |
| Moni (5'9") | RJ (5'2") | Passive strafer |
| Franzi (5'4") | Rob (5'0") | Close-range spammer |
| B-Nap (5'0") | Adam (4'8") | Final boss |
| You (5'8") | You (5'3") | |

| Speed | Wake ridges | Turn fling | Jumps |
| --- | --- | --- | --- |
| Slow | None (flat water) | 1x | No |
| Medium | Small | 1.15x | Only with a very fast slide |
| Full throttle | Big | 1.3x | Any fast slide over a crest |

- **The ridges** sit about two tube-widths either side of the centerline, just
  outside where you start. Riding up one tilts you and slowly slides you back down.
- **Jumping:** cross a crest with enough sideways speed and you launch. The faster
  you're moving, the higher and farther you fly. Turns, knockback and dodges all give
  you that speed. A turn flinging you outward and then the rope swinging you back in
  is the classic launch.
- **In the air** you can't attack or be hit, can't grab health kits, and only have
  a little lean control.
- **Going over:** if you're above your opponent's head while you pass over them, you
  land on their other side and you've swapped sides.
- **STOMP:** come down mostly on top of them, after having cleared their head, and
  they lose **30 balance and 15 tube air**. That's more than any single attack.
  Glancing landings just bump off.
- Turns at full throttle fling harder, and the turn banner appears from farther away
  to give you the same reaction time.

### Height and weight

Taller riders reach a little farther with every attack; shorter riders a little less.
You can still hit anyone: attacks aim at the target's own head and body, and ducking
works against everyone.

| 2010 rider | Height | Reach vs you (5'8") | Notes |
| --- | --- | --- | --- |
| Burton | 6'5" | +8% (low kick ~390) | 1.8x heavier: shrugs off knockback and wins bumps |
| Chillo | 6'1" | +4% | |
| Barf, Moni | 5'9" | +1% | |
| Franzi | 5'4" | -4% | |
| B-Nap | 5'0" | -7% (punch ~240) | Shortest reach, so he makes up for it with timing |

| 1999 rider | Height | Reach vs you (5'3") |
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
  ([Road Rash guide][rr1-faq]). Battle Tubes shows bends on screen and flashes
  "TURN AHEAD" before the boat turns. Use that warning.
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

### Chillo: the rookie idiot (6'1")
Wobbles back and forth at no fixed distance, swings all three attacks evenly, and
**often attacks when you're nowhere near him**. Barely defends. Doesn't ram you or
retreat.
- Let him whiff. Every swing at empty water is free recovery time for you.
- Punch freely: Chillo rarely ducks. Good practice for duck-then-low-kick timing.

### Franzi: the close-range spammer (5'4")
Sits tube to tube (~190) and **attacks nonstop**, mostly punches. Her reach is short
and her defense is poor.
- She's always one-handed. Duck the punch and low kick her for double tube damage.
- Back out past ~250 and her punches can't reach, while your mid and low kicks still
  can. She has to come back in, often mid-windup.

### Burton: the rammer (6'5")
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

### Moni: the passive strafer (5'9")
Keeps her distance (~320, outside punch range) and **slides in and out** around it.
Mostly mid kicks with some low kicks, almost never punches, and dodges often.
**Backs off when her balance drops below 40** and won't attack while retreating.
- Time your approach for when her strafe swings toward you, then punch: at punch
  range she has no fast answer.
- When she retreats she drifts toward her own (right) bank. In narrow water, follow
  and pin her there: no regen and steady scrape damage. Left turns make this brutal.
- She dodges a lot, so don't overextend. Low kicks from max range wear down her tube,
  and air damage sticks even when she recovers balance.

### Barf: the sub-boss (5'9", Dan in 1999)
He has no style of his own. He **fights like one of the four riders below him**,
Chillo, Franzi, Burton or Moni, and switches to a different one at random every 5–10
seconds and at the start of every round. There's no on-screen tell, so you have to
read him.

| If he's... | He's copying | Do this |
| --- | --- | --- |
| Swinging at empty water, drifting in and out | Chillo | Punch freely, let him whiff |
| Glued to your tube, punching nonstop | Franzi | Duck and low kick, or back out past ~250 |
| Leaning into you, shoving you toward your bank | Burton | Trade in wide water, brace before the narrows |
| Hanging back (~320), mid kicking, retreating when hurt | Moni | Close in on her strafe, chase him into his bank |

- **Spend the first second or two of each style reading him** before you commit. His
  spacing gives it away fastest.
- **Don't get comfortable.** A plan that's working can turn wrong when he switches.
  Rushing in on a "Moni" who's just become "Franzi" walks you into a punch flurry.
- His reactions match his rung (sharper than any of the four originals), but his body
  doesn't change. As "Burton" he shoves with normal weight, so his pushes are easier
  to resist than the real Burton's.

### B-Nap: the final boss (5'0")
The shortest reach on the ladder, but uses everything, reacts the most, takes 10%
less damage, **retreats below 30 balance**, and goes after almost every health kit it
can reach. He only shoves you when you're already near the bank in narrow water.
- **Deny kits.** Get between B-Nap and the kit, or steer kits on your side into your
  own tube. Every kit you take is one he can't.
- When he retreats he stops attacking, so chase him into his shore and keep him pinned.
- Tube damage is your best bet: it doesn't regenerate and he can only refill it with
  kits you're denying.
- Expect more ducks and dodges. Throw fewer, better-timed attacks, ideally right after
  he whiffs.

## Quick checklist

1. Read the turn banner. Left turn: attack. Right turn: brace. (This flips if you've
   jumped to the right side.)
2. Watch the speed gauge. At full throttle, look for a fast run over the crest at
   your opponent.
3. Watch the banks. In narrow water, stay off your own shore.
4. Duck punches, low kick the one-handed puncher.
5. Dodge late, not early (one tap counts).
6. Hold 255–370 against punchers, close in against kickers.
7. Back off past 370 to regenerate. Grab kits on your side.

[rr1-manual]: https://oldgamesdownload.com/wp-content/uploads/Road_Rash_Manual_Genesis_EN.pdf
[rr1-faq]: https://gamefaqs.gamespot.com/genesis/586425-road-rash/faqs/55386
[rr2-faq]: https://gamefaqs.gamespot.com/genesis/586426-road-rash-ii/faqs/14312
[rr3-faq]: https://gamefaqs.gamespot.com/genesis/586427-road-rash-3/faqs/55117
[eotj]: https://www.extentofthejam.com/RoadRashAnalysis/index.html
[tas]: https://tasvideos.org/Forum/Topics/17594
