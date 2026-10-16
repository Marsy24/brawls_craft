import { BALANCE, CLASSES, ENEMIES } from "../data/config";
import type {
  Character,
  EnemyKind,
  Mission,
  Obstacle,
  Stats,
  Vec,
} from "../types";
import { statsFor } from "./progression";
import {
  clamp,
  distance,
  free,
  lineClear,
  mapObstacles,
  move,
  pathfind,
  WORLD,
} from "./navigation";
export const mitigation = (defense: number) =>
  BALANCE.armorConstant / (BALANCE.armorConstant + Math.max(0, defense));
export const damage = (
  power: number,
  coefficient: number,
  defense: number,
  critical = false,
) =>
  Math.max(
    0,
    power *
      coefficient *
      mitigation(defense) *
      (critical ? BALANCE.critMultiplier : 1),
  );
export const effectiveHealth = (hp: number, defense: number) =>
  hp / mitigation(defense);
export interface Enemy extends Vec {
  id: number;
  kind: EnemyKind;
  hp: number;
  maxHp: number;
  power: number;
  defense: number;
  speed: number;
  cooldown: number;
  stunned: number;
  slow: number;
  marked: number;
  cursed: number;
  dot: number;
  dotTick: number;
  immune: number;
  state: "idle" | "chase" | "attack" | "return" | "stunned";
  home: Vec;
  path: Vec[];
  repath: number;
  phase: number;
  pattern: number;
  vulnerable: number;
  hitFlash: number;
  aggro: number;
}
interface Projectile extends Vec {
  id: number;
  vx: number;
  vy: number;
  life: number;
  power: number;
  hostile: boolean;
  radius: number;
  hits: Set<number>;
  pierce: number;
  group?: Set<number>;
  poison: boolean;
}
interface Hazard extends Vec {
  id: number;
  r: number;
  inner: number;
  delay: number;
  life: number;
  interval: number;
  tick: number;
  power: number;
  kind: "meteor" | "trap" | "plague" | "enemy" | "ring";
  hostile: boolean;
  triggered: boolean;
}
export interface Summon extends Vec {
  id: number;
  life: number;
  cooldown: number;
  path: Vec[];
  repath: number;
}
export interface Visual extends Vec {
  id: number;
  kind: "hit" | "slash" | "heal" | "ring" | "cast" | "death";
  life: number;
  maxLife: number;
  r: number;
  color: string;
  text?: string;
}
export interface Input {
  x: number;
  y: number;
  aim: Vec;
  attack: boolean;
  skills: boolean[];
  dodge: boolean;
  potion: boolean;
}
export interface BattleResult {
  victory: boolean;
  time: number;
  kills: number;
  damageDealt: number;
  damageTaken: number;
  killXp: number;
  optional: boolean;
  potions: number;
}
export class World {
  readonly stats: Stats;
  readonly obstacles: Obstacle[];
  readonly player = {
    x: 260,
    y: 600,
    r: 18,
    hp: 0,
    resource: 100,
    shield: 0,
    shieldTime: 0,
    invulnerable: 0,
    stealth: 0,
    poison: 0,
    buff: 0,
    haste: 0,
    dodge: 0,
    dodgeCd: 0,
    attackCd: 0,
    potionCd: 0,
    counter: 0,
    refundCd: 0,
    angle: 0,
  };
  enemies: Enemy[] = [];
  projectiles: Projectile[] = [];
  hazards: Hazard[] = [];
  summons: Summon[] = [];
  visuals: Visual[] = [];
  cooldowns = [0, 0, 0, 0];
  time = 0;
  kills = 0;
  killXp = 0;
  damageDealt = 0;
  damageTaken = 0;
  potions = 0;
  wave = 1;
  nextWave = 0;
  result: BattleResult | null = null;
  beacon = { x: 900, y: 600, hp: 600, maxHp: 600 };
  enemyLevel: number;
  totalEnemies = 0;
  private serial = 0;
  private dead = new Set<number>();
  constructor(
    readonly character: Character,
    readonly mission: Mission,
    readonly difficulty: number = 1,
    readonly random: () => number = Math.random,
  ) {
    this.stats = statsFor(character);
    this.player.hp = this.stats.hp;
    this.obstacles = mapObstacles(mission);
    this.enemyLevel = Math.max(character.level, mission.level);
    this.beacon.hp = this.beacon.maxHp =
      BALANCE.beaconHp * (1 + BALANCE.levelHp * (this.enemyLevel - 1));
    if (mission.kind === "defend") {
      this.player.x = 820;
      this.spawnWave();
    } else if (mission.kind === "waves") this.spawnWave();
    else {
      for (let i = 0; i < mission.count; i++) {
        const angle = i * 2.4;
        this.spawn(this.kindFor(i), {
          x: 620 + (i % 4) * 260,
          y: 600 + Math.sin(angle) * 350,
        });
      }
      if (mission.boss) this.spawn(mission.boss, { x: 1400, y: 600 });
    }
    this.totalEnemies = this.enemies.length;
  }
  has(id: string) {
    return this.character.talents.includes(id);
  }
  private id() {
    return ++this.serial;
  }
  private kindFor(i: number): EnemyKind {
    return (
      [
        "raider",
        "archer",
        "stalker",
        "guard",
        "shaman",
        "raider",
        "elite",
      ] as EnemyKind[]
    )[i % 7];
  }
  spawn(kind: EnemyKind, position: Vec) {
    const d = ENEMIES[kind],
      scale =
        (1 + BALANCE.enemyGrowth * (this.enemyLevel - 1)) * this.difficulty;
    let pos = { ...position };
    for (let i = 0; !free(pos, 24, this.obstacles) && i < 40; i++)
      pos = {
        x: clamp(position.x + Math.cos(i) * i * 7, 40, 1760),
        y: clamp(position.y + Math.sin(i) * i * 7, 40, 1160),
      };
    if (!free(pos, 24, this.obstacles)) pos = { x: 900, y: 600 };
    const e: Enemy = {
      ...pos,
      id: this.id(),
      kind,
      hp: d.hp * scale,
      maxHp: d.hp * scale,
      power: d.power * scale,
      defense: d.defense + this.enemyLevel,
      speed: d.speed,
      cooldown: 0.8 + this.random(),
      stunned: 0,
      slow: 0,
      marked: 0,
      cursed: 0,
      dot: 0,
      dotTick: 1,
      immune: 0,
      state: "idle",
      home: { ...pos },
      path: [],
      repath: 0,
      phase: 1,
      pattern: 0,
      vulnerable: 0,
      hitFlash: 0,
      aggro: 0,
    };
    this.enemies.push(e);
    return e;
  }
  private spawnWave() {
    const n = this.mission.count + this.wave - 1;
    for (let i = 0; i < n; i++) {
      const angle = (i / n) * Math.PI * 2 + this.wave;
      this.spawn(this.kindFor(i + this.wave), {
        x: 900 + Math.cos(angle) * 650,
        y: 600 + Math.sin(angle) * 450,
      });
    }
  }
  visual(
    kind: Visual["kind"],
    p: Vec,
    r: number,
    color: string,
    text?: string,
  ) {
    if (this.visuals.length >= 180) this.visuals.shift();
    this.visuals.push({
      ...p,
      id: this.id(),
      kind,
      r,
      color,
      text,
      life: kind === "death" ? 0.7 : 0.4,
      maxLife: kind === "death" ? 0.7 : 0.4,
    });
  }
  private control(e: Enemy, duration: number) {
    if (e.immune > 0) return;
    const boss = e.kind === "warden" || e.kind === "oracle";
    e.stunned = boss ? Math.min(BALANCE.bossControlCap, duration) : duration;
    e.immune = e.stunned + BALANCE.controlImmunity;
  }
  private nearest(p: Vec, range = 600) {
    return this.enemies
      .filter((e) => e.hp > 0 && distance(e, this.player) <= range)
      .sort((a, b) => distance(a, p) - distance(b, p))[0];
  }
  private dot(e: Enemy) {
    e.dot = Math.max(
      e.dot,
      this.has("a3") ? BALANCE.poisonExtendedDuration : BALANCE.poisonDuration,
    );
  }
  private heal(amount: number) {
    const delta = Math.min(amount, this.stats.hp - this.player.hp);
    this.player.hp += delta;
    if (delta > 1)
      this.visual("heal", this.player, 20, "#9cde99", `+${Math.round(delta)}`);
  }
  private hit(
    e: Enemy,
    coefficient: number,
    source = "skill",
    rawPower = this.stats.power,
    extra = 1,
  ) {
    if (e.hp <= 0) return 0;
    let mult =
      extra *
      (e.marked > 0 ? BALANCE.markedDamage : 1) *
      (e.cursed > 0 ? BALANCE.cursedDamage : 1) *
      (this.player.buff > 0 ? BALANCE.warriorBuffDamage : 1) *
      (e.vulnerable > 0 ? BALANCE.vulnerableDamage : 1);
    if (
      this.character.classId === "mage" &&
      (e.slow > 0 || e.stunned > 0) &&
      source !== "dot"
    )
      mult *= BALANCE.mageComboDamage;
    if (this.player.stealth > 0 && source !== "dot" && source !== "summon")
      mult *= BALANCE.assassinAmbushDamage;
    if (this.has("w5") && this.player.hp < this.stats.hp * 0.4) mult *= 1.25;
    if (this.has("h2") && e.marked > 0 && e.hp / e.maxHp < 0.35) mult *= 1.3;
    if (source === "summon" && this.has("n2") && e.cursed > 0) mult *= 1.4;
    const crit =
      this.random() <
      Math.min(
        BALANCE.combatCritCap,
        this.stats.crit + (this.has("h0") && e.marked > 0 ? 0.15 : 0),
      );
    const amount =
      damage(
        rawPower,
        coefficient,
        e.defense,
        source === "dot" ? false : crit,
      ) * mult;
    const actual = Math.min(e.hp, amount);
    e.hp -= amount;
    e.hitFlash = 0.13;
    e.state = "chase";
    e.aggro = BALANCE.hitAggro;
    this.damageDealt += actual;
    this.visual(
      "hit",
      e,
      crit ? 25 : 15,
      crit ? "#ffdd92" : "#eee7d6",
      `${Math.round(amount)}${crit ? "!" : ""}`,
    );
    if (source === "basic") {
      if (this.character.classId === "warrior")
        this.player.resource = Math.min(100, this.player.resource + 3);
      if (this.has("w3") || this.player.poison > 0) this.dot(e);
      if (this.has("a5") && e.dot > 0 && this.player.refundCd <= 0) {
        this.player.resource = Math.min(100, this.player.resource + 2);
        this.player.refundCd = 0.5;
      }
    }
    if (
      this.has("m5") &&
      (e.slow > 0 || e.stunned > 0) &&
      this.player.refundCd <= 0 &&
      source !== "dot"
    ) {
      this.player.resource = Math.min(100, this.player.resource + 2);
      this.player.refundCd = 0.5;
    }
    if (e.hp <= 0 && !this.dead.has(e.id)) {
      this.dead.add(e.id);
      this.kills++;
      this.killXp += Math.round(
        ENEMIES[e.kind].xp * (1 + 0.05 * (this.enemyLevel - 1)),
      );
      if (this.character.classId === "necromancer")
        this.player.resource = Math.min(100, this.player.resource + 4);
      if (this.has("n5") && e.cursed > 0) this.heal(this.stats.hp * 0.03);
      this.visual("death", e, 35, ENEMIES[e.kind].color);
    }
    return actual;
  }
  private hurt(amount: number) {
    if (this.player.invulnerable > 0 || this.result) return;
    const defense =
      this.stats.defense + (this.has("n0") && this.summons.length ? 15 : 0);
    let dealt = amount * mitigation(defense);
    if (this.player.shield > 0) {
      const blocked = Math.min(dealt, this.player.shield);
      this.player.shield -= blocked;
      dealt -= blocked;
      if (this.character.classId === "warrior")
        this.player.counter = this.has("w0") ? 1 : 0.5;
    }
    this.player.hp = Math.max(0, this.player.hp - dealt);
    this.damageTaken += dealt;
    if (dealt > 0)
      this.visual("hit", this.player, 25, "#ff8a78", `−${Math.round(dealt)}`);
  }
  private area(
    p: Vec,
    r: number,
    coefficient: number,
    apply?: (e: Enemy) => void,
  ) {
    let count = 0;
    for (const e of this.enemies)
      if (e.hp > 0 && distance(e, p) < r) {
        this.hit(e, coefficient);
        apply?.(e);
        count++;
      }
    return count;
  }
  private shoot(
    origin: Vec,
    angle: number,
    power: number,
    hostile = false,
    life = 1,
    group?: Set<number>,
  ) {
    if (this.projectiles.length >= 220) return;
    const speed = hostile ? 260 : 620;
    this.projectiles.push({
      ...origin,
      id: this.id(),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life,
      power,
      hostile,
      radius: hostile ? 8 : 5,
      hits: new Set(),
      pierce: !hostile && !group && this.has("h1") ? 2 : 1,
      group,
      poison: this.player.poison > 0,
    });
  }
  basic(aim: Vec) {
    if (this.player.attackCd > 0) return;
    this.player.attackCd = 1 / this.stats.attackRate;
    const angle = Math.atan2(aim.y - this.player.y, aim.x - this.player.x),
      cls = CLASSES[this.character.classId];
    const coefficient = 1 + this.player.counter;
    this.player.counter = 0;
    if (cls.range < 150) {
      this.visual("slash", this.player, cls.range, cls.color);
      for (const e of this.enemies) {
        const a = Math.atan2(e.y - this.player.y, e.x - this.player.x);
        const diff = Math.atan2(Math.sin(a - angle), Math.cos(a - angle));
        if (
          distance(e, this.player) < cls.range &&
          Math.abs(diff) < 1.1 &&
          lineClear(this.player, e, this.obstacles)
        )
          this.hit(e, coefficient, "basic");
      }
    } else
      this.shoot(
        this.player,
        angle,
        this.stats.power * coefficient,
        false,
        cls.range / 620,
      );
    this.player.stealth = 0;
  }
  private dash(aim: Vec, length: number) {
    const angle = Math.atan2(aim.y - this.player.y, aim.x - this.player.x);
    move(
      this.player,
      Math.cos(angle) * length,
      Math.sin(angle) * length,
      18,
      this.obstacles,
    );
    this.visual("cast", this.player, 45, CLASSES[this.character.classId].color);
  }
  skill(index: number, aim: Vec) {
    const skill = CLASSES[this.character.classId].skills[index];
    if (
      !skill ||
      this.cooldowns[index] > 0 ||
      this.player.resource < skill.cost
    )
      return false;
    const target = this.nearest(aim);
    if (["drain", "mark", "chain"].includes(skill.action) && !target)
      return false;
    this.player.resource -= skill.cost;
    this.cooldowns[index] = skill.cooldown;
    const p = this.player,
      dist = distance(p, aim),
      scale = Math.min(1, BALANCE.aimRange / (dist || 1));
    const point = {
      x: clamp(p.x + (aim.x - p.x) * scale, 25, 1775),
      y: clamp(p.y + (aim.y - p.y) * scale, 25, 1175),
    };
    const col = CLASSES[this.character.classId].color;
    this.visual("cast", p, 42, col);
    switch (skill.action) {
      case "cleave": {
        const n = this.area(p, 135, skill.coefficient, (e) => {
          if (this.has("w4")) e.slow = 2;
        });
        if (this.has("w1")) this.heal(this.stats.hp * Math.min(0.08, n * 0.02));
        this.visual("ring", p, 135, col);
        break;
      }
      case "charge":
        this.dash(point, Math.min(210, dist));
        this.area(p, 100, skill.coefficient, (e) => this.control(e, 1));
        break;
      case "shield":
        p.shield = this.stats.hp * 0.35;
        p.shieldTime = 4;
        if (this.has("w2")) this.area(p, 130, 0, (e) => this.control(e, 1));
        break;
      case "warcry":
        p.buff = 5;
        for (const e of this.enemies)
          if (distance(e, p) < 500) {
            e.state = "chase";
            e.aggro = BALANCE.warcryAggro;
          }
        break;
      case "nova":
        this.area(p, 190, skill.coefficient, (e) => {
          e.slow = 3;
          if (this.has("m3")) this.control(e, 0.8);
        });
        this.visual("ring", p, 190, col);
        break;
      case "meteor":
        this.hazards.push({
          ...point,
          id: this.id(),
          r: 115,
          inner: 0,
          delay: 0.8,
          life: 0.05,
          interval: 1,
          tick: 0,
          power: skill.coefficient,
          kind: "meteor",
          hostile: false,
          triggered: false,
        });
        break;
      case "chain": {
        const targets = this.enemies
          .filter(
            (e) =>
              e.hp > 0 && distance(e, target!) < 240 && distance(e, p) < 600,
          )
          .sort((a, b) => distance(a, target!) - distance(b, target!))
          .slice(0, this.has("m1") ? 5 : 3);
        targets.forEach((e, i) => {
          this.hit(e, skill.coefficient * Math.pow(0.8, i));
          this.visual("cast", e, 40, col);
        });
        break;
      }
      case "blink":
        this.dash(point, Math.min(210, dist));
        p.invulnerable = 0.35;
        if (this.has("m4")) {
          p.shield = this.stats.hp * 0.2;
          p.shieldTime = 3;
        }
        break;
      case "volley": {
        const angle = Math.atan2(aim.y - p.y, aim.x - p.x),
          group = new Set<number>();
        for (const offset of [-0.22, 0, 0.22])
          this.shoot(
            p,
            angle + offset,
            this.stats.power * skill.coefficient,
            false,
            0.95,
            group,
          );
        break;
      }
      case "trap":
        this.hazards.push({
          ...point,
          id: this.id(),
          r: 110,
          inner: 0,
          delay: 0,
          life: 8,
          interval: 1,
          tick: 0,
          power: skill.coefficient,
          kind: "trap",
          hostile: false,
          triggered: false,
        });
        break;
      case "mark":
        target!.marked = 6;
        break;
      case "retreat": {
        const angle = Math.atan2(aim.y - p.y, aim.x - p.x);
        this.dash({ x: p.x - (aim.x - p.x), y: p.y - (aim.y - p.y) }, 180);
        p.invulnerable = 0.25;
        this.shoot(p, angle, this.stats.power * skill.coefficient, false, 0.95);
        if (this.has("h4")) p.haste = 3;
        break;
      }
      case "summon":
        if (this.summons.length >= BALANCE.maxSummons) this.summons.shift();
        this.summons.push({
          x: p.x,
          y: p.y,
          id: this.id(),
          life: BALANCE.summonLife + (this.has("n1") ? 8 : 0),
          cooldown: 0.5,
          path: [],
          repath: 0,
        });
        break;
      case "curse":
        this.area(point, 150, skill.coefficient, (e) => {
          e.cursed = 6;
          e.slow = 3;
        });
        this.visual("ring", point, 150, col);
        break;
      case "drain": {
        const dealt = this.hit(target!, skill.coefficient);
        this.heal(
          Math.min(
            this.stats.hp * (this.has("n3") ? 0.2 : 0.15),
            dealt * (this.has("n3") ? 0.6 : 0.4),
          ),
        );
        break;
      }
      case "plague":
        this.hazards.push({
          ...point,
          id: this.id(),
          r: 140,
          inner: 0,
          delay: 0,
          life: 5,
          interval: 1,
          tick: 0,
          power: skill.coefficient,
          kind: "plague",
          hostile: false,
          triggered: false,
        });
        break;
      case "lunge":
        this.dash(point, Math.min(210, dist));
        for (const e of this.enemies)
          if (e.hp > 0 && distance(e, p) < 95)
            this.hit(
              e,
              skill.coefficient,
              "skill",
              this.stats.power,
              this.has("a2") && e.hp / e.maxHp < 0.3 ? 1.4 : 1,
            );
        if (this.has("a1")) {
          p.shield = this.stats.hp * 0.15;
          p.shieldTime = 2;
        }
        break;
      case "poison":
        p.poison = 5;
        break;
      case "stealth":
        p.stealth = 3;
        if (this.has("a0")) this.heal(this.stats.hp * 0.06);
        break;
      case "fan":
        this.area(p, 150, skill.coefficient, (e) => {
          e.slow = 2;
          if (this.has("a4") || p.poison > 0) this.dot(e);
        });
        this.visual("ring", p, 150, col);
        break;
    }
    if (
      !["stealth", "poison", "shield", "warcry", "blink"].includes(skill.action)
    )
      p.stealth = 0;
    return true;
  }
  private enemyHazard(p: Vec, r: number, power: number, delay = 1, inner = 0) {
    this.hazards.push({
      ...p,
      id: this.id(),
      r,
      inner,
      delay,
      life: 0.08,
      interval: 1,
      tick: 0,
      power,
      kind: inner ? "ring" : "enemy",
      hostile: true,
      triggered: false,
    });
  }
  private enemyMove(e: Enemy | Summon, target: Vec, speed: number, dt: number) {
    e.repath -= dt;
    let dest = target;
    if (!lineClear(e, target, this.obstacles, 20)) {
      if (e.repath <= 0 || !e.path.length) {
        e.path = pathfind(e, target, this.obstacles);
        e.repath = 0.7;
      }
      if (e.path.length) {
        dest = e.path[0];
        if (distance(e, dest) < 12) {
          e.path.shift();
          dest = e.path[0] ?? target;
        }
      }
    } else e.path = [];
    const d = distance(e, dest);
    if (d > 2)
      move(
        e,
        ((dest.x - e.x) / d) * speed * dt,
        ((dest.y - e.y) / d) * speed * dt,
        18,
        this.obstacles,
      );
  }
  private updateEnemy(e: Enemy, dt: number) {
    if (e.hp <= 0) return;
    for (const key of [
      "cooldown",
      "stunned",
      "slow",
      "marked",
      "cursed",
      "immune",
      "vulnerable",
      "hitFlash",
      "aggro",
    ] as const)
      e[key] = Math.max(0, e[key] - dt);
    if (e.dot > 0) {
      e.dot -= dt;
      e.dotTick -= dt;
      if (e.dotTick <= 0) {
        e.dotTick = 1;
        this.hit(e, BALANCE.poisonPower, "dot");
      }
    } else e.dotTick = 1;
    if (e.hp <= 0) return;
    if (e.stunned > 0) {
      e.state = "stunned";
      return;
    }
    const boss = e.kind === "warden" || e.kind === "oracle";
    if (boss && e.hp / e.maxHp <= BALANCE.bossPhaseHp && e.phase === 1) {
      e.phase = 2;
      this.visual("cast", e, 120, "#ef946f", "ФАЗА II");
      for (let i = 0; i < 3; i++)
        this.spawn("stalker", {
          x: e.x + Math.cos(i * 2.1) * 120,
          y: e.y + Math.sin(i * 2.1) * 120,
        });
    }
    const d = ENEMIES[e.kind];
    let target: Vec = this.player;
    const toPlayer = distance(e, this.player);
    if (
      this.mission.kind === "defend" &&
      ((toPlayer > BALANCE.defenseInterceptRadius && e.aggro <= 0) ||
        this.player.stealth > 0)
    )
      target = this.beacon;
    else if (this.player.stealth > 0) {
      e.state = "return";
      target = e.home;
    } else if (
      e.state === "idle" &&
      toPlayer > BALANCE.detectionRadius &&
      this.mission.kind !== "waves"
    )
      return;
    else if (
      toPlayer > BALANCE.leashRadius &&
      !boss &&
      this.mission.kind !== "defend" &&
      this.mission.kind !== "waves"
    ) {
      e.state = "return";
      target = e.home;
    } else e.state = "chase";
    const range = distance(e, target);
    if (e.state === "return") {
      this.enemyMove(e, target, e.speed, dt);
      if (range < 20) e.state = "idle";
      return;
    }
    if (range > d.range || !lineClear(e, target, this.obstacles, 5)) {
      this.enemyMove(
        e,
        target,
        e.speed *
          (e.slow > 0 ? 0.5 : 1) *
          (e.phase === 2 ? BALANCE.bossPhaseSpeed : 1),
        dt,
      );
      return;
    }
    e.state = "attack";
    if (e.cooldown > 0) return;
    e.cooldown = d.interval * (e.phase === 2 ? BALANCE.bossPhaseCooldown : 1);
    if (boss) {
      e.pattern++;
      e.vulnerable = 1.8;
      if (e.kind === "warden") {
        if (e.pattern % 2 === 0)
          this.enemyHazard(e, 240, e.power * 1.5, 1.2, 100);
        else this.enemyHazard(target, 110, e.power * 1.3, 0.9);
        if (e.phase === 2)
          this.enemyHazard({ ...target, x: target.x + 100 }, 85, e.power, 0.95);
      } else {
        if (e.pattern % 3 === 0) {
          for (let i = 0; i < 8; i++)
            this.shoot(
              e,
              (i * Math.PI) / 4 + this.time * 0.2,
              e.power * 0.75,
              true,
              2.7,
            );
        } else {
          this.enemyHazard(target, 125, e.power * 1.15, 1);
          if (e.phase === 2)
            this.enemyHazard(
              { x: target.x - 120, y: target.y + 80 },
              100,
              e.power,
              1.3,
            );
        }
      }
    } else if (e.kind === "shaman") this.enemyHazard(target, 80, e.power, 1);
    else if (e.kind === "archer") {
      this.shoot(
        e,
        Math.atan2(target.y - e.y, target.x - e.x),
        e.power,
        true,
        2,
      );
    } else
      this.enemyHazard(target, e.kind === "elite" ? 72 : 48, e.power, 0.55);
  }
  private updateHazards(dt: number) {
    for (const h of this.hazards) {
      if (h.delay > 0) {
        h.delay -= dt;
        continue;
      }
      if (h.kind === "trap" && !h.triggered) {
        h.life -= dt;
        if (!this.enemies.some((e) => e.hp > 0 && distance(e, h) < h.r))
          continue;
        h.triggered = true;
        h.life = 0.05;
        this.visual("ring", h, h.r, "#accc78");
      }
      h.tick -= dt;
      if (h.tick <= 0) {
        h.tick = h.interval;
        if (h.hostile) {
          const dp = distance(this.player, h);
          if (dp < h.r + this.player.r && dp > h.inner - this.player.r)
            this.hurt(h.power);
          if (
            this.mission.kind === "defend" &&
            distance(this.beacon, h) < h.r &&
            distance(this.beacon, h) >= h.inner
          )
            this.beacon.hp = Math.max(0, this.beacon.hp - h.power);
          this.visual("ring", h, h.r, "#f28b74");
        } else
          for (const e of this.enemies)
            if (e.hp > 0 && distance(e, h) < h.r) {
              this.hit(
                e,
                h.power,
                "skill",
                this.stats.power,
                h.kind === "meteor" &&
                  this.has("m0") &&
                  (e.slow > 0 || e.stunned > 0)
                  ? 1.35
                  : 1,
              );
              if (h.kind === "trap") {
                this.control(e, 1);
                if (this.has("h3")) this.dot(e);
                if (this.has("h5")) e.marked = 6;
              }
              if (h.kind === "meteor" && this.has("m2")) this.dot(e);
              if (h.kind === "plague" && this.has("n4")) e.slow = 1.2;
            }
        if (h.kind === "meteor") this.visual("ring", h, h.r, "#85cff0");
      }
      h.life -= dt;
    }
    this.hazards = this.hazards.filter((h) => h.life > 0);
  }
  update(dt: number, input: Input) {
    if (this.result) return;
    dt = clamp(dt, 0, 1 / 30);
    this.time += dt;
    const p = this.player;
    for (const key of [
      "shieldTime",
      "invulnerable",
      "stealth",
      "poison",
      "buff",
      "haste",
      "dodge",
      "dodgeCd",
      "attackCd",
      "potionCd",
      "refundCd",
    ] as const)
      p[key] = Math.max(0, p[key] - dt);
    if (!p.shieldTime) p.shield = 0;
    this.cooldowns = this.cooldowns.map((c) => Math.max(0, c - dt));
    p.resource = Math.min(100, p.resource + BALANCE.resourceRegen * dt);
    p.angle = Math.atan2(input.aim.y - p.y, input.aim.x - p.x);
    if (input.dodge && p.dodgeCd <= 0) {
      p.dodge = BALANCE.dodgeDuration;
      p.invulnerable = BALANCE.dodgeDuration;
      p.dodgeCd = BALANCE.dodgeCooldown;
    }
    if (input.potion && p.potionCd <= 0 && p.hp < this.stats.hp) {
      this.heal(this.stats.hp * BALANCE.hpPotion);
      p.potionCd = BALANCE.potionCooldown;
      this.potions++;
    }
    const norm = Math.hypot(input.x, input.y);
    if (norm > 0) {
      const speed =
        p.dodge > 0
          ? BALANCE.dodgeSpeed
          : this.stats.speed *
            (p.stealth > 0 ? 1.25 : 1) *
            (p.haste > 0 ? 1.3 : 1) *
            (p.buff > 0 ? 1.15 : 1);
      move(
        p,
        (input.x / norm) * speed * dt,
        (input.y / norm) * speed * dt,
        p.r,
        this.obstacles,
      );
    }
    if (input.attack) this.basic(input.aim);
    input.skills.forEach((v, i) => {
      if (v) this.skill(i, input.aim);
    });
    for (const e of [...this.enemies]) this.updateEnemy(e, dt);
    for (const s of this.summons) {
      s.life -= dt;
      s.cooldown -= dt;
      const target = this.enemies
        .filter((e) => e.hp > 0 && distance(e, p) < BALANCE.summonRange)
        .sort((a, b) => distance(a, s) - distance(b, s))[0];
      if (target) {
        if (distance(s, target) > 45)
          this.enemyMove(s, target, BALANCE.summonSpeed, dt);
        else if (s.cooldown <= 0) {
          s.cooldown = BALANCE.summonAttackInterval;
          this.hit(target, CLASSES.necromancer.skills[0].coefficient, "summon");
          this.visual("slash", s, 42, "#b1cfb1");
        }
      } else if (distance(s, p) > 75) this.enemyMove(s, p, 180, dt);
    }
    this.summons = this.summons.filter((s) => s.life > 0);
    for (const b of this.projectiles) {
      b.life -= dt;
      const old = { x: b.x, y: b.y };
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (!lineClear(old, b, this.obstacles, b.radius)) {
        b.life = 0;
        continue;
      }
      if (b.hostile) {
        if (distance(b, p) < p.r + b.radius) {
          this.hurt(b.power);
          b.life = 0;
        } else if (
          this.mission.kind === "defend" &&
          distance(b, this.beacon) < 35
        ) {
          this.beacon.hp = Math.max(0, this.beacon.hp - b.power);
          b.life = 0;
        }
      } else
        for (const e of this.enemies) {
          if (
            e.hp <= 0 ||
            b.hits.has(e.id) ||
            b.group?.has(e.id) ||
            distance(b, e) >
              (e.kind === "warden" || e.kind === "oracle" ? 38 : 20) + b.radius
          )
            continue;
          this.hit(e, 1, b.group ? "skill" : "basic", b.power);
          if (b.poison) this.dot(e);
          b.hits.add(e.id);
          b.group?.add(e.id);
          b.pierce--;
          if (b.pierce <= 0) {
            b.life = 0;
            break;
          }
        }
    }
    this.projectiles = this.projectiles.filter((b) => b.life > 0);
    this.updateHazards(dt);
    this.enemies = this.enemies.filter((e) => e.hp > 0);
    for (const v of this.visuals) v.life -= dt;
    this.visuals = this.visuals.filter((v) => v.life > 0);
    if (p.hp <= 0 || this.beacon.hp <= 0) {
      this.finish(false);
      return;
    }
    if (!this.enemies.length) {
      if (
        (this.mission.kind === "waves" || this.mission.kind === "defend") &&
        this.wave < BALANCE.waveCount
      ) {
        this.nextWave += dt;
        if (this.nextWave >= BALANCE.wavePause) {
          if (this.mission.kind === "defend") {
            this.beacon.hp = Math.min(
              this.beacon.maxHp,
              this.beacon.hp + this.beacon.maxHp * BALANCE.beaconRepair,
            );
            this.visual("heal", this.beacon, 40, "#a2ce98", "Ремонт маяка");
          }
          this.wave++;
          this.nextWave = 0;
          this.spawnWave();
        }
      } else this.finish(true);
    }
  }
  finish(victory: boolean) {
    if (this.result) return;
    const optional =
      victory &&
      (this.mission.id === "whisperwood"
        ? this.time < 100
        : this.mission.id === "fallen-bell"
          ? this.player.hp / this.stats.hp > 0.5
          : this.mission.id === "hollow"
            ? this.potions <= 1
            : this.mission.id === "emberwatch"
              ? this.beacon.hp / this.beacon.maxHp > 0.6
              : this.time < 150);
    this.result = {
      victory,
      time: this.time,
      kills: this.kills,
      damageDealt: this.damageDealt,
      damageTaken: this.damageTaken,
      killXp: this.killXp,
      optional,
      potions: this.potions,
    };
  }
}
