import { CLASSES, MISSIONS, SKINS, RARITIES, BALANCE } from "../data/config";
import { itemValue, talentBudget, xpRequired } from "./progression";
import type { Save } from "../types";
export const SAVE_KEY = "brawls-craft:save:v1";
export const freshSave = (): Save => ({
  version: 1,
  characters: [],
  selected: "",
  collection: ["skin-0-0"],
  chests: 0,
  shards: 0,
  pity: 0,
  settings: { sound: true, volume: 0.3, reducedMotion: false },
});
const integer = (v: unknown, min: number, max: number): v is number =>
  typeof v === "number" && Number.isSafeInteger(v) && v >= min && v <= max;
const text = (v: unknown, max = 100): v is string =>
  typeof v === "string" && v.length > 0 && v.length <= max;
const list = (v: unknown, max: number): v is unknown[] =>
  Array.isArray(v) && v.length <= max;
export function validateSave(raw: unknown): Save {
  if (!raw || typeof raw !== "object")
    throw new Error("Файл не содержит сохранение.");
  const s = raw as Save;
  if (s.version !== 1) throw new Error("Неподдерживаемая версия сохранения.");
  if (
    !list(s.characters, 10) ||
    !list(s.collection, SKINS.length) ||
    !integer(s.chests, 0, 999999) ||
    !integer(s.shards, 0, 9999999) ||
    !integer(s.pity, 0, 9) ||
    typeof s.selected !== "string"
  )
    throw new Error("Повреждены данные коллекции.");
  if (
    new Set(s.collection).size !== s.collection.length ||
    !s.collection.every((id) => SKINS.some((k) => k.id === id)) ||
    !s.collection.includes("skin-0-0")
  )
    throw new Error("Неизвестная косметика.");
  if (
    !s.settings ||
    typeof s.settings.sound !== "boolean" ||
    typeof s.settings.reducedMotion !== "boolean" ||
    !Number.isFinite(s.settings.volume) ||
    s.settings.volume < 0 ||
    s.settings.volume > 1
  )
    throw new Error("Повреждены настройки.");
  const ids = new Set();
  for (const c of s.characters) {
    if (
      !c ||
      !text(c.id) ||
      ids.has(c.id) ||
      !text(c.name, 24) ||
      !Object.hasOwn(CLASSES, c.classId) ||
      !integer(c.level, 1, 15) ||
      !integer(c.xp, 0, c.level === 15 ? 0 : xpRequired(c.level) - 1) ||
      !integer(c.gold, 0, 99999999) ||
      !integer(c.appearance, 0, 2) ||
      typeof c.color !== "string" ||
      !/^#[0-9a-fA-F]{6}$/.test(c.color) ||
      !integer(c.runs, 0, 999999) ||
      !s.collection.includes(c.skin)
    )
      throw new Error("Повреждены данные персонажа.");
    ids.add(c.id);
    const defs = CLASSES[c.classId].talents;
    if (
      !list(c.talents, talentBudget(c.level)) ||
      new Set(c.talents).size !== c.talents.length ||
      !c.talents.every((id) => defs.some((t) => t.id === id))
    )
      throw new Error("Некорректные таланты.");
    for (const id of c.talents) {
      const t = defs.find((t) => t.id === id)!;
      if (
        t.tier > 0 &&
        !defs.some(
          (p) =>
            p.branch === t.branch &&
            p.tier === t.tier - 1 &&
            c.talents.includes(p.id),
        )
      )
        throw new Error("Нарушена последовательность талантов.");
    }
    if (
      !list(c.completed, 5) ||
      new Set(c.completed).size !== c.completed.length ||
      !c.completed.every((id) => MISSIONS.some((m) => m.id === id))
    )
      throw new Error("Некорректные миссии.");
    if (
      !list(c.inventory, BALANCE.inventoryLimit) ||
      !c.equipment ||
      typeof c.equipment !== "object"
    )
      throw new Error("Повреждён инвентарь.");
    const itemIds = new Set();
    for (const i of c.inventory) {
      if (
        !i ||
        !text(i.id) ||
        itemIds.has(i.id) ||
        !text(i.name) ||
        !["weapon", "armor", "charm"].includes(i.slot) ||
        !RARITIES.includes(i.rarity) ||
        !integer(i.level, 1, 15) ||
        i.value !== itemValue(i.slot, i.level, i.rarity)
      )
        throw new Error("Некорректный предмет.");
      itemIds.add(i.id);
    }
    for (const [slot, id] of Object.entries(c.equipment)) {
      if (
        !["weapon", "armor", "charm"].includes(slot) ||
        !c.inventory.some((i) => i.id === id && i.slot === slot)
      )
        throw new Error("Некорректная экипировка.");
    }
  }
  if (s.characters.length && !s.characters.some((c) => c.id === s.selected))
    throw new Error("Не найден выбранный герой.");
  return structuredClone(s);
}
export function loadSave(storage: Storage): { save: Save; warning?: string } {
  try {
    const raw = storage.getItem(SAVE_KEY);
    if (!raw) return { save: freshSave() };
    return { save: validateSave(JSON.parse(raw)) };
  } catch {
    try {
      const backup = storage.getItem(SAVE_KEY + ":backup");
      if (backup)
        return {
          save: validateSave(JSON.parse(backup)),
          warning: "Основное сохранение повреждено. Загружена резервная копия.",
        };
    } catch {
      /* Preserve damaged records for manual recovery. */
    }
    return {
      save: freshSave(),
      warning:
        "Не удалось прочитать сохранение. Исходная запись не удалена; экспортируйте новый прогресс вручную.",
    };
  }
}
export function writeSave(storage: Storage, save: Save) {
  const valid = validateSave(save);
  const old = storage.getItem(SAVE_KEY);
  if (old) {
    try {
      validateSave(JSON.parse(old));
      storage.setItem(SAVE_KEY + ":backup", old);
    } catch {
      /* Do not overwrite a valid backup with corrupt data. */
    }
  }
  storage.setItem(SAVE_KEY, JSON.stringify(valid));
}
