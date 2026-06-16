import type { CardDef } from './types'

// Starter card pool. Day 2 expands this toward ~12 cards.
export const CARDS: Record<string, CardDef> = {
  strike: {
    key: 'strike',
    name: 'Strike',
    cost: 1,
    type: 'attack',
    text: 'Deal 6 damage.',
    damage: 6,
  },
  defend: {
    key: 'defend',
    name: 'Defend',
    cost: 1,
    type: 'skill',
    text: 'Gain 5 block.',
    block: 5,
  },
  heavy: {
    key: 'heavy',
    name: 'Heavy Strike',
    cost: 2,
    type: 'attack',
    text: 'Deal 10 damage.',
    damage: 10,
  },
  overclock: {
    key: 'overclock',
    name: 'Overclock',
    cost: 1,
    type: 'skill',
    text: 'Draw 2 cards.',
    draw: 2,
  },
}

// 10-card starter deck.
export const STARTER_DECK: string[] = [
  'strike',
  'strike',
  'strike',
  'strike',
  'defend',
  'defend',
  'defend',
  'defend',
  'heavy',
  'overclock',
]
