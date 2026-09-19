# Sources, confidence, and limitations

[Research index](./README.md) · [Game comparison](./game-comparison.md)

## Method

Research was conducted on **2026-09-18** by locating and reading public web sources. Official Activision/Treyarch guides and communications were preferred for mode definitions and modern systems. Contemporary reporting and established strategy guides supplied historical context; community wikis supplied map- and title-specific mechanics not fully covered by official material.

The documents describe a representative set of eight games, not every Call of Duty Zombies mode. No game client was run, no developer scripts were inspected, and no controlled timing, health, spawn, or statistical experiment was performed. “Typical match” is a **qualitative synthesis of documented mechanics and guide advice**, not a measured average of player sessions.

## Citation layout

Each era chapter contains its own claim-linked bibliography:

| Chapter                                             | Citation prefix   | Principal evidence                                                                  |
| --------------------------------------------------- | ----------------- | ----------------------------------------------------------------------------------- |
| [Classic Survival](./classic-survival.md)           | CS                | Contemporary BOII reveal reporting, original-map references, historical mechanics.  |
| [BOIII and BO4](./black-ops-3-and-4.md)             | B34               | Official consumable/loadout guides, patch reporting, detailed community references. |
| [Cold War and BO6](./modern-survival.md)            | M (chapter-local) | Official reveal and gameplay guides, with version-scoped mechanical detail.         |
| [BO7 Survival](./black-ops-7-survival.md)           | B7                | Official Vandorn Farm guide and launch loadout information.                         |
| [Match flow](./match-flow.md)                       | F                 | Sources supporting the cross-era sequence and concrete map examples.                |
| [Mechanics and economy](./mechanics-and-economy.md) | M                 | Shared systems, title-specific scoring, and power-up behavior.                      |

The [comparison](./game-comparison.md) links back to these evidence-bearing chapters rather than repeating every URL in every table cell. An ID such as CS11 is local to its chapter; it is not an uncited assertion or a repository issue number.

## Key source entry points

### Primary and official platform material

- Activision, [Liberty Falls map guide](https://www.callofduty.com/guides/blackops6/zombies/call-of-duty-guides-black-ops-6-round-based-zombies-liberty-falls), **2024-11-21**. Particularly useful for an actual sequence of play: earn Essence, choose a route, reach Pack-a-Punch, weigh perks against weapon upgrades, and optionally exfil.
- Valerie Lee / Activision, [BO6 Zombies reveal on PlayStation Blog](https://blog.playstation.com/2024/08/08/black-ops-6-zombies-and-the-terminus-launch-map-full-details-revealed/), **2024-08-08**. Useful for the modern system vocabulary, loadouts, equipment, Augments, enemies, and higher-round intentions. This is pre-release communication.
- Xbox Wire, [BO6 systems and features](https://news.xbox.com/en-us/2024/08/15/call-of-duty-black-ops-6-zombies-more-details/), **2024-08-15**. Official platform coverage of customization, Wonder Weapons, and solo save-and-quit. It largely draws on the same developer reveal cycle, so it is not independent experimental confirmation.
- Activision, [Vandorn Farm Survival guide](https://www.callofduty.com/guides/blackops7/zombies/survival-vandorn-farm), **2025-09-30**. The clearest primary statement of named Survival: a constrained location, no main quest, and an upgrade-driven endurance loop.
- Activision, [BO7 Zombies launch briefing](https://www.callofduty.com/blog/2025/11/call-of-duty-black-ops-7-launch-zombies), **2025-11-06**. Used for launch weapon/loadout/upgrade information, not as a blanket proof of every current Survival detail.

Additional official BOIII, BO4, and Cold War references appear in their respective chapters.

### Historical and community material

- Gamer Guides, Paul Williams, [Depot–Farm–Town](https://www.gamerguides.com/call-of-duty-black-ops-ii/guide/zombies-guide/survival-and-grief-modes/depot-farm-town-guide). Concrete facilities and route advice. The page's guide-information panel lists a 2013 guide release and 2020 update; dynamic page metadata is not treated as evidence of a newly authored gameplay guide.
- Call of Duty Wiki, [Survival](https://callofduty.fandom.com/wiki/Survival). Cross-check for named-mode distinctions, the BOII facility matrix, and the absence of a power-switch requirement in those maps.
- Call of Duty Wiki, [Points](<https://callofduty.fandom.com/wiki/Points_(Zombies)>). Useful because it separates classic hit rewards, BO4's health-fraction system, and later Essence. It is community-maintained, includes a cleanup notice, and mixes multiple titles; only explicitly scoped portions are used.
- Call of Duty Wiki, [Max Ammo](https://callofduty.fandom.com/wiki/Max_Ammo). A useful counterexample to assuming that an unchanged pickup name means unchanged mechanics.

## Source problems found and handled

### Broad guides can contain incorrect generalizations

The [Gamer Guides BOII overview](https://www.gamerguides.com/call-of-duty-black-ops-ii/guide/zombies-guide/zombies-mode/overview) is useful for introductory terminology but contains claims that should not become rules:

- It describes repair as costing points, despite its own scoring list awarding points for repairs. The independent points reference supports **earning** limited repair points.
- It says Pack-a-Punch is in each map. Its own map-specific guide and the Survival reference show **Bus Depot and Farm lack it**.
- Its wording implies the Mystery Box relocates after each opening. That is not adopted as a universal rule.
- Its numerical Juggernog description is not accepted as a reliable health specification.

The collection uses narrow, corroborated portions of that overview rather than accepting or rejecting every sentence wholesale. Historical community guides, including Neoseeker and hXcHector, likewise are not treated as authoritative numerical balance tables.

### Publication date is not current-version verification

BO6 reveal material predates release; Cold War's later systems changed after launch; BO4 received early balance changes. A source supports the ruleset it describes, not every subsequent patch. The BO7 Vandorn Farm guide includes **beta-only free GobbleGums** that are not normal inventory behavior.

Where numerical values are included, their title and context are stated. The docs deliberately avoid claiming to describe the latest weapon balance, seasonal enemy density, consumable pricing, or complete perk roster.

### Similar names conceal different systems

- Original maps and remakes can have different weapons, perks, enemies, and recovery tools.
- BOII Farm and BO7 Vandorn Farm do not share the same upgrade availability.
- Quick Revive, Double Tap, Max Ammo, and Pack-a-Punch change behavior between titles.
- BO4's points system is neither classic per-hit farming nor simply Cold War's ordinary kill rewards.
- Standard, Directed, Survival, Rush, Gauntlet, and custom rules must not be merged into one ruleset.

## Confidence boundaries

**Well-supported at the descriptive level:** the repeatable round/economy/upgrade loop; BOII arena facility differences; named Survival versus broader round-based play; the major pre-match, economy, and upgrade changes between eras.

**Context-dependent:** optimal opening routes, which purchase should come first, camping versus training, and what counts as “high rounds.” These depend on map, skill, team, loadout, and player goal; the documents present examples and synthesis, not universal prescriptions.

**Not established as exact implementation data:** spawn budgets and concurrency limits for every map, health-growth formulas and caps for every difficulty, complete damage tables, drop probabilities, regeneration/bleedout timers, all inventory-loss exceptions, and current-patch extraction schedules across all modes. Resolving those would require title/version-specific evidence or controlled gameplay work beyond this literature review.
