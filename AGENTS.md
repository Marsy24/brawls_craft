# Development instructions

Work on a feature branch; never force-push. Keep original art and lore; no unlicensed Blizzard resources. Maintain five equal-scope classes, including necromancer and assassin. Balance changes belong in config and shared formulas, not rendering. Preserve save version 1 or implement explicit migration. Never trust imported save data. Do not change combat stats from cosmetic choices.

Before committing meaningful gameplay changes run `npm test`, `npm run balance`, `npm run build`. Record evidence and limitations in PROGRESS.md and BALANCE.md. Do not claim human playtesting or 60 FPS without measurements. Keep UI in Russian and accessible. Document altered mechanics accurately. Do not introduce paid loot boxes, backend dependence, multiplayer or external trackers.
