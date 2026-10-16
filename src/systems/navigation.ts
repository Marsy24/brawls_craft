import type { Mission, Obstacle, Vec } from "../types";
export const WORLD = { width: 1800, height: 1200 };
export const distance = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y);
export const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));
export function seeded(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const mapSeed = (id: string) =>
  [...id].reduce((hash, c) => (Math.imul(hash, 31) + c.charCodeAt(0)) | 0, 17);
export function mapObstacles(m: Mission): Obstacle[] {
  const random = seeded(mapSeed(m.id));
  const out: Obstacle[] = [];
  for (let i = 0; i < 45; i++) {
    const x = 90 + random() * 1620,
      y = 100 + random() * 1000; // Keep the starting clearing, central objective and boss arena unobstructed.
    if (
      distance({ x, y }, { x: 260, y: 600 }) < 190 ||
      distance({ x, y }, { x: 900, y: 600 }) < 220 ||
      distance({ x, y }, { x: 1400, y: 600 }) < 200
    )
      continue;
    if (Math.abs(y - 600) < 70) continue;
    out.push({
      x,
      y,
      r: 24 + random() * 15,
      kind:
        m.biome === "forest" ? "tree" : m.biome === "cave" ? "rock" : "pillar",
    });
  }
  return out;
}
export function free(p: Vec, r: number, obstacles: Obstacle[]) {
  return (
    p.x >= r &&
    p.y >= r &&
    p.x <= WORLD.width - r &&
    p.y <= WORLD.height - r &&
    !obstacles.some((o) => distance(p, o) < r + o.r)
  );
}
export function move(
  p: Vec,
  dx: number,
  dy: number,
  r: number,
  obstacles: Obstacle[],
) {
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 10));
  for (let i = 0; i < steps; i++) {
    const nx = clamp(p.x + dx / steps, r, WORLD.width - r);
    if (free({ x: nx, y: p.y }, r, obstacles)) p.x = nx;
    const ny = clamp(p.y + dy / steps, r, WORLD.height - r);
    if (free({ x: p.x, y: ny }, r, obstacles)) p.y = ny;
  }
}
export function lineClear(a: Vec, b: Vec, obstacles: Obstacle[], r = 3) {
  const n = Math.max(1, Math.ceil(distance(a, b) / 16));
  for (let i = 1; i <= n; i++)
    if (
      !free(
        { x: a.x + ((b.x - a.x) * i) / n, y: a.y + ((b.y - a.y) * i) / n },
        r,
        obstacles,
      )
    )
      return false;
  return true;
}
/** Grid A*: bounded map, no diagonal corner cutting. Recomputed only when a direct route is blocked. */
export function pathfind(
  start: Vec,
  goal: Vec,
  obstacles: Obstacle[],
  radius = 18,
): Vec[] {
  const cell = 50,
    cols = WORLD.width / cell,
    rows = WORLD.height / cell;
  const key = (x: number, y: number) => y * cols + x;
  const center = (id: number) => ({
    x: ((id % cols) + 0.5) * cell,
    y: (Math.floor(id / cols) + 0.5) * cell,
  });
  const from = key(Math.floor(start.x / cell), Math.floor(start.y / cell));
  const end = key(Math.floor(goal.x / cell), Math.floor(goal.y / cell));
  const open = [from],
    g = new Map([[from, 0]]),
    parent = new Map<number, number>();
  let best = from;
  const closed = new Set<number>();
  while (open.length && closed.size < 900) {
    open.sort(
      (a, b) =>
        g.get(a)! +
        distance(center(a), goal) -
        (g.get(b)! + distance(center(b), goal)),
    );
    const current = open.shift()!;
    if (current === end) {
      best = current;
      break;
    }
    closed.add(current);
    if (distance(center(current), goal) < distance(center(best), goal))
      best = current;
    const x = current % cols,
      y = Math.floor(current / cols);
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nx = x + dx,
        ny = y + dy,
        id = key(nx, ny);
      if (
        nx < 0 ||
        ny < 0 ||
        nx >= cols ||
        ny >= rows ||
        closed.has(id) ||
        !free(center(id), radius, obstacles)
      )
        continue;
      const score = g.get(current)! + cell;
      if (score < (g.get(id) ?? Infinity)) {
        g.set(id, score);
        parent.set(id, current);
        if (!open.includes(id)) open.push(id);
      }
    }
  }
  const path: Vec[] = [];
  while (best !== from && parent.has(best)) {
    path.unshift(center(best));
    best = parent.get(best)!;
  }
  return path;
}
