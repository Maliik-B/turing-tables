import type { CardDef } from './types'

// Card pool. The starter deck uses a subset; Bulwark and Power Surge live in
// the pool for a future reward/draft system (post-jam) without code changes.
export const CARDS: Record<string, CardDef> = {
  strike: {
    key: 'strike',
    name: 'Strike',
    cost: 1,
    type: 'attack',
    text: 'Deal 6 damage.',
    damage: 6,
  },
  quickjab: {
    key: 'quickjab',
    name: 'Quick Jab',
    cost: 0,
    type: 'attack',
    text: 'Deal 3 damage.',
    damage: 3,
  },
  heavy: {
    key: 'heavy',
    name: 'Heavy Strike',
    cost: 2,
    type: 'attack',
    text: 'Deal 10 damage.',
    damage: 10,
  },
  powersurge: {
    key: 'powersurge',
    name: 'Power Surge',
    cost: 2,
    type: 'attack',
    text: 'Deal 14 damage.',
    damage: 14,
  },
  expose: {
    key: 'expose',
    name: 'Expose',
    cost: 1,
    type: 'skill',
    text: 'Apply 2 Vulnerable.',
    vulnerable: 2,
  },
  disrupt: {
    key: 'disrupt',
    name: 'Disrupt',
    cost: 1,
    type: 'skill',
    text: 'Apply 2 Weak.',
    weak: 2,
  },
  defend: {
    key: 'defend',
    name: 'Defend',
    cost: 1,
    type: 'skill',
    text: 'Gain 5 block.',
    block: 5,
  },
  bulwark: {
    key: 'bulwark',
    name: 'Bulwark',
    cost: 2,
    type: 'skill',
    text: 'Gain 12 block.',
    block: 12,
  },
  reroute: {
    key: 'reroute',
    name: 'Reroute',
    cost: 1,
    type: 'skill',
    text: 'Gain 4 block. Draw 1.',
    block: 4,
    draw: 1,
  },
  overclock: {
    key: 'overclock',
    name: 'Overclock',
    cost: 1,
    type: 'skill',
    text: 'Draw 2 cards.',
    draw: 2,
  },
  sever: {
    key: 'sever',
    name: 'Sever',
    cost: 1,
    type: 'skill',
    text: "Cut the Machine's link — it runs only scripted routines until restored. Exhaust.",
    sever: 2,
    exhaust: true,
  },
}

// 12-card starter deck: offense (Strike x3 / Quick Jab / Heavy), defense
// (Defend x3 / Reroute), cycle (Overclock), and the status pair (Expose / Disrupt).
export const STARTER_DECK: string[] = [
  'strike',
  'strike',
  'strike',
  'quickjab',
  'heavy',
  'defend',
  'defend',
  'defend',
  'reroute',
  'overclock',
  'expose',
  'disrupt',
  'sever',
]
