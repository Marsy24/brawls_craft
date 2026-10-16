import { writeFileSync } from "node:fs";
import { CLASSES, MISSIONS } from "../src/data/config";
import { World, type Input } from "../src/systems/combat";
import {
  createCharacter,
  canLearn,
  statsFor,
} from "../src/systems/progression";
import {
  distance,
  lineClear,
  pathfind,
  seeded,
} from "../src/systems/navigation";
import { grantRewards } from "../src/systems/rewards";
import { freshSave, validateSave } from "../src/systems/save";
const rows: string[] = [];
for (const id of Object.keys(CLASSES) as (keyof typeof CLASSES)[]) {
  const save = freshSave(),
    c = createCharacter("Bot", id);
  save.characters = [c];
  save.selected = c.id;
  for (const mission of MISSIONS) {
    const w = new World(c, mission, 1, seeded(431));
    let path: { x: number; y: number }[] = [];
    let repath = 0;
    for (let tick = 0; tick < 60 * 300 && !w.result; tick++) {
      const p = w.player;
      const target = w.enemies
        .slice()
        .sort(
          (a, b) =>
            distance(a, p) +
            (mission.kind === "defend" ? distance(a, w.beacon) * 0.5 : 0) -
            (distance(b, p) +
              (mission.kind === "defend" ? distance(b, w.beacon) * 0.5 : 0)),
        )[0];
      let dx = 0,
        dy = 0;
      if (target) {
        const range = distance(target, p);
        const desired = CLASSES[id].range < 150 ? 55 : 220;
        let goal = { x: target.x, y: target.y };
        const danger = w.hazards
          .filter(
            (h) =>
              h.hostile &&
              distance(h, p) < h.r + 35 &&
              distance(h, p) > h.inner - 35,
          )
          .sort((a, b) => a.delay - b.delay)[0];
        if (danger) {
          const d = distance(p, danger) || 1;
          goal = {
            x: p.x + ((p.x - danger.x) / d) * 200,
            y: p.y + ((p.y - danger.y) / d) * 200,
          };
          if (d === 1) {
            goal.x += 150;
            goal.y += 90;
          }
        } else if (range < desired - 35) {
          goal = {
            x: p.x + ((p.x - target.x) / Math.max(1, range)) * 100,
            y: p.y + ((p.y - target.y) / Math.max(1, range)) * 100,
          };
        } else if (range < desired) goal = { x: p.x, y: p.y };
        if (!lineClear(p, goal, w.obstacles, 20)) {
          if (tick >= repath || !path.length) {
            path = pathfind(p, goal, w.obstacles);
            repath = tick + 30;
          }
          if (path.length) {
            if (distance(p, path[0]) < 15) path.shift();
            goal = path[0] ?? goal;
          }
        }
        dx = goal.x - p.x;
        dy = goal.y - p.y;
        if (Math.hypot(dx, dy) < 5) {
          dx = 0;
          dy = 0;
        }
      }
      const aim = target ?? { x: p.x + 100, y: p.y };
      const close = target ? distance(target, p) : Infinity;
      const skills = [true, true, true, true];
      if (id === "warrior") {
        skills[0] = close < 130;
        skills[1] = close > 100 && close < 320;
        skills[2] = close < 150;
        skills[3] = close < 200;
      }
      if (id === "mage") {
        skills[0] = close < 190;
        skills[3] = false;
      }
      if (id === "assassin") {
        skills[0] = close < 270;
        skills[1] = close < 120;
        skills[2] = close < 150;
        skills[3] = close < 150;
      }
      if (id === "hunter") skills[3] = close < 180;
      const input: Input = {
        x: dx,
        y: dy,
        aim,
        attack: !!target,
        skills,
        dodge: w.hazards.some(
          (h) => h.hostile && h.delay < 0.25 && distance(h, p) < h.r + 20,
        ),
        potion: p.hp < w.stats.hp * 0.6,
      };
      w.update(1 / 60, input);
    }
    if (!w.result) w.finish(false);
    const r = w.result!;
    const reward = grantRewards(save, c, mission, r, 1, seeded(mission.level));
    if (reward.item && !reward.salvaged)
      c.equipment[reward.item.slot] = reward.item.id;
    for (const t of CLASSES[id].talents)
      if (canLearn(c, t.id)) c.talents.push(t.id);
    validateSave(save);
    rows.push(
      `| ${CLASSES[id].name} | ${mission.name} | ${r.victory ? "Победа" : "Поражение / лимит 300 с"} | ${r.time.toFixed(1)} | ${r.kills} | ${Math.round((w.player.hp / w.stats.hp) * 100)}% | ${c.level} |`,
    );
  }
}
const output = `# Сценарная симуляция кампании\n\nДетерминированный программный игрок, seed 431; 60 фиксированных шагов/с. Без неуязвимости, без подмены HP/урона. Использует те же World, награды и валидацию сохранений, что приложение. Навыки выбираются простой эвристикой, бот избегает предупреждений, пьёт зелья и надевает полученный предмет. Для независимой диагностики следующая миссия запускается даже после неудачи предыдущей (UI так не позволяет). Это не браузерный или пользовательский плейтест.\n\n| Класс | Миссия | Результат | Секунды | Убийства | HP | Уровень после |\n|---|---|---|---:|---:|---:|---:|\n${rows.join("\n")}\n\nПоражения бота не доказывают непроходимость: эвристика не умеет осмысленно менять билд, выводить врагов из препятствий или приоритизировать угрозы как человек. Победы подтверждают существование исполняемого пути через боевые правила, а не окончательный баланс или качество управления.\n`;
writeFileSync("docs/CAMPAIGN_REPORT.md", output);
console.log(output);
