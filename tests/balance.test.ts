import test from "node:test";
import assert from "node:assert/strict";
import { CLASSES } from "../src/data/config";
import { measureRotation } from "../scripts/rotation";
test("baseline sustained DPS stays in a bounded competitive envelope at levels 1,5,10,15", () => {
  for (const level of [1, 5, 10, 15]) {
    const values = Object.values(CLASSES).map((c) => measureRotation(c.id, level, -1, 1, 30));
    for (const v of values) {
      assert.ok(Number.isFinite(v.dps) && v.dps > 10 && v.dps < 350);
      assert.ok(v.minResource >= 0);
    }
    const dps = values.map((v) => v.dps);
    assert.ok(Math.max(...dps) / Math.min(...dps) < 1.5, `Level ${level} spread exceeded 50%`);
  }
});
test("both talent branches execute under resource limits against single targets and packs", () => {
  for (const c of Object.values(CLASSES))
    for (const branch of [0, 1]) {
      const one = measureRotation(c.id, 11, branch, 1, 30),
        pack = measureRotation(c.id, 11, branch, 4, 30);
      assert.ok(one.dps > 0 && one.dps < 400);
      assert.ok(pack.dps >= one.dps * 0.8 && pack.dps < one.dps * 6);
      assert.ok(one.minResource >= 0 && pack.minResource >= 0);
    }
});
