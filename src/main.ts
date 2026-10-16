import { startGame } from "./engine/game";
import { World } from "./systems/combat";
import { createCharacter } from "./systems/progression";
import { MISSIONS } from "./data/config";
const host = document.querySelector<HTMLElement>("#app")!;
host.style.cssText = "position:fixed;inset:0;background:#14252b";
const status = document.createElement("div");
status.style.cssText =
  "position:fixed;top:12px;left:20px;z-index:20;color:#fff;font:16px Georgia;pointer-events:none";
document.body.append(status);
const battle = new World(createCharacter("Искатель", "warrior"), MISSIONS[0]);
const runtime = startGame(
  host,
  battle,
  {
    onHud: (w) => {
      status.textContent = `HP ${Math.ceil(w.player.hp)} · Врагов ${w.enemies.length} · WASD / ЛКМ / 1–4 / Space / E`;
    },
    onFinish: (w) => {
      status.textContent = w.result!.victory
        ? "Победа — обновите страницу для новой миссии"
        : "Поражение — обновите страницу для новой попытки";
    },
    onMenu: () => {
      const resume = document.createElement("button");
      resume.textContent = "Продолжить";
      resume.style.cssText =
        "position:fixed;top:50%;left:45%;z-index:30;padding:20px";
      document.body.append(resume);
      resume.onclick = () => {
        resume.remove();
        runtime.scene.resumeBattle();
      };
    },
  },
  { sound: true, volume: 0.3, reducedMotion: false },
);
