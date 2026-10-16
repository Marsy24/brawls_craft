import {
  BALANCE,
  CLASSES,
  MISSIONS,
  RARITIES,
  RARITY_COLORS,
  RARITY_NAMES,
  SKINS,
} from "../data/config";
import type { Character, ClassId, Mission, Save } from "../types";
import { heroArt, landscapeArt, svgUri } from "../art/art";
import {
  canLearn,
  createCharacter,
  missionUnlocked,
  salvageValue,
  statsFor,
  talentBudget,
  xpRequired,
} from "../systems/progression";
import { craftSkin, rollCosmetic } from "../systems/loot";
import { freshSave, loadSave, validateSave, writeSave } from "../systems/save";
import { World, type BattleResult } from "../systems/combat";
import { grantRewards, type Rewards } from "../systems/rewards";
import type { startGame } from "../engine/game";
const esc = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
const statNames = {
  hp: "Здоровье",
  power: "Сила атаки",
  defense: "Защита",
  crit: "Крит. шанс",
  speed: "Скорость",
  attackRate: "Атак / с",
};
const slots = { weapon: "Оружие", armor: "Доспех", charm: "Аксессуар" };
const duration = (s: number) =>
  `${Math.floor(s / 60)}:${Math.floor(s % 60)
    .toString()
    .padStart(2, "0")}`;
const nav = [
  ["missions", "⌖", "Экспедиции"],
  ["character", "♜", "Герой"],
  ["talents", "✦", "Таланты"],
  ["inventory", "▣", "Арсенал"],
  ["collection", "◇", "Реликвии"],
  ["settings", "⚙", "Настройки"],
];
export class App {
  private save: Save = freshSave();
  private page = "welcome";
  private tab = "missions";
  private chosenClass: ClassId = "warrior";
  private appearance = 0;
  private chosenColor = "#e6ab62";
  private nameDraft = "";
  private mission: Mission = MISSIONS[0];
  private difficulty = 1;
  private root: HTMLElement;
  private game?: ReturnType<typeof startGame>;
  private world?: World;
  private result?: { battle: BattleResult; rewards: Rewards };
  private opening = false;
  private opened?: ReturnType<typeof rollCosmetic>;
  private destroyed = false;
  private storage?: Storage;
  private saveWarning = "";
  constructor(root: HTMLElement) {
    this.root = root;
    try {
      this.storage = window.localStorage;
      const loaded = loadSave(this.storage);
      this.save = loaded.save;
      this.saveWarning = loaded.warning ?? "";
    } catch {
      this.saveWarning = "Локальное хранилище недоступно. Используйте экспорт сохранения.";
    }
    this.page = this.save.characters.length ? "camp" : "welcome";
    this.root.addEventListener("click", (e) => void this.click(e));
    this.root.addEventListener("input", (e) => this.input(e));
    this.root.addEventListener("change", (e) => void this.change(e));
    window.addEventListener("keydown", (e) => {
      if (
        e.code === "Escape" &&
        this.world &&
        this.root.querySelector("#pause-panel")?.childElementCount
      ) {
        e.preventDefault();
        e.stopImmediatePropagation();
        this.resume();
      }
    });
    this.render();
    if (this.saveWarning) this.toast(this.saveWarning, 9000);
  }
  private get c() {
    return this.save.characters.find((c) => c.id === this.save.selected)!;
  }
  private persist() {
    try {
      if (!this.storage) throw new Error();
      writeSave(this.storage, this.save);
    } catch {
      this.toast("Не удалось записать прогресс. Экспортируйте сохранение в настройках.", 8000);
    }
  }
  private toast(message: string, time = 4000) {
    let toast = document.querySelector("#toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "toast";
      toast.setAttribute("role", "status");
      document.body.append(toast);
    }
    toast.textContent = message;
    toast.classList.add("show");
    setTimeout(() => toast?.classList.remove("show"), time);
  }
  private portrait(c: Character) {
    return heroArt(c.classId, c.color, SKINS.find((s) => s.id === c.skin)?.color, c.appearance);
  }
  private header() {
    return `<header class="topbar"><button class="brand" data-action="camp"><span class="brand-rune">⟐</span><span>ПЕПЕЛЬНЫЙ ЗАВЕТ<small>BRAWLS CRAFT</small></span></button><div class="top-right">${this.c ? `<span class="currency">◈ <b>${this.c.gold}</b> <small>золота</small></span><span class="currency">◇ <b>${this.save.chests}</b> <small>реликвий</small></span><button class="profile" data-action="roster"><span>${esc(this.c.name.slice(0, 1).toUpperCase())}</span>${esc(this.c.name)}<small>Ур. ${this.c.level}</small></button>` : '<small class="muted">ОДИНОЧНАЯ ИГРА · ЛОКАЛЬНЫЙ ПРОГРЕСС</small>'}</div></header>`;
  }
  private render() {
    document.body.classList.toggle("reduce-motion", this.save.settings.reducedMotion);
    if (this.page === "battle") return;
    this.root.className = "app";
    this.root.innerHTML = `<div class="ambient" style="background-image:url('${svgUri(landscapeArt(this.mission.biome))}')"></div>${this.header()}${this.page === "welcome" ? this.welcome() : this.page === "create" ? this.creation() : this.page === "roster" ? this.roster() : this.page === "result" ? this.results() : this.c ? this.camp() : this.welcome()}<footer class="footer"><span>ПЕПЕЛЬНЫЙ ЗАВЕТ <i>◆</i> ПЕРВАЯ ЭКСПЕДИЦИЯ</span><span>Прогресс хранится в этом браузере · <button data-action="help">Управление</button></span></footer>`;
  }
  private welcome() {
    return `<main class="welcome"><p class="eyebrow">BRAWLS CRAFT · FANTASY ACTION RPG</p><h1>Пепельный<br><em>Завет</em></h1><div class="gold-line"></div><p class="lead">Последний огонь ещё горит.<br>Пять путей. Один мир, который стоит защитить.</p><button class="button primary large" data-action="create">Начать путешествие <span>➶</span></button><button class="button quiet" data-action="settings">Настройки и импорт сохранения</button><div class="welcome-details"><span>05 <small>КЛАССОВ</small></span><span>05 <small>ЭКСПЕДИЦИЙ</small></span><span>15 <small>УРОВНЕЙ</small></span></div></main><div class="welcome-hero">${heroArt("warrior")}</div>`;
  }
  private creation() {
    const d = CLASSES[this.chosenClass];
    return `<main class="creation"><div class="section-heading"><div><p class="eyebrow">НАЧАЛО ВАШЕЙ ИСТОРИИ</p><h1>Выберите свой путь</h1></div><button class="button quiet" data-action="back">← Назад</button></div><div class="create-layout"><div class="class-list">${Object.values(
      CLASSES,
    )
      .map(
        (c) =>
          `<button data-action="class" data-id="${esc(c.id)}" class="class-option ${c.id === d.id ? "selected" : ""}" style="--class-color:${c.color}"><span class="class-mini">${heroArt(c.id)}</span><span><strong>${c.name}</strong><small>${c.title}</small></span><i>›</i></button>`,
      )
      .join(
        "",
      )}</div><div class="hero-stage"><div class="sigil"></div><div class="hero-full">${heroArt(d.id, this.chosenColor, d.color, this.appearance)}</div><div class="hero-plinth"></div><p>${d.title}</p></div><section class="panel create-info"><p class="eyebrow">${d.range < 150 ? "БЛИЖНИЙ БОЙ" : "ДАЛЬНИЙ БОЙ"} · ${d.resource.toUpperCase()}</p><h2>${d.name}</h2><p>${d.description}</p><p class="passive"><b>Пассивный эффект</b><br>${d.passive}</p><div class="skill-preview">${d.skills.map((s, i) => `<span class="ability-icon" tabindex="0" title="${s.name}: ${s.description}">${s.icon}<small>${i + 1}</small></span>`).join("")}</div><label>Имя героя<input id="hero-name" maxlength="24" value="${esc(this.nameDraft)}" placeholder="Как вас будут помнить?" autocomplete="off"></label><div class="customize"><label>Облик<select id="appearance">${["Искатель", "Хранитель", "Изгнанник"].map((n, i) => `<option value="${i}" ${i === this.appearance ? "selected" : ""}>${n}</option>`).join("")}</select></label><label>Цвет доспеха<input type="color" id="armor-color" value="${this.chosenColor}"></label></div><button class="button primary full" data-action="create-confirm" ${this.save.characters.length >= 10 ? "disabled" : ""}>Принять клятву <span>➶</span></button><small class="muted">До 10 героев. Косметическая коллекция общая.</small></section></div></main>`;
  }
  private roster() {
    return `<main class="content wide"><div class="section-heading"><div><p class="eyebrow">ВАШ ОТРЯД</p><h1>Хранители Завета</h1></div><button class="button primary" data-action="create" ${this.save.characters.length >= 10 ? "disabled" : ""}>＋ Новый герой</button></div><div class="roster">${this.save.characters.map((c) => `<button class="panel roster-card ${this.save.selected === c.id ? "selected" : ""}" data-action="select-hero" data-id="${esc(c.id)}"><div>${this.portrait(c)}</div><h3>${esc(c.name)}</h3><p>${CLASSES[c.classId].name} · Ур. ${c.level}</p><span>${c.completed.length}/5 экспедиций</span></button>`).join("")}</div></main>`;
  }
  private camp() {
    return `<div class="shell"><nav class="sidebar" aria-label="Главное меню">${nav.map(([id, icon, name]) => `<button data-action="tab" data-id="${id}" class="nav-item ${this.tab === id ? "active" : ""}"><span>${icon}</span>${name}${id === "talents" && talentBudget(this.c.level) > this.c.talents.length ? '<i class="dot"></i>' : ""}</button>`).join("")}<div class="chapter"><span>ГЛАВА I</span><b>Угасающий мир</b><div class="progress"><i style="width:${this.c.completed.length * 20}%"></i></div><small>${this.c.completed.length} из 5 экспедиций</small></div></nav><main class="content">${this.content(this.tab)}</main></div>`;
  }
  private content(tab: string) {
    switch (tab) {
      case "missions":
        return this.missions();
      case "character":
        return this.character();
      case "talents":
        return this.talents();
      case "inventory":
        return this.inventory();
      case "collection":
        return this.collection();
      case "settings":
        return this.settings();
      default:
        return this.pause();
    }
  }
  private missions() {
    const m = this.mission,
      unlocked = missionUnlocked(this.c, m);
    const coords = [
      [21, 73],
      [38, 51],
      [57, 66],
      [65, 31],
      [82, 16],
    ];
    return `<div class="section-heading"><div><p class="eyebrow">ЗА ГРАНИЦАМИ БЕЗОПАСНОГО</p><h1>Карта экспедиций</h1></div><span class="chapter-tag">ГЛАВА I <i>◆</i> ПЕПЕЛЬНЫЕ ЗЕМЛИ</span></div><div class="expedition-layout"><section class="world-map" style="background-image:url('${svgUri(landscapeArt("forest"))}')"><div class="map-label">ПЕПЕЛЬНЫЕ ЗЕМЛИ<small>Там, где свет встречается с тенью</small></div><svg class="map-route" viewBox="0 0 100 100" preserveAspectRatio="none"><path d="M21 73Q25 51 38 51T57 66Q70 66 65 31T82 16"/></svg>${MISSIONS.map((mission, i) => `<button style="left:${coords[i][0]}%;top:${coords[i][1]}%" data-action="mission" data-id="${mission.id}" class="map-node ${m.id === mission.id ? "selected" : ""} ${missionUnlocked(this.c, mission) ? "" : "locked"}" aria-label="${mission.name}"><span>${this.c.completed.includes(mission.id) ? "✓" : missionUnlocked(this.c, mission) ? i + 1 : "◇"}</span><b>${mission.name}</b></button>`).join("")}<div class="map-bottom"><span>✦ <b>${this.c.completed.length}</b> / 5 пройдено</span><span>Выберите место на карте</span></div></section><section class="mission-panel panel"><div class="mission-art" style="background-image:url('${svgUri(landscapeArt(m.biome))}')"><span class="tag">${m.subtitle}</span></div><div class="mission-body"><p class="eyebrow">РЕКОМЕНДУЕМЫЙ УРОВЕНЬ ${m.level}+</p><h2>${m.name}</h2><p>${m.description}</p><div class="objective"><span>◇</span><div><b>Дополнительная цель</b><small>${m.optional}</small></div></div><div class="rewards-preview"><span><small>ОПЫТ</small><b>${m.xp}+</b></span><span><small>ЗОЛОТО</small><b>${m.gold}+</b></span><span><small>ДОБЫЧА</small><b>Экипировка</b></span></div><label>Сложность<select id="difficulty"><option value="1" ${this.difficulty === 1 ? "selected" : ""}>Искатель · обычная</option><option value="1.3" ${this.difficulty > 1 ? "selected" : ""}>Ветеран · +30% сила врагов, +25% награды</option></select></label><button class="button primary full" data-action="launch" ${unlocked ? "" : "disabled"}>${unlocked ? "Начать экспедицию" : "Завершите предыдущую"} <span>➶</span></button><small class="muted">${!this.c.completed.includes(m.id) ? "Первое прохождение: +50% опыта миссии и реликвия." : "Новый предмет за каждую победу. Реликвия за каждую 3-ю победу."}</small></div></section></div><div class="camp-strip"><div class="strip-portrait">${this.portrait(this.c)}</div><div><b>${esc(this.c.name)}</b><span>${CLASSES[this.c.classId].name} · Уровень ${this.c.level}</span></div><div class="strip-xp"><div><span>Путь героя</span><span>${this.c.level === 15 ? "Максимальный уровень" : `${this.c.xp} / ${xpRequired(this.c.level)} XP`}</span></div><div class="progress"><i style="width:${this.c.level === 15 ? 100 : (this.c.xp / xpRequired(this.c.level)) * 100}%"></i></div></div><button class="button quiet" data-action="tab" data-id="character">Подготовить героя →</button></div>`;
  }
  private character() {
    const c = this.c,
      d = CLASSES[c.classId],
      stats = statsFor(c);
    return `<div class="section-heading"><div><p class="eyebrow">${d.title.toUpperCase()}</p><h1>${esc(c.name)}</h1></div><span class="chapter-tag">${d.name} · Уровень ${c.level}</span></div><div class="character-layout"><section class="panel portrait-panel"><div class="sigil"></div>${this.portrait(c)}<div class="portrait-caption">${SKINS.find((s) => s.id === c.skin)?.name}</div><button class="button quiet" data-action="tab" data-id="collection">Сменить облик оружия →</button></section><section class="panel padded"><h2>Характеристики</h2><div class="stats">${Object.entries(
      stats,
    )
      .map(
        ([key, val]) =>
          `<div><span>${statNames[key as keyof typeof statNames]}</span><b>${key === "crit" ? `${Math.round(val * 100)}%` : Number.isInteger(val) ? val : val.toFixed(1)}</b></div>`,
      )
      .join("")}</div><h3>Экипировка</h3>${Object.entries(slots)
      .map(([slot, label]) => {
        const item = c.inventory.find((i) => i.id === c.equipment[slot as keyof typeof slots]);
        return `<div class="equip-slot"><span>${label}</span><b style="color:${item ? RARITY_COLORS[item.rarity] : "#879692"}">${item ? esc(item.name) : "Не экипировано"}</b></div>`;
      })
      .join(
        "",
      )}<p class="passive">${d.passive}</p></section><section class="panel padded"><h2>Боевые навыки</h2>${d.skills.map((s, i) => `<div class="skill-description"><span class="ability-icon">${s.icon}<small>${i + 1}</small></span><div><h3>${s.name}</h3><p>${s.description}</p><small>${s.cost} ${d.resource.toLowerCase()} · ${s.cooldown} с</small></div></div>`).join("")}</section></div>`;
  }
  private talents() {
    const c = this.c,
      d = CLASSES[c.classId],
      left = talentBudget(c.level) - c.talents.length;
    return `<div class="section-heading"><div><p class="eyebrow">СОЗДАЙТЕ СВОЙ СТИЛЬ БОЯ</p><h1>Пути мастерства</h1></div><span class="points">✦ ${left} доступно</span></div><p class="muted">Очки на уровнях 2, 5, 8 и 11. Каждый следующий талант требует предыдущий в своей ветке. Всего 4 очка — выберите специализацию или гибрид.</p><div class="talent-columns">${d.branches
      .map(
        (branch, b) =>
          `<section class="panel talent-branch"><p class="eyebrow">ПУТЬ ${b + 1}</p><h2>${branch}</h2>${d.talents
            .filter((t) => t.branch === b)
            .map(
              (t) =>
                `<button class="talent ${c.talents.includes(t.id) ? "learned" : ""}" data-action="learn" data-id="${t.id}" ${!this.world && canLearn(c, t.id) ? "" : "disabled"}><span class="talent-symbol">${c.talents.includes(t.id) ? "✓" : ["✦", "◇", "✺"][t.tier]}</span><span><b>${t.name}</b><small>${t.description}</small><em>${c.talents.includes(t.id) ? "Изучено" : canLearn(c, t.id) ? "Изучить · 1 очко" : t.tier > 0 ? "Требуется предыдущий талант" : "Требуется очко"}</em></span></button>`,
            )
            .join("")}</section>`,
      )
      .join(
        "",
      )}</div><button class="button" data-action="reset-talents" ${this.world || !c.talents.length ? "disabled" : ""}>Сбросить таланты · бесплатно</button>${this.world ? '<p class="muted">Изменение билда доступно между экспедициями.</p>' : ""}`;
  }
  private inventory() {
    const c = this.c;
    return `<div class="section-heading"><div><p class="eyebrow">РЕЛИКВИИ ВАШИХ ПОБЕД</p><h1>Арсенал</h1></div><span class="chapter-tag">${c.inventory.length} / ${BALANCE.inventoryLimit} предметов</span></div><p class="muted">Оружие даёт силу атаки, доспех — защиту и двойное значение HP, аксессуар — процентные пункты критического шанса. Переполненная награда автоматически разбирается за золото.</p><div class="inventory-grid">${
      c.inventory.length
        ? c.inventory
            .map((i) => {
              const equipped = c.equipment[i.slot] === i.id;
              const current = c.inventory.find((x) => x.id === c.equipment[i.slot]);
              const diff = i.value - (current?.value ?? 0);
              return `<article class="item-card panel" style="--rarity:${RARITY_COLORS[i.rarity]}"><span class="item-glyph">${i.slot === "weapon" ? "⚔" : i.slot === "armor" ? "⬡" : "◇"}</span><small>${RARITY_NAMES[i.rarity]} · Ур. ${i.level}</small><h3>${esc(i.name)}</h3><p>${slots[i.slot]} · <b>+${i.value}${i.slot === "charm" ? "%" : ""}</b> <span class="${diff >= 0 ? "positive" : "negative"}">(${diff >= 0 ? "+" : ""}${diff} к надетому)</span></p><div class="item-actions"><button class="button ${equipped ? "equipped" : ""}" data-action="equip" data-id="${esc(i.id)}" ${this.world || equipped ? "disabled" : ""}>${equipped ? "✓ Надето" : "Надеть"}</button><button class="button quiet" data-action="salvage" data-id="${esc(i.id)}" ${this.world || equipped ? "disabled" : ""}>Разобрать · ${salvageValue(i)} ◈</button></div></article>`;
            })
            .join("")
        : '<div class="empty panel"><span>⚔</span><h2>История только начинается</h2><p>Завершите экспедицию, чтобы получить первый предмет.</p><button class="button" data-action="tab" data-id="missions">К экспедициям →</button></div>'
    }</div>`;
  }
  private collection() {
    return `<div class="section-heading"><div><p class="eyebrow">СИЛА В СТИЛЕ, А НЕ В ХАРАКТЕРИСТИКАХ</p><h1>Зал реликвий</h1></div><span class="chapter-tag">${this.save.collection.length} / ${SKINS.length} обликов · ${this.save.shards} осколков</span></div><div class="collection-top panel"><div class="relic-chest ${this.opening ? "opening" : ""}"><div class="chest-glow"></div><span>⟐</span></div><div><h2>${this.opening ? "Печать раскрывается…" : "Что хранит древняя печать?"}</h2><p>Все награды — облики оружия. Ни урона, ни здоровья, ни скрытых бонусов.</p><button class="button primary" data-action="open-chest" ${this.opening || !this.save.chests || this.world ? "disabled" : ""}>Открыть реликвию · ${this.save.chests}</button> <button class="button" data-action="buy-chest" ${!this.c || this.c.gold < BALANCE.chestPrice || this.world ? "disabled" : ""}>Получить за ${BALANCE.chestPrice} ◈</button><p class="muted">До гарантированной редкой или лучшей: ${BALANCE.pityAt - this.save.pity}. Дубликаты: 5 / 8 / 11 / 14 / 17 осколков по редкости.</p></div></div>${this.opened && !this.opening ? `<div class="reward-reveal" role="status" style="--rarity:${RARITY_COLORS[this.opened.skin.rarity]}"><span>✦</span><div><small>${this.opened.duplicate ? "ДУБЛИКАТ ПРЕВРАЩЁН В ОСКОЛКИ" : RARITY_NAMES[this.opened.skin.rarity].toUpperCase()}</small><h2>${this.opened.skin.name}</h2><p>${this.opened.duplicate ? `+${this.opened.shards} осколков` : "Облик добавлен в коллекцию"}</p></div></div>` : ""}<div class="odds">${RARITIES.map((r, i) => `<span style="color:${RARITY_COLORS[r]}">${RARITY_NAMES[r]} <b>${BALANCE.rarityWeights[i]}%</b></span>`).join("")}</div><p class="muted">На 10-м открытии без редкой награды: редкая 95%, эпическая 4%, легендарная 1%. Любую недостающую можно создать за 30 осколков. Первый успех в миссии и каждая третья победа дают реликвию.</p><div class="skin-grid">${SKINS.map(
      (s) => {
        const own = this.save.collection.includes(s.id),
          equipped = this.c?.skin === s.id;
        return `<article class="skin-card panel ${own ? "owned" : "unowned"}" style="--rarity:${RARITY_COLORS[s.rarity]}"><div class="skin-preview">${heroArt(this.c?.classId ?? "warrior", this.c?.color, s.color, this.c?.appearance ?? 0)}</div><small>${RARITY_NAMES[s.rarity]}</small><h3>${s.name}</h3><button class="button" data-action="${own ? "skin" : "craft"}" data-id="${s.id}" ${this.world || equipped || (!own && this.save.shards < BALANCE.craftShards) ? "disabled" : ""}>${equipped ? "✓ Используется" : own ? "Применить" : `Создать · ${BALANCE.craftShards} ◇`}</button></article>`;
      },
    ).join("")}</div>`;
  }
  private settings() {
    return `<div class="section-heading"><div><p class="eyebrow">ВАШЕ ПУТЕШЕСТВИЕ</p><h1>Настройки</h1></div></div><section class="panel settings-panel"><label class="check"><input id="sound" type="checkbox" ${this.save.settings.sound ? "checked" : ""}> Звуки боя</label><label>Громкость<input id="volume" type="range" min="0" max="1" step="0.05" value="${this.save.settings.volume}"></label><label class="check"><input id="reduced-motion" type="checkbox" ${this.save.settings.reducedMotion ? "checked" : ""}> Уменьшить анимации интерфейса и покачивание персонажа</label><hr><h2>Сохранение</h2><p>Прогресс сохраняется после действий в лагере и результатов экспедиции. Незавершённый бой после перезагрузки не восстанавливается. Экспорт создаёт переносимую резервную копию.</p><button class="button" data-action="export">↓ Экспортировать JSON</button><label class="import-label">↑ Импортировать JSON<input type="file" id="import-save" accept="application/json,.json" ${this.world ? "disabled" : ""}></label><small class="muted">Импорт заменит текущие данные после проверки. Резервная копия текущего прогресса будет скачана автоматически.</small>${this.saveWarning ? `<p class="negative">${esc(this.saveWarning)}</p>` : ""}<hr>${this.controls()}</section>`;
  }
  private controls() {
    return `<h2>Управление</h2><div class="controls">${[
      ["W A S D / ↑ ↓ ← →", "Движение"],
      ["Мышь + ЛКМ", "Наведение и атака (можно удерживать)"],
      ["1 — 4", "Классовые навыки"],
      ["Space", "Уклонение: 0,25 с неуязвимости, откат 4 с"],
      ["E", "Зелье: 40% HP, откат 22 с, без расхода золота"],
      ["I / C / K", "Инвентарь / герой / таланты"],
      ["Esc", "Пауза / продолжить"],
    ]
      .map(([key, label]) => `<kbd>${key}</kbd><span>${label}</span>`)
      .join(
        "",
      )}</div><p class="muted">Красные области предупреждают об атаках. Зелёный центр кольца безопасен. Уход вкладки в фон ставит бой на паузу. Основная платформа — компьютер с мышью и клавиатурой.</p>`;
  }
  private pause() {
    return `<div class="pause-heading"><p class="eyebrow">ОГОНЬ ПОДОЖДЁТ</p><h1>Пауза</h1><p>Бой остановлен. Прогресс миссии сохранён в памяти до закрытия страницы.</p><button class="button primary" data-action="resume">Продолжить бой</button><button class="button" data-action="retreat">Отступить в лагерь</button></div>${this.controls()}`;
  }
  private results() {
    if (!this.result) return "";
    const { battle: b, rewards: r } = this.result;
    return `<main class="results"><p class="eyebrow">${r.first ? "ПЕРВОЕ ПРОХОЖДЕНИЕ" : "ЭКСПЕДИЦИЯ ЗАВЕРШЕНА"}</p><div class="result-emblem">${b.victory ? "✦" : "◇"}</div><h1>${b.victory ? "Огонь не погас" : "Новая попытка впереди"}</h1><p class="lead">${this.mission.name}</p><div class="result-stats panel"><span><small>ВРЕМЯ</small><b>${duration(b.time)}</b></span><span><small>ПОВЕРЖЕНО</small><b>${b.kills}</b></span><span><small>НАНЕСЕНО УРОНА</small><b>${Math.round(b.damageDealt)}</b></span><span><small>ПОЛУЧЕНО УРОНА</small><b>${Math.round(b.damageTaken)}</b></span></div><div class="result-rewards"><span>✦ +${r.xp} опыта</span><span>◈ +${r.gold} золота</span>${r.chest ? "<span>◇ +1 реликвия</span>" : ""}${r.levels ? `<span>↑ Новый уровень: ${this.c.level}</span>` : ""}</div>${r.item ? `<p style="color:${RARITY_COLORS[r.item.rarity]}">${RARITY_NAMES[r.item.rarity]}: ${r.item.name}${r.salvaged ? " · инвентарь заполнен, предмет разобран за золото" : ""}</p>` : ""}<p class="muted">${b.optional ? "✓ Дополнительная цель выполнена: +25% наград миссии." : b.victory ? "Дополнительная цель не выполнена." : "Герой восстановлен в лагере. Опыт за поверженных врагов сохранён."}</p><button class="button primary" data-action="camp">Вернуться в лагерь →</button><button class="button" data-action="launch">Повторить экспедицию</button></main>`;
  }
  private async launch() {
    if (this.world || !this.c || !missionUnlocked(this.c, this.mission)) return;
    this.page = "battle";
    this.root.className = "battle-app";
    this.root.innerHTML = `<div id="game-host"></div><div id="hud"><div class="hud-top"><section class="hero-hud"><strong>${esc(this.c.name)} <small>Ур. ${this.c.level} · ${CLASSES[this.c.classId].name}</small></strong><div class="meter hp"><i id="hp-fill"></i><span id="hp-text"></span></div><div class="meter resource"><i id="resource-fill"></i><span id="resource-text"></span></div><div id="buffs"></div></section><section class="mission-hud"><b>${this.mission.name}</b><span id="objective-text"></span><small id="time-text"></small></section><button class="button pause-button" data-action="pause">Ⅱ <small>Esc</small></button></div><div id="boss-hud"></div><div class="hotbar">${CLASSES[this.c.classId].skills.map((s, i) => `<button class="hotbar-skill" id="skill-${i}" data-action="skill" data-id="${i}" title="${s.name} — ${s.description} (${s.cost} ресурса)"><kbd>${i + 1}</kbd><span>${s.icon}</span><b class="cooldown"></b><small>${s.name}</small></button>`).join("")}<div class="hotbar-skill utility"><kbd>Space</kbd><span>➶</span><b id="dodge-cd"></b><small>Уклонение</small></div><div class="hotbar-skill utility"><kbd>E</kbd><span>⚱</span><b id="potion-cd"></b><small>Зелье</small></div></div><div class="battle-hint">WASD — движение · ЛКМ — атака · I / C / K — подготовка · <span id="fps-text"></span></div></div><div id="pause-panel"></div>`;
    this.world = new World(structuredClone(this.c), this.mission, this.difficulty);
    try {
      const { startGame } = await import("../engine/game");
      if (this.destroyed) return;
      this.game = startGame(
        this.root.querySelector("#game-host")!,
        this.world,
        {
          onHud: (w, fps) => this.hud(w, fps),
          onMenu: (tab) => this.overlay(tab),
          onFinish: (w) => this.complete(w),
        },
        this.save.settings,
      );
    } catch (e) {
      this.world = undefined;
      this.page = "camp";
      this.render();
      this.toast("Не удалось загрузить движок: " + String(e), 9000);
    }
  }
  private hud(w: World, fps: number) {
    const set = (id: string, text: string) => {
      const el = this.root.querySelector("#" + id);
      if (el) el.textContent = text;
    };
    const hp = this.root.querySelector<HTMLElement>("#hp-fill"),
      resource = this.root.querySelector<HTMLElement>("#resource-fill");
    if (hp) hp.style.width = `${Math.max(0, w.player.hp / w.stats.hp) * 100}%`;
    if (resource) resource.style.width = `${w.player.resource}%`;
    set(
      "hp-text",
      `${Math.ceil(w.player.hp)} / ${w.stats.hp} HP${w.player.shield > 0 ? ` · щит ${Math.ceil(w.player.shield)}` : ""}`,
    );
    set(
      "resource-text",
      `${Math.floor(w.player.resource)} / 100 ${CLASSES[w.character.classId].resource}`,
    );
    set(
      "objective-text",
      `${w.mission.kind === "waves" || w.mission.kind === "defend" ? `Волна ${w.wave}/4 · ` : ""}Врагов: ${w.enemies.length}${w.mission.kind === "defend" ? ` · Маяк ${Math.ceil((w.beacon.hp / w.beacon.maxHp) * 100)}%` : ""}${w.nextWave > 0 ? " · Подготовка…" : ""}`,
    );
    set("time-text", `${duration(w.time)} · ${w.mission.optional}`);
    set("fps-text", fps > 0 ? `${Math.round(fps)} FPS` : "Измерение FPS…");
    set(
      "buffs",
      [
        w.player.stealth > 0 ? "◐ Скрытность" : "",
        w.player.poison > 0 ? "♠ Ядовитые клинки" : "",
        w.player.buff > 0 ? "♜ Клич битвы" : "",
        w.player.counter > 0 ? "✦ Контрудар готов" : "",
        w.summons.length ? `♙ Стражи: ${w.summons.length}` : "",
      ]
        .filter(Boolean)
        .join(" · "),
    );
    w.cooldowns.forEach((cd, i) => {
      const b = this.root.querySelector<HTMLButtonElement>("#skill-" + i);
      if (!b) return;
      b.querySelector(".cooldown")!.textContent = cd > 0 ? cd.toFixed(1) : "";
      b.classList.toggle(
        "unavailable",
        cd > 0 || w.player.resource < CLASSES[w.character.classId].skills[i].cost,
      );
      b.style.setProperty(
        "--cooldown",
        `${(cd / CLASSES[w.character.classId].skills[i].cooldown) * 100}%`,
      );
    });
    set("dodge-cd", w.player.dodgeCd > 0 ? w.player.dodgeCd.toFixed(1) : "");
    set("potion-cd", w.player.potionCd > 0 ? w.player.potionCd.toFixed(1) : "");
    const boss = w.enemies.find((e) => e.kind === "warden" || e.kind === "oracle");
    const bar = this.root.querySelector("#boss-hud");
    if (bar)
      bar.innerHTML = boss
        ? `<b>${boss.kind === "warden" ? "Каменный Смотритель" : "Оракул Пустоты"} <small>Фаза ${boss.phase}${boss.vulnerable > 0 ? " · Уязвимость +25%" : ""}</small></b><div class="meter hp"><i style="width:${(boss.hp / boss.maxHp) * 100}%"></i><span>${Math.ceil(boss.hp)} / ${Math.ceil(boss.maxHp)}</span></div>`
        : "";
  }
  private overlay(tab: string) {
    const el = this.root.querySelector("#pause-panel");
    if (!el) return;
    this.root.querySelectorAll<HTMLElement>("#hud, #game-host").forEach((node) => {
      node.inert = true;
    });
    el.innerHTML = `<div class="modal-backdrop"><section class="modal" role="dialog" aria-modal="true" aria-label="Меню экспедиции"><div class="modal-nav"><button class="button primary" data-action="resume">← В бой</button>${nav
      .filter((n) => !["missions", "collection"].includes(n[0]))
      .map(
        ([id, , name]) =>
          `<button class="button quiet" data-action="battle-tab" data-id="${id}">${name}</button>`,
      )
      .join(
        "",
      )}<button class="button quiet" data-action="battle-tab" data-id="pause">Пауза</button></div>${this.content(tab)}</section></div>`;
    el.querySelector<HTMLButtonElement>("button")?.focus();
  }
  private resume() {
    this.root.querySelector("#pause-panel")?.replaceChildren();
    this.root.querySelectorAll<HTMLElement>("#hud, #game-host").forEach((node) => {
      node.inert = false;
    });
    this.game?.scene.resumeBattle();
  }
  private complete(w: World) {
    if (this.world !== w) return; // A mission can settle only once, including retreat.
    const battle = w.result!;
    const rewards = grantRewards(this.save, this.c, this.mission, battle, this.difficulty);
    this.persist();
    this.result = { battle, rewards };
    const instance = this.game;
    this.game = undefined;
    this.world = undefined; // Phaser teardown on next frame; never destroy the scene inside its own update.
    requestAnimationFrame(() => {
      instance?.game.destroy(true);
      this.page = "result";
      this.render();
    });
  }
  private download(save: Save, name = "brawls-craft-save.json") {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(save, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
  private input(e: Event) {
    const el = e.target as HTMLInputElement;
    if (el.id === "hero-name") this.nameDraft = el.value;
    if (el.id === "volume") {
      this.save.settings.volume = Number(el.value);
      this.persist();
    }
  }
  private async change(e: Event) {
    const el = e.target as HTMLInputElement;
    if (el.id === "appearance") {
      this.appearance = Number(el.value);
      this.render();
    }
    if (el.id === "armor-color") {
      this.chosenColor = el.value;
      this.render();
    }
    if (el.id === "difficulty") this.difficulty = Number(el.value);
    if (el.id === "sound" || el.id === "reduced-motion") {
      if (el.id === "sound") this.save.settings.sound = el.checked;
      else this.save.settings.reducedMotion = el.checked;
      document.body.classList.toggle("reduce-motion", this.save.settings.reducedMotion);
      this.persist();
    }
    if (el.id === "import-save" && !this.world) {
      const file = el.files?.[0];
      if (!file) return;
      try {
        if (file.size > 1_000_000) throw new Error("Файл слишком большой.");
        const imported = validateSave(JSON.parse(await file.text()));
        if (this.save.characters.length)
          this.download(this.save, "brawls-craft-before-import.json");
        this.save = imported;
        this.persist();
        this.page = this.c ? "camp" : "welcome";
        this.tab = "missions";
        this.render();
        this.toast("Сохранение успешно импортировано.");
      } catch (error) {
        this.toast(error instanceof Error ? error.message : "Некорректное сохранение.", 7000);
      }
      el.value = "";
    }
  }
  private async click(event: Event) {
    const button = (event.target as Element).closest<HTMLButtonElement>("button[data-action]");
    if (!button || button.disabled) return;
    const action = button.dataset.action,
      id = button.dataset.id!;
    if (this.world) {
      if (action === "resume") this.resume();
      else if (action === "pause") this.game?.scene.pauseBattle();
      else if (action === "battle-tab" || action === "tab") this.overlay(id);
      else if (action === "retreat") {
        this.world.finish(false);
        this.complete(this.world);
      } else if (action === "export") this.download(this.save);
      else if (action === "skill" && !this.root.querySelector("#pause-panel")?.childElementCount) {
        const pointer = this.game?.scene.input.activePointer;
        const aim = pointer
          ? this.game!.scene.cameras.main.getWorldPoint(pointer.x, pointer.y)
          : this.world.player;
        this.world.skill(Number(id), aim);
      }
      return;
    }
    switch (action) {
      case "create":
        this.page = "create";
        break;
      case "back":
      case "camp":
        this.page = this.c ? "camp" : "welcome";
        break;
      case "roster":
        this.page = "roster";
        break;
      case "class":
        this.chosenClass = id as ClassId;
        this.chosenColor = CLASSES[this.chosenClass].color;
        break;
      case "create-confirm": {
        if (this.save.characters.length >= 10) return;
        const c = createCharacter(
          this.nameDraft,
          this.chosenClass,
          this.appearance,
          this.chosenColor,
        );
        this.save.characters.push(c);
        this.save.selected = c.id;
        this.page = "camp";
        this.tab = "missions";
        this.persist();
        break;
      }
      case "select-hero":
        this.save.selected = id;
        this.page = "camp";
        this.persist();
        break;
      case "tab":
        this.tab = id;
        this.page = "camp";
        break;
      case "mission":
        this.mission = MISSIONS.find((m) => m.id === id)!;
        break;
      case "launch":
        await this.launch();
        return;
      case "learn":
        if (canLearn(this.c, id)) {
          this.c.talents.push(id);
          this.persist();
        }
        break;
      case "reset-talents":
        this.c.talents = [];
        this.persist();
        break;
      case "equip": {
        const item = this.c.inventory.find((i) => i.id === id);
        if (item) {
          this.c.equipment[item.slot] = item.id;
          this.persist();
        }
        break;
      }
      case "salvage": {
        const item = this.c.inventory.find((i) => i.id === id);
        if (item && this.c.equipment[item.slot] !== id) {
          this.c.gold += salvageValue(item);
          this.c.inventory = this.c.inventory.filter((i) => i.id !== id);
          this.persist();
        }
        break;
      }
      case "buy-chest":
        if (this.c.gold >= BALANCE.chestPrice) {
          this.c.gold -= BALANCE.chestPrice;
          this.save.chests++;
          this.persist();
        }
        break;
      case "open-chest":
        if (this.opening || this.save.chests <= 0) return;
        this.opened = rollCosmetic(this.save);
        this.persist();
        this.opening = true;
        this.render();
        setTimeout(
          () => {
            this.opening = false;
            if (this.page === "camp" && this.tab === "collection") this.render();
          },
          this.save.settings.reducedMotion ? 100 : 1300,
        );
        return;
      case "skin":
        if (this.save.collection.includes(id)) {
          this.c.skin = id;
          this.persist();
        }
        break;
      case "craft":
        if (craftSkin(this.save, id)) this.persist();
        break;
      case "export":
        this.download(this.save);
        return;
      case "settings":
        if (this.c) {
          this.page = "camp";
          this.tab = "settings";
        } else {
          this.root.innerHTML = `${this.header()}<main class="content wide">${this.settings()}<button class="button" data-action="back">← Назад</button></main>`;
          return;
        }
        break;
      case "help": {
        const modal = document.createElement("dialog");
        modal.className = "help-dialog";
        modal.innerHTML = `${this.controls()}<button class="button primary">Понятно</button>`;
        document.body.append(modal);
        modal.querySelector("button")!.onclick = () => modal.close();
        modal.onclose = () => modal.remove();
        modal.showModal();
        return;
      }
    }
    this.render();
  }
}
