# Call of Duty Zombies: Survival research

Research date: **2026-09-18**. This is a gameplay reference, not a specification of features already implemented in this repository.

## What does a typical game look like?

**Synthesis:** players survive successive rounds, turn combat rewards into access and equipment, establish a sustainable way to kill the horde, and recover from mistakes until the run ends. Good shooting matters, but so do movement, ammunition, spending priorities, map knowledge, and—in co-op—keeping teammates alive. Later games add more pre-match customization and additional ways to finish a run.

That pattern is supported by both [classic map guidance](https://www.gamerguides.com/call-of-duty-black-ops-ii/guide/zombies-guide/survival-and-grief-modes/depot-farm-town-guide) and the [official Liberty Falls guide](https://www.callofduty.com/guides/blackops6/zombies/call-of-duty-guides-black-ops-6-round-based-zombies-liberty-falls). It is not a claim that every game has identical rules.

## Two meanings of Survival

- **Named Survival mode:** compact, relatively self-contained survival maps, notably Black Ops II's Bus Depot, Farm, Town, and Nuketown Zombies, and Black Ops 7's Vandorn Farm. BO7's official guide explicitly distinguishes Survival from Standard round-based play: one confined location, no main quest, and survival as the focus. See [classic Survival](./classic-survival.md) and [BO7 Survival](./black-ops-7-survival.md).
- **Broader round-based survival:** the recurring Zombies format across World at War and the Black Ops series. It can include substantial map setup and optional story quests without requiring players to pursue those quests just to play for rounds.

The distinction matters: **a map can support round-based survival without its playlist being named “Survival.”** Conversely, a named Survival map does not automatically include every familiar Zombies system.

## Reading order

| Document                                            | Purpose                                                                                                |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| [Match flow](./match-flow.md)                       | What players actually do from spawn through setup, sustained survival, recovery, and the end of a run. |
| [Mechanics and economy](./mechanics-and-economy.md) | Rounds, movement, points, weapons, perks, power-ups, and co-op decisions.                              |
| [Game comparison](./game-comparison.md)             | Fast cross-game matrix and the differences most likely to be confused.                                 |
| [Classic Survival](./classic-survival.md)           | World at War, Black Ops, and Black Ops II, including BOII's named Survival maps.                       |
| [Black Ops III and 4](./black-ops-3-and-4.md)       | Consumables, weapon customization, and BO4's reworked perks and loadouts.                              |
| [Modern Survival](./modern-survival.md)             | Cold War and BO6: Essence, Salvage, armor, upgrade tracks, and exfil.                                  |
| [Black Ops 7 Survival](./black-ops-7-survival.md)   | The named mode's return, using Vandorn Farm as a focused case study.                                   |
| [Sources and limitations](./sources.md)             | Evidence standards, shared references, known source problems, and unresolved quantitative details.     |

## Coverage and boundaries

Eight games form the sample: **World at War (2008), Black Ops (2010), Black Ops II (2012), Black Ops III (2015), Black Ops 4 (2018), Black Ops Cold War (2020), Black Ops 6 (2024), and Black Ops 7 (2025)**. Representative maps are used rather than an exhaustive catalog.

The emphasis is ordinary solo and up-to-four-player cooperative round-based play. Competitive variants, Dead Ops Arcade, Outbreak, Modern Warfare Zombies, and objective-focused formats are outside the baseline. Advanced Warfare, Infinite Warfare, WWII, Vanguard, mobile games, mods, and later seasonal maps are not comprehensively surveyed. This is a deliberate sample across eras, not a history of every Zombies release or every mode ever named Survival.

## How to interpret the findings

- **Documented mechanic:** attributed to a title/map and a linked source.
- **Synthesis:** an explanation of how documented mechanics combine into player decisions; not an official rule or a claim about measured player behavior.
- **Example:** an illustrative route or sequence, not a mandatory build order or optimal strategy.
- **Version-sensitive detail:** tied to the source's date or stated release baseline. Accessing a launch article today does not turn its figures into current-patch verification.

No game-client experiments, code reverse-engineering, or statistical gameplay study were performed. Exact spawn formulas, health curves, drop odds, and timing constants are intentionally not presented as verified implementation data. Follow the era-specific citations before using any detail as a balancing rule.
