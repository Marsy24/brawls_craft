import Phaser from "phaser";
import { heroArt, enemyArt, treeArt, rockArt, svgUri } from "../art/art";
import { CLASSES, ENEMIES, SKINS } from "../data/config";
import { World, type Input } from "../systems/combat";
import { seeded, mapSeed, WORLD } from "../systems/navigation";
import type { Save } from "../types";
import { AudioBus } from "./sound";
export interface GameBridge {
  onHud: (world: World, fps: number) => void;
  onFinish: (world: World) => void;
  onMenu: (tab: string) => void;
}
export class BattleScene extends Phaser.Scene {
  private world: World;
  private bridge: GameBridge;
  private settings: Save["settings"];
  private actor!: Phaser.GameObjects.Image;
  private graphics!: Phaser.GameObjects.Graphics;
  private images = new Map<number, Phaser.GameObjects.Image>();
  private labels = new Map<number, Phaser.GameObjects.Text>();
  private labelPool: Phaser.GameObjects.Text[] = [];
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private accumulator = 0;
  private pendingSkills = [false, false, false, false];
  private pendingDodge = false;
  private pendingPotion = false;
  private hudTime = 0;
  private stopped = false;
  private announced = false;
  private lastVisual = 0;
  private audio: AudioBus;
  private fpsSamples: number[] = [];
  constructor(world: World, bridge: GameBridge, settings: Save["settings"]) {
    super("battle");
    this.world = world;
    this.bridge = bridge;
    this.settings = settings;
    this.audio = new AudioBus(settings);
  }
  preload() {
    const c = this.world.character;
    this.load.svg(
      "hero",
      svgUri(
        heroArt(
          c.classId,
          c.color,
          SKINS.find((s) => s.id === c.skin)!.color,
          c.appearance,
        ),
      ),
      { width: 96, height: 120 },
    );
    for (const kind of Object.keys(ENEMIES) as (keyof typeof ENEMIES)[])
      this.load.svg(kind, svgUri(enemyArt(kind)), { width: 96, height: 120 });
    this.load.svg(
      "summon",
      svgUri(heroArt("warrior", "#b8c6b5", "#a9c9bd", 2)),
      { width: 72, height: 90 },
    );
    this.load.svg("tree", svgUri(treeArt()), { width: 140, height: 190 });
    this.load.svg("rock", svgUri(rockArt()), { width: 120, height: 150 });
    this.load.svg("pillar", svgUri(rockArt(true)), { width: 120, height: 150 });
  }
  create() {
    this.drawTerrain();
    for (const o of this.world.obstacles)
      this.add
        .image(o.x, o.y, o.kind)
        .setOrigin(0.5, 0.83)
        .setScale(o.kind === "tree" ? 1 : 0.8)
        .setDepth(o.y);
    this.actor = this.add
      .image(this.world.player.x, this.world.player.y, "hero")
      .setOrigin(0.5, 0.82)
      .setScale(0.78);
    this.graphics = this.add.graphics().setDepth(5000);
    this.cameras.main.setBounds(0, 0, WORLD.width, WORLD.height);
    this.cameras.main.startFollow(this.actor, true, 0.12, 0.12);
    this.cameras.main.setZoom(1);
    this.keys = this.input.keyboard!.addKeys(
      "W,A,S,D,UP,DOWN,LEFT,RIGHT,ONE,TWO,THREE,FOUR,SPACE,E,ESC,I,C,K",
    ) as Record<string, Phaser.Input.Keyboard.Key>;
    this.input.mouse?.disableContextMenu();
    const pause = () => this.pauseBattle("pause");
    const visibility = () => {
      if (document.hidden) pause();
    };
    window.addEventListener("blur", pause);
    document.addEventListener("visibilitychange", visibility);
    this.events.once("shutdown", () => {
      window.removeEventListener("blur", pause);
      document.removeEventListener("visibilitychange", visibility);
      this.audio.destroy();
    });
    this.bridge.onHud(this.world, 0);
  }
  private drawTerrain() {
    const texture = this.textures.createCanvas(
      "ground",
      WORLD.width,
      WORLD.height,
    )!;
    const ctx = texture.context;
    const bi = this.world.mission.biome;
    const palette =
      bi === "forest"
        ? ["#263f35", "#425749", "#64715a"]
        : bi === "cave"
          ? ["#252c3c", "#353d52", "#626381"]
          : bi === "ruins"
            ? ["#343c3d", "#4a5351", "#76796b"]
            : bi === "keep"
              ? ["#3c3332", "#514840", "#7c715c"]
              : ["#302e45", "#494259", "#796d90"];
    ctx.fillStyle = palette[0];
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);
    const random = seeded(mapSeed(this.world.mission.id));
    for (let i = 0; i < 6500; i++) {
      const x = random() * 1800,
        y = random() * 1200;
      ctx.fillStyle = palette[i % 3];
      ctx.globalAlpha = 0.07 + random() * 0.2;
      if (bi === "forest") {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + random() * 6 - 3, y - 6 - random() * 6);
        ctx.lineTo(x + 5, y);
        ctx.fill();
      } else {
        ctx.strokeStyle = palette[2];
        ctx.strokeRect(
          Math.floor(x / 60) * 60,
          Math.floor(y / 45) * 45,
          56,
          41,
        );
      }
    }
    ctx.globalAlpha = 0.18;
    ctx.strokeStyle = palette[2];
    ctx.lineWidth = 120;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(180, 600);
    ctx.bezierCurveTo(600, 540, 1050, 680, 1610, 600);
    ctx.stroke();
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = 2;
    for (let r = 80; r <= 200; r += 40) {
      ctx.beginPath();
      ctx.arc(1400, 600, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI) / 6;
      ctx.save();
      ctx.translate(1400 + Math.cos(a) * 175, 600 + Math.sin(a) * 175);
      ctx.rotate(a);
      ctx.strokeRect(-7, -7, 14, 14);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    const gradient = ctx.createRadialGradient(900, 600, 250, 900, 600, 1100);
    gradient.addColorStop(0, "#07121400");
    gradient.addColorStop(1, "#071214aa");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1800, 1200);
    texture.refresh();
    this.add.image(0, 0, "ground").setOrigin(0).setDepth(-100);
  }
  pauseBattle(tab = "pause") {
    if (this.stopped || this.world.result) return;
    this.stopped = true;
    this.accumulator = 0;
    this.input.keyboard?.resetKeys();
    this.pendingSkills.fill(false);
    this.pendingDodge = this.pendingPotion = false;
    this.bridge.onMenu(tab);
  }
  resumeBattle() {
    this.stopped = false;
    this.accumulator = 0;
    this.input.keyboard?.resetKeys();
    this.pendingSkills.fill(false);
    this.pendingDodge = this.pendingPotion = false;
  }
  update(_time: number, delta: number) {
    if (!this.keys || this.stopped) return;
    for (const [key, tab] of [
      ["ESC", "pause"],
      ["I", "inventory"],
      ["C", "character"],
      ["K", "talents"],
    ])
      if (Phaser.Input.Keyboard.JustDown(this.keys[key])) {
        this.pauseBattle(tab);
        return;
      }
    const pointer = this.input.activePointer;
    const aim = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const input: Input = {
      x:
        Number(this.keys.D.isDown || this.keys.RIGHT.isDown) -
        Number(this.keys.A.isDown || this.keys.LEFT.isDown),
      y:
        Number(this.keys.S.isDown || this.keys.DOWN.isDown) -
        Number(this.keys.W.isDown || this.keys.UP.isDown),
      aim,
      attack: pointer.leftButtonDown(),
      skills: ["ONE", "TWO", "THREE", "FOUR"].map((k) =>
        Phaser.Input.Keyboard.JustDown(this.keys[k]),
      ),
      dodge: Phaser.Input.Keyboard.JustDown(this.keys.SPACE),
      potion: Phaser.Input.Keyboard.JustDown(this.keys.E),
    };
    this.pendingSkills = this.pendingSkills.map((v, i) => v || input.skills[i]);
    this.pendingDodge ||= input.dodge;
    this.pendingPotion ||= input.potion;
    this.accumulator += Math.min(delta / 1000, 0.1);
    while (this.accumulator >= 1 / 60) {
      this.world.update(1 / 60, {
        ...input,
        skills: this.pendingSkills,
        dodge: this.pendingDodge,
        potion: this.pendingPotion,
      });
      this.pendingSkills = [false, false, false, false];
      this.pendingDodge = false;
      this.pendingPotion = false;
      this.accumulator -= 1 / 60;
    }
    this.renderWorld();
    this.hudTime += delta;
    this.fpsSamples.push(1000 / Math.max(1, delta));
    if (this.fpsSamples.length > 120) this.fpsSamples.shift();
    if (this.hudTime > 100) {
      this.hudTime = 0;
      this.bridge.onHud(
        this.world,
        this.fpsSamples.reduce((a, b) => a + b, 0) / this.fpsSamples.length,
      );
    }
    if (this.world.result && !this.announced) {
      this.announced = true;
      this.bridge.onFinish(this.world);
    }
  }
  private renderWorld() {
    const w = this.world,
      p = w.player,
      g = this.graphics;
    g.clear();
    const moving =
      this.keys.W.isDown ||
      this.keys.A.isDown ||
      this.keys.S.isDown ||
      this.keys.D.isDown;
    this.actor
      .setPosition(
        p.x,
        p.y +
          (moving && !this.settings.reducedMotion
            ? Math.sin(w.time * 15) * 2
            : 0),
      )
      .setDepth(p.y)
      .setFlipX(Math.cos(p.angle) < 0)
      .setAlpha(p.stealth > 0 ? 0.4 : 1);
    if (p.invulnerable > 0) this.actor.setTint(0xd3eee6);
    else this.actor.clearTint();
    const live = new Set<number>();
    for (const e of w.enemies) {
      live.add(e.id);
      let img = this.images.get(e.id);
      if (!img) {
        img = this.add.image(e.x, e.y, e.kind).setOrigin(0.5, 0.82);
        this.images.set(e.id, img);
      }
      const boss = e.kind === "warden" || e.kind === "oracle";
      img
        .setPosition(e.x, e.y)
        .setDepth(e.y)
        .setScale(boss ? 1.45 : e.kind === "elite" ? 0.88 : 0.66)
        .setFlipX(e.x > p.x);
      if (e.hitFlash > 0) img.setTint(0xffdfc1);
      else if (e.slow > 0) img.setTint(0xadd5e7);
      else img.clearTint();
      const width = boss ? 86 : 38;
      g.fillStyle(0x081416, 0.9).fillRoundedRect(
        e.x - width / 2 - 2,
        e.y - (boss ? 120 : 61),
        width + 4,
        7,
        2,
      );
      g.fillStyle(e.cursed > 0 ? 0xb594d3 : 0xbe6a55).fillRect(
        e.x - width / 2,
        e.y - (boss ? 118 : 59),
        width * Math.max(0, e.hp / e.maxHp),
        3,
      );
      if (e.marked > 0) {
        g.lineStyle(2, 0xf2ce7c, 0.8).strokeCircle(e.x, e.y - 70, 8);
        g.lineBetween(e.x, e.y - 82, e.x, e.y - 58);
      }
      if (e.stunned > 0) {
        g.lineStyle(2, 0xc3e2ed).strokeEllipse(e.x, e.y - 75, 30, 9);
      }
    }
    for (const s of w.summons) {
      live.add(s.id);
      let img = this.images.get(s.id);
      if (!img) {
        img = this.add
          .image(s.x, s.y, "summon")
          .setOrigin(0.5, 0.82)
          .setScale(0.6)
          .setAlpha(0.8);
        this.images.set(s.id, img);
      }
      img.setPosition(s.x, s.y).setDepth(s.y);
      g.lineStyle(1, 0xa4ccb4, 0.5).strokeCircle(s.x, s.y, 15);
    }
    for (const [id, img] of this.images)
      if (!live.has(id)) {
        img.destroy();
        this.images.delete(id);
      }
    for (const h of w.hazards) {
      const col = h.hostile
        ? 0xf0906c
        : h.kind === "plague"
          ? 0x9fa26d
          : h.kind === "trap"
            ? 0xa9c779
            : 0x8fcbe6;
      g.fillStyle(col, h.hostile ? 0.1 : 0.13).fillCircle(h.x, h.y, h.r);
      g.lineStyle(
        h.hostile ? 3 : 2,
        col,
        h.delay > 0 ? 0.6 + 0.3 * Math.sin(w.time * 9) : 0.8,
      ).strokeCircle(h.x, h.y, h.r);
      if (h.inner > 0) {
        g.fillStyle(0x1d3035, 0.9).fillCircle(h.x, h.y, h.inner);
        g.lineStyle(2, 0xa5c9ad, 0.9).strokeCircle(h.x, h.y, h.inner);
      }
      if (h.delay > 0) {
        g.lineStyle(2, col, 0.6);
        g.lineBetween(h.x - 12, h.y, h.x + 12, h.y);
        g.lineBetween(h.x, h.y - 12, h.x, h.y + 12);
      }
    }
    for (const b of w.projectiles) {
      const col = b.hostile
        ? 0xe88c77
        : Phaser.Display.Color.HexStringToColor(
            CLASSES[w.character.classId].color,
          ).color;
      g.lineStyle(b.hostile ? 5 : 3, col, 0.5);
      g.lineBetween(b.x - b.vx * 0.025, b.y - b.vy * 0.025, b.x, b.y);
      g.fillStyle(col).fillCircle(b.x, b.y, b.radius);
    }
    if (p.shield > 0) {
      g.lineStyle(3, 0x88c7e0, 0.65).strokeEllipse(p.x, p.y - 24, 65, 88);
    }
    g.lineStyle(1, 0xc7d6a1, 0.4).strokeEllipse(p.x, p.y + 2, 42, 17);
    const labelIds = new Set<number>();
    for (const v of w.visuals) {
      const progress = 1 - v.life / v.maxLife;
      const col = Phaser.Display.Color.HexStringToColor(v.color).color;
      if (v.kind !== "hit" && v.kind !== "heal") {
        g.lineStyle(3 * (1 - progress), col, 1 - progress).strokeCircle(
          v.x,
          v.y - 12,
          v.r * (0.3 + 0.7 * progress),
        );
      }
      if (v.text) {
        labelIds.add(v.id);
        let label = this.labels.get(v.id);
        if (!label) {
          label =
            this.labelPool.pop() ??
            this.add
              .text(0, 0, "", {
                fontFamily: "Georgia",
                fontSize: "18px",
                fontStyle: "bold",
                stroke: "#0c1820",
                strokeThickness: 3,
              })
              .setDepth(6000)
              .setOrigin(0.5);
          this.labels.set(v.id, label);
          label.setText(v.text).setColor(v.color).setVisible(true);
        }
        label.setPosition(v.x, v.y - 60 - progress * 35).setAlpha(1 - progress);
      }
      if (v.id > this.lastVisual && v.kind === "hit")
        this.audio.hit(v.color === "#ff8a78");
      this.lastVisual = Math.max(this.lastVisual, v.id);
    }
    for (const [id, label] of this.labels)
      if (!labelIds.has(id)) {
        label.setVisible(false);
        this.labels.delete(id);
        if (this.labelPool.length < 50) this.labelPool.push(label);
        else label.destroy();
      }
    if (w.mission.kind === "defend") {
      const b = w.beacon;
      g.fillStyle(0x29383d).fillRoundedRect(b.x - 28, b.y - 25, 56, 45, 5);
      g.lineStyle(3, 0xc8ae74).strokeRect(b.x - 24, b.y - 25, 48, 40);
      g.fillStyle(0xedbd65, 0.25).fillCircle(
        b.x,
        b.y - 45,
        35 + Math.sin(w.time * 4) * 4,
      );
      g.fillStyle(0xf0cf8c).fillTriangle(
        b.x - 13,
        b.y - 26,
        b.x + 13,
        b.y - 26,
        b.x + Math.sin(w.time * 5) * 8,
        b.y - 78,
      );
      g.fillStyle(0x09191c).fillRect(b.x - 42, b.y + 25, 84, 8);
      g.fillStyle(0x80bb95).fillRect(
        b.x - 40,
        b.y + 27,
        (80 * b.hp) / b.maxHp,
        4,
      );
    }
    // Compact minimap: actual enemies and position, no fictional markers.
    const camera = this.cameras.main;
    const mx = camera.scrollX + camera.width - 156,
      my = camera.scrollY + 95;
    g.fillStyle(0x07151c, 0.8).fillRoundedRect(mx, my, 136, 96, 5);
    g.lineStyle(1, 0xa68e5e, 0.6).strokeRoundedRect(mx, my, 136, 96, 5);
    for (const e of w.enemies)
      g.fillStyle(0xd88973).fillCircle(
        mx + (e.x / 1800) * 136,
        my + (e.y / 1200) * 96,
        2,
      );
    g.fillStyle(0xf0d99c).fillCircle(
      mx + (p.x / 1800) * 136,
      my + (p.y / 1200) * 96,
      3,
    );
  }
}
export function startGame(
  parent: HTMLElement,
  world: World,
  bridge: GameBridge,
  settings: Save["settings"],
) {
  const scene = new BattleScene(world, bridge, settings);
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: parent.clientWidth,
    height: parent.clientHeight,
    backgroundColor: "#17292b",
    scale: { mode: Phaser.Scale.RESIZE },
    render: { antialias: true, powerPreference: "high-performance" },
    scene: [scene],
    audio: { noAudio: true },
  });
  return { game, scene };
}
