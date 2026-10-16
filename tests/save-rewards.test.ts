import test from "node:test";
import assert from "node:assert/strict";
import { CLASSES, MISSIONS, SKINS } from "../src/data/config";
import {
  freshSave,
  loadSave,
  SAVE_KEY,
  validateSave,
  writeSave,
} from "../src/systems/save";
import {
  createCharacter,
  canLearn,
  rollItem,
  statsFor,
  talentBudget,
} from "../src/systems/progression";
import { grantRewards } from "../src/systems/rewards";
import { craftSkin, rollCosmetic } from "../src/systems/loot";
import type { BattleResult } from "../src/systems/combat";
import { seeded } from "../src/systems/navigation";
class MemoryStorage implements Storage {
  private data = new Map<string, string>();
  get length() {
    return this.data.size;
  }
  clear() {
    this.data.clear();
  }
  getItem(k: string) {
    return this.data.get(k) ?? null;
  }
  key(i: number) {
    return [...this.data.keys()][i] ?? null;
  }
  removeItem(k: string) {
    this.data.delete(k);
  }
  setItem(k: string, v: string) {
    this.data.set(k, v);
  }
}
function state() {
  const s = freshSave();
  const c = createCharacter("Искатель", "necromancer");
  s.characters = [c];
  s.selected = c.id;
  return { s, c };
}
const won: BattleResult = {
  victory: true,
  time: 70,
  kills: 16,
  damageDealt: 1000,
  damageTaken: 30,
  killXp: 200,
  optional: true,
  potions: 0,
};
test("backup recovers the last valid save and rejects corrupt data", () => {
  const st = new MemoryStorage();
  const { s, c } = state();
  writeSave(st, s);
  c.gold = 200;
  writeSave(st, s);
  st.setItem(SAVE_KEY, "{broken");
  const restored = loadSave(st);
  assert.ok(restored.warning);
  assert.equal(restored.save.characters[0].gold, 0);
  assert.equal(st.getItem(SAVE_KEY), "{broken");
});
test("storage quota failure is exposed rather than falsely reported saved", () => {
  const st = new MemoryStorage();
  st.setItem = () => {
    throw new Error("quota");
  };
  assert.throws(() => writeSave(st, state().s));
});
test("validation rejects malformed fields, forged gear, duplicate IDs and unsafe colors", () => {
  const bad = [
    (s: any) => (s.version = 2),
    (s: any) => (s.characters[0].level = NaN),
    (s: any) => (s.characters[0].color = "red;position:fixed"),
    (s: any) => (s.characters[0].talents = ["n2"]),
    (s: any) => (s.characters[0].equipment = { weapon: "missing" }),
    (s: any) => s.collection.push("fake"),
    (s: any) => s.characters.push(s.characters[0]),
    (s: any) => (s.characters[0].gold = -1),
    (s: any) =>
      (s.characters[0].inventory = [{ ...rollItem(1, () => 0), value: 9999 }]),
    (s: any) => (s.settings.volume = 2),
    (s: any) => (s.pity = 10),
  ];
  for (const mutate of bad) {
    const { s } = state();
    mutate(s);
    assert.throws(() => validateSave(s));
  }
});
test("first clear, repeated runs and inventory overflow pay exactly the intended rewards", () => {
  const { s, c } = state();
  const first = grantRewards(s, c, MISSIONS[0], won, 1, () => 0);
  assert.equal(first.xp, 519);
  assert.equal(first.gold, 81);
  assert.equal(first.chest, true);
  assert.equal(c.completed.length, 1);
  const second = grantRewards(s, c, MISSIONS[0], won, 1, () => 0);
  assert.equal(second.chest, false);
  assert.equal(second.first, false);
  const third = grantRewards(s, c, MISSIONS[0], won, 1, () => 0);
  assert.equal(third.chest, true);
  while (c.inventory.length < 60) c.inventory.push(rollItem(1));
  const overflow = grantRewards(s, c, MISSIONS[0], won, 1, () => 0);
  assert.equal(overflow.salvaged, true);
  assert.equal(c.inventory.length, 60);
  validateSave(s);
});
test("immediate retreat cannot farm gold or chests", () => {
  const { s, c } = state();
  const r = grantRewards(
    s,
    c,
    MISSIONS[0],
    { ...won, victory: false, kills: 0, killXp: 0, time: 0 },
    1,
  );
  assert.equal(r.gold, 0);
  assert.equal(r.xp, 0);
  assert.equal(s.chests, 0);
  assert.equal(c.runs, 0);
  assert.equal(c.inventory.length, 0);
});
test("all branches require prerequisites and are bounded by four points", () => {
  for (const cls of Object.values(CLASSES)) {
    const c = createCharacter("Test", cls.id);
    c.level = 15;
    assert.equal(talentBudget(c.level), 4);
    assert.equal(canLearn(c, cls.talents[2].id), false);
    for (const t of cls.talents.slice(0, 4)) {
      assert.ok(canLearn(c, t.id));
      c.talents.push(t.id);
    }
    assert.equal(canLearn(c, cls.talents[4].id), false);
  }
});
test("cosmetic ownership, duplicates and crafting are deterministic and stat-neutral", () => {
  const { s, c } = state();
  const before = statsFor(c);
  s.chests = 1;
  const result = rollCosmetic(s, () => 0)!;
  assert.equal(result.duplicate, true);
  assert.equal(s.shards, 5);
  assert.equal(rollCosmetic(s), null);
  s.shards = 30;
  assert.equal(craftSkin(s, SKINS[14].id), true);
  assert.equal(s.shards, 0);
  assert.equal(craftSkin(s, SKINS[14].id), false);
  c.skin = SKINS[14].id;
  assert.deepEqual(statsFor(c), before);
  validateSave(s);
});
test("seeded loot distribution respects legendary base rate and ten-opening guarantee", () => {
  const s = freshSave();
  s.chests = 20000;
  const rng = seeded(72);
  let legendary = 0;
  for (let i = 0; i < 20000; i++) {
    const before = s.pity;
    const r = rollCosmetic(s, rng)!;
    if (r.skin.rarity === "legendary") legendary++;
    if (before === 9)
      assert.ok(["rare", "epic", "legendary"].includes(r.skin.rarity));
    assert.ok(s.pity < 10);
  }
  assert.ok(legendary > 140 && legendary < 270);
});
