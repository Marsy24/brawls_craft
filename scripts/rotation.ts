import { CLASSES, MISSIONS } from "../src/data/config";
import type { ClassId } from "../src/types";
import { World, effectiveHealth } from "../src/systems/combat";
import { createCharacter } from "../src/systems/progression";
import { seeded } from "../src/systems/navigation";
/** Synthetic throughput experiment, intentionally excludes movement cost and incoming damage. */
export function measureRotation(
  classId: ClassId,
  level = 5,
  branch = -1,
  targets = 1,
  seconds = 60,
) {
  const c = createCharacter("Rotation", classId);
  c.level = level;
  if (branch >= 0)
    c.talents = CLASSES[classId].talents
      .filter((t) => t.branch === branch || t.tier === 0)
      .map((t) => t.id);
  const w = new World(c, MISSIONS[0], 1, seeded(2026));
  w.enemies = [];
  w.obstacles.length = 0;
  for (let i = 0; i < targets; i++) {
    const target = w.spawn("guard", { x: 330 + (i % 2) * 15, y: 600 + Math.floor(i / 2) * 25 });
    target.hp = target.maxHp = 1e9;
    target.defense = 10;
    target.speed = 0;
    target.power = 0;
    target.cooldown = 1e9;
  }
  let minResource = 100;
  for (let tick = 0; tick < 60 * seconds; tick++) {
    w.player.x = 260;
    w.player.y = 600;
    w.player.invulnerable = 1;
    w.update(1 / 60, {
      x: 0,
      y: 0,
      aim: w.enemies[0],
      attack: true,
      skills: [true, true, true, true],
      dodge: false,
      potion: false,
    });
    minResource = Math.min(minResource, w.player.resource);
  }
  return {
    dps: w.damageDealt / seconds,
    ehp: effectiveHealth(w.stats.hp, w.stats.defense + (w.has("n0") && w.summons.length ? 15 : 0)),
    minResource,
  };
}
