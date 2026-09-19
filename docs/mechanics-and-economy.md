# Shared mechanics and the survival economy

[Research index](./README.md) · [Match flow](./match-flow.md) · [Game comparison](./game-comparison.md)

This chapter separates recurring ideas from title-specific implementations. Tactical consequences labeled **synthesis** are interpretations of the evidence, not measured claims about the average player.

## Rounds, spawning, and difficulty

An ordinary round is a wave to clear, followed by a short transition and another wave. Clearing the enemies currently visible does not necessarily finish the round: additional enemies can still enter. The **total population of a round** and the **maximum simultaneously active population** are different quantities. Population rules also depend on the game and player count; original World at War has notable map-specific exceptions. [Classic chapter, CS02]

Difficulty is not simply “add one zombie every round.” Across the sample, pressure can rise through enemy durability, numbers, speed, spawn pacing, and special-enemy composition. BO6's official reveal explicitly describes faster movement and increasingly dangerous mixtures of armored and special enemies at higher rounds. No common health equation, active-enemy cap, or special-round interval is established by this research. [M1]

Special rounds interrupt the ordinary rhythm on maps that have them. Kino's Hellhound waves are one example, with a Max Ammo reward on completion. They are not evidence that every map has dogs or that every fifth round must be a dog round. [Classic chapter, CS06]

## Movement and damage avoidance

Ordinary zombies pursue players and become especially dangerous when several close approaches remove the player's escape space. In BO6, enemies can also throw projectiles when they cannot reach the player, and special enemies introduce attacks beyond ordinary melee. The exact navigation and targeting implementation is not documented here. [M1]

**Synthesis:** keeping a clear exit is often more valuable than firing continuously. Reloading, interacting with a machine, or reviving creates a period of reduced combat flexibility. Players use separation, elevation, traps, and distractions to make those actions safer. This is why both the classic Town guide and modern official guides spend time on routes rather than only weapon damage. [M1, M2, M3]

Health recovery, maximum health, and damage protection must be kept distinct. Juggernog raises resilience where present; BO4 removes it in favor of difficulty-dependent starting health, and modern armor introduces a separately maintained protection layer. A generic “two hits to die” rule is unsuitable across this sample. BO4 Zombies also must not inherit BO4 Multiplayer's manual-healing rules. [BO3/BO4 chapter; modern chapter; M8]

For example, BO4 and Cold War allow health regeneration after a delay without further damage, and Quick Revive modifies recovery. Creating distance therefore gives health a chance to return; it does not automatically refill a separate armor resource. Exact delays and perk effects are title-specific. [Call of Duty Wiki: Quick Revive](https://callofduty.fandom.com/wiki/Quick_Revive)

## Currency: three different incentives

| Era                        | How ordinary combat rewards work                                                                                       | Tactical implication — synthesis                                         |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| World at War through BOIII | Nonlethal hits grant points, with different lethal-hit awards.                                                         | Multiple controlled weak hits can build money before a finishing blow.   |
| BO4                        | Damage rewards are tied to fractions of the enemy's health, with bounded ordinary earnings and finishing bonuses.      | Merely shooting more weak bullets does not create the same extra income. |
| Cold War and BO6           | Ordinary Essence income centers on kills, with critical-kill rewards and other game-specific assistance/bonus sources. | Efficient kills and critical shots matter more than classic hit farming. |

Source: [M4], cross-checked against the era chapters. This table intentionally does not extend the BO6 earning table to every BO7 playlist.

For a concrete **classic** example, the community points reference records **10 points for a nonlethal hit**, **100 for a lethal headshot**, and **130 for a lethal melee hit**. These are event awards, not interchangeable total rewards for every enemy: preceding hits can add to the total. They are not modern Essence values. [M4]

Repairing classic window boards earns limited points and slows entry; it is not a points purchase. Buying a door or clearing purchasable debris is a different interaction. Repair income is limited, so the ability to rebuild a window does not imply unlimited currency farming. [M4]

### Why money remains a survival constraint

The same points wallet often funds doors, guns, ammunition, perks, upgrades, and traps. Spending on one delays another. Opening a route benefits the team, while a perk or weapon primarily benefits its purchaser. **Synthesis:** this creates useful co-op negotiations over who buys doors and who needs equipment first. BO6 additionally supports splitting a door's price. [M2, M3]

Modern games add **Salvage**, which is not interchangeable with Essence. Cold War has ordinary and high-grade Salvage; BO6 consolidates this into one type. Armor, rarity, equipment, and Ammo Mod purchase rules differ between those games. The [modern chapter](./modern-survival.md) provides the title-specific allocation instead of assuming one modern shopping list.

## Weapons and upgrades

- **Wall buy:** a known weapon at a known place and price; in classic play, the matching wall purchase can also supply ammunition. Predictability helps plan a route. [M2; classic chapter]
- **Mystery Box:** a randomized weapon purchase. It can offer otherwise difficult-to-obtain equipment, but money spent does not guarantee the desired result. [M1; classic chapter]
- **Pack-a-Punch (PaP):** an in-match weapon upgrade where available. BOIII repacking, BO4 repeated damage upgrades, and modern three-tier upgrading are different systems. It is not present on every classic Survival map. [Era chapters]
- **Wonder Weapon:** a special weapon with unusual effects, often tied to particular maps. The category does not imply identical damage, ammunition, upgrade access, or acquisition methods. BO6's Beamsmasher, for example, has multiple distinct attacks. [M9]
- **Weapon rarity:** in Cold War and BO6, an additional damage-progression track, separate from Pack-a-Punch. Improving one does not mean the other has been improved. [M1, M3; modern chapter]
- **Ammo Mods / alternate ammo:** added effects whose acquisition and trigger behavior vary by game. BOIII's repack effects should not be described as the same purchase system as BO6's Arsenal Mods. [BO3/BO4 chapter; M1]

A better weapon still has a magazine, reload commitment, and ammunition supply to consider. **Synthesis:** “sustainable” means the loadout can keep clearing threats and replenishing resources, not just deliver a large one-time burst.

## Perks, power, and preparation

A **perk** is a purchased ongoing ability; a **power-up** is typically an immediate or temporary pickup effect. Perks do not all exist on every map, and a familiar name does not guarantee identical behavior across titles. Quick Revive is the clearest example: World at War's co-op benefit is not Black Ops' solo recovery, nor BO4's independent self-revive system. [Classic and BO3/BO4 chapters]

Similarly, **power** and **Pack-a-Punch access** are separate map conditions. Kino has a power switch and teleporter-link setup. BOII Town Survival requires neither a power switch nor TranZit's upgrade-access puzzle. BO7 Vandorn Farm's guide explicitly includes modern upgrade facilities in its confined Survival arena. [M2, M3; BO7 chapter]

Pre-match progression also differs from in-match purchases. BOIII Weapon Kits customize eligible guns when acquired; BO4 preselects perks that must still be bought in the match. Cold War skill upgrades and BO6 researched/equipped Augments affect future runs but do not imply that bought doors, armor, perks, and upgraded guns all persist into a fresh match. Consumable inventories are another separate layer. [Era chapters]

## Power-ups and ammunition rhythm

| Pickup        | Typical function                                                   | Important boundary                                                                                                                                              |
| ------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Max Ammo      | Replenishes weapon ammunition.                                     | Before BO4, ordinarily refills reserves rather than the current magazine; BO4 onward also refills magazines. Equipment replenishment changes again in Cold War. |
| Double Points | Temporarily increases eligible point earnings.                     | Eligible events and interactions depend on the game; it is not a discount on every purchase.                                                                    |
| Insta-Kill    | Lets attacks instantly kill ordinary zombies for a limited period. | Does not mean every special enemy or boss instantly dies, or that the player becomes invulnerable.                                                              |
| Nuke          | Clears spawned ordinary zombies and creates breathing room.        | Does not necessarily kill bosses, remove future spawns, or end the current round.                                                                               |
| Carpenter     | Repairs eligible barricades.                                       | Its additional effects and usefulness depend on the title; it is not a permanent seal on spawn entrances.                                                       |

Sources: Max Ammo [M5], points and Carpenter reward context [M4], Insta-Kill [M6], Nuke [M7], and the classic overview's basic pickup descriptions [M10]. No universal drop probability or duration is asserted. The Max Ammo source records weapon-specific exceptions even before BO4, so “reload before collecting” is classic advice rather than a franchise-wide necessity.

**Synthesis:** pickup timing can be a tradeoff. A Nuke can rescue a dangerous situation while sacrificing opportunities to earn individual kill/hit rewards. Crossing a horde to collect Max Ammo may cost the run it was meant to save. These are tactical consequences, not reasons to always accept or always avoid a pickup.

## Cooperation and recovery

Players cooperate against the AI rather than defeat one another in ordinary Survival. Revives, door purchases, emergency equipment, and route choices affect the group. A teammate leading another horde across a planned escape route can make a previously safe pattern unsafe. [Classic chapter; M1, M3; route interaction is synthesis]

Distinguish:

1. **Downed:** incapacitated, but potentially revivable.
2. **Dead/bleeding out completed:** no longer available for an ordinary revive; classic co-op return usually waits for the next round.
3. **Revived:** back in play, but potentially missing perks or other protection.
4. **Run ended:** no remaining survival/recovery path, or a supported successful finish such as exfil.

The costs of each transition vary. A universal rule like “all perks and guns disappear immediately on every down” would be wrong. See the era chapters for ordinary loss rules and named exceptions.

## Sources

Accessed 2026-09-18. Detailed historical/version claims also link to the evidence-bearing era chapters.

- **M1 — Activision on PlayStation Blog, primary, 2024-08-08:** [BO6 Zombies reveal](https://blog.playstation.com/2024/08/08/black-ops-6-zombies-and-the-terminus-launch-map-full-details-revealed/). Movement, equipment, enemy composition, upgrade systems.
- **M2 — Gamer Guides, secondary map guide:** [Depot–Farm–Town](https://www.gamerguides.com/call-of-duty-black-ops-ii/guide/zombies-guide/survival-and-grief-modes/depot-farm-town-guide). Facilities, purchases, and movement routes.
- **M3 — Activision, primary, 2024-11-21:** [Liberty Falls](https://www.callofduty.com/guides/blackops6/zombies/call-of-duty-guides-black-ops-6-round-based-zombies-liberty-falls). Spending, door sharing, routes, and rarity/PaP relationship.
- **M4 — Call of Duty Wiki, community:** [Points](<https://callofduty.fandom.com/wiki/Points_(Zombies)>). Earning models, classic awards, repair limits, power-up scoring.
- **M5 — Call of Duty Wiki, community:** [Max Ammo](https://callofduty.fandom.com/wiki/Max_Ammo). Reserve/magazine and equipment differences.
- **M6 — Call of Duty Wiki, community:** [Insta-Kill](https://callofduty.fandom.com/wiki/Insta-Kill). Ordinary-enemy effect and stronger-enemy exceptions.
- **M7 — Call of Duty Wiki, community:** [Nuke](<https://callofduty.fandom.com/wiki/Nuke_(Zombies)>). Spawned-enemy clearing and exceptions.
- **M8 — Call of Duty Wiki, community:** [Health System](https://callofduty.fandom.com/wiki/Health_System). Mode- and title-dependent health rules; not used as an exact balance table.
- **M9 — Xbox Wire, official platform coverage, 2024-08-15:** [BO6 Zombies details](https://news.xbox.com/en-us/2024/08/15/call-of-duty-black-ops-6-zombies-more-details/). Beamsmasher attacks and customization.
- **M10 — Gamer Guides, secondary overview:** [BOII Zombies overview](https://www.gamerguides.com/call-of-duty-black-ops-ii/guide/zombies-guide/zombies-mode/overview). Used only for basic pickup descriptions, not its inaccurate universal map or numerical health claims; see [source limitations](./sources.md).
