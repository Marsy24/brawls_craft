import type { Character, Mission, Save, Item } from "../types";
import type { BattleResult } from "./combat";
import { BALANCE } from "../data/config";
import { addXp, rollItem, salvageValue } from "./progression";
export interface Rewards {
  xp: number;
  gold: number;
  levels: number;
  chest: boolean;
  first: boolean;
  item?: Item;
  salvaged: boolean;
}
export function grantRewards(
  save: Save,
  c: Character,
  m: Mission,
  r: BattleResult,
  difficulty: number,
  random: () => number = Math.random,
): Rewards {
  const first = r.victory && !c.completed.includes(m.id);
  const bonus = (r.optional ? 1.25 : 1) * (difficulty > 1 ? 1.25 : 1);
  const xp =
    r.killXp + (r.victory ? Math.round(m.xp * bonus * (first ? 1.5 : 1)) : 0);
  let gold = r.victory
    ? Math.round(m.gold * bonus)
    : Math.min(r.kills * 2, Math.round(m.gold * 0.2));
  const levels = addXp(c, xp);
  let item: Item | undefined;
  let salvaged = false;
  let chest = false;
  if (r.victory) {
    c.runs++;
    if (first) c.completed.push(m.id);
    chest = first || c.runs % 3 === 0;
    if (chest) save.chests++;
    item = rollItem(Math.min(15, Math.max(c.level, m.level)), random);
    if (c.inventory.length < BALANCE.inventoryLimit) c.inventory.push(item);
    else {
      gold += salvageValue(item);
      salvaged = true;
    }
  }
  c.gold += gold;
  return { xp, gold, levels, chest, first, item, salvaged };
}
