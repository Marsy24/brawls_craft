import { performance } from "node:perf_hooks";
import { writeFileSync } from "node:fs";
import { BALANCE, CLASSES, ENEMIES, MISSIONS, RARITIES } from "../src/data/config";
import { World, effectiveHealth, damage, type Input } from "../src/systems/combat";
import { createCharacter, xpRequired } from "../src/systems/progression";
import { seeded } from "../src/systems/navigation";
import { freshSave } from "../src/systems/save";
import { rollCosmetic } from "../src/systems/loot";
import { measureRotation } from "./rotation";
const rows: string[] = [];
const buildRows: string[] = [];
const started = performance.now();
for (const id of Object.keys(CLASSES) as (keyof typeof CLASSES)[]) {
  const c = createCharacter("Simulation", id);
  c.level = 5;
  const w = new World(c, MISSIONS[0], 1, seeded(2026));
  w.enemies = [];
  w.obstacles.length = 0;
  const enemy = w.spawn("guard", { x: 330, y: 600 });
  enemy.maxHp = enemy.hp = 1e9;
  enemy.defense = 10;
  enemy.speed = 0;
  enemy.power = 0;
  enemy.cooldown = 1e9;
  for (let tick = 0; tick < 60 * 120; tick++) {
    // Stationary target; reset position to isolate resource/cooldown rotation throughput.
    w.player.x = 260;
    w.player.y = 600;
    const input: Input = {
      x: 0,
      y: 0,
      aim: enemy,
      attack: true,
      skills: [true, true, true, true],
      dodge: false,
      potion: false,
    };
    w.player.invulnerable = 1;
    w.update(1 / 60, input);
  }
  const dps = w.damageDealt / 120;
  const base = CLASSES[id];
  rows.push(
    `| ${base.name} | ${dps.toFixed(1)} | ${effectiveHealth(w.stats.hp, w.stats.defense).toFixed(0)} | ${((ENEMIES.raider.hp * (1 + BALANCE.enemyGrowth * 4)) / dps).toFixed(2)} с |`,
  );
}
for (const cls of Object.values(CLASSES)) {
  for (const branch of [0, 1]) {
    const single = measureRotation(cls.id, 11, branch, 1);
    const pack = measureRotation(cls.id, 11, branch, 4);
    buildRows.push(
      `| ${cls.name} / ${cls.branches[branch]} | ${single.dps.toFixed(1)} | ${pack.dps.toFixed(1)} | ${single.ehp.toFixed(0)} |`,
    );
  }
}
const save = freshSave();
save.chests = 100000;
const random = seeded(294);
const counts = Object.fromEntries(RARITIES.map((r) => [r, 0]));
for (let i = 0; i < 100000; i++) {
  const reward = rollCosmetic(save, random)!;
  counts[reward.skin.rarity]++;
}
const xpTotal = Array.from({ length: 14 }, (_, i) => xpRequired(i + 1)).reduce((a, b) => a + b, 0);
const text = `# Автоматический отчёт баланса\n\nSeed 2026; 120 секунд, уровень 5, без предметов и талантов. Реальная fixed-step симуляция. Неподвижная цель с 10 защиты, без входящего урона. Герой возвращается на расстояние 70 после каждого тика для изоляции ротации; все навыки запрашиваются по откату в порядке 1–4. Это **синтетический ориентир**, не плейтест: позиционирование, расход ресурса при другой ротации, перемещение и несколько целей меняют результат.\n\n| Класс | DPS | EHP | Оценка TTK мародёра ур. 5* |\n|---|---:|---:|---:|\n${rows.join("\n")}\n\n*HP / измеренный sustained DPS; не моделирует burst первого удара.\n\n## Билды: уровень 11, 4 очка\n\nТри таланта указанной ветки + начальный талант другой. 60 секунд. EHP учитывает постоянную броню и активных стражей, но не ценность исцеления, контроля, щитов и мобильности. Урон по группе — суммарный по четырём целям. Не следует выбирать лучший билд только по этому столбцу.\n\n| Класс / основная ветка | DPS одной цели | DPS группы | EHP |\n|---|---:|---:|---:|\n${buildRows.join("\n")}\n\n## Опыт и экономика\n\nДо уровня 15 нужно **${xpTotal} XP**. Чистая миссионная награда (без XP убийств, первого прохождения и доп. цели): ${MISSIONS.map((m) => `${m.name}: ${m.xp} XP / ${m.gold} золота`).join("; ")}. Стоимость реликвии ${BALANCE.chestPrice}; бесплатные реликвии за первое прохождение и каждую третью победу.\n\n## Косметические выпадения\n\n100000 открытий с pity (seed 294): ${RARITIES.map((r) => `${r}: ${(counts[r] / 1000).toFixed(2)}%`).join("; ")}. Наблюдаемые частоты включают гарантию и поэтому отличаются от базовых весов. Все 15 скинов имеют нулевое влияние на боевые параметры.\n\n## Ограничения\n\nТребуются пользовательские плейтесты: ресурс/позиционирование, жизнеспособность всех талантов, скорость прохождения, оборона маяка. CPU-время этого отчёта ${(performance.now() - started).toFixed(0)} мс на данной среде не является FPS браузерного рендера.\n`;
writeFileSync("docs/BALANCE_REPORT.md", text);
console.log(text);
