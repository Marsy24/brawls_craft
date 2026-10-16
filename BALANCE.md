# Balance model

## Scope and evidence

This is an initial mathematically constrained balance, **not a human-playtested final balance**. Reports are reproducible with `npm run balance` and `npm run simulate`. `docs/BALANCE_REPORT.md` contains actual combat-model measurements; `docs/CAMPAIGN_REPORT.md` contains scripted campaigns, explicitly distinct from browser tests.

## Formulas

Let L be level, P derived attack power, C skill coefficient, A defense.

- HP = round(baseHP × (1 + 0.09 × (L−1))) + armorValue × 2.
- P = basePower × (1 + 0.075 × (L−1)) + weaponValue.
- A = baseDefense + 1.6 × (L−1) + armorValue. Necromancer's Bone Armor adds 15 while a summon is alive.
- Mitigation multiplier = 100 / (100 + max(0,A)). No negative damage and no immunity from armor.
- Damage = P × C × mitigation × (critical ? 1.6 : 1) × active multipliers.
- EHP = HP × (1 + A/100). Does not include healing, shielding, dodge or regeneration.
- Expected basic DPS = P × attackRate × mitigation × (1 + criticalChance × 0.6).
- Gear crit capped at 50%; marked-target talent may raise effective crit to 65%.
- Target bonus: mark ×1.25; curse ×1.20; boss vulnerability ×1.25. Class passives and talent multipliers are explicitly applied in combat.
- Skill sustained DPS estimate = damage / cooldown, bounded by resources, hit probability, targets, downtime and cooldown rotation. Simulation uses real resource and cooldown logic.
- Resource pool 100, regeneration 10/s. A class cannot produce unlimited casts.
- Poison/bleed: 0.35 × P per second for 3 s, refreshed instead of stacked; poison talent extends to 5 s. DOT cannot crit.
- Control: after a stun, immunity lasts its duration plus 2.5 s; bosses' stun capped at 0.3 s. Slows do not stop movement.
- Summons: 18 s, 45% power per 1.2 s, max 3, no self-replication. Talent can extend life by 8 s.
- Potion: 40% maximum HP, cooldown 22 s. Free but cannot be spammed. Dodge: 0.25 s immunity, cooldown 4 s.

XP to next level: `80 + 35*(L−1) + 12*(L−1)^2`. Total level 1→15 = 14,133 XP. Extra XP at cap is discarded. XP for kills is settled after either victory or defeat; no rewards are written mid-combat.

Enemy level = max(hero level, mission recommended level). Enemy HP/power multiplier = `(1 + 0.095*(enemyLevel−1)) * difficulty`. Normal difficulty 1; veteran 1.3. Enemy armor adds enemyLevel to its configured base. Movement and cooldowns do not scale infinitely with level. Boss phase II at 50% HP: speed ×1.12, cooldown ×0.78, one group of three adds.

Gear value before rarity: weapon `3+0.8L`, armor `4+L`, accessory `2+0.22L`; multiplier `1+0.12*rarityIndex`, then round. Legendary therefore has at most a bounded 48% increase over the same base item, not orders of magnitude. Gear drop: 52/30/13/4.5/0.5%. Slots equip only one item each. Inventory maximum 60; overflow items convert to their visible salvage price.

## Rewards and economy

Victory mission XP/gold: base × optional objective factor 1.25 × veteran factor 1.25. First clear grants ×1.5 mission XP and one chest. Kill XP is separate and does not receive those multipliers. Every third successful run grants a chest; first-clear and third-win conditions grant one chest total, never two. Defeat gold = min(kills × 2, round(base mission gold × 0.2)); immediate retreat gives nothing. A run is settled only once by the application controller.

One item per victory; salvage = 8 + 2L + 6\*rarityIndex. Chests cost 160 earned gold, or are free as above. No payment integrations. Talent reset is free to encourage experimentation.

Cosmetic base weights: 55/28/12/4/1%. After 9 consecutive common/uncommon openings, the next converts common/uncommon rolls to rare, yielding 95/4/1% rare/epic/legendary on that opening. Rare-or-better resets the counter. Duplicate shards: 5/8/11/14/17. Any missing skin can be crafted for 30 shards, including legendary. Cosmetics are intentionally absent from `statsFor`.

## Adjustments from simulation

First scripted run exposed beacon losses for every class: ranged damage did not properly redirect attacks from the beacon. Added 3 s aggro on hit, 6 s on Warrior warcry, beacon base HP 500→700, 15% repair between completed waves. Rerun passed all 25 class/mission pairs on seed 431. This correction is supported by a real simulation, not a claim that all play styles are equally viable.

Initial level-5 stationary-target DPS range was 70.8–81.5 (about 15% spread), with Warrior 319 EHP and Mage 178 EHP. Position resets in that experiment remove the movement costs of retreats/dashes; results must not be used alone to rank classes.

## Remaining hypotheses

Human tests are needed for aiming, clarity of boss ring safe zones, melee execution under latency, talent opportunity costs and repeated mission variety. Scripted normal campaigns are intentionally forgiving and take roughly 4–6 minutes total with near-perfect automation. Veteran difficulty and repeat runs extend progression to 15; no unsupported real-player duration estimate is promised. DOM tests do not verify WebGL, screenshots, real input focus or FPS. The HUD displays live measured frame rate when run in a real browser.
