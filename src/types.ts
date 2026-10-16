export type ClassId = 'warrior' | 'mage' | 'hunter' | 'necromancer' | 'assassin';
export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
export type Slot = 'weapon' | 'armor' | 'charm';
export interface Stats { hp: number; power: number; defense: number; crit: number; speed: number; attackRate: number }
export type Action = 'cleave'|'charge'|'shield'|'warcry'|'nova'|'meteor'|'chain'|'blink'|'volley'|'trap'|'mark'|'retreat'|'summon'|'curse'|'drain'|'plague'|'lunge'|'poison'|'stealth'|'fan';
export interface Skill { name: string; icon: string; action: Action; cost: number; cooldown: number; coefficient: number; description: string }
export interface Talent { id: string; name: string; branch: number; tier: number; description: string }
export interface ClassDef { id: ClassId; name: string; title: string; description: string; color: string; resource: string; passive: string; stats: Stats; range: number; branches: [string,string]; skills: Skill[]; talents: Talent[] }
export interface Item { id: string; name: string; slot: Slot; rarity: Rarity; level: number; value: number }
export interface Character { id: string; name: string; classId: ClassId; appearance: number; color: string; level: number; xp: number; gold: number; talents: string[]; inventory: Item[]; equipment: Partial<Record<Slot,string>>; skin: string; completed: string[]; runs: number }
export interface Save { version: 1; characters: Character[]; selected: string; collection: string[]; chests: number; shards: number; pity: number; settings: { sound: boolean; volume: number; reducedMotion: boolean } }
export interface Mission { id: string; name: string; subtitle: string; description: string; biome: 'forest'|'ruins'|'cave'|'keep'|'sanctum'; kind: 'clear'|'boss'|'waves'|'defend'; level: number; xp: number; gold: number; count: number; boss?: 'warden'|'oracle'; optional: string }
export interface Skin { id: string; name: string; rarity: Rarity; color: string }
export interface Vec { x: number; y: number }
export interface Obstacle extends Vec { r: number; kind: 'tree'|'rock'|'pillar' }
export type EnemyKind = 'raider'|'archer'|'shaman'|'stalker'|'guard'|'elite'|'warden'|'oracle';
export interface EnemyDef { name: string; hp: number; power: number; defense: number; speed: number; range: number; interval: number; xp: number; color: string }
