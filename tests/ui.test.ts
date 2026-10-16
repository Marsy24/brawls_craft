import test from "node:test";
import assert from "node:assert/strict";
import {
  Window,
  HTMLButtonElement as HappyButton,
  HTMLInputElement as HappyInput,
} from "happy-dom";
import { App } from "../src/ui/app";
import { createCharacter, rollItem } from "../src/systems/progression";
import { freshSave, SAVE_KEY, validateSave } from "../src/systems/save";
import { heroArt } from "../src/art/art";
const boot = () => {
  const window = new Window({ url: "https://game.test" });
  Object.assign(globalThis, { window, document: window.document });
  const root = window.document.createElement("div");
  window.document.body.append(root);
  const click = (action: string, id?: string) => {
    const b = root.querySelector(`button[data-action="${action}"]${id ? `[data-id="${id}"]` : ""}`);
    assert.ok(b, `${action} exists`);
    (b as unknown as HappyButton).click();
  };
  return { window, root, click };
};
test("DOM: create necromancer, escape name, navigate screens, restore saved character", async () => {
  const { window, root, click } = boot();
  try {
    new App(root as unknown as HTMLElement);
    click("create");
    click("class", "necromancer");
    const input = root.querySelector("#hero-name") as unknown as HappyInput;
    input.value = "<img src=x onerror=alert>";
    input.dispatchEvent(new window.Event("input", { bubbles: true }));
    click("create-confirm");
    let saved = validateSave(JSON.parse(window.localStorage.getItem(SAVE_KEY)!));
    assert.equal(saved.characters[0].classId, "necromancer");
    assert.equal(root.querySelectorAll("img").length, 0);
    for (const tab of ["character", "talents", "inventory", "collection", "settings", "missions"]) {
      click("tab", tab);
      assert.ok(root.textContent!.length > 100);
    }
    const next = window.document.createElement("div");
    window.document.body.replaceChildren(next);
    new App(next as unknown as HTMLElement);
    assert.match(next.textContent!, /Карта экспедиций/);
    saved = validateSave(JSON.parse(window.localStorage.getItem(SAVE_KEY)!));
    assert.equal(saved.characters.length, 1);
  } finally {
    await window.happyDOM.abort();
  }
});
test("DOM: gear, talents, cosmetics, settings persist; locked actions remain disabled", async () => {
  const { window, root, click } = boot();
  try {
    const s = freshSave(),
      c = createCharacter("Сумрак", "assassin");
    c.level = 11;
    c.gold = 300;
    c.inventory = [rollItem(3, () => 0)];
    s.characters = [c];
    s.selected = c.id;
    s.chests = 1;
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(s));
    new App(root as unknown as HTMLElement);
    click("tab", "inventory");
    click("equip", c.inventory[0].id);
    click("tab", "talents");
    click("learn", "a0");
    click("learn", "a1");
    click("tab", "collection");
    click("buy-chest");
    const soundBefore = s.settings.sound;
    click("tab", "settings");
    const sound = root.querySelector("#sound") as unknown as HappyInput;
    sound.checked = !soundBefore;
    sound.dispatchEvent(new window.Event("change", { bubbles: true }));
    const saved = validateSave(JSON.parse(window.localStorage.getItem(SAVE_KEY)!));
    assert.equal(saved.characters[0].equipment.weapon, c.inventory[0].id);
    assert.deepEqual(saved.characters[0].talents, ["a0", "a1"]);
    assert.equal(saved.chests, 2);
    assert.equal(saved.characters[0].gold, 140);
    assert.equal(saved.settings.sound, false);
    click("tab", "missions");
    click("mission", "eclipse");
    assert.equal(
      (root.querySelector('[data-action="launch"]') as unknown as HappyButton).disabled,
      true,
    );
  } finally {
    await window.happyDOM.abort();
  }
});
test("inline hero SVGs have unique gradient IDs", () => {
  const a = heroArt("warrior"),
    b = heroArt("mage");
  const ids = (s: string) => [...s.matchAll(/id="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(
    ids(a).some((id) => ids(b).includes(id)),
    false,
  );
});

test("DOM: imported IDs and item names stay inert and equipment actions still work", async () => {
  const { window, root, click } = boot();
  try {
    const s = freshSave();
    const c = createCharacter("Искатель", "warrior");
    c.id = 'hero" onclick="alert(1)';
    const item = rollItem(1, () => 0);
    item.id = 'item" onclick="alert(1)';
    item.name = "<img src=x onerror=alert(1)>";
    c.inventory = [item];
    s.characters = [c];
    s.selected = c.id;
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(validateSave(s)));
    new App(root as unknown as HTMLElement);
    click("roster");
    assert.equal(root.querySelectorAll("[onclick], img").length, 0);
    const hero = root.querySelector('[data-action="select-hero"]')!;
    assert.equal(hero.getAttribute("data-id"), c.id);
    (hero as unknown as HappyButton).click();
    click("tab", "inventory");
    assert.equal(root.querySelectorAll("img, [onerror], [onclick]").length, 0);
    const equip = root.querySelector('[data-action="equip"]')!;
    assert.equal(equip.getAttribute("data-id"), item.id);
    (equip as unknown as HappyButton).click();
    const saved = validateSave(JSON.parse(window.localStorage.getItem(SAVE_KEY)!));
    assert.equal(saved.characters[0].equipment.weapon, item.id);
  } finally {
    await window.happyDOM.abort();
  }
});
