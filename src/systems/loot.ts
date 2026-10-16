import { BALANCE, RARITIES, SKINS } from "../data/config";
import type { Save, Skin } from "../types";
export function rollCosmetic(
  save: Save,
  random: () => number = Math.random,
): { skin: Skin; duplicate: boolean; shards: number } | null {
  if (save.chests <= 0) return null;
  save.chests--;
  save.pity++;
  const roll = random() * 100;
  let cumulative = 0;
  let rank = 0;
  for (let i = 0; i < BALANCE.rarityWeights.length; i++) {
    cumulative += BALANCE.rarityWeights[i];
    if (roll < cumulative) {
      rank = i;
      break;
    }
  }
  if (save.pity >= BALANCE.pityAt) rank = Math.max(2, rank);
  if (rank >= 2) save.pity = 0;
  const pool = SKINS.filter((s) => s.rarity === RARITIES[rank]);
  const skin =
    pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))];
  const duplicate = save.collection.includes(skin.id);
  const shards = duplicate ? 5 + rank * 3 : 0;
  if (duplicate) save.shards += shards;
  else save.collection.push(skin.id);
  return { skin, duplicate, shards };
}
export function craftSkin(save: Save, id: string) {
  if (
    save.collection.includes(id) ||
    !SKINS.some((s) => s.id === id) ||
    save.shards < BALANCE.craftShards
  )
    return false;
  save.shards -= BALANCE.craftShards;
  save.collection.push(id);
  return true;
}
