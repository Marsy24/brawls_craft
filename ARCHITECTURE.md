# Architecture

TypeScript + Vite + Phaser 3.90. DOM/CSS menus intentionally avoid an extra React runtime. Phaser owns rendering, input, camera and texture lifecycle. Simulation has no Phaser or DOM dependency and runs at 60 fixed ticks/second; tab pauses do not catch up.

- `src/data/config.ts`: classes, 20 skills, 30 talents, enemies, missions, skins and shared numeric balance.
- `src/systems/combat.ts`: damage formulas, enemy state, projectiles, status effects, summons, mission state; inject RNG for deterministic tests.
- `src/systems/navigation.ts`: collision-aware movement and grid A\*.
- `src/systems/progression.ts`: derived stats, XP, equipment, unlocks and talent prerequisites.
- `src/systems/loot.ts`: weighted cosmetic rewards, pity, duplicate conversion and crafting.
- `src/systems/save.ts`: versioned schema checks, atomic single-record storage, last-valid backup.
- `src/art/`: original vector artwork shared by menu and game textures.
- `src/engine/`: Phaser presentation and input adapter.
- `src/ui/`: DOM screens and HUD; menu edits paused during combat.
- `tests/`, `scripts/balance.ts`: unit/integration checks and reproducible balance estimates.

No backend; no secrets; imports are untrusted data and validated before replacement. Character names are escaped in HTML. Inventory bounded at 60: overflow reward salvaged visibly. Active entities and effect lifetimes are bounded. Visuals do not determine collision outcomes.
