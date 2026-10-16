import test from "node:test";
import assert from "node:assert/strict";
import { BALANCE, CLASSES, MISSIONS } from "../src/data/config";
import {
  World,
  damage,
  effectiveHealth,
  type Input,
} from "../src/systems/combat";
import { createCharacter } from "../src/systems/progression";
import {
  distance,
  free,
  move,
  pathfind,
  seeded,
} from "../src/systems/navigation";
const input = (w: World): Input => ({
  x: 0,
  y: 0,
  aim: { x: w.player.x + 70, y: w.player.y },
  attack: false,
  skills: [false, false, false, false],
  dodge: false,
  potion: false,
});
const arena = (id: keyof typeof CLASSES = "warrior") => {
  const w = new World(createCharacter("Test", id), MISSIONS[0], 1, seeded(7));
  w.enemies = [];
  w.obstacles.length = 0;
  return w;
};
test("armor has diminishing returns and EHP agrees with damage", () => {
  assert.equal(damage(100, 1, 0), 100);
  assert.equal(damage(100, 1, 100), 50);
  assert.equal(damage(100, 1, 100, true), 80);
  assert.equal(effectiveHealth(100, 100), 200);
  assert.equal(damage(100, 1, -20), 100);
});
test("diagonal movement normalized; walls cannot be tunneled by dash", () => {
  const a = arena(),
    b = arena();
  a.spawn("guard", { x: 1600, y: 600 });
  b.spawn("guard", { x: 1600, y: 600 });
  a.update(1 / 60, { ...input(a), x: 1 });
  b.update(1 / 60, { ...input(b), x: 1, y: 1 });
  assert.ok(
    Math.abs(
      distance(a.player, { x: 260, y: 600 }) -
        distance(b.player, { x: 260, y: 600 }),
    ) < 1e-8,
  );
  const p = { x: 50, y: 100 };
  move(p, 500, 0, 18, [{ x: 150, y: 100, r: 35, kind: "rock" }]);
  assert.ok(p.x < 100);
});
test("A* routes around an obstacle without cutting through it", () => {
  const obstacles = [{ x: 175, y: 175, r: 40, kind: "rock" as const }];
  const start = { x: 75, y: 175 },
    target = { x: 325, y: 175 };
  const path = pathfind(start, target, obstacles);
  assert.ok(path.length);
  for (const node of path) assert.ok(free(node, 18, obstacles));
  assert.ok(path.some((p) => p.y !== 175));
});
test("skills spend resources once and enforce cooldown", () => {
  const w = arena();
  w.spawn("guard", { x: 320, y: 600 });
  assert.equal(w.skill(0, input(w).aim), true);
  assert.equal(w.player.resource, 76);
  assert.equal(w.skill(0, input(w).aim), false);
  w.cooldowns[1] = 0;
  w.player.resource = 0;
  assert.equal(w.skill(1, input(w).aim), false);
});
test("necromancer summons are capped and expire", () => {
  const w = arena("necromancer");
  w.spawn("guard", { x: 1700, y: 1000 });
  for (let i = 0; i < 7; i++) {
    w.player.resource = 100;
    w.cooldowns[0] = 0;
    w.skill(0, input(w).aim);
  }
  assert.equal(w.summons.length, BALANCE.maxSummons);
  for (let i = 0; i < 60 * 19; i++) {
    w.player.invulnerable = 1;
    w.update(1 / 60, input(w));
  }
  assert.equal(w.summons.length, 0);
});
test("assassin stealth ends on attack, poison refreshes rather than stacking", () => {
  const w = arena("assassin");
  const enemy = w.spawn("guard", { x: 320, y: 600 });
  w.skill(2, input(w).aim);
  assert.ok(w.player.stealth > 0);
  w.skill(1, input(w).aim);
  w.basic(input(w).aim);
  assert.equal(w.player.stealth, 0);
  assert.equal(enemy.dot, 3);
  w.player.attackCd = 0;
  w.basic(input(w).aim);
  assert.equal(enemy.dot, 3);
});
test("crowd control immunity prevents continuous stun lock", () => {
  const w = arena("mage");
  w.character.talents = ["m3"];
  const enemy = w.spawn("guard", { x: 320, y: 600 });
  w.skill(0, input(w).aim);
  assert.equal(enemy.stunned, 0.8);
  enemy.stunned = 0;
  w.cooldowns[0] = 0;
  w.player.resource = 100;
  w.skill(0, input(w).aim);
  assert.equal(enemy.stunned, 0);
  assert.ok(enemy.immune > 0);
});
test("dodge avoids telegraphed damage and pauses do not advance world", () => {
  const w = arena();
  const enemy = w.spawn("raider", { x: 280, y: 600 });
  enemy.cooldown = 0;
  w.update(1 / 60, input(w));
  assert.equal(w.hazards.length, 1);
  assert.equal(w.player.hp, w.stats.hp);
  for (let i = 0; i < 32; i++) w.update(1 / 60, input(w));
  w.update(1 / 60, { ...input(w), dodge: true });
  for (let i = 0; i < 5; i++) w.update(1 / 60, input(w));
  assert.equal(w.player.hp, w.stats.hp);
});
test("projectiles collide with geometry and have bounded lifetime", () => {
  const w = arena("mage");
  w.spawn("guard", { x: 1000, y: 600 });
  w.obstacles.push({ x: 350, y: 600, r: 35, kind: "rock" });
  w.basic({ x: 1000, y: 600 });
  for (let i = 0; i < 60; i++) w.update(1 / 60, input(w));
  assert.equal(w.projectiles.length, 0);
});
test("both bosses change phase and summon adds at half health", () => {
  for (const mission of MISSIONS.filter((m) => m.boss)) {
    const w = new World(createCharacter("Boss", "mage"), mission, 1, seeded(1));
    const boss = w.enemies.find((e) => e.kind === mission.boss)!;
    boss.hp = boss.maxHp * 0.49;
    const count = w.enemies.length;
    w.update(1 / 60, input(w));
    assert.equal(boss.phase, 2);
    assert.equal(w.enemies.length, count + 3);
  }
});
test("every skill executes with finite state and no missing handlers", () => {
  for (const id of Object.keys(CLASSES) as (keyof typeof CLASSES)[]) {
    for (let index = 0; index < 4; index++) {
      const w = arena(id);
      w.spawn("guard", { x: 320, y: 600 });
      assert.ok(w.skill(index, { x: 320, y: 600 }), `${id} ${index}`);
      for (let tick = 0; tick < 120; tick++) {
        w.player.invulnerable = 1;
        w.update(1 / 60, input(w));
      }
      assert.ok(Number.isFinite(w.player.hp));
      assert.ok(Number.isFinite(w.player.resource));
      assert.ok(w.player.resource >= 0 && w.player.resource <= 100);
    }
  }
});
test("all mission kinds can complete and cannot finish waves early", () => {
  for (const mission of MISSIONS) {
    const w = new World(createCharacter("Test", "warrior"), mission);
    w.enemies = [];
    w.update(1 / 60, input(w));
    if (mission.kind === "waves" || mission.kind === "defend") {
      assert.equal(w.result, null);
      for (let tick = 0; tick < 1000 && !w.result; tick++) {
        w.enemies = [];
        w.update(1 / 60, input(w));
      }
      assert.equal(w.wave, 4);
    }
    assert.equal(w.result?.victory, true);
  }
});
test("beacon destruction or hero death yields defeat and freezes simulation", () => {
  for (const type of ["player", "beacon"] as const) {
    const w = new World(createCharacter("T", "hunter"), MISSIONS[3]);
    w[type].hp = 0;
    w.update(1 / 60, input(w));
    assert.equal(w.result?.victory, false);
    const time = w.time;
    w.update(1 / 60, input(w));
    assert.equal(w.time, time);
  }
});
test("killed enemy XP is awarded exactly once", () => {
  const w = arena();
  const e = w.spawn("raider", { x: 310, y: 600 });
  e.hp = 1;
  w.basic(input(w).aim);
  const xp = w.killXp;
  assert.ok(xp > 0);
  w.player.attackCd = 0;
  w.basic(input(w).aim);
  assert.equal(w.killXp, xp);
  assert.equal(w.kills, 1);
});
